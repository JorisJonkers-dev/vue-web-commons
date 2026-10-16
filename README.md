# @jorisjonkers-dev/vue-web-commons

Framework-neutral Vue 3 commons for Joris Jonkers web applications.

## What It Is

`@jorisjonkers-dev/vue-web-commons` is a source-available npm package with
shared Vue components, composables, API runtime helpers, Vite/Vitest config
helpers, and SPA nginx template helpers.

The package is intentionally consumer-configured: auth endpoints, API base URLs,
theme storage, generated-client paths, and nginx runtime details are supplied by
the application that imports it.

## Local Use

```bash
npm ci
npm run format:check
npm run typecheck
npm run lint
npm test
npm run package:check
```

Install the published package from GitHub Packages, which needs a token with package read access
even though the package is public:

```bash
npm install @jorisjonkers-dev/vue-web-commons@0.6.0
```

A public repository can install it without a token from the tarball attached to each GitHub
Release, at an exact version:

```json
"@jorisjonkers-dev/vue-web-commons": "https://github.com/JorisJonkers-dev/vue-web-commons/releases/download/v0.7.0/jorisjonkers-dev-vue-web-commons-0.7.0.tgz"
```

Consumers provide Vue runtime integrations as peer dependencies:

```bash
npm install vue pinia vue-router @grafana/faro-web-sdk @grafana/faro-web-tracing
```

Import package APIs from public coordinates:

```ts
import { BaseButton, useApi, useTheme } from '@jorisjonkers-dev/vue-web-commons'
import { createApiFetch } from '@jorisjonkers-dev/vue-web-commons/api-runtime'
import { createVueViteConfig } from '@jorisjonkers-dev/vue-web-commons/config'
import { createUnprivilegedSpaNginxConfig } from '@jorisjonkers-dev/vue-web-commons/nginx'
import '@jorisjonkers-dev/vue-web-commons/style.css'
import '@jorisjonkers-dev/vue-web-commons/theme.css'
```

Do not import from `@jorisjonkers-dev/vue-web-commons/src/...`; source files are
not part of the package contract.

## Shared Quality Config

Use the shared ESLint flat config from `eslint.config.ts`:

```ts
import createVueEslintConfig from '@jorisjonkers-dev/vue-web-commons/eslint'

export default createVueEslintConfig()
```

A Playwright journey longer than a few actions must name its stages with `test.step`, so a
failure says which stage broke (the estate testing standards). Any flat config can add the rule,
with or without `createVueEslintConfig`:

```ts
import { playwrightStepsConfig } from '@jorisjonkers-dev/vue-web-commons/eslint'

export default [
  // ...the repository's own config
  playwrightStepsConfig(), // e2e specs, more than 8 awaited actions; or ({ files, max })
]
```

Use the shared Prettier config from `prettier.config.mjs`:

```js
export { default } from '@jorisjonkers-dev/vue-web-commons/prettier'
```

Use the strict shared TypeScript base from `tsconfig.json`:

```json
{
  "extends": "@jorisjonkers-dev/vue-web-commons/tsconfig/base",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "env.d.ts"]
}
```

The shared defaults are designed for `eslint --max-warnings=0`,
`tsc --noEmit`, and `prettier --check .` gates.

## Exports

- Components: `AppShell`, `BaseButton`, `Card`, `Dropdown`, `FormErrors`,
  `FormField`, `Modal`, `Spinner`, `SubmitButton`, `Tabs`, `TabPanel`,
  `ToastHost`.
- Composables: `useAuth`, `useApi`, `useApiWithAuth`, `useFormErrors`,
  `useMutationState`, `useTheme`, `useToast`.
- Runtime helpers: `createApiFetch`, `createHeyApiRuntimeConfig`, JWT helpers,
  and validation-normalization types.
- Config helpers: Vue Vite, Vitest, Playwright, TypeScript, ESLint, and
  dependency-cruiser config factories.
- Nginx helpers: unprivileged SPA config rendering for Vite-built apps.

Use exact versions in downstream applications so Renovate controls package
rollout:

```json
{
  "dependencies": {
    "@jorisjonkers-dev/vue-web-commons": "0.4.0"
  }
}
```

## Links

- [Organization profile](https://github.com/JorisJonkers-dev)
- [Security policy](https://github.com/JorisJonkers-dev/.github/security/policy)
- [Changelog](./CHANGELOG.md)
- [License](./LICENSE)

Copyright (c) Joris Jonkers. Source available for viewing only; use, copying,
modification, redistribution, deployment, or reuse is not licensed. See
[LICENSE](./LICENSE).
