import type { ServerResponse } from 'node:http'
import type { Middleware, Principal, PrincipalReader, PrincipalRequest } from '../src/index'
import { describe, expect, it } from 'vitest'
import {
  IdentityUnavailable,
  principalMiddleware,
  PrincipalRefused,
  refuseTools,
  requireMachine,
  requireRecentTwoFactor,
  requireRole,
  requireUser,
} from '../src/index'

const now = Date.parse('2026-10-20T12:00:30Z')

function ada(edit: Partial<Principal> = {}): Principal {
  return {
    subject: 'ada',
    kind: 'user',
    roles: ['user'],
    via: 'session',
    twoFactor: false,
    sid: 's',
    ver: '1.1',
    ...edit,
  }
}

/** What a middleware did with a request: the status and Location it answered, or that it passed it on. */
async function serve(
  middleware: Middleware,
  req: Partial<PrincipalRequest>,
): Promise<{ status?: number; location?: string; passed: boolean }> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = {}
    const res = {
      statusCode: 200,
      setHeader: (name: string, value: string) => (headers[name] = value),
      end: () =>
        resolve({
          status: res.statusCode,
          ...(headers.Location ? { location: headers.Location } : {}),
          passed: false,
        }),
    }
    const request = Object.assign(req, {
      headers: req.headers ?? {},
      url: 'url' in req ? req.url : '/',
    })
    const passed = (): void => resolve({ passed: true })
    middleware(request as PrincipalRequest, res as unknown as ServerResponse, passed)
  })
}

function readerAnswering(outcome: Principal | Error): PrincipalReader {
  return {
    read: async () => (outcome instanceof Error ? Promise.reject(outcome) : outcome),
  } as unknown as PrincipalReader
}

describe('the middleware', () => {
  it('passes the Principal on to the handler', async () => {
    const req: Partial<PrincipalRequest> = {}

    const outcome = await serve(principalMiddleware(readerAnswering(ada())), req)

    expect([outcome.passed, req.principal?.subject]).toEqual([true, 'ada'])
  })

  it('answers 401 to a refused request', async () => {
    expect(
      await serve(principalMiddleware(readerAnswering(new PrincipalRefused('missing'))), {}),
    ).toEqual({ status: 401, passed: false })
  })

  it('answers 503 when identity cannot be asked', async () => {
    expect(
      await serve(principalMiddleware(readerAnswering(new IdentityUnavailable('down'))), {}),
    ).toEqual({ status: 503, passed: false })
  })

  it("reads the request's headers by name, whatever their case", async () => {
    let asked: string | undefined
    const reader = {
      read: async (header: (n: string) => string | undefined) => {
        asked = header('Authorization')
        return ada()
      },
    } as unknown as PrincipalReader

    await serve(principalMiddleware(reader), { headers: { authorization: 'Bearer t' } })

    expect(asked).toBe('Bearer t')
  })
})

describe('the policy helpers', () => {
  it('let through a caller holding the generated role', async () => {
    expect(
      (await serve(requireRole('editor'), { principal: ada({ roles: ['editor'] }) })).passed,
    ).toBe(true)
  })

  it('answer 403 to a caller without the role', async () => {
    expect((await serve(requireRole('editor'), { principal: ada() })).status).toBe(403)
  })

  it('answer 403 to a tool acting for a User', async () => {
    expect(
      (
        await serve(refuseTools(), {
          principal: ada({ via: 'tool', actor: { id: 'mcp_1', name: 'Claude Code' } }),
        })
      ).status,
    ).toBe(403)
  })

  it('let the User themselves through refuseTools', async () => {
    expect((await serve(refuseTools(), { principal: ada() })).passed).toBe(true)
  })

  it('answer 403 to a machine on a page for people, and let a person through', async () => {
    const machine = ada({ kind: 'machine', via: 'machine' })

    expect([
      (await serve(requireUser(), { principal: machine })).status,
      (await serve(requireUser(), { principal: ada() })).passed,
    ]).toEqual([403, true])
  })

  it('answer 403 to a person on a machine endpoint, and let a machine through', async () => {
    const machine = ada({ kind: 'machine', via: 'machine' })

    expect([
      (await serve(requireMachine(), { principal: ada() })).status,
      (await serve(requireMachine(), { principal: machine })).passed,
    ]).toEqual([403, true])
  })

  it.each([
    ['requireRole', requireRole('user')],
    ['requireRecentTwoFactor', requireRecentTwoFactor(5)],
  ])('%s answers 401 without a Principal', async (_, m) => {
    expect((await serve(m, {})).status).toBe(401)
  })
})

describe('requireRecentTwoFactor', () => {
  const clock = () => new Date(now)

  it('lets a fresh enough proof through', async () => {
    const proved = new Date(now - 240_000).toISOString()

    expect(
      (
        await serve(requireRecentTwoFactor(5, clock), {
          principal: ada({ twoFactor: true, twoFactorAt: proved }),
        })
      ).passed,
    ).toBe(true)
  })

  it("sends a stale session to the Gate's step-up and back to the same page", async () => {
    const proved = new Date(now - 360_000).toISOString()

    const outcome = await serve(requireRecentTwoFactor(5, clock), {
      principal: ada({ twoFactor: true, twoFactorAt: proved }),
      url: '/pay?amount=3',
    })

    expect(outcome).toEqual({
      status: 303,
      location: '/.auth/step-up?minutes=5&rd=%2Fpay%3Famount%3D3',
      passed: false,
    })
  })

  it('sends a session with no proof to step-up', async () => {
    expect(
      (await serve(requireRecentTwoFactor(5, clock), { principal: ada(), url: undefined }))
        .location,
    ).toBe('/.auth/step-up?minutes=5&rd=%2F')
  })

  it('answers 403 to a Personal Token it cannot step up', async () => {
    expect(
      (await serve(requireRecentTwoFactor(5), { principal: ada({ via: 'personal-token' }) }))
        .status,
    ).toBe(403)
  })

  it('reads the real time when given no clock', async () => {
    const proved = new Date().toISOString()

    expect(
      (
        await serve(requireRecentTwoFactor(5), {
          principal: ada({ twoFactor: true, twoFactorAt: proved }),
        })
      ).passed,
    ).toBe(true)
  })
})
