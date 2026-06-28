# @jorisjonkers-dev/vue-web-commons

Framework-neutral Vue 3 commons for Joris Jonkers web applications.

## Install

```sh
npm install @jorisjonkers-dev/vue-web-commons@0.3.1
```

Consumers provide Vue runtime integrations as peer dependencies:

```sh
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

Do not import from `@jorisjonkers-dev/vue-web-commons/src/...`; source files are not part of the package contract.

`style.css` contains CSS emitted from Vue components. `theme.css` contains shared CSS tokens and base styles for consumers that opt in.

## Exports

Generic-now exports:

- Components: `AppShell`, `BaseButton`, `Card`, `Dropdown`, `FormErrors`, `FormField`, `Modal`, `Spinner`, `SubmitButton`, `Tabs`, `TabPanel`, `ToastHost`.
- Composables: `useFormErrors`, `useMutationState`, `useToast`.
- Utilities: `decodeJwt`, `isTokenExpired`.
- Observability: `initFaro`.
- Types: `ApiError`, `AuthTokens`, `FieldError`, `ProblemDetail`, `User`, `UserRole`, component/composable option and return types.

Injection-required exports:

- `useAuth(options)` receives current-user endpoint, credentials, user mapping, role mapping, logout handling, CSRF token source, and fetch implementation.
- `useApi(options)` receives base URL, credentials, headers, serializer, and fetch implementation.
- `useApiWithAuth(options)` receives base URL, credentials, CSRF token/header behavior, unauthorized behavior, logout callback, serializer, and fetch implementation.
- `useTheme(options)` receives storage key, default/allowed modes, DOM target, attribute/class strategy, storage implementation, and style application policy.
- `AppShell` accepts `themeOptions` and passes them to `useTheme`.

Intentionally excluded from the first release:

- PrimeVue, Vuetify, or other UI-kit-specific components.
- Personal Stack feature components.
- Generated API clients.
- Consumer repository migrations.

## Round 3 Infrastructure Helpers

Config helpers live under `@jorisjonkers-dev/vue-web-commons/config` so browser runtime imports stay focused on app code:

```ts
import { createVueViteConfig } from '@jorisjonkers-dev/vue-web-commons/config'
import { defineConfig } from 'vite'

export default defineConfig(createVueViteConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
  build: {
    hashedAssetNames: true,
  },
}))
```

The same subpath exports `createVueVitestConfig`, `createVuePlaywrightConfig`, `createVueTsConfig`, and `createFeatureSlicedDependencyCruiserConfig`. Generated-client paths are configurable:

```js
// .dependency-cruiser.mjs
import { createFeatureSlicedDependencyCruiserConfig } from '@jorisjonkers-dev/vue-web-commons/config'

export default createFeatureSlicedDependencyCruiserConfig({
  generatedClientPaths: ['src/shared/services/api/generated', 'src/services/api/generated'],
})
```

Generated API runtime helpers live under `@jorisjonkers-dev/vue-web-commons/api-runtime`:

```ts
import { createApiFetch } from '@jorisjonkers-dev/vue-web-commons/api-runtime'

const apiFetch = createApiFetch({
  baseUrl: '/api',
  credentials: 'include',
  bearerToken: () => sessionStorage.getItem('access_token'),
  csrf: {
    bootstrapPath: '/csrf',
    headerName: 'X-XSRF-TOKEN',
  },
})
```

The runtime helpers are generator-agnostic and include base URL resolution, credentials, bearer auth, CSRF bootstrap for unsafe methods, ProblemDetail validation normalization, and `createHeyApiRuntimeConfig` for `@hey-api/openapi-ts` style clients.

SPA nginx templates live under `@jorisjonkers-dev/vue-web-commons/nginx`:

```ts
import { createUnprivilegedSpaNginxConfig } from '@jorisjonkers-dev/vue-web-commons/nginx'

const nginxConf = createUnprivilegedSpaNginxConfig({
  listenPort: 8080,
  healthz: true,
})
```

The template renders immutable caching for Vite hashed assets, no-store `index.html`, fallback routing, gzip, optional `/healthz`, and privileged/unprivileged port variants. Domains, hostnames, image names, namespaces, and service paths are intentionally caller-provided.

## Downstream Personal Stack Adoption

Personal Stack should consume this package at an exact Renovate-managed version, for example:

```json
{
  "dependencies": {
    "@jorisjonkers-dev/vue-web-commons": "0.3.1"
  }
}
```

Use an exact version, not a semver range and not a workspace link. Personal Stack remains continuously deployed from its own repository; adopting this package does not require publishing, tagging, or versioning Personal Stack itself.

Personal Stack build/test validation is deferred until a package version is published and the downstream repository can replace its workspace import with the package coordinate.

## Publishing

Release PRs are managed by release-please. Release-created tags publish to GitHub Packages under the `@jorisjonkers-dev` scope with npm provenance.

New packages on this personal account default to private in GitHub Packages; the owner must set the package public once after the first publish.
