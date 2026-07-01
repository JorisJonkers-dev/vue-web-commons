import type { Ref } from 'vue'
import type { User, UserRole } from '../types'
import { computed, ref } from 'vue'
import { createRequestUrl } from './useApi'

const defaultUser = ref<User | null>(null)

type MaybePromise<T> = T | Promise<T>

export interface UseAuthOptions<RawUser = unknown, TUser extends User = User> {
  baseUrl?: string
  currentUserUrl?: string
  credentials?: RequestCredentials
  fetchImpl?: typeof fetch
  userState?: Ref<TUser | null>
  mapUser?: (raw: RawUser) => TUser
  mapRole?: (rawRole: unknown, raw: RawUser) => TUser['role'] | null | undefined
  fallbackRole?: TUser['role']
  onLogout?: (user: TUser | null) => MaybePromise<void>
  csrfTokenSource?: () => string | null | undefined
}

export interface AuthApi<TUser extends User = User> {
  user: Ref<TUser | null>
  isAuthenticated: Readonly<Ref<boolean>>
  setUser: (user: TUser | null) => void
  fetchUser: (currentUserUrl?: string) => Promise<TUser | null>
  logout: () => Promise<void>
  getCsrfToken: () => string | null
}

export function useAuth<RawUser = unknown, TUser extends User = User>(
  options: UseAuthOptions<RawUser, TUser> = {},
): AuthApi<TUser> {
  const state = options.userState ?? (defaultUser as Ref<TUser | null>)
  const isAuthenticated = computed(() => state.value !== null)

  function setUser(user: TUser | null): void {
    state.value = user
  }

  async function fetchUser(currentUserUrl?: string): Promise<TUser | null> {
    const endpoint = currentUserUrl ?? options.currentUserUrl
    if (!endpoint) {
      state.value = null
      return null
    }

    try {
      const fetcher = options.fetchImpl ?? fetch
      const requestInit: RequestInit = {}
      if (options.credentials !== undefined) requestInit.credentials = options.credentials
      const response = await fetcher(createRequestUrl(options.baseUrl, endpoint), requestInit)
      if (!response.ok) {
        state.value = null
        return null
      }
      const raw = (await response.json()) as RawUser
      const mapped = options.mapUser ? options.mapUser(raw) : defaultMapUser(raw, options)
      state.value = mapped
      return mapped
    } catch {
      state.value = null
      return null
    }
  }

  async function logout(): Promise<void> {
    const previous = state.value
    state.value = null
    await options.onLogout?.(previous)
  }

  function getCsrfToken(): string | null {
    return options.csrfTokenSource?.() ?? null
  }

  return {
    user: state,
    isAuthenticated,
    setUser,
    fetchUser,
    logout,
    getCsrfToken,
  }
}

export function cookieCsrfTokenSource(
  cookieName: string,
  cookieDocument: Pick<Document, 'cookie'> = document,
): () => string | null {
  return () => getCookie(cookieName, cookieDocument)
}

export function _resetAuthStateForTests(): void {
  defaultUser.value = null
}

function getCookie(cookieName: string, cookieDocument: Pick<Document, 'cookie'>): string | null {
  const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = cookieDocument.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function defaultMapUser<RawUser, TUser extends User>(
  raw: RawUser,
  options: UseAuthOptions<RawUser, TUser>,
): TUser {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Cannot map non-object auth user')
  }

  const source = raw as Record<string, unknown>
  const rawRole = source.role
  const mappedRole = options.mapRole?.(rawRole, raw)
  const role = mappedRole ?? stringRole(rawRole) ?? options.fallbackRole
  const user: User<UserRole> = {
    id: String(source.id ?? ''),
    username: String(source.username ?? source.name ?? ''),
    ...(typeof source.email === 'string' ? { email: source.email } : {}),
    ...(role !== undefined && role !== null ? { role } : {}),
  }
  return user as TUser
}

function stringRole(role: unknown): string | undefined {
  return typeof role === 'string' ? role : undefined
}
