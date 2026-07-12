# Tarot Journal App

Tarot Journal App is a private tarot journaling and trend-tracking app built with Expo, React Native, TypeScript, and Expo Router.

The app currently uses a local persistence adapter by default. A Supabase client foundation is present for a later adapter, but no Supabase data access, migrations, or authentication UI is enabled yet.

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

`local` is the default adapter and does not require Supabase values. Set `EXPO_PUBLIC_DATA_ADAPTER=supabase` only after a Supabase repository adapter is implemented; the app will then validate both public Supabase variables before creating a client. Public publishable keys may be present in the app, but service-role keys must never be used in Expo or committed to the repository.

## Local Data

Topics, fixed questions, readings, and reading cards are stored locally through AsyncStorage. The store keeps a schema version, serializes writes, and safely recovers from malformed persisted records. In development builds only, Settings offers a reset control that restores bundled test data.

## Supabase MCP

Supabase MCP is optional for local development and is not required by the app runtime. It can be configured manually later without changing this codebase.

## Supabase Database

The app still uses the local adapter by default. The initial Supabase schema,
RLS policies, and migration are deployed to the linked remote project. A
Supabase repository adapter and authentication UI are not implemented yet.

The linked project still requires two-user RLS verification before Prompt 15C.
For a future schema repair, do not edit the deployed migration; create a new
migration and deploy it after linking and inspecting the remote project:

```powershell
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase migration list
pnpm exec supabase db push
```

Do not edit an already deployed migration. Create a new migration for a repair,
then deploy it with `supabase db push`. RLS and the minimum table grants are
both required for Data API access. Never put a database password, access token,
or service-role key in Expo public variables or the repository.
