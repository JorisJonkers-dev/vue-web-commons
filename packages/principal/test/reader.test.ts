import type { JWK } from 'jose'
import { CompactSign, exportJWK, generateKeyPair } from 'jose'
import { beforeAll, describe, expect, it } from 'vitest'
import { IdentityUnavailable, PrincipalReader, PrincipalRefused } from '../src/index'

const signedAt = Date.parse('2026-10-20T12:00:00Z')
let privateKey: CryptoKey
let jwks: { keys: JWK[] }

beforeAll(async () => {
  const pair = await generateKeyPair('RS256', { extractable: true })
  privateKey = pair.privateKey
  jwks = { keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'k', alg: 'RS256' }] }
})

function claims(edit: (c: Record<string, unknown>) => void = () => {}): Record<string, unknown> {
  const c: Record<string, unknown> = {
    iss: 'https://auth.example.test',
    sub: 'ada',
    aud: 'web',
    client_id: 'web',
    exp: signedAt / 1000 + 60,
    ver: '1.1',
    kind: 'user',
    via: 'personal-token',
    roles: ['user'],
    two_factor: false,
  }
  edit(c)
  return c
}

async function sign(
  payload: Record<string, unknown> | string,
  typ = 'JWT',
  kid = 'k',
): Promise<string> {
  const bytes = new TextEncoder().encode(
    typeof payload === 'string' ? payload : JSON.stringify(payload),
  )
  return new CompactSign(bytes).setProtectedHeader({ alg: 'RS256', typ, kid }).sign(privateKey)
}

/** identity as a fetch, counting each question and answering what a test sets. */
function identity() {
  const state = {
    keysStatus: 200,
    keysBody: '' as string | undefined,
    introspection: { status: 200, body: '{"active":false}' },
    keysFetched: 0,
    asked: 0,
    fails: false,
  }
  const fetch: typeof globalThis.fetch = async (input) => {
    if (state.fails) throw new TypeError('fetch failed')
    if (String(input).endsWith('/oidc/keys')) {
      state.keysFetched++
      return new Response(state.keysBody ?? JSON.stringify(jwks), { status: state.keysStatus })
    }
    state.asked++
    return new Response(state.introspection.body, { status: state.introspection.status })
  }
  state.keysBody = undefined
  return { state, fetch }
}

function reader(
  fetch: typeof globalThis.fetch,
  clock = { now: signedAt + 30_000 },
  secret: string | undefined = 's3cret',
) {
  return new PrincipalReader({
    issuer: 'https://auth.example.test',
    clientId: 'web',
    fetch,
    now: () => new Date(clock.now),
    ...(secret ? { clientSecret: secret } : {}),
  })
}

function bearer(token: string) {
  return (name: string) => (name === 'Authorization' ? `Bearer ${token}` : undefined)
}

async function reason(read: Promise<unknown>): Promise<string> {
  try {
    await read
  } catch (e) {
    return e instanceof PrincipalRefused ? e.reason : 'not refused'
  }
  return 'read'
}

describe("the Issuer's keys", () => {
  it('are fetched once for every token they sign', async () => {
    const { state, fetch } = identity()
    const r = reader(fetch)
    const token = await sign(claims())
    for (let i = 0; i < 3; i++) await r.read(bearer(token))

    expect(state.keysFetched).toBe(1)
  })

  it('are fetched again for an unknown key at most once a minute', async () => {
    const { state, fetch } = identity()
    const clock = { now: signedAt + 30_000 }
    const r = reader(fetch, clock)
    await r.read(bearer(await sign(claims())))
    const stranger = await sign(claims(), 'JWT', 'stranger')
    expect(await reason(r.read(bearer(stranger)))).toBe('unknown-key')
    expect(state.keysFetched).toBe(1)

    clock.now += 60_000
    await reason(r.read(bearer(stranger)))

    expect(state.keysFetched).toBe(2)
  })

  it('that answer an error are no refusal', async () => {
    const { state, fetch } = identity()
    state.keysStatus = 502

    await expect(reader(fetch).read(bearer(await sign(claims())))).rejects.toBeInstanceOf(
      IdentityUnavailable,
    )
  })

  it('that are no JSON are no refusal', async () => {
    const { state, fetch } = identity()
    state.keysBody = '<html>'

    await expect(reader(fetch).read(bearer(await sign(claims())))).rejects.toBeInstanceOf(
      IdentityUnavailable,
    )
  })

  it('that cannot be reached are no refusal', async () => {
    const { state, fetch } = identity()
    state.fails = true

    await expect(reader(fetch).read(bearer(await sign(claims())))).rejects.toBeInstanceOf(
      IdentityUnavailable,
    )
  })

  it('may be published without a JWKS keys list', async () => {
    const { state, fetch } = identity()
    state.keysBody = '{}'

    expect(await reason(reader(fetch).read(bearer(await sign(claims()))))).toBe('unknown-key')
  })
})

describe('an access token', () => {
  it('that is no JWS is refused', async () => {
    expect(await reason(reader(identity().fetch).read(bearer('a.b.c')))).toBe('bad-signature')
  })

  it('not signed with RS256 is refused', async () => {
    const hmac = await new CompactSign(new TextEncoder().encode('{}'))
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(new Uint8Array(32))

    expect(await reason(reader(identity().fetch).read(bearer(hmac)))).toBe('bad-signature')
  })

  it('whose signed payload is no JSON is refused', async () => {
    expect(await reason(reader(identity().fetch).read(bearer(await sign('not json'))))).toBe(
      'bad-signature',
    )
  })

  it("whose audience lists only the app's Client is read", async () => {
    const p = await reader(identity().fetch).read(
      bearer(await sign(claims((c) => (c.aud = ['web'])))),
    )

    expect(p.subject).toBe('ada')
  })

  it('whose audience is neither a string nor a list is refused', async () => {
    expect(
      await reason(reader(identity().fetch).read(bearer(await sign(claims((c) => (c.aud = 7)))))),
    ).toBe('wrong-audience')
  })

  it('stating a kind v1 does not know is refused', async () => {
    expect(
      await reason(
        reader(identity().fetch).read(bearer(await sign(claims((c) => (c.kind = 'robot'))))),
      ),
    ).toBe('unknown-major')
  })

  it('stating no roles or subject holds empty ones', async () => {
    const p = await reader(identity().fetch).read(
      bearer(
        await sign(
          claims((c) => {
            delete c.roles
            delete c.sub
          }),
        ),
      ),
    )

    expect([p.roles, p.subject]).toEqual([[], ''])
  })

  it('stating no ver is refused', async () => {
    expect(
      await reason(reader(identity().fetch).read(bearer(await sign(claims((c) => delete c.ver))))),
    ).toBe('unknown-major')
  })
})

describe('an opaque token', () => {
  it('that is revoked stops working within thirty seconds', async () => {
    const { state, fetch } = identity()
    const clock = { now: signedAt }
    const r = reader(fetch, clock)
    state.introspection.body = JSON.stringify(claims((c) => (c.active = true)))
    await r.read(bearer('idapp_tool'))

    state.introspection.body = '{"active":false}'
    clock.now += 29_000
    await r.read(bearer('idapp_tool'))
    clock.now += 1_000

    expect(await reason(r.read(bearer('idapp_tool')))).toBe('inactive')
  })

  it('is asked about once per thirty seconds', async () => {
    const { state, fetch } = identity()
    state.introspection.body = JSON.stringify(claims((c) => (c.active = true)))
    const r = reader(fetch)

    for (let i = 0; i < 5; i++) await r.read(bearer('idapp_tool'))

    expect(state.asked).toBe(1)
  })

  it('is refused without asking by an app without a Client secret', async () => {
    const { state, fetch } = identity()

    expect(await reason(reader(fetch, undefined, '').read(bearer('idpat_script')))).toBe('inactive')
    expect(state.asked).toBe(0)
  })

  it('that cannot be asked about is no refusal and is asked about again', async () => {
    const { state, fetch } = identity()
    const r = reader(fetch)
    state.introspection.status = 502
    await expect(r.read(bearer('idapp_tool'))).rejects.toBeInstanceOf(IdentityUnavailable)

    state.introspection = { status: 200, body: JSON.stringify(claims((c) => (c.active = true))) }

    expect((await r.read(bearer('idapp_tool'))).subject).toBe('ada')
  })
})

describe('the answers kept', () => {
  it('are dropped once ten thousand are kept, so the first is asked about again', async () => {
    const { state, fetch } = identity()
    state.introspection.body = JSON.stringify(claims((c) => (c.active = true)))
    const r = reader(fetch)
    for (let i = 0; i <= 10_000; i++) await r.read(bearer(`idapp_${i}`))
    const asked = state.asked

    await r.read(bearer('idapp_0'))

    expect(state.asked).toBe(asked + 1)
  })
})

describe('a request', () => {
  it.each([[undefined], ['Basic dXNlcjpwYXNz'], ['Bearer '], ['Bearer']])(
    'with Authorization %s carries no Principal',
    async (authorization) => {
      expect(
        await reason(
          reader(identity().fetch).read((name) =>
            name === 'Authorization' ? authorization : undefined,
          ),
        ),
      ).toBe('missing')
    },
  )
})

describe('a reader', () => {
  it("asks the Issuer's own endpoints by default", async () => {
    const asked: string[] = []
    const r = new PrincipalReader({
      issuer: 'https://auth.example.test/',
      clientId: 'web',
      clientSecret: 's3cret',
      fetch: async (input) => {
        asked.push(String(input))
        return new Response('{"active":false}')
      },
    })
    await reason(r.read(bearer('idpat_script')))
    await reason(r.read(bearer(await sign(claims()))))

    expect(asked).toEqual([
      'https://auth.example.test/oidc/introspect',
      'https://auth.example.test/oidc/keys',
    ])
  })
})
