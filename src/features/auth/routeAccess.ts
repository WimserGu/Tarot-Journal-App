import type { AuthStatus } from './AuthProvider';
export type RouteAccess = {
  publicAuth: boolean;
  onboarding: boolean;
  privateData: boolean;
  loading: boolean;
};
export function getRouteAccess(status: AuthStatus, onboardingCompleted: boolean): RouteAccess {
  const authenticated = status === 'authenticated' || status === 'localDevelopment';
  return {
    loading: status === 'loading',
    publicAuth: status === 'unauthenticated',
    onboarding: authenticated && !onboardingCompleted,
    privateData: authenticated && onboardingCompleted,
  };
}
