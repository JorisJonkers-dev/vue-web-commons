# Requirements Checklist: Vue Web Commons Package

## Spec Quality

- [x] Overview explains what is being specified and why it matters.
- [x] User scenarios describe consumer, maintainer, configuration, and UI-kit neutrality goals.
- [x] Functional requirements are numbered with `FR-n`.
- [x] Functional requirements are testable through metadata audits, import fixtures, configuration fixtures, or consumer build checks.
- [x] Success criteria are numbered with `SC-n`.
- [x] Success criteria are measurable and tied to observable package or consumer outcomes.
- [x] Assumptions, edge cases, key entities, and out-of-scope boundaries are present.
- [x] No unresolved clarification markers are used.

## Requirements Coverage

- [x] Package identity `@jorisjonkers-dev/vue-web-commons` is specified.
- [x] Built `dist` output and generated type declarations are required.
- [x] Public export metadata is required to reference built artifacts rather than source files.
- [x] `publishConfig` is required.
- [x] Vue, Pinia, Vue Router, and Faro packages are required as peers when part of the public runtime contract.
- [x] Peer packages are prohibited from being bundled as ordinary runtime dependencies.
- [x] PrimeVue, Vuetify, and other UI-kit dependencies are prohibited from the core package runtime contract.
- [x] UI-kit-specific future exports are required to be separated from the core package.
- [x] Generic-now exports are distinguished from injection-required exports.
- [x] `useAuth`, `useApiWithAuth`, auth-sensitive API defaults, and `useTheme` are required to receive consumer-provided configuration before extraction.
- [x] Auth routes, role mapping, CSRF cookie/header names, storage keys, and theme behavior are prohibited from being hardcoded.
- [x] Personal Stack consumption is specified as an exact Renovate-managed package version using short public coordinates.
- [x] Personal Stack continuous auto-deployment and non-versioned status are preserved.
- [x] Website adoption is acknowledged as future consumption, not first-release migration.

## Result

PASS
