import type { Principal } from '../src/index'
import { describe, expect, it } from 'vitest'
import { PRINCIPAL_HEADER, PrincipalReader, PrincipalRefused } from '../src/index'
import { contractText, vectors } from './contract'

interface SignedHeaderVector {
  issuer: string
  client: string
  now: string
  headers: Record<string, string>
  principal?: Principal
  refusal?: string
}
interface TokenVector {
  issuer: string
  client: string
  now: string
  token: string
  principal?: Principal
  refusal?: string
}
interface IntrospectionVector {
  client: string
  answer: unknown
  principal?: Principal
  refusal?: string
}

/** identity as a fetch: its published keys, and an introspection answer for one Client and token. */
export function identity(answer?: {
  client: string
  secret: string
  token: string
  body: unknown
}): typeof fetch {
  return async (input, init) => {
    const url = String(input)
    if (url.endsWith('/oidc/keys')) return new Response(contractText('vectors/jwks.json'))
    const credentials = `Basic ${btoa(`${answer?.client}:${answer?.secret}`)}`
    const asked = new URLSearchParams(String(init?.body)).get('token')
    if (
      (init?.headers as Record<string, string>).Authorization !== credentials ||
      asked !== answer?.token
    ) {
      return new Response('', { status: 401 })
    }
    return Response.json(answer?.body)
  }
}

async function outcome(
  read: Promise<Principal>,
): Promise<{ principal?: Principal; refusal?: string }> {
  try {
    return { principal: await read }
  } catch (e) {
    if (e instanceof PrincipalRefused) return { refusal: e.reason }
    throw e
  }
}

function expected(v: { principal?: Principal; refusal?: string }): {
  principal?: Principal
  refusal?: string
} {
  return v.refusal ? { refusal: v.refusal } : { principal: v.principal! }
}

describe('every pinned signed-header vector', () => {
  it.each(vectors<SignedHeaderVector>('signed-header'))(
    '%s reads as the contract says',
    async (_, v) => {
      const reader = new PrincipalReader({
        issuer: v.issuer,
        clientId: v.client,
        fetch: identity(),
        now: () => new Date(v.now),
      })

      await expect(outcome(reader.read((name) => v.headers[name]))).resolves.toEqual(expected(v))
    },
  )
})

describe('every pinned access-token vector', () => {
  it.each(vectors<TokenVector>('access-token'))('%s reads as the contract says', async (_, v) => {
    const reader = new PrincipalReader({
      issuer: v.issuer,
      clientId: v.client,
      fetch: identity(),
      now: () => new Date(v.now),
    })

    await expect(
      outcome(reader.read((name) => (name === 'Authorization' ? `Bearer ${v.token}` : undefined))),
    ).resolves.toEqual(expected(v))
  })
})

describe('every pinned introspection vector', () => {
  it.each(vectors<IntrospectionVector>('introspection'))(
    '%s reads as the contract says',
    async (_, v) => {
      const fetch = identity({
        client: v.client,
        secret: 's3cret',
        token: 'opaque',
        body: v.answer,
      })
      const reader = new PrincipalReader({
        issuer: 'https://auth.example.test',
        clientId: v.client,
        clientSecret: 's3cret',
        fetch,
      })

      await expect(
        outcome(reader.read((name) => (name === 'Authorization' ? 'Bearer opaque' : undefined))),
      ).resolves.toEqual(expected(v))
    },
  )
})

describe('typ keeps the channels apart', () => {
  it('refuses an access token presented as the signed header', async () => {
    const [, v] = vectors<TokenVector>('access-token').find(([name]) => name === 'session')!
    const reader = new PrincipalReader({
      issuer: v.issuer,
      clientId: v.client,
      fetch: identity(),
      now: () => new Date(v.now),
    })

    await expect(
      outcome(reader.read((name) => (name === PRINCIPAL_HEADER ? v.token : undefined))),
    ).resolves.toEqual({ refusal: 'wrong-typ' })
  })

  it('refuses a signed header presented as a bearer token', async () => {
    const [, v] = vectors<SignedHeaderVector>('signed-header').find(([name]) => name === 'session')!
    const reader = new PrincipalReader({
      issuer: v.issuer,
      clientId: v.client,
      fetch: identity(),
      now: () => new Date(v.now),
    })
    const bearer = `Bearer ${v.headers[PRINCIPAL_HEADER]}`

    await expect(
      outcome(reader.read((name) => (name === 'Authorization' ? bearer : undefined))),
    ).resolves.toEqual({ refusal: 'wrong-typ' })
  })
})
