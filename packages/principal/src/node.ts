import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Principal } from './principal.gen.js'
import type { PrincipalReader } from './reader.js'
import { PrincipalRefused } from './reader.js'

/** A request the middleware read a Principal for. */
export type PrincipalRequest = IncomingMessage & { principal?: Principal }

/** Connect- and Express-style middleware. */
export type Middleware = (
  req: PrincipalRequest,
  res: ServerResponse,
  next: (err?: unknown) => void,
) => void

/** The Gate's step-up on every gated host (contract/principal mapping.json stepUp). */
export const STEP_UP_PATH = '/.auth/step-up'

function answer(res: ServerResponse, status: number, location?: string): void {
  res.statusCode = status
  if (location) res.setHeader('Location', location)
  res.end()
}

/**
 * Reads each request's Principal onto req.principal. A request whose Principal is refused is
 * answered 401, and one identity could not be asked about 503.
 */
export function principalMiddleware(reader: PrincipalReader): Middleware {
  return (req, res, next) => {
    reader
      .read((name) => req.headers[name.toLowerCase()] as string | undefined)
      .then(
        (principal) => {
          req.principal = principal
          next()
        },
        (e: unknown) => answer(res, e instanceof PrincipalRefused ? 401 : 503),
      )
  }
}

function guard(allow: (p: Principal) => boolean): Middleware {
  return (req, res, next) => {
    if (!req.principal) return answer(res, 401)
    if (!allow(req.principal)) return answer(res, 403)
    next()
  }
}

/** Lets through a caller holding role; takes the App Roles deploy-kit generates as plain strings. */
export function requireRole(role: string): Middleware {
  return guard((p) => p.roles.includes(role))
}

/** Turns away a tool acting for a User, so a tool can read but never, say, delete. */
export function refuseTools(): Middleware {
  return guard((p) => p.via !== 'tool')
}

/** Lets through only a person, never a Machine Identity. */
export function requireUser(): Middleware {
  return guard((p) => p.kind === 'user')
}

/** Lets through only a Machine Identity, never a person. */
export function requireMachine(): Middleware {
  return guard((p) => p.kind === 'machine')
}

/**
 * Lets through a session that proved two-factor within minutes. An older or missing proof sends the
 * browser to the Gate's step-up on the app's own host and back; a Personal Token, a tool or a
 * machine, which no browser carries through a step-up, is answered 403.
 */
export function requireRecentTwoFactor(
  minutes: number,
  now: () => Date = () => new Date(),
): Middleware {
  return (req, res, next) => {
    const p = req.principal
    if (!p) return answer(res, 401)
    const proved = p.twoFactorAt ? Date.parse(p.twoFactorAt) : undefined
    if (proved !== undefined && now().getTime() - proved <= minutes * 60_000) return next()
    if (p.via !== 'session') return answer(res, 403)
    const query = new URLSearchParams({ minutes: String(minutes), rd: req.url ?? '/' })
    answer(res, 303, `${STEP_UP_PATH}?${query.toString()}`)
  }
}
