import AsyncStorage from '@react-native-async-storage/async-storage';
export const LOCAL_AUTH_STATE_KEY = '@tarot-journal/auth/local-state';
export type LocalAuthState = { entered: boolean; onboardingCompletedAt: string | null };
const emptyState: LocalAuthState = { entered: false, onboardingCompletedAt: null };
let cachedState: LocalAuthState | null = null;
export async function readLocalAuthState(): Promise<LocalAuthState> {
  if (cachedState) return cachedState;
  const raw = await AsyncStorage.getItem(LOCAL_AUTH_STATE_KEY);
  if (!raw) return emptyState;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      'entered' in value &&
      'onboardingCompletedAt' in value
    ) {
      const state = value as Record<string, unknown>;
      if (
        typeof state.entered === 'boolean' &&
        (state.onboardingCompletedAt === null || typeof state.onboardingCompletedAt === 'string')
      ) {
        cachedState = {
          entered: state.entered,
          onboardingCompletedAt: state.onboardingCompletedAt,
        };
        return cachedState;
      }
    }
  } catch {
    /* Recover with a safe incomplete state. */
  }
  cachedState = emptyState;
  return cachedState;
}
export async function updateLocalAuthState(
  update: Partial<LocalAuthState>,
): Promise<LocalAuthState> {
  const next = { ...(await readLocalAuthState()), ...update };
  await AsyncStorage.setItem(LOCAL_AUTH_STATE_KEY, JSON.stringify(next));
  cachedState = next;
  return next;
}
