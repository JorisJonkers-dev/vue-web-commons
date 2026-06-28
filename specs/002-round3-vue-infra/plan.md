# Implementation Plan: Round 3 Vue Infrastructure Commons

**Branch**: `002-round3-vue-infra` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-round3-vue-infra/spec.md`

## Summary

Add three package subpaths to `@jorisjonkers-dev/vue-web-commons`: `./config` for Vue app config and dependency-cruiser presets, `./api-runtime` for generated-client browser runtime helpers, and `./nginx` for Vite SPA nginx config rendering. Keep app-specific values configurable and keep the existing main runtime entry point unchanged.

## Technical Context

**Language/Version**: TypeScript 6.x, Vue 3, Vite 8, Vitest 4
**Primary Dependencies**: Existing Vite, Vitest, `@vitejs/plugin-vue`, Vue package stack; no new installed dependencies
**Storage**: N/A
**Testing**: Vitest with jsdom and V8 coverage
**Target Platform**: Browser Vue apps and Node-side tooling config consumers
**Project Type**: Vue library package
**Performance Goals**: Config/render helpers are synchronous except API CSRF bootstrap; runtime request wrappers add only one optional async token lookup for unsafe methods
**Constraints**: No networked npm install; reference repos are read-only; keep `Pipeline Complete` CI contract green
**Scale/Scope**: Three extract-now items from round 3 for this repository

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] No attribution is introduced in files, comments, commit text, or PR text
- [x] Claude/Codex parity is preserved for any agent-facing behavior
- [x] Rendered artifacts are updated by the owning renderer when source changes require it
- [x] Small stacked PR boundary is clear and unrelated cleanup is excluded
- [x] Verification command is identified for each touched area

## Project Structure

### Documentation

```text
specs/002-round3-vue-infra/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
`-- tasks.md
```

### Source Code

```text
src/config/index.ts
src/config/vue.ts
src/config/dependencyCruiser.ts
src/api-runtime/index.ts
src/api-runtime/runtime.ts
src/nginx/index.ts
src/nginx/spa.ts
src/__tests__/configPreset.test.ts
src/__tests__/apiRuntime.test.ts
src/__tests__/nginxSpa.test.ts
test/consumer-fixture.ts
package.json
vite.config.ts
tsconfig.fixture.json
README.md
scripts/check-package.mjs
```

**Structure Decision**: Tooling and deployment helpers are exposed as package subpaths. The main `src/index.ts` stays runtime-focused and does not re-export config or nginx helpers.

## Phase 0: Outline & Research

1. Compare Personal Stack and Website Vite, Vitest, Playwright, TypeScript, dependency-cruiser, generated API runtime, and nginx files.
2. Identify common reusable behavior and app-specific values that must become options.
3. Verify package build can emit multiple entry points without requiring new dependencies.

**Output**: `research.md`

## Phase 1: Design & Contracts

1. Document option entities in `data-model.md`.
2. Document package subpath contracts in `contracts/package-subpaths.md`.
3. Write `quickstart.md` with consumer examples and validation steps.
4. Re-run Constitution Check.

**Output**: `data-model.md`, `contracts/package-subpaths.md`, `quickstart.md`

## Phase 2: Task Planning Approach

Tasks are ordered by the assignment: config/architecture presets, API runtime, then nginx template. Tests are added with each implementation area, followed by package export/docs/fixture validation.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| N/A | N/A | N/A |

## Progress Tracking

**Phase Status**:

- [x] Phase 0: Research complete
- [x] Phase 1: Design complete
- [x] Phase 2: Task planning approach complete

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
