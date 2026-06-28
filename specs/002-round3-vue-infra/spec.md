# Feature Specification: Round 3 Vue Infrastructure Commons

## Overview

`@jorisjonkers-dev/vue-web-commons` must extract the reusable Vue application infrastructure identified in extraction round 3: Vue/Vite testing and architecture presets, generated API runtime helpers for browser clients, and an nginx SPA static-serving template. The package must stay framework-neutral where the current repository already is, must not carry Personal Stack or Website domains, paths, namespaces, or generated-client assumptions, and must keep the package's existing CI contract green.

The round-3 reference repositories remain read-only. This feature ships reusable package code, tests, documentation, and fixtures in this repository only.

## User Scenarios

### Scenario 1: Vue app maintainers share app config conventions

A Vue application maintainer imports config factories for Vite, Vitest, Playwright, TypeScript, and dependency-cruiser. The maintainer can customize app-specific ports, aliases, generated-client paths, coverage setup, and feature-sliced source paths without copying Personal Stack or Website config files.

### Scenario 2: Generated API clients receive consistent browser runtime behavior

A frontend integrating any generated TypeScript client can resolve an API base URL from explicit config, environment values, or the browser origin; attach credentials and bearer auth; bootstrap CSRF tokens before unsafe methods; and normalize RFC 7807 validation errors without depending on one generator's output shape.

### Scenario 3: Vite SPAs share nginx caching behavior

A deployment maintainer renders an nginx server block for a Vite-built SPA with immutable hashed asset caching, no-store `index.html`, fallback routing, optional `/healthz`, gzip, and configurable privileged or unprivileged listen ports.

## Functional Requirements

- **FR-1**: The package must expose a config preset entry point that creates Vite, Vitest, Playwright, TypeScript, and dependency-cruiser configuration objects.
- **FR-2**: Config presets must support feature-sliced applications with configurable feature, shared, service-adapter, and generated-client path prefixes.
- **FR-3**: Dependency-cruiser rules must include circular import detection, component-to-view isolation, service-only API access, store isolation from generated clients, cross-feature barrel boundaries, generated-client import isolation, and shared-component domain isolation.
- **FR-4**: Generated-client paths in dependency-cruiser rules must be configurable and must not be fixed to `src/shared/services/api/generated`.
- **FR-5**: Vite/Vitest config factories must support Vue plugin defaults, aliases, server ports/proxies, coverage options, setup files, and caller-provided plugins without requiring a specific UI kit.
- **FR-6**: Playwright config factories must support test directory, base URL, projects, retries, reporter, web server, and CI worker customization without importing Playwright at runtime.
- **FR-7**: TypeScript config factories must return strict browser-oriented defaults compatible with Vue SFC projects and allow caller overrides.
- **FR-8**: API runtime helpers must resolve base URLs from explicit values, configurable environment keys, browser origin plus path, or fallback values.
- **FR-9**: API runtime helpers must support configurable credentials and bearer token sources for generator-agnostic fetch clients.
- **FR-10**: API runtime helpers must bootstrap CSRF tokens for unsafe methods through a configurable endpoint, header name, token reader, token writer, and fetch implementation.
- **FR-11**: API runtime helpers must normalize RFC 7807 ProblemDetail validation errors when `errors` is a single object, keyed object map, primitive string, array, or absent.
- **FR-12**: API runtime helpers must include an optional wrapper for `@hey-api/openapi-ts` style clients without taking a hard dependency on that package.
- **FR-13**: The nginx template entry point must render Vite SPA caching behavior with immutable asset caching, no-store entry document headers, fallback routing, gzip, optional health check, and configurable static asset extensions.
- **FR-14**: The nginx template must support privileged and unprivileged variants through listen-port defaults and must allow root, server name, asset prefix, and fallback path customization.
- **FR-15**: All extracted defaults must avoid hardcoded Personal Stack or Website domains, hosts, IPs, namespaces, queue/exchange names, vendor URLs, and service-specific paths.
- **FR-16**: Tests and fixtures must cover the new public entry points and package declarations.

## Success Criteria

- **SC-1**: Unit tests verify generated dependency-cruiser rules with at least two generated-client path configurations.
- **SC-2**: Unit tests verify Vite, Vitest, Playwright, and TypeScript factories merge caller options while keeping Vue/browser defaults.
- **SC-3**: Unit tests verify API base URL resolution, bearer auth, credentials, CSRF bootstrap caching for unsafe methods, and validation ProblemDetail normalization.
- **SC-4**: Unit tests verify the optional hey-api wrapper returns generator-compatible options without importing `@hey-api/openapi-ts`.
- **SC-5**: Unit tests verify privileged and unprivileged nginx output, no-store `index.html`, immutable Vite assets, fallback routing, and optional `/healthz`.
- **SC-6**: The consumer fixture can import `@jorisjonkers-dev/vue-web-commons/config`, `@jorisjonkers-dev/vue-web-commons/api-runtime`, and `@jorisjonkers-dev/vue-web-commons/nginx` from built declaration files.
- **SC-7**: Existing CI scripts remain the intended validation path: typecheck, lint, Vitest with coverage, build, package check, and fixture check.

## Assumptions

- Consumers install app-tooling packages such as Vite, Vitest, `@vitejs/plugin-vue`, Playwright, or dependency-cruiser in their own applications when using config presets.
- The package may expose tooling helpers through subpath exports so normal runtime imports remain small and browser-focused.
- API helper consumers may use fetch-based generated clients directly or adapt the provided request hooks to a generator-specific client.
- The nginx template renders text; deployment-specific image names, Dockerfiles, Kubernetes manifests, and ingress resources remain consumer concerns.

## Edge Cases

- A generated client has multiple generated output roots; dependency-cruiser rules must isolate all of them.
- A CSRF bootstrap request fails transiently; the helper must allow fallback to the last known token.
- Multiple unsafe API requests start concurrently before a CSRF token exists; only one bootstrap should be in flight when caching is enabled.
- A ProblemDetail validation payload returns a keyed object map instead of an array.
- An app is served under an unprivileged nginx image and cannot bind port 80.
- An SPA route has no matching file and must fall back to `index.html` while real missing assets return 404 under the asset prefix.

## Key Entities

- **Config Preset**: A factory that returns plain configuration for Vue app tooling while leaving application-specific values configurable.
- **Feature-Sliced Architecture Rules**: Dependency-cruiser forbidden rules that enforce feature/view/component/service/generated-client boundaries.
- **Generated API Runtime**: Fetch-oriented helpers that attach base URL, credentials, auth, CSRF, and error normalization around generated clients.
- **CSRF Bootstrapper**: A cached token loader for unsafe methods.
- **ProblemDetail Normalizer**: A function that converts varied validation error payloads to the package's generic `ProblemDetail` shape.
- **SPA Nginx Template**: A rendered nginx server configuration for static Vite assets and browser history fallback.

## Out of Scope

- Migrating `/workspace/personal-stack` or `/workspace/website` to consume the new helpers.
- Choosing or enforcing a specific TypeScript OpenAPI generator.
- Adding production Dockerfiles, Kubernetes manifests, or workflow templates.
- Installing new network-fetched dependencies in this sandbox.
