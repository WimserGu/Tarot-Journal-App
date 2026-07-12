# Project Status

## Prompt 10: Reading Creation Flow

Implementation status: complete and verified.

### Completed Scope

- Reused the shared local journal store and existing `ReadingRepository`.
- Kept the existing Reading form, tarot card picker, draft/completed saves, detail screen, route prefills, and unsaved-change guard.
- Added a small submission guard so concurrent save taps produce only one repository call.
- Added regression coverage for deleting a middle card and keeping persisted card orders continuous.

### Verification

- Prettier check: passed.
- ESLint: passed with 0 errors and 0 warnings.
- TypeScript: passed.
- Vitest: 8 test files and 30 tests passed.
- Expo SDK alignment: passed. `react-native` is `0.79.6`, and the required `expo-font@~13.3.2` peer is installed.
- Babel runtime fix: `@babel/runtime@7.29.7` is a direct production dependency, so Metro can resolve its runtime helper from the app root.
- Expo Doctor: passed 18 of 18 checks.
- Expo Web: passed. `expo export --platform web --clear` completed successfully.
- Development directory: `C:\dev\Tarot-Journal-App`.

### Next Step

Prompt 11.

## Prompt 11: Tarot Card Picker

Implementation status: complete and verified.

### Completed Scope

- Reused the canonical 78-card metadata and the existing Reading form flow.
- Added normalized Chinese and English search that ignores case and extra whitespace.
- Added all, major/minor arcana, and four-suit filters with a single clear action.
- Made selected cards visible in the picker, including an accessible selected state and text label.
- Added an accessible quick orientation toggle while preserving the existing upright/reversed controls.
- Kept the picker image-free with consistent text-card placeholders.

### Verification

- Prettier check: passed.
- ESLint: passed with 0 errors and 0 warnings.
- TypeScript: passed.
- Vitest: 9 test files and 35 tests passed.
- Expo Web: `expo export --platform web --clear` completed successfully.

## Prompt 15A: Supabase Client Foundation

Implementation status: complete and verified.

### Completed Scope

- Added `@supabase/supabase-js` and `react-native-url-polyfill` without changing the default local adapter.
- Added strict public environment validation and a lazy Supabase client factory backed by AsyncStorage for session persistence.
- Added `.env.example` placeholders only; no real project URL or key is stored in source control.
- Documented the local-first adapter policy, public-variable boundaries, and optional Supabase MCP setup.
- Supabase client: complete.
- Local adapter default: complete.
- Migration: deployed.
- Authentication UI: not implemented.
- MCP: optional and not blocking.

### Verification

- Prettier check: passed.
- ESLint: passed with 0 errors and 0 warnings.
- TypeScript: passed.
- Vitest: 14 test files and 66 tests passed.
- Expo Doctor: 14 of 18 checks passed. The remaining checks could not run because this execution environment has no `npm` executable for Expo Doctor's dependency-tree subprocesses.
- Expo Web: `expo export --platform web --clear` completed successfully.

### Next Step

Prompt 15B.

## Prompt 15B: Supabase Schema and RLS

Implementation status: remote migration and RLS deployed; two-user RLS verification pending.

### Current Scope

- The initial migration is aligned with the Prompt 14 local domain model, including Topic icons, historical question snapshots, ordered card rows, and current enum values.
- RLS and minimum Data API grants are defined for every private business table; anonymous access is revoked.
- Unused AI-summary storage was removed from the MVP migration.
- The local adapter remains the default; no Supabase repository or authentication UI is enabled.
- Two-user RLS verification is pending.

### Remote State

- Remote migration deployed: yes.
- RLS deployed: yes.
- Supabase project linked: yes.
- Two-user RLS verification: pending.

### Verification

- Prettier check: passed.
- ESLint: passed with 0 errors and 0 warnings.
- TypeScript: passed.
- Vitest: 14 test files and 66 tests passed.
- Expo Web: `expo export --platform web --clear` completed successfully.
- Expo Doctor: 13 of 18 checks passed in this environment. Four dependency-tree checks and the npm-version check could not run because `npm` is unavailable. Doctor also reported `.expo` despite `git check-ignore` confirming `.expo/` is ignored and untracked.

### Next Step

Complete two-user RLS verification before Prompt 15C.

## Prompt 15C: Supabase Repositories

Implementation status: complete locally; remote migration and two-user RLS verification pending.

### Completed Scope

- Stable Topic, QuestionTemplate, and Reading contracts with unified repository errors and test overrides.
- Local adapters remain the default and support template display order, duplicate lookup, active toggles, bulk ordering, and Reading filters.
- Pure database mappers and Supabase adapters return domain models only and use local mutation listeners without Realtime.
- `0002_supabase_repositories.sql` safely backfills template display order and defines security-invoker Topic, template, and atomic Reading RPCs.
- Pages and hooks use stable factory exports instead of importing mock repository instances.

### Remote State

- Prompt 15B initial migration deployed: yes.
- Prompt 15C migration deployed: no (local file only).
- Default adapter: local.
- Real two-user RLS integration verification: pending.
- Mocked Supabase tests: local test doubles only; not proof of remote RLS, email, or session behavior.

### Verification

- Mapper unit tests: 5 passed.
- Local shared repository contracts: 4 passed.
- Mocked Supabase repository tests: 6 passed.
- Repository factory tests: 2 passed.
- Full Vitest suite: 18 files and 83 tests passed.
- Prettier, ESLint, and TypeScript: passed.
- Expo Web export: passed.
- Expo Doctor: 18 of 18 checks passed.
- Real remote two-user/RLS integration tests: pending until `0002_supabase_repositories.sql` is deployed.

### Next Step

Review and run `pnpm exec supabase db push`, perform authenticated two-user RLS/RPC integration tests, then begin Prompt 16.

- Manual Web check: selected three consecutive cards (The Fool, The Magician, The High Priestess); each selection retained its selected state and appended the next empty card slot.

### Next Step

Prompt 12.

## Prompt 12: Reading Detail, Editing, and Deletion

Implementation status: complete and verified.

### Completed Scope

- Expanded the local `ReadingRepository` with update, delete, and favorite operations.
- Added a full Reading detail screen with topic, question snapshot/source, cards, interpretation, feedback placeholder, status, favorite state, and metadata.
- Added an edit screen that reuses the existing Reading form, validation, duplicate-submission guard, and unsaved-change prompt.
- Added completed-to-draft confirmation, deletion confirmation, question-copy flow, and an ID-free plain-text share summary.
- Preserved historical question snapshots when an edited Reading keeps the same fixed-question template.

### Verification

- Prettier check: passed.
- ESLint: passed with 0 errors and 0 warnings.
- TypeScript: passed.
- Vitest: 10 test files and 43 tests passed.
- Expo Web: `expo export --platform web --clear` completed successfully.
- Manual Web check: opened a completed Reading detail and its edit form; verified topic, template source, status, favorite, feedback, ordered cards, orientations, positions, and prefilled form values.

## Prompt 13: Timeline and Same-Question Tracking

Implementation status: complete and verified.

### Completed Scope

- Added repository-level topic timeline queries with date, fixed-question, card-name, orientation, date-range, and favorite filters.
- Added a virtualized Topic timeline with clear filter, empty, no-result, draft, and completed states.
- Added same-question history using fixed-question IDs while retaining each Reading's historical question snapshot.
- Added factual comparisons of repeated, newly appearing, disappeared, and orientation-changed cards between two real records.
- Added topic and Reading detail entry points for timeline and same-question history.

### Verification

- Prettier check: passed.
- ESLint: passed with 0 errors and 0 warnings.
- TypeScript: passed.
- Vitest: 11 test files and 52 tests passed.
- Expo Web: `expo export --platform web --clear` completed successfully.
- Manual Web check: verified descending Topic timeline, Chinese card-name filtering, and a two-record same-question comparison.

## Prompt 14: Reliable Local Persistence

Implementation status: complete and verified.

### Storage Design

- Uses Expo-compatible `@react-native-async-storage/async-storage` below the existing shared `JournalStore` and repository interfaces.
- Persists Topics, fixed questions, question positions, Readings, and Reading cards in separate keys; canonical tarot card metadata remains bundled with the app.
- Stores a schema version independently and includes a version-zero-to-one migration path.
- Serializes writes through one store queue so overlapping writes cannot overwrite a newer snapshot.
- Quarantines malformed table payloads and skips malformed individual records while retaining valid data and recovery notices.

### Completed Scope

- Added durable hydration, recovery notices, reset-to-seed support, and stable storage errors to the existing shared store.
- Updated Topic and Reading adapters to wait for store hydration and persist all mutations.
- Added a QuestionTemplate repository interface and local adapter with CRUD and position persistence.
- Added a development-only reset-test-data control; it is not rendered in production builds.

### Verification

- Prettier check: passed.
- ESLint: passed with 0 errors and 0 warnings.
- TypeScript: passed.
- Vitest: 12 test files and 60 tests passed.
- Expo Web: `expo export --platform web --clear` completed successfully.
