import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_APP_THEME_ID, isAppThemeId } from './themeRegistry';
import type { AppThemeId } from './types';

const THEME_PREFERENCE_KEY = 'tarot-journal:app-theme';

export interface ThemePreferenceStore {
  load(): Promise<AppThemeId>;
  save(themeId: AppThemeId): Promise<void>;
}

export const themePreferenceStore: ThemePreferenceStore = {
  async load() {
    const stored = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
    return isAppThemeId(stored) ? stored : DEFAULT_APP_THEME_ID;
  },
  async save(themeId) {
    await AsyncStorage.setItem(THEME_PREFERENCE_KEY, themeId);
  },
};
