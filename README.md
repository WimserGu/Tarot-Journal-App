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

The initial schema and RLS are deployed. Prompt 15C adds local-only migration
`0002_supabase_repositories.sql`, which introduces template-level display order,
the Topic activity query, and transactional template/Reading RPCs. It has not
been pushed to the remote project. The adapters use RLS, never a service role,
and notify in-process listeners after successful mutations; cross-device
Realtime is outside this prompt.

Two-user remote RLS verification remains pending. Mocked repository tests do
not replace that integration check. After reviewing the migration, deploy it:
For a future schema repair, do not edit the deployed migration; create a new
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
