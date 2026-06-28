# Package Subpath Contracts

## `@jorisjonkers-dev/vue-web-commons/config`

Exports:

- `createVueViteConfig(options?)`
- `createVueVitestConfig(options?)`
- `createVuePlaywrightConfig(options?)`
- `createVueTsConfig(options?)`
- `createFeatureSlicedDependencyCruiserConfig(options?)`
- `createFeatureSlicedDependencyCruiserForbiddenRules(options?)`

The factories return plain configuration objects. Consumers may pass them to `defineConfig` in their own tool config files.

## `@jorisjonkers-dev/vue-web-commons/api-runtime`

Exports:

- `resolveApiBaseUrl(options?)`
- `createApiFetch(options?)`
- `createCsrfBootstrapper(options)`
- `createHeyApiRuntimeConfig(defaultConfig?, options?)`
- `normalizeProblemDetail(input, fallback?)`
- `normalizeValidationErrors(input)`
- `isUnsafeHttpMethod(method?)`

The helpers are fetch-oriented and generator-agnostic. The hey-api helper is structural and introduces no package dependency.

## `@jorisjonkers-dev/vue-web-commons/nginx`

Exports:

- `createSpaNginxConfig(options?)`
- `createPrivilegedSpaNginxConfig(options?)`
- `createUnprivilegedSpaNginxConfig(options?)`

The functions return nginx configuration text.
