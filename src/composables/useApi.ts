import type { ProblemDetail } from '../types'
import { ApiError } from '../types'

export interface ApiOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
  credentials?: RequestCredentials
  headers?: HeadersInit | (() => HeadersInit)
  serializeBody?: (body: unknown) => BodyInit | undefined
}

export interface ApiClient {
  get: <T>(path: string, init?: RequestInit) => Promise<T>
  post: <T>(path: string, body: unknown, init?: RequestInit) => Promise<T>
  put: <T>(path: string, body: unknown, init?: RequestInit) => Promise<T>
  patch: <T>(path: string, body: unknown, init?: RequestInit) => Promise<T>
  del: (path: string, init?: RequestInit) => Promise<void>
  request: <T>(path: string, init?: RequestInit) => Promise<T>
}

export function useApi(options: ApiOptions = {}): ApiClient {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const fetcher = options.fetchImpl ?? fetch
    const headers = buildHeaders(options.headers, init.headers, init.body)
    const requestInit: RequestInit = {
      ...init,
      headers,
    }
    const credentials = init.credentials ?? options.credentials
    if (credentials !== undefined) requestInit.credentials = credentials
    const response = await fetcher(createRequestUrl(options.baseUrl, path), requestInit)
    if (!response.ok) {
      throw await problemFromResponse(response)
    }
    return parseOkResponse<T>(response)
  }

  return {
    get: <T>(path: string, init?: RequestInit) =>
      request<T>(path, { ...init, method: init?.method ?? 'GET' }),
    post: <T>(path: string, body: unknown, init?: RequestInit) =>
      request<T>(path, withSerializedBody('POST', body, options, init)),
    put: <T>(path: string, body: unknown, init?: RequestInit) =>
      request<T>(path, withSerializedBody('PUT', body, options, init)),
    patch: <T>(path: string, body: unknown, init?: RequestInit) =>
      request<T>(path, withSerializedBody('PATCH', body, options, init)),
    del: (path: string, init?: RequestInit) =>
      request<void>(path, { ...init, method: init?.method ?? 'DELETE' }),
    request,
  }
}

export function createRequestUrl(baseUrl: string | undefined, path: string): string {
  if (!baseUrl || isAbsoluteUrl(path)) return path
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

export function defaultSerializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined
  if (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob
  ) {
    return body
  }
  return JSON.stringify(body)
}

export function buildHeaders(
  optionHeaders: ApiOptions['headers'],
  initHeaders: HeadersInit | undefined,
  body: BodyInit | null | undefined,
): Headers {
  const headers = new Headers(typeof optionHeaders === 'function' ? optionHeaders() : optionHeaders)
  new Headers(initHeaders).forEach((value, key) => headers.set(key, value))
  if (body !== undefined && body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return headers
}

export function withSerializedBody(
  method: string,
  body: unknown,
  options: Pick<ApiOptions, 'serializeBody'>,
  init: RequestInit = {},
): RequestInit {
  const requestInit: RequestInit = {
    ...init,
    method: init.method ?? method,
  }
  const serializedBody = init.body ?? (options.serializeBody ?? defaultSerializeBody)(body)
  if (serializedBody !== undefined) requestInit.body = serializedBody
  return requestInit
}

function isAbsoluteUrl(path: string): boolean {
  return /^[a-z][a-z\d+\-.]*:/i.test(path)
}

/**
 * Parses a non-2xx response into an ApiError that wraps a ProblemDetail.
 * Falls back to a synthetic ProblemDetail when the response body is missing
 * or unparseable.
 */
export async function problemFromResponse(response: Response): Promise<ApiError> {
  let problem: ProblemDetail
  try {
    const parsed = (await response.json()) as ProblemDetail
    problem = parsed
  } catch {
    problem = {
      type: 'about:blank',
      title: response.statusText || 'Request failed',
      status: response.status,
    }
  }
  return new ApiError(problem)
}

/**
 * Deserializes a 2xx response body, returning undefined for 204, empty, or
 * non-JSON bodies.
 */
export async function parseOkResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T
  }
  const text = await response.text()
  if (text.length === 0) {
    return undefined as T
  }
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.toLowerCase().includes('json')) {
    return undefined as T
  }
  return JSON.parse(text) as T
}
