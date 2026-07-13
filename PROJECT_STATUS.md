# Project Status

## Prompt 27: Free Tarot Table (Phase 1)

Implemented a question-first, free-table draw flow. Draft DrawSessions can begin empty and persist the question, drawn-card order, reveal state, and remaining deck. Finishing hands the stored question and cards to Reading without inferring a spread. No migration was added.

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

## Prompt 21: Unified Draw Engine and Manual Card Entry

Implementation status: complete locally; migration deployment and real remote verification pending.

### Completed Scope

- Added a pure, injectable DrawEngine over the canonical 78-card deck with 1–10 card validation,
  no duplicates, deterministic ordering, and disabled/standard/expression reversal modes.
- DrawResult now owns its cards, effective configuration, and ISO creation time; random and time
  providers can both be fixed in tests.
- Added temporary in-memory DrawSession coordination, editable draw results, discard-without-save,
  and handoff into the existing Reading creation form.
- Unified App-drawn and manually entered cards through `ReadingCard.source`, `drawSessionId`, and
  neutral optional `reversalExpression` fields. Existing manual Reading creation/editing remains available.
- Added manual and draw-result controls for upright, ordinary reversed, underexpressed, and
  overexpressed states; upright cards always clear the expression.
- Upgraded local persistence to schema version 4 with safe legacy defaults and strict validation.
- Added strict Supabase mapping and updated atomic Reading RPC payloads.
- Created local-only migration `20260713103538_unified_card_entry.sql`; no existing migration was modified.
- Statistics and Reviews continue using the unified card orientation and require no separate draw logic.

### Integration Status

- Default adapter: local.
- Prompt 21 migration deployed remotely: no.
- Existing RLS policies/grants expanded: no.
- Real authenticated Supabase create/update and remote legacy-row verification: pending after deployment.
- DrawSession persistence, complex spreads, animations, custom probabilities, AI, sharing, and export: not started.

### Verification

- Prettier check: passed.
- ESLint: passed with 0 warnings.
- TypeScript: passed.
- Vitest: 41 files and 248 tests passed; the focused draw/Reading/persistence/Supabase suite passed
  9 files and 62 tests.
- Expo Web export: passed (990 modules).
- Expo Doctor: passed 18 of 18 checks.
- Browser regression: all three reversal modes, result editing, manual card addition, Reading save/detail,
  Statistics consumption, pure manual entry, and legacy Reading detail/edit passed in local mode.

### Next Step

Review and deploy the pending migrations, verify manual/drawn Reading CRUD with an authenticated user,
and confirm older remote Reading cards read as manual before planning a later visual draw experience.

## Prompt 25: Import Assistant Phase 1

Implementation status: complete locally; no migration created.

- External AI is optional and only formats user-selected text; the app parses pasted blocks locally and makes no AI API or text-upload request.
- Candidates are editable, topics use exact title matching or explicit creation, and imported cards are manual with no DrawSession or inferred spread.
- Sequential import reports partial failures and supports retrying only failed candidates; app-internal back navigation warns before an import draft is discarded. Web refresh/close interception is not implemented.

## Prompt 24: Draw Session Detail & Historical Experience

Implementation status: complete locally; no migration created.

### Completed Scope

- Added a dedicated Draw Session Detail page that renders the persisted card and position snapshots, rather than regenerating labels from the current spread metadata.
- Added Reading-to-original-draw navigation, related Reading lists, deleted-link messaging, and the ability to create another Reading from a saved DrawSession.
- Added Draw History status filters and newest/oldest ordering.
- Extended `DrawSessionRepository` with `listRelatedReadings`, implemented from the existing Reading-card provenance marker in local and Supabase adapters.
- Statistics and Reviews remain Reading-only.

## Prompt 23: Draw Session Persistence (Phase 1)

Implementation status: complete locally; Supabase migration deployment remains pending.

### Completed Scope

- Added persistent, user-owned DrawSession and DrawSessionCard models independent from Reading snapshots.
- Added local AsyncStorage persistence (schema version 6), strict single-draft validation, and repository adapters for local and Supabase data modes.
- Drawing now creates a draft immediately; reopening Draw offers the active draft for continuation or deletion.
- Saving a Reading marks its DrawSession as `saved` and links the new Reading without changing the original draw cards.
- Added Draw History with draft continuation/deletion and navigation to saved Readings.
- Added local-only migration `20260713163935_draw_session_persistence.sql` with RLS, user ownership, one-active-draft indexing, card position uniqueness, and no migration of legacy Readings.

### Intentional Limits

- Phase 1 permanently deletes discarded drafts. Recycle/recovery UI is deferred.
- Statistics and Reviews remain Reading-only; a standalone DrawSession never contributes to either.
- The new migration is not deployed remotely and must follow the already-pending Prompt 21/22 migrations.

## Prompt 22: Spread Engine Phase 1

Implementation status: complete locally; migration deployment and real remote verification pending.

### Completed Scope

- Added a pure immutable Spread domain and repository with Single Card, Three Card, Situation, and
  1–10 card Open spreads.
- Integrated semantic spread positions into both Draw and manual Reading entry without creating a
  second Reading workflow.
- Added strict fixed-count/position validation, safe spread changes, legacy-null compatibility, and
  position-aware Reading detail rendering.
- Upgraded local persistence to schema version 5 and added strict Supabase mapping/RPC payloads.
- Created local-only migration `20260713121140_spread_engine.sql`; no deployed migration was changed.
- Statistics, Reviews, Follow-Ups, authentication, and the default local adapter remain unchanged.

### Verification

- TypeScript: passed.
- Vitest: 42 files and 255 tests passed.
- Migration deployment: pending; real authenticated Supabase Reading CRUD verification is pending.

### Next Step

Review and deploy the Prompt 21 and Prompt 22 migrations in order, verify legacy and spread Reading
CRUD with an authenticated user, then plan Prompt 23. Prompt 23 has not started.

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

Implementation status: complete; remote migration deployed and two-user RLS verification pending.

### Completed Scope

- Stable Topic, QuestionTemplate, and Reading contracts with unified repository errors and test overrides.
- Local adapters remain the default and support template display order, duplicate lookup, active toggles, bulk ordering, and Reading filters.
- Pure database mappers and Supabase adapters return domain models only and use local mutation listeners without Realtime.
- `0002_supabase_repositories.sql` safely backfills template display order and defines security-invoker Topic, template, and atomic Reading RPCs.
- Pages and hooks use stable factory exports instead of importing mock repository instances.

### Remote State

- Prompt 15B initial migration deployed: yes.
- Prompt 15C migration deployed: yes.
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
- Real remote two-user/RLS integration tests: pending until authentication test users are available.

### Next Step

Perform authenticated two-user RLS/RPC integration tests.

## Prompt 16: Authentication and onboarding

Implementation status: implemented locally; Prompt 16 migration and real Auth integration verification pending.

### Completed Scope

- Central Auth provider/service, stable error mapping, session restoration/listener cleanup, and duplicate-submit guards.
- Email sign-up/sign-in, verification branch, sign-out, generic password recovery, callback handling, and password update.
- Central Expo Router protected navigation with a stable loading gate.
- Persisted local development entry without Supabase Auth, with a clear environment banner.
- Shared local/Supabase onboarding repository and safe owned upsert semantics.
- Three-step onboarding for purpose, first Topic, and first fixed question, including skip and non-destructive review mode.
- Local-only `0003_auth_onboarding.sql` with RLS-protected `user_preferences`.

### Integration Status

- Auth/onboarding unit and mocked tests: 17 passed; full suite currently 21 files and 100 tests.
- Local Web regression: welcome, local entry, forced onboarding, skip, persistent re-entry, environment banner, Settings review mode, and non-destructive exit verified.
- Prettier, ESLint, TypeScript, Expo Web export, and Expo Doctor 18/18: passed.
- Real Supabase sign-up, email delivery/confirmation, recovery, mobile/web deep links: pending manual verification.
- Real `user_preferences` RLS and Prompt 15C two-user RLS/RPC verification: pending.
- Default adapter: local. Prompt 17 has not started.

### Next Step

Deploy `0003`, configure redirect URLs, and complete real Auth and two-user RLS checks.

## Prompt 17: Basic Statistics and Traceable Insights

Implementation status: complete locally and verified.

### Completed Scope

- Added a StatisticsRepository facade over existing Reading, Topic, and QuestionTemplate contracts; local and Supabase remain hidden from the page.
- Added a pure StatisticsService and reusable StatisticsResult/StatisticsFilter domain models.
- Added Reading/card counts, Top 10 cards, upright/reversed counts and ratios, arcana and suit distribution, recent 7/30-day activity, fixed-question counts, consecutive-card streaks, and equal-period quantity comparisons.
- Every aggregate includes source Reading IDs and navigates to Reading detail.
- Added lightweight text/count/percentage horizontal bars without a chart dependency.
- Added Topic, inclusive date-range, and include-drafts filters; drafts are excluded by default and date-only boundaries use Reading timezone.
- No migration, SQL aggregation, RPC, view, AI, prediction, export, or sharing was added.

### Verification

- Statistics service/repository/page-model tests cover counts, duplicate cards, arcana, suits, orientation, questions, drafts, Topic/date filters, DST, empty/invalid ranges, comparison, streaks, trace, loading/empty/error/content states, navigation, and local/mocked-Supabase output consistency.
- Statistics-specific tests: 17 passed; full suite: 24 files and 117 tests passed.
- Existing Prompt 15 repository and Prompt 16 Auth/onboarding suites remain in the full regression gate.

### Next Step

Prompt 18 may reuse StatisticsResult directly; Prompt 18 has not started.

## Prompt 18: Weekly and Monthly Reviews

Implementation status: complete locally; Review migration deployment and real RLS verification pending.

### Completed Scope

- Added stable ReviewRepository, local and Supabase adapters, strict Review mapper,
  repository factory integration, local listeners, and unified repository errors.
- Added pure timezone-aware weekly/monthly period utilities using Monday weeks,
  natural calendar months, and `[start, end)` boundaries.
- Reused Prompt 17 StatisticsService to build immutable-by-default Review snapshots,
  active Topics, top cards, first-ever cards, fixed-question counts, previous-period
  card/suit/orientation changes, source Reading IDs, and deterministic fingerprints.
- Added optional personal summaries with a 5,000-character limit, preserved newlines,
  duplicate-submit protection, failure retention, explicit regeneration, and deletion
  that never touches journal source data.
- Added Review list/detail routes, Weekly/Monthly and period navigation, IANA timezone,
  include-drafts control, current-period indicator, neutral stale-data notice, and
  traceable Reading-detail links.
- Created local-only migration `20260713073610_weekly_monthly_reviews.sql` with the
  `reviews` table, ownership RLS, minimum grants, database uniqueness, constraints,
  timezone validation, and updated-at trigger. Existing migrations remain unchanged.

### Integration Status

- Default adapter: local.
- Review migration deployed remotely: no.
- Mocked Supabase Review tests: local test doubles only.
- Real authenticated Review CRUD and two-user RLS isolation: pending after deployment.
- No AI, LLM, interpretation, prediction, sharing, export, reminders, or Prompt 19 work.

### Verification

- Review-specific tests: 6 files and 42 tests passed; full suite: 30 files and 159 tests passed.
- Prettier, ESLint with zero warnings, and TypeScript: passed.
- Expo Web export: passed.
- Expo Doctor: 18 of 18 checks passed.
- Local browser regression: Weekly/Monthly switching, timezone period navigation,
  current-period state, snapshot save, multiline summary, detail rendering, and
  Reading trace navigation passed.

### Next Step

Review and deploy the Prompt 18 migration, run authenticated two-user Review CRUD/RLS
verification, then begin Prompt 19 separately.

## Prompt 20: Follow-Up and Later-Outcome Reflections

Implementation status: complete locally; migration deployment and real RLS verification pending.

### Completed Scope

- Added a stable FollowUpRepository with local and Supabase adapters, strict mapper,
  repository factory integration, unified repository errors, and in-process mutation
  listeners without Realtime.
- A Reading supports multiple scheduled or completed Follow-Ups. `scheduledFor`
  preserves the planned date while `reviewedAt` records the actual completion time.
- Added 7-day, 30-day, and custom calendar-date scheduling using the Reading timezone,
  explicit-now due-state calculation, DST-safe calendar arithmetic, and in-app snooze.
- Added Reading-detail scheduling and history, home overdue/due-today reminders,
  all/pending/completed lists, detail, completion, editing, deletion, and source
  Reading navigation.
- Added a neutral outcome distribution over completed Follow-Ups with source Follow-Up
  and Reading IDs. No accuracy, prediction-success, AI, LLM, notification, or
  background scheduling feature was added.
- Local JournalStore schema version 3 persists Follow-Ups and loads old data without
  the new table as an empty collection. Reading deletion cascades Follow-Ups locally;
  Follow-Up deletion never changes the Reading.
- Created local-only migration `20260713090039_reading_follow_ups.sql` with strict
  state/outcome constraints, Reading `ON DELETE CASCADE`, RLS ownership checks,
  linked-Reading ownership validation, explicit authenticated grants, indexes,
  updated-at trigger, and pending-schedule uniqueness.

### Integration Status

- Default adapter: local.
- Follow-Up migration deployed remotely: no.
- Existing deployed migrations modified: no.
- Mocked Supabase Follow-Up tests: local test doubles only.
- Real authenticated Follow-Up CRUD, two-user RLS isolation, cross-user Reading-link
  prevention, and remote Reading cascade: pending after migration deployment.
- Prompt 19 AI implementation remains deferred; no next Sprint has started.

### Next Step

Review and deploy all pending migrations, perform the documented two-user Follow-Up
RLS/cascade verification, then prepare an AI technical design separately without
enabling a real provider.

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
