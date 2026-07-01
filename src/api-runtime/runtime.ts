import type { FieldError, ProblemDetail } from '../types'

export type MaybePromise<T> = T | Promise<T>

export interface ApiBaseUrlOptions {
  baseUrl?: string | null
  env?: Record<string, string | undefined>
  envKeys?: string | string[]
  origin?: string
  defaultPath?: string
  fallbackBaseUrl?: string
}

export interface CsrfBootstrapOptions {
  bootstrapPath: string
  baseUrl?: string
  fetchImpl?: typeof fetch
  credentials?: RequestCredentials
  headerName?: string
  tokenPath?: string | string[]
  readToken?: () => MaybePromise<string | null | undefined>
  writeToken?: (token: string | null) => MaybePromise<void>
  cacheBootstrap?: boolean
}

export interface ApiRuntimeOptions extends ApiBaseUrlOptions {
  fetchImpl?: typeof fetch
  credentials?: RequestCredentials
  bearerToken?: string | (() => MaybePromise<string | null | undefined>)
  headers?: HeadersInit | (() => HeadersInit)
  csrf?: CsrfBootstrapOptions
}

export interface HeyApiRuntimeOptions extends ApiRuntimeOptions {
  throwOnError?: boolean
}

export interface HeyApiRuntimeConfig<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> {
  baseUrl?: string
  fetch?: typeof fetch
  credentials?: RequestCredentials
  headers?: HeadersInit | (() => HeadersInit)
  throwOnError?: boolean
  interceptors?: TConfig['interceptors']
}

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function resolveApiBaseUrl(options: ApiBaseUrlOptions = {}): string {
  if (isNonEmptyString(options.baseUrl)) return trimTrailingSlash(options.baseUrl)

  const envKeys = Array.isArray(options.envKeys)
    ? options.envKeys
    : options.envKeys
      ? [options.envKeys]
      : ['VITE_API_BASE_URL', 'VITE_APP_URL']
  for (const key of envKeys) {
    const value = options.env?.[key]
    if (isNonEmptyString(value)) return trimTrailingSlash(value)
  }

  if (isNonEmptyString(options.origin)) {
    return trimTrailingSlash(joinUrl(options.origin, options.defaultPath ?? '/api'))
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return trimTrailingSlash(joinUrl(window.location.origin, options.defaultPath ?? '/api'))
  }

  return trimTrailingSlash(options.fallbackBaseUrl ?? '/api')
}

export function isUnsafeHttpMethod(method: string | undefined): boolean {
  return unsafeMethods.has((method ?? 'GET').toUpperCase())
}

export function createCsrfBootstrapper(
  options: CsrfBootstrapOptions,
): () => Promise<string | null> {
  let inFlight: Promise<string | null> | null = null
  const cacheBootstrap = options.cacheBootstrap ?? true

  async function bootstrap(): Promise<string | null> {
    const existing = await options.readToken?.()
    if (existing) return existing

    if (cacheBootstrap && inFlight) return inFlight

    const run = requestCsrfToken(options)
      .then(async (token) => {
        await options.writeToken?.(token)
        return token
      })
      .catch(async () => {
        return (await options.readToken?.()) ?? null
      })
      .finally(() => {
        inFlight = null
      })

    inFlight = run
    return run
  }

  return bootstrap
}

export function createApiFetch(options: ApiRuntimeOptions = {}): typeof fetch {
  const fetcher = options.fetchImpl ?? fetch
  const csrfBootstrapper = options.csrf
    ? createCsrfBootstrapper({
        ...options.csrf,
        baseUrl: options.csrf.baseUrl ?? resolveApiBaseUrl(options),
        fetchImpl: options.csrf.fetchImpl ?? fetcher,
        ...((options.csrf.credentials ?? options.credentials) !== undefined
          ? { credentials: options.csrf.credentials ?? options.credentials }
          : {}),
      })
    : null

  return async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const method = init.method ?? methodFromInput(input)
    const headers = new Headers(
      typeof options.headers === 'function' ? options.headers() : options.headers,
    )
    new Headers(init.headers).forEach((value, key) => headers.set(key, value))

    const token = await resolveBearerToken(options.bearerToken)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    else headers.delete('Authorization')

    if (options.csrf && csrfBootstrapper && isUnsafeHttpMethod(method)) {
      const csrfToken = await csrfBootstrapper()
      if (csrfToken) headers.set(options.csrf.headerName ?? 'X-XSRF-TOKEN', csrfToken)
    }

    const requestInit: RequestInit = {
      ...init,
      method,
      headers,
    }
    const credentials = init.credentials ?? options.credentials
    if (credentials !== undefined) requestInit.credentials = credentials

    return fetcher(resolveRequestInput(input, options), requestInit)
  }
}

export function createHeyApiRuntimeConfig<TConfig extends Record<string, unknown>>(
  defaultConfig: TConfig,
  options: HeyApiRuntimeOptions = {},
): TConfig & HeyApiRuntimeConfig<TConfig> {
  return {
    ...defaultConfig,
    baseUrl: resolveApiBaseUrl(options),
    fetch: createApiFetch(options),
    ...(options.credentials !== undefined ? { credentials: options.credentials } : {}),
    ...(options.headers !== undefined ? { headers: options.headers } : {}),
    ...(options.throwOnError !== undefined ? { throwOnError: options.throwOnError } : {}),
  }
}

export function normalizeProblemDetail(
  input: unknown,
  fallback: Partial<ProblemDetail> = {},
): ProblemDetail {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const status = numberOr(source.status, fallback.status ?? 500)
  const title = stringOr(source.title, fallback.title ?? 'Request failed')
  const type = stringOr(source.type, fallback.type ?? 'about:blank')
  const detail = stringOrUndefined(source.detail) ?? fallback.detail
  const instance = stringOrUndefined(source.instance) ?? fallback.instance
  const errors = normalizeValidationErrors(source.errors)

  return {
    ...source,
    ...fallback,
    type,
    title,
    status,
    ...(detail !== undefined ? { detail } : {}),
    ...(instance !== undefined ? { instance } : {}),
    ...(errors.length > 0 ? { errors } : {}),
  }
}

export function normalizeValidationErrors(input: unknown): FieldError[] {
  if (input === undefined || input === null) return []
  if (Array.isArray(input))
    return input.flatMap((value, index) => normalizeValidationError(value, String(index)))
  if (typeof input === 'object') {
    const record = input as Record<string, unknown>
    if (isFieldErrorLike(record)) return normalizeValidationError(record, '')
    return Object.entries(record).flatMap(([field, value]) =>
      normalizeValidationError(value, field),
    )
  }
  return [{ field: '', message: String(input) }]
}

async function requestCsrfToken(options: CsrfBootstrapOptions): Promise<string | null> {
  const fetcher = options.fetchImpl ?? fetch
  const response = await fetcher(joinUrl(options.baseUrl, options.bootstrapPath), {
    method: 'GET',
    ...(options.credentials !== undefined ? { credentials: options.credentials } : {}),
  })
  if (!response.ok) return null
  const data = (await response.json().catch(() => null)) as unknown
  const token = readPath(data, options.tokenPath ?? ['token'])
  return typeof token === 'string' && token.length > 0 ? token : null
}

function normalizeValidationError(input: unknown, fallbackField: string): FieldError[] {
  if (input === undefined || input === null) return []
  if (Array.isArray(input))
    return input.flatMap((value) => normalizeValidationError(value, fallbackField))
  if (typeof input === 'object') {
    const record = input as Record<string, unknown>
    if (isFieldErrorLike(record)) {
      return [
        {
          field: stringOr(record.field, fallbackField),
          message: stringOr(
            record.message,
            record.detail ? String(record.detail) : 'Invalid value',
          ),
          ...('rejectedValue' in record ? { rejectedValue: record.rejectedValue } : {}),
        },
      ]
    }
    return Object.entries(record).flatMap(([field, value]) =>
      normalizeValidationError(value, field),
    )
  }
  return [{ field: fallbackField, message: String(input) }]
}

function isFieldErrorLike(record: Record<string, unknown>): boolean {
  return 'message' in record || 'field' in record || 'rejectedValue' in record
}

function resolveRequestInput(
  input: RequestInfo | URL,
  options: ApiBaseUrlOptions,
): RequestInfo | URL {
  if (typeof input !== 'string') return input
  if (/^[a-z][a-z\d+\-.]*:/i.test(input)) return input
  return joinUrl(resolveApiBaseUrl(options), input)
}

async function resolveBearerToken(token: ApiRuntimeOptions['bearerToken']): Promise<string | null> {
  if (typeof token === 'function') return (await token()) ?? null
  return token ?? null
}

function methodFromInput(input: RequestInfo | URL): string {
  return typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET'
}

function readPath(input: unknown, path: string | string[]): unknown {
  const parts = Array.isArray(path) ? path : path.split('.')
  let current = input
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function joinUrl(baseUrl: string | undefined, path: string | undefined): string {
  if (!baseUrl) return path ?? ''
  if (!path) return baseUrl
  if (/^[a-z][a-z\d+\-.]*:/i.test(path)) return path
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

function trimTrailingSlash(value: string): string {
  return value.length > 1 ? value.replace(/\/$/, '') : value
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback
}
