import { beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetAuthStateForTests, cookieCsrfTokenSource, useAuth } from '../composables/useAuth'

const fetchMock = vi.fn()

describe('useAuth', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    _resetAuthStateForTests()
    document.cookie = 'APP-XSRF=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'SITE-CSRF=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  })

  it('starts unauthenticated when no user is set', () => {
    const { isAuthenticated } = useAuth()
    expect(isAuthenticated.value).toBe(false)
  })

  it('setUser sets user and isAuthenticated becomes true', () => {
    const { setUser, isAuthenticated, user } = useAuth()

    setUser({ id: 'user-123', username: 'alice', email: 'alice@example.test', role: 'member' })

    expect(isAuthenticated.value).toBe(true)
    expect(user.value?.username).toBe('alice')
    expect(user.value?.role).toBe('member')
  })

  it('logout clears user and calls injected logout handling', async () => {
    const onLogout = vi.fn()
    const { setUser, logout, isAuthenticated } = useAuth({ onLogout })
    const user = { id: 'user-123', username: 'alice', role: 'member' }

    setUser(user)
    await logout()

    expect(isAuthenticated.value).toBe(false)
    expect(useAuth().user.value).toBeNull()
    expect(onLogout).toHaveBeenCalledWith(user)
  })

  it('fetchUser supports configured current-user endpoints and role mappings', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'u-1', username: 'bob', role: 'ADMIN' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ uuid: 'u-2', handle: 'sam', permissions: ['reader'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))

    const first = useAuth({
      baseUrl: 'https://accounts.example.test',
      currentUserUrl: '/session/me',
      credentials: 'include',
      mapRole: (role) => String(role).toLowerCase(),
    })

    const second = useAuth<{ uuid: string; handle: string; permissions: string[] }>({
      currentUserUrl: 'https://website.example.test/profile',
      mapUser: (raw) => ({
        id: raw.uuid,
        username: raw.handle,
        role: raw.permissions.includes('reader') ? 'viewer' : 'member',
      }),
    })

    await expect(first.fetchUser()).resolves.toMatchObject({ username: 'bob', role: 'admin' })
    await expect(second.fetchUser()).resolves.toMatchObject({ username: 'sam', role: 'viewer' })

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://accounts.example.test/session/me', {
      credentials: 'include',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://website.example.test/profile', {})
  })

  it('fetchUser returns null and clears user on failure', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))

    const { fetchUser, setUser, user } = useAuth({ currentUserUrl: '/me' })

    setUser({ id: 'user-1', username: 'alice', role: 'member' })
    const result = await fetchUser()

    expect(result).toBeNull()
    expect(user.value).toBeNull()
  })

  it('returns null without a configured current-user endpoint', async () => {
    const { fetchUser } = useAuth()

    await expect(fetchUser()).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reads CSRF tokens from injected cookie names', () => {
    document.cookie = 'APP-XSRF=abc123; path=/'
    document.cookie = 'SITE-CSRF=def456; path=/'

    const first = useAuth({ csrfTokenSource: cookieCsrfTokenSource('APP-XSRF') })
    const second = useAuth({ csrfTokenSource: cookieCsrfTokenSource('SITE-CSRF') })

    expect(first.getCsrfToken()).toBe('abc123')
    expect(second.getCsrfToken()).toBe('def456')
  })
})
