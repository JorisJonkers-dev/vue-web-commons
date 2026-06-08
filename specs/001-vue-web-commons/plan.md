# Implementation Plan: Vue Web Commons Package

## Scope and Boundary

Implement `@extratoast/vue-web-commons` as a standalone Vue 3 library package in this repository. `/workspace/personal-stack`, `/workspace/website`, and `/workspace/repo-template` are read-only references, so downstream Personal Stack adoption is documented but not edited here.

Spec adjustment: FR-22 through FR-24 and SC-7 through SC-9 are documentation/downstream-adoption requirements for this repository because Personal Stack is explicitly read-only for this implementation.

## Technical Context

- Package manager: npm with `package-lock.json`, `npm ci` in CI, and `npm publish` for the tag publish workflow.
- Runtime build: Vite library mode, ESM output only, entry `src/index.ts`, output under `dist`.
- Declaration build: `vite-plugin-dts` emits `.d.ts` for all public exports, including Vue SFC declarations.
- Vue SFC support: `@vitejs/plugin-vue`.
- Tests: Vitest with jsdom and `@vue/test-utils`.
- Type checking: `vue-tsc --noEmit`.
- Linting: ESLint with the same Antfu Vue/TypeScript baseline used by the reference project, scoped to this standalone package.
- Package peers: Vue, Pinia, Vue Router, `@grafana/faro-web-sdk`, and `@grafana/faro-web-tracing` are peer dependencies and dev dependencies for local test/build only.
- Release: release-please on `main`; publish-on-tag workflow publishes npm artifacts to GitHub Packages under `@extratoast`.

## Architecture

### Public Entry Points

- `@extratoast/vue-web-commons`: all runtime exports from `src/index.ts`.
- `@extratoast/vue-web-commons/theme.css`: copied to `dist/theme.css` and exported as a package subpath.

No public export resolves to `src`. `package.json` uses `main`, `module`, `types`, and `exports` that point at `dist`.

### Source Layout

- `src/components`: UI-kit-neutral Vue components ported from `libs/vue-common`.
- `src/composables`: portable composables. Generic composables are direct ports; app-coupled composables receive injected options.
- `src/observability`: opt-in Faro initializer.
- `src/types`: generic RFC 7807 problem/error/user/token types.
- `src/utils`: JWT helpers.
- `src/theme.css`: package-relative shared CSS tokens and base styles.
- `src/__tests__`: unit and fixture-style tests proving public-coordinate behavior and config injection.
- `test/consumer-fixture.ts`: TypeScript fixture that imports from package coordinates after build.

### Generalization Design

- `useAuth(options)`: keep singleton state by default, but remove fixed endpoints, roles, CSRF cookie, credentials, and user mapping. Options provide `currentUserUrl`, optional `baseUrl`, `credentials`, `mapUser`, `mapRole`, `fallbackRole`, `onLogout`, `csrfTokenSource`, and `fetchImpl`.
- `useApi(options)`: remove `/api/v1` default. Options provide `baseUrl`, `fetchImpl`, `credentials`, `headers`, and `serializeBody`. JSON remains the default serializer but can be overridden.
- `useApiWithAuth(options)`: reuse API parsing helpers but accept `baseUrl`, `credentials`, `csrfTokenSource`, `csrfHeaderName`, `onUnauthorized`, `logout`, `fetchImpl`, and serialization defaults. It does not call `useAuth()` unless the caller passes compatible callbacks.
- `useTheme(options)`: no module-level storage key or DOM target assumption. Options provide `storageKey`, `defaultMode`, `allowedModes`, `target`, `attribute`, `className`, `storage`, and `applyStyles`. Defaults are generic (`theme`, `system`, `html`, `data-theme`, `dark`) and SSR-safe.
- `initFaro(options)`: keep opt-in call surface and catch initialization failures.

## FR Traceability

- FR-1: `package.json` name, non-private metadata, scoped publish config.
- FR-2: Vite build and `vite-plugin-dts`; CI and dry-run verify `dist` runtime and declarations.
- FR-3: `package.json` `main`, `module`, `types`, `exports` point to `dist`.
- FR-4: `publishConfig.registry=https://npm.pkg.github.com` and `access=public`.
- FR-5, FR-6: peer dependency declarations plus Vite Rollup externals.
- FR-7, FR-8: no UI-kit dependencies; README documents no core UI-kit entry point.
- FR-9: index exports components, `useMutationState`, `useToast`, JWT utilities, `initFaro`, shared types.
- FR-10: plan, README, and generalized implementations identify/configure app-coupled exports.
- FR-11, FR-12: `useAuth` injected endpoint, mapping, credentials, logout, CSRF.
- FR-13, FR-14: `useApi` and `useApiWithAuth` injected base URL, credentials, unauthorized behavior, CSRF, and serializer/header defaults.
- FR-15, FR-16: `useTheme` injected storage key, modes, target, attribute/class behavior, and opt-in style behavior.
- FR-17: `theme.css` exported from `dist/theme.css`, no workspace-relative paths.
- FR-18, FR-19: `initFaro` does nothing unless called and catches failures.
- FR-20: `ProblemDetail` exposes generic RFC 7807 fields with optional extension fields.
- FR-21: README and consumer fixture use package coordinates only.
- FR-22, FR-23, FR-24: README documents exact-version downstream adoption and no Personal Stack release/versioning requirement.
- FR-25: README includes generic-now, injection-required, and excluded export lists.

## CI and Release

- `.github/workflows/ci.yml` runs install, typecheck, lint, tests, build, package dry-run, and fixture validation. The terminal job is named exactly `Pipeline Complete` and uses `re-actors/alls-green@release/v1`.
- `.github/workflows/release.yml` runs release-please on `main`.
- `.github/workflows/publish-on-tag.yml` installs with `npm ci`, builds, configures GitHub Packages auth, and runs `npm publish`.

## Validation

Local validation:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm pack --dry-run`
- consumer fixture declaration/import check

CI validation covers the same package checks. Publish is network-bound and deferred to release/tag workflow.

## Risks and Constraints

- Personal Stack adoption cannot be completed in this repository because the reference repo is read-only.
- GitHub Packages marks newly published packages private by default for this personal account; the owner must set the package public once after first publish.
- Some reference components use Tailwind-style utility classes and CSS variables. This package ships them as plain class names/tokens; consumers need their own CSS processor if they expect utility-class expansion.
