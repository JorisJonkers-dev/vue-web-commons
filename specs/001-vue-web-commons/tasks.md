# Tasks: Vue Web Commons Package

## Phase 1: Project Scaffold

- [x] T001 [FR-1..FR-6] Create npm package metadata, package-lock, Vite, TypeScript, Vue, Vitest, ESLint, and build configs.
- [x] T002 [FR-21] Add package-coordinate TypeScript path aliases for local tests and consumer fixture validation.
- [x] T003 [FR-2, FR-3, FR-17] Configure build scripts to emit `dist` JavaScript, declarations, and `dist/theme.css`.

## Phase 2: Generic Exports

- [x] T004 [P] [FR-9] Port UI-kit-neutral components and component helper types from `/workspace/personal-stack/libs/vue-common/src/components`.
- [x] T005 [P] [FR-9] Port `useMutationState`, `useToast`, and `useFormErrors`.
- [x] T006 [P] [FR-9, FR-18, FR-19, FR-20] Port JWT utilities, shared types, and `initFaro`.
- [x] T007 [FR-9, FR-21] Create `src/index.ts` public exports for components, composables, observability, utilities, and types.
- [x] T008 [FR-17] Port and generalize `theme.css` comments/paths so the stylesheet is package-relative.

## Phase 3: Injection-Required Exports

- [x] T009 [FR-11, FR-12] Implement configurable `useAuth` with injected endpoints, user/role mapping, credentials, logout handling, CSRF source, and fetch implementation.
- [x] T010 [FR-13, FR-14] Implement configurable `useApi` and shared response parsing without fixed `/api/v1` defaults.
- [x] T011 [FR-13, FR-14] Implement configurable `useApiWithAuth` with injected CSRF header/source, unauthorized behavior, credentials, serializer defaults, and optional logout callback.
- [x] T012 [FR-15, FR-16] Implement configurable SSR-safe `useTheme` with injected storage key, modes, target, attribute/class behavior, and style application.
- [x] T013 [FR-10, FR-25] Document generic-now, injection-required, and excluded export groups in README.

## Phase 4: Tests and Fixtures

- [x] T014 [P] [SC-4, SC-10] Port generic component/composable/utility tests and keep them UI-kit-free.
- [x] T015 [P] [SC-5] Add `useAuth` and `useApiWithAuth` tests for two endpoints, role mappings, and CSRF cookie/header combinations.
- [x] T016 [P] [SC-6] Add `useTheme` tests for two storage keys and two DOM strategies.
- [x] T017 [SC-1, SC-4, SC-10, FR-21] Add a consumer fixture that imports a component, composable, type, JWT utility, `initFaro`, and `theme.css` from public package coordinates.
- [x] T018 [SC-1, SC-2, SC-3] Add package-audit validation for dry-run artifacts, peer dependency placement, and no UI-kit runtime dependencies.

## Phase 5: CI and Release

- [x] T019 [FR-1..FR-7, SC-1..SC-6, SC-10] Add `.github/workflows/ci.yml` with install, typecheck, lint, test, build, audit, fixture validation, and terminal `Pipeline Complete`.
- [x] T020 [FR-4] Add release-please config, manifest, `release.yml`, and `publish-on-tag.yml` for GitHub Packages npm publishing.
- [x] T021 [FR-22, FR-23, FR-24, SC-7, SC-8, SC-9] Document downstream Personal Stack exact-version adoption, deferred build validation, and unchanged deployment model.

## Phase 6: Verification and Landing

- [x] T022 Run `npm ci`.
- [x] T023 Run `npm run typecheck`.
- [x] T024 Run `npm run lint`.
- [x] T025 Run `npm test`.
- [x] T026 Run `npm run build`.
- [x] T027 Run `npm run package:check`.
- [x] T028 Run consumer fixture validation.
- [ ] T029 Commit, push `impl/initial`, open PR, poll `Pipeline Complete`, fix once if red, and squash-merge when green.

## Dependencies

- T001 blocks all source, test, build, and CI work.
- T004 through T006 may run independently after T001.
- T009 through T012 depend on shared types from T006 and public API decisions in T007.
- T014 through T018 depend on their corresponding implementation tasks.
- T019 and T020 depend on scripts from T001/T003/T018.
- T029 depends on local verification tasks T022 through T028.
