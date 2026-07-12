import { describe, expect, it } from 'vitest';
import { AuthError, mapAuthError } from '../authErrors';
import { getRouteAccess } from '../routeAccess';
import { signInSchema, signUpSchema, updatePasswordSchema } from '../authValidation';

describe('auth validation and errors', () => {
  it('validates email, password and confirmation separately', () => {
    expect(signInSchema.safeParse({ email: 'bad', password: '' }).success).toBe(false);
    expect(
      signUpSchema.safeParse({
        email: 'a@example.com',
        password: 'short',
        confirmPassword: 'short',
      }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({
        email: 'a@example.com',
        password: 'long-password',
        confirmPassword: 'other-password',
      }).success,
    ).toBe(false);
    expect(
      updatePasswordSchema.safeParse({
        password: 'long-password',
        confirmPassword: 'long-password',
      }).success,
    ).toBe(true);
  });
  it.each([
    [{ message: 'Invalid login credentials' }, 'invalid_credentials'],
    [{ message: 'Email not confirmed' }, 'email_not_verified'],
    [{ message: 'Failed to fetch' }, 'network'],
    [{ message: 'rate limit', status: 429 }, 'rate_limited'],
  ])('maps remote errors to stable codes', (remote, code) =>
    expect(mapAuthError(remote).code).toBe(code),
  );
  it('never returns the raw remote message', () => {
    const error = mapAuthError({ message: 'secret backend detail' });
    expect(error).toBeInstanceOf(AuthError);
    expect(error.message).not.toContain('secret');
  });
});

describe('central route access', () => {
  it('does not redirect while loading', () =>
    expect(getRouteAccess('loading', false)).toEqual({
      loading: true,
      publicAuth: false,
      onboarding: false,
      privateData: false,
    }));
  it('protects private data when unauthenticated', () =>
    expect(getRouteAccess('unauthenticated', false).privateData).toBe(false));
  it('allows onboarding before private data', () =>
    expect(getRouteAccess('authenticated', false)).toMatchObject({
      onboarding: true,
      privateData: false,
    }));
  it('allows local development after persisted entry and onboarding', () =>
    expect(getRouteAccess('localDevelopment', true)).toMatchObject({
      onboarding: false,
      privateData: true,
    }));
});
