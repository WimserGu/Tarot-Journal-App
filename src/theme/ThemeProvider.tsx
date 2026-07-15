import { createContext, type PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { DEFAULT_APP_THEME_ID, resolveAppTheme } from './themeRegistry';
import { themePreferenceStore } from './themePreference';
import type { AppTheme, AppThemeId } from './types';

type ThemeContextValue = {
  theme: AppTheme;
  themeId: AppThemeId;
  setThemeId(themeId: AppThemeId): Promise<void>;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeId, setThemeIdState] = useState<AppThemeId>(DEFAULT_APP_THEME_ID);

  useEffect(() => {
    let active = true;
    void themePreferenceStore.load().then((stored) => {
      if (active) setThemeIdState(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: resolveAppTheme(themeId),
      themeId,
      async setThemeId(nextThemeId) {
        setThemeIdState(nextThemeId);
        await themePreferenceStore.save(nextThemeId);
      },
    }),
    [themeId],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
