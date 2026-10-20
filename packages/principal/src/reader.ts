import type { CryptoKey, JWK } from 'jose'
import type { Kind, Principal, Via } from './principal.gen.js'
import { compactVerify, decodeProtectedHeader, importJWK } from 'jose'

/** The Gate's signed Principal. */
export const PRINCIPAL_HEADER = 'X-Identity-Principal'

/** The signed Principal's JWT typ, which no access token carries. */
export const PRINCIPAL_TYPE = 'identity-principal+jwt'

/** zitadel/oidc signs access and ID tokens alike as JWT; an access token alone names a client_id. */
const ACCESS_TOKEN_TYPE = 'JWT'
const MAJOR = '1'
const REFETCH_AFTER_MS = 60_000
const ANSWER_LIFETIME_MS = 30_000
const MAX_ANSWERS = 10_000

/** One of the contract's refusals. */
export type Refusal =
  | 'missing'
  | 'wrong-typ'
  | 'not-an-access-token'
  | 'wrong-issuer'
  | 'wrong-audience'
  | 'expired'
  | 'unknown-key'
  | 'bad-signature'
  | 'unknown-major'
  | 'inactive'

/** Why a request carries no Principal. */
export class PrincipalRefused extends Error {
  constructor(readonly reason: Refusal) {
    super(`the request's Principal is refused: ${reason}`)
  }
}

/** identity could not be asked: its keys or its introspection did not answer. */
export class IdentityUnavailable extends Error {}

/** Where the Principals an app reads come from, and which Client the app is. */
export interface ReaderConfig {
  /** identity's URL, as each Principal's iss states it. */
  issuer: string
  /** The app's own Client, which each Principal must be for. */
  clientId: string
  /** The app's Client secret, which it introspects opaque tokens with; without one they are refused. */
  clientSecret?: string
  /** Where identity publishes its keys; issuer + /oidc/keys by default. */
  keysUrl?: string
  /** Where identity answers about opaque tokens; issuer + /oidc/introspect by default. */
  introspectUrl?: string
  fetch?: typeof fetch
  now?: () => Date
}

type Claims = Record<string, unknown>

function refuse(reason: Refusal): never {
  throw new PrincipalRefused(reason)
}

function major(claims: Claims): string | undefined {
  return typeof claims.ver === 'string' ? claims.ver.split('.')[0] : undefined
}

function audience(aud: unknown): string[] | undefined {
  if (typeof aud === 'string') return [aud]
  return Array.isArray(aud) ? aud.map(String) : undefined
}

function isOnly(list: string[] | undefined, value: string): boolean {
  return list?.length === 1 && list[0] === value
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
}

function principalOf(claims: Claims): Principal {
  const kind = claims.kind as Kind
  const via = claims.via as Via
  if (
    !['user', 'machine'].includes(kind) ||
    !['session', 'personal-token', 'tool', 'machine'].includes(via)
  ) {
    refuse('unknown-major')
  }
  const p: Principal = {
    subject: typeof claims.sub === 'string' ? claims.sub : '',
    kind,
    roles: Array.isArray(claims.roles) ? claims.roles.map(String) : [],
    via,
    twoFactor: claims.two_factor === true,
    ver: String(claims.ver),
  }
  if (typeof claims.email === 'string') p.email = claims.email
  if (typeof claims.name === 'string') p.name = claims.name
  const act = claims.act as { sub?: unknown; name?: unknown } | undefined
  if (act && typeof act === 'object') p.actor = { id: String(act.sub), name: String(act.name) }
  if (typeof claims.two_factor_at === 'number')
    p.twoFactorAt = new Date(claims.two_factor_at * 1000).toISOString().replace('.000Z', 'Z')
  if (typeof claims.sid === 'string') p.sid = claims.sid
  return p
}

/**
 * Reads who is calling from identity's Principal contract: the Gate's signed header when a request
 * has one, or else its bearer token, a JWT access token verified here or an opaque token
 * introspected. The plain X-Auth-Request-* headers are never read.
 */
export class PrincipalReader {
  private readonly fetch: typeof fetch
  private readonly now: () => Date
  private readonly keysUrl: string
  private readonly introspectUrl: string
  private keys: JWK[] = []
  private fetchedAt: number | undefined
  private readonly answers = new Map<
    string,
    { result: Principal | PrincipalRefused; until: number }
  >()

  constructor(private readonly config: ReaderConfig) {
    const base = config.issuer.replace(/\/$/, '')
    this.keysUrl = config.keysUrl ?? `${base}/oidc/keys`
    this.introspectUrl = config.introspectUrl ?? `${base}/oidc/introspect`
    this.fetch = config.fetch ?? fetch
    this.now = config.now ?? (() => new Date())
  }

  /** The Principal a request carries, given its headers by name; rejects with PrincipalRefused when none. */
  async read(header: (name: string) => string | undefined): Promise<Principal> {
    const signed = header(PRINCIPAL_HEADER)
    if (signed) return this.checked(await this.verified(signed, PRINCIPAL_TYPE))
    const [scheme, token] = (header('Authorization') ?? '').split(' ', 2)
    if (scheme?.toLowerCase() !== 'bearer' || !token) refuse('missing')
    if (token.split('.').length !== 3) return this.introspected(token)
    const claims = await this.verified(token, ACCESS_TOKEN_TYPE)
    if (typeof claims.client_id !== 'string' || claims.client_id === '')
      refuse('not-an-access-token')
    return this.checked(claims)
  }

  private async verified(token: string, typ: string): Promise<Claims> {
    let header
    try {
      header = decodeProtectedHeader(token)
    } catch {
      refuse('bad-signature')
    }
    if (header.alg !== 'RS256') refuse('bad-signature')
    if (header.typ !== typ) refuse('wrong-typ')
    const key = await this.key(header.kid)
    if (!key) refuse('unknown-key')
    try {
      const { payload } = await compactVerify(token, key)
      return JSON.parse(new TextDecoder().decode(payload)) as Claims
    } catch {
      refuse('bad-signature')
    }
  }

  private checked(claims: Claims): Principal {
    if (major(claims) !== MAJOR) refuse('unknown-major')
    if (claims.iss !== this.config.issuer) refuse('wrong-issuer')
    if (!isOnly(audience(claims.aud), this.config.clientId)) refuse('wrong-audience')
    if (this.now().getTime() >= Number(claims.exp) * 1000) refuse('expired')
    return principalOf(claims)
  }

  /** The key with id kid; an id it does not know fetches the keys again, at most once a minute. */
  private async key(kid: string | undefined): Promise<CryptoKey | Uint8Array | undefined> {
    const now = this.now().getTime()
    const known = (): JWK | undefined => this.keys.find((k) => k.kid !== undefined && k.kid === kid)
    if (!known() && (this.fetchedAt === undefined || now - this.fetchedAt >= REFETCH_AFTER_MS)) {
      this.keys = ((await this.ask(this.keysUrl, {}, 'keys')) as { keys?: JWK[] }).keys ?? []
      this.fetchedAt = now
    }
    const jwk = known()
    return jwk ? importJWK(jwk, 'RS256') : undefined
  }

  /** The Principal identity answers for an opaque token, asked at most once per 30 seconds. */
  private async introspected(token: string): Promise<Principal> {
    const secret = this.config.clientSecret
    if (!secret) refuse('inactive')
    const now = this.now().getTime()
    const key = await sha256(token)
    const kept = this.answers.get(key)
    let result = kept && now < kept.until ? kept.result : undefined
    if (!result) {
      const credentials = `${encodeURIComponent(this.config.clientId)}:${encodeURIComponent(secret)}`
      const claims = await this.ask(
        this.introspectUrl,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(credentials)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ token }).toString(),
        },
        'introspection',
      )
      try {
        result = this.answered(claims)
      } catch (e) {
        result = e as PrincipalRefused
      }
      if (this.answers.size >= MAX_ANSWERS) this.answers.clear()
      this.answers.set(key, { result, until: now + ANSWER_LIFETIME_MS })
    }
    if (result instanceof PrincipalRefused) throw result
    return result
  }

  private answered(claims: Claims): Principal {
    if (claims.active !== true) refuse('inactive')
    if (major(claims) !== MAJOR) refuse('unknown-major')
    if (
      claims.client_id !== this.config.clientId ||
      !isOnly(audience(claims.aud), this.config.clientId)
    ) {
      refuse('wrong-audience')
    }
    return principalOf(claims)
  }

  private async ask(url: string, init: RequestInit, what: string): Promise<Claims> {
    let response: Response
    try {
      response = await this.fetch(url, init)
    } catch (e) {
      throw new IdentityUnavailable(`identity's ${what} did not answer`, { cause: e })
    }
    if (response.status !== 200)
      throw new IdentityUnavailable(`identity's ${what} answered ${response.status}`)
    try {
      return (await response.json()) as Claims
    } catch (e) {
      throw new IdentityUnavailable(`identity's ${what} answer is no JSON`, { cause: e })
    }
  }
}
