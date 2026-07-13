# Tarot Journal App

Tarot Journal App is a private tarot journaling and trend-tracking app built with Expo, React Native, TypeScript, and Expo Router.

The app uses stable Topic, QuestionTemplate, and Reading repository contracts. The local AsyncStorage adapter remains the default; Supabase adapters are available when explicitly selected and an authenticated Supabase session is present.

## Tech Stack

- Expo
- React Native
- TypeScript with strict mode
- Expo Router
- AsyncStorage local persistence
- Optional Supabase JavaScript client foundation
- ESLint
- Prettier
- Android, iOS, and Web support

## Getting Started

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

Run on a specific platform:

```bash
npm run android
npm run ios
npm run web
```

## Quality Checks

Run lint:

```bash
npm run lint
```

Run TypeScript checks:

```bash
npm run typecheck
```

Format files:

```bash
npm run format
```

## Environment Variables

Copy `.env.example` to `.env`. Do not commit real keys.

```bash
EXPO_PUBLIC_DATA_ADAPTER=local
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`local` is the default adapter and does not initialize Supabase or require its values. Set `EXPO_PUBLIC_DATA_ADAPTER=supabase` to use the Supabase repositories; the app validates both public variables and repository calls require an authenticated session. Public publishable keys may be present in the app, but service-role keys must never be used in Expo or committed to the repository.

## Local Data

Topics, fixed questions, readings, and reading cards are stored locally through AsyncStorage. The store keeps a schema version, serializes writes, and safely recovers from malformed persisted records. In development builds only, Settings offers a reset control that restores bundled test data.

## Supabase MCP

Supabase MCP is optional for local development and is not required by the app runtime. It can be configured manually later without changing this codebase.

## Supabase Database

The initial schema, RLS, and Prompt 15C migration are deployed. Prompt 15C adds
`0002_supabase_repositories.sql`, which introduces template-level display order,
the Topic activity query, and transactional template/Reading RPCs. The adapters use RLS, never a service role,
and notify in-process listeners after successful mutations; cross-device
Realtime is outside this prompt.

Two-user remote RLS verification remains pending. Mocked repository tests do
not replace that integration check. For a future schema repair, do not edit the deployed migration; create a new
migration and deploy it after linking and inspecting the remote project:

```powershell
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase migration list
pnpm exec supabase db push
```

Repository and mapper tests run with `pnpm exec vitest run`. The full local
quality gate is Prettier, ESLint, TypeScript, Vitest, Expo Web export, and Expo
Doctor. Reading creation currently uses a database-generated UUID; a lost RPC
response can therefore require manual reconciliation before retrying. A future
idempotency key/client UUID can close that narrow retry window.

Do not edit an already deployed migration. Create a new migration for a repair,
then deploy it with `supabase db push`. RLS and the minimum table grants are
both required for Data API access. Never put a database password, access token,
or service-role key in Expo public variables or the repository.

## Authentication and onboarding

Prompt 16 provides centralized email/password authentication, session restoration,
sign-out, email-verification messaging, password recovery, protected routes, and
first-use onboarding. Pages call stable Auth APIs rather than Supabase directly;
passwords, tokens, full sessions, and recovery URLs are never logged.

Local mode never initializes Supabase Auth or cloud repositories. Entering the
development experience is persisted separately from journal data. The app displays
“Local Development Mode · Data is stored on this device”, and exiting does not delete
Topics, templates, or Readings.

Configure the applicable Supabase Auth redirect URLs:

```text
tarotjournal://recovery
http://localhost:8081/recovery
```

Use the exact production web origin for deployed web builds. Recovery handles PKCE
`code`, query/fragment tokens, and an already-restored session. Real email delivery,
confirmation, deep links, web callbacks, and two-user RLS remain manual checks.

Migration `0003_auth_onboarding.sql` adds RLS-protected `user_preferences` and is
intentionally local-only until manually reviewed and deployed:

```powershell
pnpm exec supabase migration list
pnpm exec supabase db push
```

## Statistics and traceability

The Insights tab provides historical Statistics without AI interpretation. A shared
StatisticsRepository composes the existing Reading, Topic, and QuestionTemplate
repositories, while a pure StatisticsService calculates counts, card frequency,
orientation, arcana, suit distribution, fixed-question frequency, streaks, recent
7/30-day activity, and current-versus-previous period quantities.

`includeDrafts` defaults to `false`. Topic and inclusive date filters are centralized
in `StatisticsFilter`; date-only boundaries use each Reading's `reading_timezone`.
Every aggregate carries source Reading IDs, and the page exposes links back to Reading
detail. Charts always show labels, counts, and percentages and have text empty states.
No SQL aggregation, RPC, view, migration, AI, or network statistics service was added.

Statistics tests cover empty data, drafts, duplicate cards, date boundaries, DST,
Topic filters, ratios, comparisons, streaks, trace IDs, repository consistency, page
states, and Reading-detail navigation.

## Weekly and monthly reviews

Prompt 18 adds global Weekly and Monthly Reviews without AI interpretation. Weeks
start on Monday in the selected IANA timezone; weekly and natural-month boundaries
use half-open intervals `[start, end)`, so DST, leap-year February, cross-month weeks,
and cross-year weeks do not rely on a fixed UTC duration. Drafts remain excluded by
default through the shared `StatisticsFilter.includeDrafts` semantics.

Creating a Review saves a Statistics snapshot, the source Reading IDs, a deterministic
source fingerprint, the selected timezone and draft policy, and an optional personal
summary. Opening a saved Review displays that snapshot rather than silently changing
it when Readings change. A neutral notice offers explicit regeneration; regeneration
keeps the personal summary unchanged. Every aggregate retains trace links to Reading
detail. Reviews can be deleted without deleting Topics, templates, Readings, or cards.

Local mode persists Reviews in a versioned AsyncStorage key. Supabase mode uses the
same ReviewRepository contract and the RLS-protected `reviews` table. Migration
`20260713073610_weekly_monthly_reviews.sql` is local-only and has not been deployed.
It adds no statistics RPC, view, or SQL aggregation. After review, deploy manually:

```powershell
pnpm exec supabase migration list --linked
pnpm exec supabase db push
pnpm exec supabase migration list --linked
```

Review tests cover timezone period boundaries, DST, weekly/monthly navigation,
snapshot construction, previous-period card/suit/orientation changes,
`firstEverCards`, fingerprints, strict mapping, local and mocked Supabase contracts,
factory overrides, trace navigation, empty/loading/error states, and submission guards.
Mocked Supabase tests are not proof of real remote RLS; authenticated two-user Review
CRUD and ownership isolation remain manual verification after migration deployment.

## Reading Follow-Ups

Prompt 20 adds neutral, traceable Follow-Ups for recording what happened after a
Reading and how the user understands it now. A Reading can have multiple Follow-Ups,
so a seven-day reflection never overwrites a later thirty-day reflection. Each record
separates `scheduledFor` (the planned review time) from `reviewedAt` (the actual
completion time).

The Reading detail screen can schedule a Follow-Up for 7 local calendar days, 30
local calendar days, or a custom date. Calendar calculations use the Reading's IANA
timezone and preserve local clock time across DST rather than adding fixed
milliseconds. Pending Follow-Ups are classified as `upcoming`, `due_today`, or
`overdue` using an explicit current time and user timezone. The home screen shows a
small in-app reminder list with completion, Reading trace, and 7/30-day snooze
actions; there are no push notifications, email reminders, or background schedulers.

Completed Follow-Ups use four descriptive outcome categories: happened in a similar
way, partly similar, did not happen in a similar way, or still unclear. The outcome
distribution counts completed Follow-Ups and retains source Follow-Up and Reading
IDs. It intentionally contains no accuracy, prediction-success, or combined "hit
rate" field. A user's multiline reflection is optional, is never automatically
rewritten, and is limited to 5,000 characters.

Local mode persists Follow-Ups in JournalStore schema version 3 and treats legacy
data without a Follow-Up table as an empty collection. Supabase mode uses the same
factory contract and the RLS-protected `reading_follow_ups` table. Deleting a Reading
cascades its cards and Follow-Ups; deleting a Follow-Up never changes its Reading or
other Follow-Ups.

Migration `20260713090039_reading_follow_ups.sql` was created locally only. It uses a
Reading foreign key with `ON DELETE CASCADE`, strict scheduled/completed constraints,
an exact-pending-schedule uniqueness rule, minimum Data API grants, and ownership RLS
that also verifies the linked Reading belongs to `auth.uid()`. Deploy only after
reviewing all pending migrations:

```powershell
pnpm exec supabase migration list --linked
pnpm exec supabase db push
pnpm exec supabase migration list --linked
```

Follow-Up tests cover local-calendar dates, DST and timezone boundaries, strict
mapping, local and mocked Supabase repository contracts, old local data, Reading
deletion cascade, neutral outcome distribution, source IDs, factory overrides, and
page models. Mocked Supabase tests are not proof of real RLS. Authenticated two-user
Follow-Up CRUD, cross-user Reading-link prevention, and remote cascade remain pending
until this migration is deployed.
