# UI 2.0 — Lunar Mystic / Moonlight Design System

## 1. Visual principles

Moonlight is calm, reflective and contemporary. It uses a deep blue-violet atmosphere, soft moonlit contrast and restrained glass surfaces. It must not suggest supernatural certainty or become gothic, neon-heavy or decorative at the expense of journaling.

The hierarchy is content-first:

1. the question and cards;
2. the user's interpretation and later feedback;
3. navigation and management actions.

## 2. Theme architecture

The default theme ID is `moonlight`. `ThemeProvider` resolves IDs through `themeRegistry` and persists the preference through the `ThemePreferenceStore` interface. Phase 1 registers only one theme; future themes must add a complete `AppTheme` implementation and a registry entry rather than branching inside pages.

Key files:

- `src/theme/types.ts`
- `src/theme/themes/moonlight.ts`
- `src/theme/themeRegistry.ts`
- `src/theme/themePreference.ts`
- `src/theme/ThemeProvider.tsx`
- `src/theme/useAppTheme.ts`

Legacy screens continue using `src/theme/tokens.ts` until deliberately migrated. This avoids an unsafe all-at-once visual rewrite.

## 3. Color tokens

| Role            | Value                       |
| --------------- | --------------------------- |
| Background deep | `#17142D`                   |
| Background mid  | `#29234B`                   |
| Background soft | `#514477`                   |
| Primary         | `#8D79D6`                   |
| Primary soft    | `#B5A7EA`                   |
| Moonlight       | `#E3DDF8`                   |
| Warm accent     | `#E8D4C5`                   |
| Text primary    | `#F6F2FF`                   |
| Text secondary  | `rgba(246, 242, 255, 0.76)` |
| Text muted      | `rgba(246, 242, 255, 0.54)` |
| Glass           | `rgba(255, 255, 255, 0.09)` |
| Elevated glass  | `rgba(255, 255, 255, 0.14)` |
| Glass border    | `rgba(255, 255, 255, 0.16)` |

Primary text is always used for long-form content. Muted text is reserved for metadata and never becomes the only status indicator.

## 4. Typography

- Display: 32 / 40, short greetings and primary questions only.
- Page title: 27 / 34.
- Section title: 20 / 28.
- Card title: 17 / 24.
- Body: 16 / 25.
- Caption: 13 / 19.

Phase 1 uses the system font stack to avoid layout shifts and missing Chinese glyphs. The theme exposes display/body family slots for a later audited font addition. Long Chinese or English text uses body styles and remains selectable/wrappable.

## 5. Spacing and radius

Spacing follows `4, 8, 16, 24, 32, 48`. Page sections normally use 24; compact metadata uses 4 or 8. Radius follows `10, 16, 22, 28`, with `pill` reserved for buttons, small statuses and filters.

Web content is centered and capped: Home at 1040 px and Reading Detail at 980 px. Small screens keep 24 px page padding and wrapping layouts.

## 6. Background rules

`MysticScreen` owns safe area, keyboard behavior, page width and the atmospheric background. The background is built from low-cost native layers: deep/mid fields, one soft top glow, one fog shape and five static star points. It does not use animated particles or require Blur/Gradient libraries.

Decorations are non-interactive and hidden from accessibility. They must never reduce text contrast.

## 7. Glass panels

`GlassPanel` variants:

- `default`: normal grouping;
- `elevated`: one visually important area per section, with restrained shadow;
- `subtle`: secondary metadata and list rows.

Glass always has a stable translucent fallback and a visible one-pixel border. Do not stack multiple elevated panels inside each other or apply glow to every panel.

## 8. Buttons

`MoonButton` variants are `primary`, `secondary`, `ghost`, and `destructive`. All provide a minimum 46 px target, pressed scale `0.98`, disabled opacity, loading state and accessibility state. Primary is reserved for the next meaningful action; edit/share/delete remain secondary.

## 9. Tarot card display and orientation

`TarotCardDisplay` wraps the existing artwork registry and never redefines orientation data.

- upright: 0°;
- ordinary reversed: 180°;
- reversed left: −30°;
- reversed right: +30°.

The text label and screen-reader label always name the direction, so rotation is not the only cue. Artwork rotates inside a stable, unrotated layout frame. The component supports compact, standard and hero dimensions, uses a restrained moon-white edge, and inherits the existing fallback artwork behavior.

## 10. Motion

Motion tokens are 180, 240 and 320 ms. Tarot cards use one short opacity/scale entrance. Buttons use pressed-state scale only. `useReducedMotion` disables the card entrance and displays final orientation immediately. No looping motion, particles, sound or vibration is allowed.

## 11. Accessibility

- Primary body text uses the highest contrast token.
- Buttons and icon controls have explicit labels and adequate hit areas.
- Statuses include text, not color alone.
- Layouts wrap under large text and narrow windows.
- Tarot orientation remains available in visible and spoken text.
- Decorative background layers are hidden from assistive technology.
- Reduced Motion is respected.

## 12. Migrated surfaces

- Home, including Today Reading, recent Reading, Follow-ups, fixed questions and quick entry.
- Reading Detail, including cards, per-card interpretation, overall interpretation, feedback, Follow-ups and management actions.
- Bottom tab appearance.
- Shared Tarot card presentation.
- Draw mode selection and question preparation.
- Interactive Tarot Table surface, deck edge, toolbar, observation overlay and Focus Card.
- Reading create/edit screens, selectors, card editor and Tarot card picker.
- Insights global filters, overview, single-card interpretation and trend surfaces.
- Topics list, detail, create/edit, timeline and Topic controls.
- Import Assistant six-step flow, editable candidates and result summary.
- Settings, authentication, password recovery, Reviews and Follow-ups.
- Draw History, DrawSession Detail, fixed Question History, Onboarding and artwork attribution.

Phase 4 migrates Settings, the complete authentication flow, Reviews and Follow-ups. Authentication forms use a narrow readable column and elevated glass form surface. Review and Follow-up pages retain their existing traceability and repository boundaries while using Moonlight hierarchy and actions.

Authentication errors, recovery messages and loading states remain textual and accessible; decorative styling must never hide account state. Review statistics must keep source Reading navigation visible. Follow-up outcome labels describe the user's later observation and must not imply that Tarot predictions were objectively verified.

Phase 5 history surfaces keep immutable source information visually distinct from later journal content. Question History places its `FlatList` directly inside `MysticScreen`, preserving virtualization without nesting it in a `ScrollView`. Onboarding uses the same repositories and validation as before; theme components only organize each step. Artwork attribution remains readable and keeps its external Commons source explicit.

### Phase 2 interaction rules

- DrawSession remains the only source of truth; Moonlight components do not add a parallel table state.
- The table surface keeps its established placement coordinate system. Atmospheric styling must never rotate or offset the draggable container.
- Pinch zoom is a view-only table transform between 75% and 160%. The midpoint between both fingers is the focal anchor and may move with the gesture. Stored normalized placements remain unchanged, and drag/drop coordinates must be converted through the complete viewport transform.
- The deck edge keeps virtualization and the existing tap/drag gesture boundary.
- Reading forms retain React Hook Form, Zod validation and repository inputs. Visual panels do not infer or rewrite Topic, spread, card or DrawSession data.
- Reading card previews reuse `TarotCardDisplay`, while the picker continues using the lightweight picker artwork size for scrolling performance.

### Phase 3 data-heavy surface rules

- Insights uses restrained glass groups and pill filters; statistics remain subordinate to the selected view and global filter summary.
- Topic timelines retain `FlatList`; Moonlight styling must not replace virtualization with a fully rendered scroll view.
- Import keeps its local-only privacy boundary. Theme components never log, upload or transform pasted text.
- Dense candidate controls may wrap on small screens, but the raw text area and error messages remain full width and readable.

## 13. Migration guide

For each later page:

1. keep repository/hooks and business callbacks unchanged;
2. replace the outer screen with `MysticScreen`;
3. use `MysticHeader` and `SectionLabel` for hierarchy;
4. group information with no more than one elevated `GlassPanel` per section;
5. replace page-local buttons with `MoonButton`;
6. use `MysticText` rather than applying Moonlight colors to the legacy `Text` component;
7. test narrow Web, large text, loading/error/empty states and Reduced Motion;
8. remove legacy page styles only after parity is verified.

## 14. Adding a future theme

Create a complete `AppTheme` object for `arcane-library`, `nature-wisdom`, `celestial-minimal` or `dark-nebula`, extend `AppThemeId`, and register it in `themeRegistry`. Do not add conditional color logic to components. A Settings selector can call `setThemeId`; persistence is already isolated behind `ThemePreferenceStore`.
