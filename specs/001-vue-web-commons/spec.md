# Feature Specification: Vue Web Commons Package

## Overview

`ExtraToast/vue-web-commons` defines a framework-neutral Vue 3 commons package published to npm as `@extratoast/vue-web-commons`. The package extracts the reusable surface currently represented by `/workspace/personal-stack/libs/vue-common` so Personal Stack can consume shared Vue components, composables, observability setup, utilities, and types from a stable external package, and so `/workspace/website` can adopt the same commons later without inheriting Personal Stack application assumptions.

The first release must preserve Personal Stack's current frontend behavior while turning the library into a package with a clean distribution contract: built output in `dist`, generated type declarations, peer dependency boundaries, public publish metadata, and short consumer import coordinates. Personal Stack remains continuously auto-deployed from its own repository and is not converted into a versioned product as part of this extraction.

The reference library currently exposes components (`AppShell`, `BaseButton`, `Card`, `Dropdown`, `FormErrors`, `FormField`, `Modal`, `Spinner`, `SubmitButton`, `Tabs`, `TabPanel`, `ToastHost`), composables (`useApi`, `useApiWithAuth`, `useAuth`, `useFormErrors`, `useMutationState`, `useTheme`, `useToast`), observability (`initFaro`), JWT utilities, and shared types. The specification distinguishes exports that are generic enough to extract now from exports that must receive injected configuration before they can be extracted safely.

## User Scenarios

### Scenario 1: Personal Stack consumes shared commons

A Personal Stack frontend imports shared Vue primitives from `@extratoast/vue-web-commons` using the package's public entry points. The app continues to build, typecheck, test, and auto-deploy without workspace-linking `libs/vue-common` or requiring a Personal Stack release version.

### Scenario 2: Package maintainers publish a reusable Vue library

A package maintainer prepares a release artifact that includes built JavaScript, generated declaration files, CSS subpath exports when applicable, and package metadata suitable for npm publication. Consumers install Vue-related runtime integrations as peer dependencies rather than receiving hidden bundled framework dependencies.

### Scenario 3: Application-specific assumptions are configured, not embedded

A consuming app provides auth, API, CSRF, role-mapping, storage-key, and theme configuration to the commons package. The same composable surface works for Personal Stack and for a future website consumer without hardcoded Personal Stack routes, cookies, roles, storage keys, or theme DOM behavior.

### Scenario 4: Consumers avoid UI-kit lock-in

A consuming app can use commons components and composables without installing PrimeVue, Vuetify, or another UI kit. UI-kit-specific components, if introduced later, are separated from the core package contract so the first release remains UI-kit-neutral.

## Functional Requirements

- **FR-1**: The package name must be `@extratoast/vue-web-commons`, and the package metadata must allow public npm publication rather than marking the package private.
- **FR-2**: The package must ship built runtime output under `dist` and generated TypeScript declaration files for every public export.
- **FR-3**: Public `exports`, `main`, `module`, and `types` metadata must point to built package artifacts, not to source files under `src`.
- **FR-4**: The package metadata must include `publishConfig` appropriate for publishing the scoped package.
- **FR-5**: Vue, Pinia, Vue Router, `@grafana/faro-web-sdk`, and `@grafana/faro-web-tracing` must be declared as peer dependencies when they are part of the public runtime contract.
- **FR-6**: Peer dependencies listed in FR-5 must not be bundled into the package artifact or hidden as ordinary runtime dependencies.
- **FR-7**: The core package must not declare hard runtime dependencies on PrimeVue, Vuetify, or any other UI-kit framework.
- **FR-8**: Any UI-kit-specific export added after the first release must be isolated from the core package entry point through a separately documented optional entry point or a separate package.
- **FR-9**: Generic-now exports must be identified as eligible for first-release extraction without app-specific configuration beyond normal props/options. This set includes the existing base interaction/display components that do not import a UI kit, `useMutationState`, `useToast`, JWT utilities, `initFaro`, and framework-neutral shared types.
- **FR-10**: Exports that embed Personal Stack assumptions must be identified as needing injected configuration before extraction. This set includes `useAuth`, `useApiWithAuth`, auth-sensitive `useApi` defaults, `useTheme`, and any component behavior that depends on those composables.
- **FR-11**: `useAuth` must not hardcode Personal Stack auth endpoints, role names, fallback role behavior, user response mapping, credential behavior, logout behavior, CSRF cookie names, or CSRF token retrieval.
- **FR-12**: `useAuth` must accept or consume configuration that supplies the current-user endpoint, user mapping, role mapping, authentication state handling, logout handling, credentials policy, and CSRF token source.
- **FR-13**: `useApi` and `useApiWithAuth` must not require `/api/v1`, a fixed unauthorized flow, a fixed CSRF header, a fixed CSRF cookie, or a fixed credential policy.
- **FR-14**: Authenticated API helpers must accept or consume configuration for base URL, credential policy, unauthorized behavior, CSRF token source, CSRF header name, and request serialization defaults.
- **FR-15**: `useTheme` must not hardcode the `ps_theme` storage key, a single DOM target, a single theme attribute/class strategy, or Personal Stack-specific theme token assumptions.
- **FR-16**: `useTheme` must accept or consume configuration for storage key, default mode, allowed modes, DOM target, attribute/class behavior, and opt-in stylesheet usage.
- **FR-17**: Any exported stylesheet must use package-relative behavior and documented package subpaths, not a Personal Stack workspace path such as `libs/vue-common/src`.
- **FR-18**: `initFaro` must remain opt-in: consumers that do not provide an observability endpoint or do not call the initializer must not be required to initialize Faro.
- **FR-19**: `initFaro` failures must not prevent a consumer app from bootstrapping.
- **FR-20**: Shared Problem Detail and error types must expose generic RFC 7807-compatible fields while keeping Personal Stack-specific extensions optional, documented, and non-mandatory for other consumers.
- **FR-21**: Consumers must import package APIs from short public coordinates such as `@extratoast/vue-web-commons` and documented subpaths such as `@extratoast/vue-web-commons/theme.css`; consumers must not import from `@extratoast/vue-web-commons/src/...`.
- **FR-22**: Package documentation must require downstream Personal Stack adoption to consume `@extratoast/vue-web-commons` at an exact Renovate-managed version, not a semver range and not a workspace link.
- **FR-23**: Package documentation must preserve Personal Stack's continuously auto-deployed repository model after downstream package adoption.
- **FR-24**: Package documentation must make clear that downstream Personal Stack adoption does not require publishing, tagging, or versioning Personal Stack itself.
- **FR-25**: The first release must document which exports are generic-now, which exports require injected configuration before extraction, and which exports are intentionally excluded from the first release.

## Success Criteria

- **SC-1**: A package dry-run artifact contains `dist` JavaScript, declaration files, `package.json`, and any documented CSS files, with no public export resolving to `src`.
- **SC-2**: A dependency audit of the package metadata shows Vue, Pinia, Vue Router, `@grafana/faro-web-sdk`, and `@grafana/faro-web-tracing` listed as peer dependencies when used by public runtime exports, and not bundled as ordinary runtime dependencies.
- **SC-3**: A dependency audit of the core package metadata shows zero runtime dependencies on PrimeVue, Vuetify, or another UI kit.
- **SC-4**: A consumer fixture can import at least one generic-now component, one generic-now composable, one type, one JWT utility, and `initFaro` from public package coordinates with TypeScript declaration resolution passing.
- **SC-5**: Configuration-focused tests or fixtures demonstrate `useAuth` working with two different current-user endpoints, two different role mappings, and two different CSRF cookie/header combinations without changing package source.
- **SC-6**: Configuration-focused tests or fixtures demonstrate `useTheme` working with two different storage keys and two different DOM attribute/class strategies without changing package source.
- **SC-7**: Package documentation describes the exact-version dependency coordinate and Renovate-compatible downstream adoption requirement for Personal Stack.
- **SC-8**: A local consumer fixture demonstrates public-coordinate package imports; Personal Stack frontend build/test validation is deferred to downstream adoption after a package version is published.
- **SC-9**: Package documentation shows no new requirement to tag, publish, or manually version Personal Stack in order to deploy downstream frontend changes.
- **SC-10**: A website-oriented consumer fixture can install the package and render generic-now exports without installing PrimeVue or Vuetify.

## Assumptions

- The npm package is intended to be public under the `@extratoast` scope.
- Consumers are Vue 3 applications and may provide Vue Router, Pinia, and Faro packages only when their selected exports require those integrations.
- Renovate is available to manage exact-version package updates in Personal Stack.
- Personal Stack keeps its current continuous deployment model after replacing the workspace-linked package with the published dependency.
- The first release may preserve existing visual primitives if they remain UI-kit-neutral and do not require Personal Stack-only paths or configuration.

## Edge Cases

- A consumer imports only non-observability exports and never calls `initFaro`; Faro must not initialize.
- A consumer lacks an observability endpoint; app bootstrap must continue without runtime failure.
- A consumer has no Vue Router usage; router-dependent exports must not be required for unrelated imports.
- A consumer uses different auth routes, role names, CSRF cookie names, or CSRF header names than Personal Stack.
- Multiple apps on the same origin use different theme storage keys or DOM theme attributes.
- A consumer imports the stylesheet outside the Personal Stack pnpm workspace; the stylesheet must not rely on workspace-relative source scanning.
- A package version is not yet published when Personal Stack is migrated; adoption must be blocked by package availability rather than by Personal Stack versioning.

## Key Entities

- **Vue Web Commons Package**: The npm package `@extratoast/vue-web-commons` that exposes reusable Vue 3 components, composables, observability helpers, utilities, types, and optional styles.
- **Built Artifact**: The published package contents under `dist`, including runtime JavaScript and generated declaration files.
- **Generic-Now Export**: A public export that is reusable across consumers without Personal Stack-specific assumptions beyond normal props/options.
- **Injection-Required Export**: A public export candidate that must receive consumer-provided configuration before it can be extracted safely.
- **Consumer App**: A Vue 3 application, including Personal Stack frontends and the future website consumer, that installs and imports the package.
- **Peer Dependency**: A package expected to be supplied by the consumer app and not bundled into the commons package.
- **Auth Configuration**: Consumer-provided settings and callbacks for current-user loading, user mapping, role mapping, credentials, logout, and CSRF behavior.
- **Theme Configuration**: Consumer-provided settings for theme modes, persistence, DOM application, and stylesheet opt-in.
- **Renovate-Pinned Dependency**: An exact-version dependency coordinate managed by Renovate rather than a workspace link or semver range.

## Out of Scope

- Publishing `@extratoast/vue-web-commons` to npm or GitHub Packages during initial implementation.
- Migrating Personal Stack consumer manifests or frontend imports during initial implementation.
- Converging PrimeVue and Vuetify components, or selecting a UI-kit strategy, for the first release.
- Replacing Personal Stack's application-specific feature components.
- Migrating `/workspace/website` to the package in the first release.
- Changing Personal Stack's deployment model, release process, hosting, or service architecture.
- Redesigning Personal Stack authentication, authorization, CSRF policy, or API contracts.
- Creating generated API clients or changing backend OpenAPI workflows.
