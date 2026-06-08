import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useApiWithAuth } from '../composables/useApiWithAuth'
import { cookieCsrfTokenSource } from '../composables/useAuth'
import { ApiError } from '../types'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  document.cookie = 'APP-XSRF=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  document.cookie = 'SITE-CSRF=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useApiWithAuth', () => {
  it('parses a 200 JSON body with an injected base URL', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'r-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = useApiWithAuth({ baseUrl: '/service-a' })

    const result = await api.get<{ id: string }>('/repositories/r-1')

    expect(result).toEqual({ id: 'r-1' })
    expect(fetchMock).toHaveBeenCalledWith('/service-a/repositories/r-1', expect.any(Object))
  })

  it('returns undefined on a 202 Accepted with an empty body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 202 }))
    const api = useApiWithAuth()

    const result = await api.post('/repositories/abc/key', {
      privateKeyOpenssh: 'x',
      publicKeyOpenssh: 'y',
    })

    expect(result).toBeUndefined()
  })

  it('returns undefined on a 204 No Content (DELETE)', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    const api = useApiWithAuth()

    const result = await api.del('/workspaces/123')

    expect(result).toBeUndefined()
  })

  it('throws an ApiError carrying the parsed ProblemDetail on a 4xx', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          type: 'https://example.test/errors/upstream',
          title: 'Upstream Error',
          status: 502,
          detail: 'cannot patch resource',
          upstreamCode: 403,
          upstreamReason: 'Forbidden',
        }),
        { status: 502, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    )
    const api = useApiWithAuth()

    const promise = api.post('/workspaces', { name: 'w' })

    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await expect(promise).rejects.toMatchObject({
      status: 502,
      problem: { upstreamCode: 403, upstreamReason: 'Forbidden' },
    })
  })

  it('uses injected CSRF cookie/header combinations for non-GET requests', async () => {
    document.cookie = 'APP-XSRF=tok-abc; path=/'
    document.cookie = 'SITE-CSRF=tok-def; path=/'
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 202 }))
      .mockResolvedValueOnce(new Response('', { status: 202 }))

    const first = useApiWithAuth({
      csrfTokenSource: cookieCsrfTokenSource('APP-XSRF'),
      csrfHeaderName: 'X-App-CSRF',
    })
    const second = useApiWithAuth({
      csrfTokenSource: cookieCsrfTokenSource('SITE-CSRF'),
      csrfHeaderName: 'X-Site-CSRF',
    })

    await first.post('/first', {})
    await second.post('/second', {})

    const firstHeaders = fetchMock.mock.calls[0]![1].headers as Headers
    const secondHeaders = fetchMock.mock.calls[1]![1].headers as Headers
    expect(firstHeaders.get('X-App-CSRF')).toBe('tok-abc')
    expect(secondHeaders.get('X-Site-CSRF')).toBe('tok-def')
  })

  it('runs injected unauthorized behavior on 401', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401, statusText: 'Unauthorized' }))
    const logout = vi.fn()
    const onUnauthorized = vi.fn()
    const api = useApiWithAuth({ logout, onUnauthorized })

    await expect(api.get('/private')).rejects.toBeInstanceOf(ApiError)

    expect(logout).toHaveBeenCalledOnce()
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
})
