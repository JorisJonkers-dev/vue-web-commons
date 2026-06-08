# @extratoast/vue-web-commons

Framework-neutral Vue 3 commons for ExtraToast web applications.

## Install

```sh
npm install @extratoast/vue-web-commons@0.0.0
```

Consumers provide Vue runtime integrations as peer dependencies:

```sh
npm install vue pinia vue-router @grafana/faro-web-sdk @grafana/faro-web-tracing
```

Import package APIs from public coordinates:

```ts
import { BaseButton, useApi, useTheme } from '@extratoast/vue-web-commons'
import '@extratoast/vue-web-commons/style.css'
import '@extratoast/vue-web-commons/theme.css'
```

Do not import from `@extratoast/vue-web-commons/src/...`; source files are not part of the package contract.

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

## Downstream Personal Stack Adoption

Personal Stack should consume this package at an exact Renovate-managed version, for example:

```json
{
  "dependencies": {
    "@extratoast/vue-web-commons": "0.0.0"
  }
}
```

Use an exact version, not a semver range and not a workspace link. Personal Stack remains continuously deployed from its own repository; adopting this package does not require publishing, tagging, or versioning Personal Stack itself.

Personal Stack build/test validation is deferred until a package version is published and the downstream repository can replace its workspace import with the package coordinate.

## Publishing

Release PRs are managed by release-please. Published tags run the npm publish workflow for GitHub Packages under the `@extratoast` scope.

New packages on this personal account default to private in GitHub Packages; the owner must set the package public once after the first publish.
