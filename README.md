# Tarot Journal App

UI 2.0 Phase 1 uses the Lunar Mystic / Moonlight design system on Home and Reading Detail. See [docs/UI_2_MOONLIGHT_DESIGN_SYSTEM.md](docs/UI_2_MOONLIGHT_DESIGN_SYSTEM.md) for tokens, reusable components, accessibility rules and the remaining migration plan.

Tarot Journal App is a private tarot journaling and trend-tracking app built with Expo, React Native, TypeScript, and Expo Router.

The app uses stable Topic, QuestionTemplate, and Reading repository contracts. The local AsyncStorage adapter remains the default; Supabase adapters are available when explicitly selected and an authenticated Supabase session is present.

## Topic-scoped question tags (Phase 1)

Each Reading may optionally reference one question tag owned by its Topic. Users manage tags from the
Topic detail page, reuse them in new/edit Reading forms and Import Assistant, and see an “未分类”
bucket when no tag is selected. Relationship Topics can explicitly add the presets “对方的想法”、
“我的状态”、“关系走向”、“沟通” and “行动建议”; the App never assigns a tag automatically and
tags never cross Topic boundaries. Insights shows the selected Topic grouped by tag using Reading
history only, without AI or semantic matching.

Local persistence schema version 7 stores tags and legacy Readings load with `question_tag_id = null`.
The pending migration `20260714180000_question_tags_phase_1.sql` creates `question_tags`, adds the
nullable Reading reference, enforces same-user/same-Topic integrity, and enables RLS. It has not been
deployed remotely.

## Tech Stack

- Expo SDK 54
- React Native 0.81
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
pnpm install
```

Start the Expo development server:

```bash
pnpm exec expo start
```

Run on a specific platform:

```bash
pnpm android
pnpm ios
pnpm web
```

## Quality Checks

Run lint:

```bash
pnpm lint
```

Run TypeScript checks:

```bash
pnpm typecheck
```

Format files:

```bash
pnpm format
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

## Instant Draw and Unified Card Entry

Prompt 21 adds two equal Reading entry paths: **即时抽牌** uses a pure DrawEngine, while
**手动录入实体牌** keeps the existing Reading form. Both paths persist the same `Reading` and
`ReadingCard` models, so Statistics, Reviews, Follow-Ups, and future features do not branch on how
the card was entered.

- `ReadingCard.source` is `drawn` for cards produced by the App and `manual` for physical-card entry.
- Legacy cards safely load as `source = manual`, `reversalVariant = null`, and `drawSessionId = null`.
- Reversal modes are `disabled`, `standard`, and `dual`. Standard mode keeps the traditional
  upright / reversed states; dual mode uses upright / reversed-left / reversed-right.
- A reversed card may optionally use the neutral `left` or `right` variant. The App does not assign
  meanings to either direction; users decide how, or whether, to interpret them.
- An upright card always clears `reversalVariant`.
- `DrawResult` is a temporary domain value containing the drawn cards, the effective configuration,
  and an ISO creation time. Random and time providers are injectable for deterministic tests.
- DrawSession is temporary in v1. It holds configuration and editable results in memory, links to a
  Reading after save, and is discarded without creating a separate history or database table.
- The DrawEngine prevents duplicate cards, supports 1–10 cards and disabled/standard/dual
  reversal modes, and accepts an injectable RandomProvider for deterministic tests. Within the draw
  feature, `Math.random()` is isolated to the default infrastructure provider.
- Cards manually added on the draw result page are persisted as `manual`; editing an engine-produced
  card preserves `drawn` provenance.

The local-only migration is `20260713103538_unified_card_entry.sql`. It adds `source`,
`draw_session_id`, and `reversal_expression` to `reading_cards`, adds consistency constraints, and
updates the existing security-invoker atomic Reading create/update RPCs. It does not add a
`draw_sessions` table, change RLS policies, or expand grants. Deploy manually after review:

```powershell
pnpm exec supabase migration list --linked
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
pnpm exec supabase migration list --linked
```

The current Supabase card columns retain their historical `reversal_expression` constraints. To avoid
a new migration in this revision, repository mappers temporarily encode `left` and `right` using the
deprecated storage values `underexpressed` and `overexpressed`, and decode them at the repository
boundary. These deprecated names never enter the current domain or UI. Local JSON and legacy
DrawSession configuration are normalized in the same direction. No remote migration was deployed.

Card artwork uses one centralized rotation mapping: upright is 0°, ordinary reversed is 180°,
reversed-left is about -30°, and reversed-right is about +30°. Only the artwork rotates; table
placement, hit targets, controls, labels, notes, and accessibility elements remain upright. Reduced
Motion skips the transition and shows the final angle immediately.

Statistics continue to count every reversed card in the overall orientation total. A separate dual
reversal refinement counts only cards that actually have a left or right variant, so ordinary
reversals are never forced into a side. No meaning is inferred from either direction.

## Import Assistant (Phase 1)

Import Assistant copies a neutral formatting prompt, then parses pasted `[Reading]` blocks locally. External AI services only format text the user chooses to share; this app makes no AI API request and never uploads pasted history. Candidates are reviewed and edited before sequential import. Topic titles match exactly or are created explicitly; cards import as `manual`, without DrawSessions or inferred spreads. Strict card lines accept `upright`, ordinary `reversed`, `reversed | left`, and `reversed | right`; the formatter must not infer a side from card meanings. Partial failures remain visible and can be retried. No migration is added. App-internal navigation warns about losing an active import draft; browser refresh/close cannot be reliably intercepted.

## Free Tarot Table (Phase 1)

The instant-draw entry first presents four draw modes: Free Tarot Table, Single Card, Three Cards, and the honestly marked not-yet-available Custom Spread editor. Free Table starts with a question and lets the user decide how many cards to select; Single and Three Cards reuse the built-in Spread Engine positions. The table, draw order, reveal progress, orientation, question, and remaining deck are restored from the DrawSession draft. No AI API, migration, or sharing is involved.

The table experience uses a full-height, dark cloth surface with a quiet question header, naturally offset cards, and a low-contrast toolbar. The virtualized face-down deck remains attached to the table edge: touch users swipe it directly, while desktop users can click-drag it. A movement threshold keeps a click selecting a card and a drag scrolling the deck. Scroll indicators and the numerical remaining-card count are intentionally hidden.

### Digital Tarot Table MVP

The Free Tarot Table is now a directly manipulated workspace. A click on the virtualized hidden-card river selects that exact persisted hidden card, while an 8 px movement threshold turns the same gesture into horizontal drag scrolling without drawing. Face-down and revealed cards can be moved independently on the table; taps reveal face-down cards or open Focus Card for revealed cards. `Finish` remains explicit, so revealing the current cards never prevents drawing more.

Table placement is stored inside the existing DrawSession configuration as normalized `x`/`y` coordinates plus a small z-index. Positions therefore restore proportionally at different viewport sizes. Old DrawSessions without placement data receive deterministic in-memory defaults and are not rewritten until the user acts. Local JSON persistence and the Supabase configuration mapper preserve placement alongside the hidden deck, reveal order, observation state, and temporary notes. No migration is required.

Tarot visuals now use a centralized Rider–Waite–Smith theme registry covering all 78 stable card IDs. The historical “Pam-A” scan set comes from the Wikimedia Commons TaionWC collection; every individual file was checked through the Commons API for a Public Domain label. Assets are normalized to 456 × 787 without cropping symbolic content or recoloring. A neutral original App card back and missing-art fallback are bundled separately. Traditional reversed cards rotate the image by 180 degrees; dual reversed cards use about -30 or +30 degrees while controls and metadata remain upright.

The table, Single Card, Three Card, Focus Card, Draw Session detail, and Reading detail all resolve artwork from the existing numeric `tarotCardId`. Old records therefore display the current default theme without data changes. The card river repeats only the lightweight back asset and never loads hidden fronts. Full source, per-file URLs, Commons SHA-1 values, license labels, processing notes, jurisdiction caveat, and card-back origin are recorded in `assets/tarot/rws/ARTWORK_SOURCE.md` and `source-files.json`. No modern commercial edition, AI-generated replacement art, image upload, Supabase binary, or migration is involved.

Future artwork themes can be added by registering another immutable `TarotDeckTheme`; Phase 1 exposes only Rider–Waite–Smith and the Settings attribution page is informational rather than a fake selector. Run `pnpm test:rws-assets` to audit the 78 mappings, source records, missing files, orphan files, card back, and fallback.

Current Phase 1 limitations: no user-controlled rotation, resizing, multi-select, advanced stacks, custom deck switching UI, AI interpretation, sound, or haptics. Pointer placement has keyboard-accessible tap actions, but keyboard coordinate movement is not included yet. Public-domain applicability still depends on the user's jurisdiction; modern derivative RWS editions are not included.

## Interactive Tarot Table (Phase 2)

Revealed cards can be focused individually, while users may continue drawing and reveal in any order. Observation Mode hides controls until the user taps to return. Optional per-card observation notes, reveal order, and observation state remain only in DrawSession configuration and are not automatically copied to Reading. No migration or AI is used.

## Natural Drawing Experience (Phase 1)

Each free-table session creates one hidden shuffled deck and persists its order in DrawSession configuration. The horizontally scrollable table edge shows only face-down backs; selecting one uses its already-assigned hidden card and removes it from the edge. The deck is never reshuffled during a session, so restoration preserves the same remaining order. No migration is used.

## Built-in Spread Engine

Prompt 22 adds an immutable, domain-only `SpreadRepository` shared by draw and manual Reading entry.
It provides exactly four built-ins: Single Card (Reflection), Three Card
(Past/Present/Future), Situation (Situation/Challenge/Advice), and Open. Open supports 1–10 numbered
positions; the other spreads derive their card count from their position definitions.

- `Reading.spread_id` identifies the selected spread and `ReadingCard.spreadPositionId` identifies the
  semantic position. Legacy rows keep both values `null` and remain editable.
- Position order remains derived from `position_order`; position IDs and fixed-spread card counts are
  strictly validated before persistence.
- Changing a spread preserves cards by index, creates empty positions when growing, and requires an
  explicit destructive confirmation before filled cards would be removed.
- Draw results and manual entry save through the existing Reading model and repositories. Statistics,
  Reviews, and Follow-Ups continue to consume Reading cards without spread-specific calculations.
- Built-in spreads are application metadata: there is no spread table, Supabase CRUD, custom-spread
  persistence, animation, AI interpretation, or draw-session history in this phase.

Local migration `20260713121140_spread_engine.sql` adds nullable `spread_id` and
`spread_position_id` markers and updates the existing atomic Reading RPCs. It has not been deployed.
After review, deploy it with the normal linked-project migration workflow.
