import type { ProblemDetail } from '../types'
import type { ApiClient, ApiOptions } from './useApi'
import { ApiError } from '../types'
import {
  buildHeaders,
  createRequestUrl,
  parseOkResponse,
  problemFromResponse,
  withSerializedBody,
} from './useApi'

export interface ApiWithAuthOptions extends ApiOptions {
  csrfTokenSource?: () => MaybePromise<string | null | undefined>
  csrfHeaderName?: string
  onUnauthorized?: (response: Response) => MaybePromise<void>
  logout?: () => MaybePromise<void>
  unauthorizedProblem?: (response: Response) => ProblemDetail
}

type MaybePromise<T> = T | Promise<T>

export function useApiWithAuth(options: ApiWithAuthOptions = {}): ApiClient {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const method = init.method ?? 'GET'
    const body = init.body ?? null
    const headers = buildHeaders(options.headers, init.headers, body)

    if (method !== 'GET' && method !== 'HEAD' && options.csrfTokenSource && options.csrfHeaderName) {
      const csrf = await options.csrfTokenSource()
      if (csrf) headers.set(options.csrfHeaderName, csrf)
    }

    const fetcher = options.fetchImpl ?? fetch
    const requestInit: RequestInit = {
      ...init,
      method,
      headers,
    }
    const credentials = init.credentials ?? options.credentials
    if (credentials !== undefined) requestInit.credentials = credentials
    const response = await fetcher(createRequestUrl(options.baseUrl, path), requestInit)

    if (response.status === 401) {
      await options.logout?.()
      await options.onUnauthorized?.(response)
      throw new ApiError(
        options.unauthorizedProblem?.(response) ?? {
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          detail: 'Unauthorized',
        },
      )
    }

    if (!response.ok) {
      throw await problemFromResponse(response)
    }

    return parseOkResponse<T>(response)
  }

  return {
    get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: init?.method ?? 'GET' }),
    post: <T>(path: string, body: unknown, init?: RequestInit) =>
      request<T>(path, withSerializedBody('POST', body, options, init)),
    put: <T>(path: string, body: unknown, init?: RequestInit) =>
      request<T>(path, withSerializedBody('PUT', body, options, init)),
    patch: <T>(path: string, body: unknown, init?: RequestInit) =>
      request<T>(path, withSerializedBody('PATCH', body, options, init)),
    del: (path: string, init?: RequestInit) => request<void>(path, { ...init, method: init?.method ?? 'DELETE' }),
    request,
  }
}
