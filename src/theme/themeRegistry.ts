import { moonlightTheme } from './themes/moonlight';
import type { AppTheme, AppThemeId } from './types';

export const DEFAULT_APP_THEME_ID: AppThemeId = 'moonlight';

const themes: Readonly<Record<AppThemeId, AppTheme>> = { moonlight: moonlightTheme };

export function isAppThemeId(value: unknown): value is AppThemeId {
  return value === 'moonlight';
}

export function resolveAppTheme(id: AppThemeId = DEFAULT_APP_THEME_ID): AppTheme {
  return themes[id] ?? themes[DEFAULT_APP_THEME_ID];
}

export function registeredAppThemes(): readonly AppTheme[] {
  return Object.values(themes);
}
