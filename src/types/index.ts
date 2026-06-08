export type UserRole = string

export interface User<Role extends UserRole = UserRole> {
  id: string
  username: string
  email?: string
  role?: Role
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType?: string
}

export interface FieldError {
  field: string
  message: string
  rejectedValue?: unknown
}

/**
 * RFC 7807-compatible problem payload. The standard fields stay generic;
 * application-specific extension members are optional so consumers can add
 * service metadata without changing the base contract.
 */
export interface ProblemDetail {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  errors?: FieldError[]
  traceId?: string
  exception?: string
  constraint?: string
  column?: string
  referencedTable?: string
  runnerStatus?: string
  retryAfterSeconds?: number
  kubernetesCode?: number
  kubernetesReason?: string
  [extension: string]: unknown
}

/**
 * Thrown by the API fetch helpers when the server returns a non-2xx
 * ProblemDetail response.
 */
export class ApiError extends Error {
  public readonly problem: ProblemDetail
  public readonly status: number

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${problem.status}`)
    this.name = 'ApiError'
    this.problem = problem
    this.status = problem.status
  }
}
