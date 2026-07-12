import type { SupabaseClient } from '@supabase/supabase-js';
import type { EnvironmentSource } from '../../config/environment';
import { getAppEnvironment } from '../../config/environment';
import { getSupabaseClient } from '../../lib/supabase';
import { mapAuthError } from '../auth/authErrors';
import { readLocalAuthState, updateLocalAuthState } from '../auth/localAuthState';

export type OnboardingStatus = { completedAt: string | null; completed: boolean };
export interface OnboardingRepository {
  getStatus(): Promise<OnboardingStatus>;
  markCompleted(): Promise<void>;
  reset(): Promise<void>;
}
export const LOCAL_ONBOARDING_KEY = '@tarot-journal/auth/local-state';

export class LocalOnboardingRepository implements OnboardingRepository {
  async getStatus(): Promise<OnboardingStatus> {
    const completedAt = (await readLocalAuthState()).onboardingCompletedAt;
    return { completedAt, completed: completedAt !== null };
  }
  async markCompleted(): Promise<void> {
    await updateLocalAuthState({ onboardingCompletedAt: new Date().toISOString() });
  }
  async reset(): Promise<void> {
    await updateLocalAuthState({ onboardingCompletedAt: null });
  }
}

export class SupabaseOnboardingRepository implements OnboardingRepository {
  constructor(private readonly client: SupabaseClient) {}
  private async userId(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) throw mapAuthError(error ?? { message: 'unauthorized' });
    return data.user.id;
  }
  async getStatus(): Promise<OnboardingStatus> {
    const userId = await this.userId();
    const { data, error } = await this.client
      .from('user_preferences')
      .select('onboarding_completed_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw mapAuthError(error);
    const completedAt = data?.onboarding_completed_at ?? null;
    return { completedAt, completed: completedAt !== null };
  }
  async markCompleted(): Promise<void> {
    const userId = await this.userId();
    const { error } = await this.client
      .from('user_preferences')
      .upsert(
        { user_id: userId, onboarding_completed_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
    if (error) throw mapAuthError(error);
  }
  async reset(): Promise<void> {
    const userId = await this.userId();
    const { error } = await this.client
      .from('user_preferences')
      .upsert({ user_id: userId, onboarding_completed_at: null }, { onConflict: 'user_id' });
    if (error) throw mapAuthError(error);
  }
}

export function createOnboardingRepository(source?: EnvironmentSource): OnboardingRepository {
  const environment = getAppEnvironment(source);
  return environment.dataAdapter === 'local'
    ? new LocalOnboardingRepository()
    : new SupabaseOnboardingRepository(getSupabaseClient(source));
}
