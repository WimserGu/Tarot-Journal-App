import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseAuthService } from '../authService';
function client(overrides: Record<string, unknown> = {}): SupabaseClient {
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(async () => ({
      data: { session: { access_token: 'x' } },
      error: null,
    })),
    signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    exchangeCodeForSession: vi.fn(async () => ({
      data: { session: { access_token: 'x' } },
      error: null,
    })),
    setSession: vi.fn(async () => ({ data: { session: { access_token: 'x' } }, error: null })),
    updateUser: vi.fn(async () => ({ error: null })),
    ...overrides,
  };
  return { auth } as unknown as SupabaseClient;
}
describe('SupabaseAuthService', () => {
  it('handles sign-in, sign-up verification branch and sign-out', async () => {
    const fake = client();
    const service = new SupabaseAuthService(fake);
    expect(await service.signIn('a@b.com', 'password')).toBeTruthy();
    expect(
      (await service.signUp('a@b.com', 'password', 'tarotjournal://verify'))
        .requiresEmailVerification,
    ).toBe(true);
    await service.signOut();
    expect(fake.auth.signOut).toHaveBeenCalled();
  });
  it('restores empty session and cleans listener', async () => {
    const fake = client();
    const service = new SupabaseAuthService(fake);
    expect(await service.getSession()).toBeNull();
    const stop = service.subscribe(() => undefined);
    stop();
    expect(fake.auth.onAuthStateChange).toHaveBeenCalled();
  });
  it('sends generic recovery and exchanges PKCE code', async () => {
    const fake = client();
    const service = new SupabaseAuthService(fake);
    await service.sendPasswordRecovery('a@b.com', 'tarotjournal://recovery');
    await service.recoverSessionFromUrl('tarotjournal://recovery?code=abc');
    expect(fake.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
  });
  it('rejects invalid recovery URLs and updates a password', async () => {
    const service = new SupabaseAuthService(client());
    await expect(
      service.recoverSessionFromUrl('tarotjournal://recovery?error=expired'),
    ).rejects.toMatchObject({ code: 'expired_recovery_link' });
    await service.updatePassword('long-password');
  });
});
