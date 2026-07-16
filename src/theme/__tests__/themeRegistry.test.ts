import { describe, expect, it } from 'vitest';

import { moonlightTheme } from '../themes/moonlight';
import {
  DEFAULT_APP_THEME_ID,
  isAppThemeId,
  registeredAppThemes,
  resolveAppTheme,
} from '../themeRegistry';

describe('Moonlight app theme', () => {
  it('is the default and only registered Moonlight theme', () => {
    expect(DEFAULT_APP_THEME_ID).toBe('moonlight');
    expect(resolveAppTheme()).toBe(moonlightTheme);
    expect(registeredAppThemes().map((theme) => theme.id)).toEqual(['moonlight']);
  });

  it('defines reusable visual, motion and card tokens', () => {
    expect(moonlightTheme.colors.backgroundDeep).toBe('#17142D');
    expect(moonlightTheme.colors.textPrimary).toBe('#F6F2FF');
    expect(moonlightTheme.cards.standard).toEqual({ width: 82, height: 142 });
    expect(moonlightTheme.motion.pressedScale).toBe(0.98);
    expect(moonlightTheme.radii.xl).toBeGreaterThan(moonlightTheme.radii.md);
  });

  it('provides stable tokens for the table and Reading editor migration', () => {
    expect(moonlightTheme.colors.backgroundDeep).not.toBe(moonlightTheme.colors.backgroundMid);
    expect(moonlightTheme.colors.glassBorder).toContain('rgba');
    expect(moonlightTheme.opacity.disabled).toBeLessThan(1);
    expect(moonlightTheme.cards.compact.width).toBeLessThan(moonlightTheme.cards.standard.width);
    expect(moonlightTheme.status.draft).toBeTruthy();
  });

  it('validates stored preference IDs without accepting future unknown themes', () => {
    expect(isAppThemeId('moonlight')).toBe(true);
    expect(isAppThemeId('dark-nebula')).toBe(false);
    expect(isAppThemeId(null)).toBe(false);
  });
});
