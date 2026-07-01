import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createApiFetch,
  createCsrfBootstrapper,
  createHeyApiRuntimeConfig,
  isUnsafeHttpMethod,
  normalizeProblemDetail,
  normalizeValidationErrors,
  resolveApiBaseUrl,
} from '../api-runtime'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generated API runtime', () => {
  it('resolves base URLs from explicit config, env, origin, and fallback', () => {
    expect(resolveApiBaseUrl({ baseUrl: 'https://api.example.test/' })).toBe(
      'https://api.example.test',
    )
    expect(
      resolveApiBaseUrl({
        env: {
          VITE_APP_URL: 'https://app-env.example.test/api',
        },
      }),
    ).toBe('https://app-env.example.test/api')
    expect(
      resolveApiBaseUrl({
        env: {
          CUSTOM_API: 'https://custom-env.example.test',
        },
        envKeys: ['CUSTOM_API'],
      }),
    ).toBe('https://custom-env.example.test')
    expect(
      resolveApiBaseUrl({
        origin: 'https://spa.example.test',
        defaultPath: '/backend',
      }),
    ).toBe('https://spa.example.test/backend')
    vi.stubGlobal('window', undefined)
    expect(resolveApiBaseUrl({ fallbackBaseUrl: 'http://localhost:8080/api/' })).toBe(
      'http://localhost:8080/api',
    )
  })

  it('classifies unsafe methods', () => {
    expect(isUnsafeHttpMethod('GET')).toBe(false)
    expect(isUnsafeHttpMethod('HEAD')).toBe(false)
    expect(isUnsafeHttpMethod('POST')).toBe(true)
    expect(isUnsafeHttpMethod('delete')).toBe(true)
  })

  it('adds base URL, credentials, bearer auth, and CSRF for unsafe requests', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrf: { token: 'csrf-1' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    const apiFetch = createApiFetch({
      baseUrl: '/api',
      credentials: 'include',
      bearerToken: () => 'access-1',
      csrf: {
        bootstrapPath: '/csrf',
        tokenPath: 'csrf.token',
        headerName: 'X-CSRF',
      },
    })

    await apiFetch('/orders', { method: 'POST', body: '{}' })

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/csrf', {
      method: 'GET',
      credentials: 'include',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/orders',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: '{}',
      }),
    )
    const headers = fetchMock.mock.calls[1]![1]!.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer access-1')
    expect(headers.get('X-CSRF')).toBe('csrf-1')
  })

  it('shares one CSRF bootstrap for concurrent unsafe requests and writes the token', async () => {
    let stored: string | null = null
    let resolveBootstrap: (response: Response) => void = () => {}
    fetchMock.mockImplementation((input, _init) => {
      if (String(input).endsWith('/csrf')) {
        return new Promise<Response>((resolve) => {
          resolveBootstrap = resolve
        })
      }
      return Promise.resolve(new Response('', { status: 202 }))
    })

    const bootstrap = createCsrfBootstrapper({
      baseUrl: '/api',
      bootstrapPath: '/csrf',
      readToken: () => stored,
      writeToken: (token) => {
        stored = token
      },
    })

    const first = bootstrap()
    const second = bootstrap()
    await Promise.resolve()
    resolveBootstrap(
      new Response(JSON.stringify({ token: 'csrf-shared' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(first).resolves.toBe('csrf-shared')
    await expect(second).resolves.toBe('csrf-shared')
    expect(stored).toBe('csrf-shared')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to the last known CSRF token when bootstrap fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    const bootstrap = createCsrfBootstrapper({
      baseUrl: '/api',
      bootstrapPath: '/csrf',
      readToken: () => 'csrf-old',
    })

    await expect(bootstrap()).resolves.toBe('csrf-old')
  })

  it('normalizes validation errors from arrays, maps, objects, and primitives', () => {
    expect(normalizeValidationErrors([{ field: 'email', message: 'invalid' }])).toEqual([
      { field: 'email', message: 'invalid' },
    ])
    expect(
      normalizeValidationErrors({ email: ['required', 'invalid'], age: { message: 'too low' } }),
    ).toEqual([
      { field: 'email', message: 'required' },
      { field: 'email', message: 'invalid' },
      { field: 'age', message: 'too low' },
    ])
    expect(normalizeValidationErrors('bad request')).toEqual([
      { field: '', message: 'bad request' },
    ])
  })

  it('normalizes ProblemDetail payloads with validation errors', () => {
    const problem = normalizeProblemDetail({
      title: 'Validation failed',
      status: 422,
      errors: {
        username: { message: 'must be unique', rejectedValue: 'sam' },
      },
      traceId: 'trace-1',
    })

    expect(problem).toMatchObject({
      type: 'about:blank',
      title: 'Validation failed',
      status: 422,
      traceId: 'trace-1',
      errors: [{ field: 'username', message: 'must be unique', rejectedValue: 'sam' }],
    })
  })

  it('returns hey-api compatible structural config without importing the generator', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    const config = createHeyApiRuntimeConfig(
      { throwOnError: false, custom: 'kept' },
      {
        baseUrl: 'https://api.example.test',
        credentials: 'same-origin',
        bearerToken: 'access-2',
        throwOnError: true,
      },
    )

    expect(config).toMatchObject({
      baseUrl: 'https://api.example.test',
      credentials: 'same-origin',
      throwOnError: true,
      custom: 'kept',
    })
    await config.fetch?.('/status')
    const headers = fetchMock.mock.calls[0]![1]!.headers as Headers
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.example.test/status')
    expect(headers.get('Authorization')).toBe('Bearer access-2')
  })
})
