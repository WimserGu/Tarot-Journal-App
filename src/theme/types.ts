export type AppThemeId = 'moonlight';

export type AppTheme = {
  id: AppThemeId;
  colors: {
    backgroundDeep: string;
    backgroundMid: string;
    backgroundSoft: string;
    primary: string;
    primarySoft: string;
    moonlight: string;
    warm: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    glass: string;
    glassElevated: string;
    glassSubtle: string;
    glassBorder: string;
    divider: string;
    danger: string;
    success: string;
    warning: string;
    overlay: string;
    star: string;
  };
  gradients: {
    screen: readonly [string, string, string];
    primary: readonly [string, string];
    glow: readonly [string, string];
  };
  typography: {
    display: number;
    pageTitle: number;
    sectionTitle: number;
    cardTitle: number;
    body: number;
    caption: number;
    displayFamily?: string;
    bodyFamily?: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radii: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  borders: { hairline: number; regular: number };
  shadows: {
    panel: { color: string; opacity: number; radius: number; elevation: number };
    card: { color: string; opacity: number; radius: number; elevation: number };
  };
  opacity: { disabled: number; pressed: number; decoration: number };
  motion: { fast: number; normal: number; slow: number; pressedScale: number };
  cards: {
    compact: { width: number; height: number };
    standard: { width: number; height: number };
    hero: { width: number; height: number };
  };
  icons: { primary: string; secondary: string; danger: string };
  status: { draft: string; completed: string; pending: string };
};
