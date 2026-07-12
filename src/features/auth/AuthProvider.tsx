import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getAppEnvironment } from '../../config/environment';
import { getSupabaseClient } from '../../lib/supabase';
import {
  createOnboardingRepository,
  type OnboardingRepository,
} from '../onboarding/onboardingRepository';
import type { AuthService, SignUpResult } from './authService';
import { SupabaseAuthService } from './authService';
import { readLocalAuthState, updateLocalAuthState } from './localAuthState';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'localDevelopment';
type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  onboardingCompleted: boolean;
  mode: 'local' | 'supabase';
  enterLocalDevelopment(): Promise<void>;
  exitLocalDevelopment(): Promise<void>;
  refreshOnboarding(): Promise<void>;
  completeOnboarding(): Promise<void>;
  signUp(email: string, password: string, redirectTo: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordRecovery(email: string, redirectTo: string): Promise<void>;
  recoverSessionFromUrl(url: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const environment = useMemo(() => getAppEnvironment(), []);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const recovering = useRef(false);
  const localOnboardingCompleted = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const authService = useMemo<AuthService | null>(
    () =>
      environment.dataAdapter === 'supabase' ? new SupabaseAuthService(getSupabaseClient()) : null,
    [environment.dataAdapter],
  );
  const onboardingRepository = useMemo<OnboardingRepository>(
    () => createOnboardingRepository(),
    [],
  );
  const loadOnboarding = useCallback(async () => {
    const value = await onboardingRepository.getStatus();
    localOnboardingCompleted.current = value.completed;
    setOnboardingCompleted(value.completed);
  }, [onboardingRepository]);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    const initialize = async () => {
      if (environment.dataAdapter === 'local') {
        const entered = (await readLocalAuthState()).entered;
        if (!active) return;
        await loadOnboarding().catch(() => setOnboardingCompleted(false));
        if (entered) {
          setStatus('localDevelopment');
        } else setStatus('unauthenticated');
        return;
      }
      if (!authService) return;
      recovering.current = (await Linking.getInitialURL())?.includes('/recovery') ?? false;
      const restored = await authService.getSession();
      if (!active) return;
      setSession(restored);
      if (restored && !recovering.current) {
        await loadOnboarding().catch(() => setOnboardingCompleted(false));
        setStatus('authenticated');
      } else setStatus('unauthenticated');
      unsubscribe = authService.subscribe((_event, next) => {
        if (!active) return;
        setSession(next);
        if (recovering.current) return;
        if (next) {
          void loadOnboarding()
            .catch(() => setOnboardingCompleted(false))
            .finally(() => setStatus('authenticated'));
        } else {
          setOnboardingCompleted(false);
          setStatus('unauthenticated');
        }
      });
    };
    void initialize().catch(() => {
      if (active) setStatus('unauthenticated');
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [authService, environment.dataAdapter, loadOnboarding]);

  const requireService = () => {
    if (!authService) throw new Error('Supabase auth is unavailable in local mode.');
    return authService;
  };
  const recoverSessionFromUrl = useCallback(
    async (url: string) => {
      if (!authService) throw new Error('Supabase auth is unavailable in local mode.');
      recovering.current = true;
      const next = await authService.recoverSessionFromUrl(url);
      setSession(next);
    },
    [authService],
  );
  const value: AuthContextValue = {
    status,
    session,
    onboardingCompleted,
    mode: environment.dataAdapter,
    async enterLocalDevelopment() {
      await updateLocalAuthState({
        entered: true,
        onboardingCompletedAt: localOnboardingCompleted.current ? new Date().toISOString() : null,
      });
      setOnboardingCompleted(localOnboardingCompleted.current);
      setStatus('localDevelopment');
    },
    async exitLocalDevelopment() {
      await updateLocalAuthState({
        entered: false,
        onboardingCompletedAt: onboardingCompleted ? new Date().toISOString() : null,
      });
      setStatus('unauthenticated');
    },
    refreshOnboarding: loadOnboarding,
    async completeOnboarding() {
      await onboardingRepository.markCompleted();
      localOnboardingCompleted.current = true;
      setOnboardingCompleted(true);
    },
    async signUp(email, password, redirectTo) {
      const result = await requireService().signUp(email, password, redirectTo);
      if (result.session) {
        setSession(result.session);
        await loadOnboarding().catch(() => setOnboardingCompleted(false));
        setStatus('authenticated');
      }
      return result;
    },
    async signIn(email, password) {
      const next = await requireService().signIn(email, password);
      setSession(next);
      await loadOnboarding().catch(() => setOnboardingCompleted(false));
      setStatus('authenticated');
    },
    async signOut() {
      if (environment.dataAdapter === 'local') {
        await updateLocalAuthState({
          entered: false,
          onboardingCompletedAt: onboardingCompleted ? new Date().toISOString() : null,
        });
        setStatus('unauthenticated');
        return;
      }
      await requireService().signOut();
      setSession(null);
      setStatus('unauthenticated');
    },
    sendPasswordRecovery: (email, redirectTo) =>
      requireService().sendPasswordRecovery(email, redirectTo),
    recoverSessionFromUrl,
    async updatePassword(password) {
      await requireService().updatePassword(password);
      recovering.current = false;
      await loadOnboarding().catch(() => setOnboardingCompleted(false));
      setStatus('authenticated');
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}
