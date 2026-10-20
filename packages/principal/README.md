# @jorisjonkers-dev/principal

Reads who is calling an app from identity's Principal contract: the Gate's signed
`X-Identity-Principal`, a JWT access token verified against the Issuer's keys, or an opaque token
introspected with the app's Client secret (each answer kept at most 30 seconds). The plain
`X-Auth-Request-*` headers are never read. A Vue app imports the same `Principal` type.

```ts
import {
  principalMiddleware,
  PrincipalReader,
  refuseTools,
  requireRecentTwoFactor,
  requireRole,
} from '@jorisjonkers-dev/principal'

const reader = new PrincipalReader({
  issuer: 'https://auth.jorisjonkers.dev',
  clientId: 'wiki',
  clientSecret: process.env.WIKI_CLIENT_SECRET,
})
app.use(principalMiddleware(reader)) // req.principal, or 401 / 503
app.delete('/pages/:id', refuseTools(), requireRole('editor'), deletePage)
app.post('/pay', requireRecentTwoFactor(5), pay) // a stale session goes to /.auth/step-up and back
```

The contract it is held to is vendored in `contract/`; `scripts/pin-contract.sh <tag>` moves the
pin, and `PRINCIPAL_UPDATE=true npm test -w @jorisjonkers-dev/principal` regenerates
`src/principal.gen.ts` from it.
