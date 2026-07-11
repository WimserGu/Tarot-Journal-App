# Tarot Journal App MVP Database Design

> Migration: `supabase/migrations/0001_initial_schema.sql`
> Deployment status: prepared locally; remote deployment is recorded in `PROJECT_STATUS.md`.

## Scope and alignment

This schema mirrors the current local persistence model from Prompt 14. The
local adapter remains the default; no Supabase repository or authentication UI
is active yet.

The database deliberately uses the existing TypeScript names below instead of
introducing a second vocabulary:

| Product wording       | Persisted field                                   | Reason                                                                                        |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Topic name            | `topics.title`                                    | Matches `Topic` and the current forms.                                                        |
| Cadence               | `question_templates.frequency`                    | `as_needed`, `daily`, and `weekly` match `QuestionFrequency`.                                 |
| Question snapshot     | `readings.question_text_snapshot`                 | Matches `Reading`.                                                                            |
| Card identifier       | `reading_cards.tarot_card_id` -> `tarot_cards.id` | The stable English identifier is `tarot_cards.card_key`; display names are never identifiers. |
| Card order / position | `position_order` / `position_name`                | Matches `ReadingCard` and template position models.                                           |

There is no `reviews`, separate `follow_ups`, or AI-summary table in this MVP.
`FollowUp` is currently a typed view over `readings.reality_feedback`, so a
second table would duplicate data without an active repository contract.

## Tables

| Table                         | Ownership                | Purpose                                                                 |
| ----------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `auth.users`                  | Supabase Auth            | Account UUIDs; not created by this migration.                           |
| `tarot_cards`                 | Shared read-only catalog | Canonical seeded 78-card metadata.                                      |
| `topics`                      | User-owned               | Long-term journal topics.                                               |
| `question_templates`          | User-owned               | Repeatable questions for a topic.                                       |
| `question_template_positions` | User-owned               | Optional default spread positions.                                      |
| `readings`                    | User-owned               | One draw, its immutable question snapshot, notes, status, and feedback. |
| `reading_cards`               | User-owned               | Any number of cards within a reading.                                   |

## Fields and constraints

### `tarot_cards`

The catalog is seeded with exactly 78 rows. Its `id` is a stable `smallint`
from 0 to 77 and `card_key` is a unique stable English machine key such as
`swords_eight`. `name_zh` and `name_en` are display fields only. `arcana`,
`suit`, rank, and display ordering are checked by database constraints.

### `topics`

`id`, `user_id`, `title`, `description`, `icon`, `is_pinned`, `archived_at`,
`created_at`, and `updated_at`. `icon` is constrained to the current
`TopicIcon` values: `book`, `briefcase`, `compass`, `heart`, `moon`, and
`sparkles`. Titles are trimmed and limited to 120 characters.

### `question_templates`

`id`, `user_id`, `topic_id`, `question_text`, `frequency`, `is_active`,
`is_pinned`, `created_at`, and `updated_at`. Frequency is a text check rather
than a PostgreSQL enum so a future vocabulary change can be migrated in data
without replacing an enum type. Allowed values are `as_needed`, `daily`, and
`weekly`, exactly matching TypeScript.

`question_template_positions` stores `id`, `user_id`,
`question_template_id`, `position_order`, `position_name`, timestamps, and a
deferrable unique constraint on `(question_template_id, position_order)`.

### `readings`

`id`, `user_id`, optional `topic_id`, optional `question_template_id`,
`question_text_snapshot`, `reading_at`, `reading_timezone`, `interpretation`,
`reality_feedback`, `status`, `is_favorite`, and timestamps. Status is checked
as `draft` or `completed`. Drafts may be incomplete; the existing application
and repository enforce that completed readings have a topic, question, and at
least one selected card.

For a template-based reading, a small database trigger copies the template
text into `question_text_snapshot` when the template or topic changes. Editing
the template later therefore cannot rewrite the historical question.

### `reading_cards`

`id`, `user_id`, `reading_id`, optional `tarot_card_id`, `position_order`,
optional `position_name`, `orientation`, and timestamps. One row is one card;
there is no fixed card-count limit. Orders start at one and are unique per
reading through a deferrable unique constraint. Orientation is checked as
`upright` or `reversed`. A blank position is represented consistently as SQL
`NULL` by the application boundary.

## Relationships and deletion rules

All user-owned rows have `user_id` referencing `auth.users(id)` with account
deletion cascading only that user's data.

| Child relationship             | Delete behavior                   | Rationale                                                                                                        |
| ------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Template -> Topic              | `CASCADE`                         | Current local Topic deletion removes its templates.                                                              |
| Template positions -> Template | `CASCADE`                         | Positions have no independent meaning.                                                                           |
| Reading -> Topic               | `CASCADE`                         | Matches the current confirmed local Topic deletion flow, which explicitly reports associated readings and cards. |
| Reading -> Template            | `SET NULL (question_template_id)` | A removed template never destroys historical readings; the snapshot remains.                                     |
| Reading card -> Reading        | `CASCADE`                         | Removing a reading removes its cards.                                                                            |
| Reading card -> Tarot card     | `RESTRICT`                        | The canonical catalog cannot lose a card used by history.                                                        |

Composite foreign keys that include `user_id` prevent cross-user Topic,
template, position, reading, and card links at the database layer. RLS provides
the request-level protection as well.

## Indexes

| Index                                      | Query supported                            |
| ------------------------------------------ | ------------------------------------------ |
| `topics_active_list_idx`                   | A user's active pinned/recent topics.      |
| `question_templates_active_list_idx`       | Active fixed questions for a topic.        |
| `question_template_positions_template_idx` | Positions in display order.                |
| `readings_topic_timeline_idx`              | Completed topic timeline by date.          |
| `readings_question_timeline_idx`           | Completed same-question history.           |
| `readings_drafts_idx`                      | Recovering recent drafts.                  |
| `readings_favorites_idx`                   | Favorite completed readings.               |
| `reading_cards_analysis_idx`               | Card-frequency and repeated-card analysis. |

## RLS and grants

RLS is enabled on every table exposed through the Data API. Private table
policies use `(select auth.uid()) = user_id` for `SELECT`, `INSERT`, `UPDATE`,
and `DELETE`; updates include both `USING` and `WITH CHECK`. The policies cover
`topics`, `question_templates`, `question_template_positions`, `readings`, and
`reading_cards`.

`tarot_cards` is the one non-private table. Authenticated users may only read
it; `anon` has no access. `anon` receives no schema or table privileges.
`authenticated` receives `USAGE` on `public` and only the table operations
implemented by the current local repository contracts. Table grants never
replace RLS; both layers must allow a request.

The migration revokes public execution of its trigger functions. A service-role
key is never used by the Expo client and must not be stored in source control.

## Migration workflow

The initial migration has not yet been deployed, so it may be corrected before
the first remote push. Once deployed, do not edit it: create a new timestamped
migration for every schema change.

```powershell
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase migration list
pnpm exec supabase db push
```

Verify RLS, policies, and grants after deployment in the Supabase dashboard or
SQL editor. Use two fictitious test users and remove their test data afterward;
never use real journal records for permission tests.
