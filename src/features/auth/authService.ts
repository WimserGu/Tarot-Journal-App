import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { AuthError, mapAuthError } from './authErrors';
export type SignUpResult = { session: Session | null; requiresEmailVerification: boolean };
export interface AuthService {
  getSession(): Promise<Session | null>;
  subscribe(listener: (event: AuthChangeEvent, session: Session | null) => void): () => void;
  signUp(email: string, password: string, emailRedirectTo: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  sendPasswordRecovery(email: string, redirectTo: string): Promise<void>;
  recoverSessionFromUrl(url: string): Promise<Session>;
  updatePassword(password: string): Promise<void>;
}
function paramsFromUrl(url: string): URLSearchParams {
  const parsed = new URL(url);
  const result = new URLSearchParams(parsed.search);
  new URLSearchParams(parsed.hash.replace(/^#/, '')).forEach((value, key) =>
    result.set(key, value),
  );
  return result;
}
export class SupabaseAuthService implements AuthService {
  constructor(private readonly client: SupabaseClient) {}
  async getSession(): Promise<Session | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw mapAuthError(error);
    return data.session;
  }
  subscribe(listener: (event: AuthChangeEvent, session: Session | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange(listener);
    return () => data.subscription.unsubscribe();
  }
  async signUp(email: string, password: string, emailRedirectTo: string): Promise<SignUpResult> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });
    if (error) throw mapAuthError(error);
    return { session: data.session, requiresEmailVerification: data.session === null };
  }
  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw mapAuthError(error);
    if (!data.session) throw new AuthError('unauthorized', '无法建立登录会话。');
    return data.session;
  }
  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw mapAuthError(error);
  }
  async sendPasswordRecovery(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw mapAuthError(error);
  }
  async recoverSessionFromUrl(url: string): Promise<Session> {
    const params = paramsFromUrl(url);
    if (params.get('error_code') ?? params.get('error'))
      throw new AuthError('expired_recovery_link', '此恢复链接无效或已过期，请重新申请。');
    const code = params.get('code');
    if (code) {
      const { data, error } = await this.client.auth.exchangeCodeForSession(code);
      if (error) throw mapAuthError(error);
      return data.session;
    }
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data, error } = await this.client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error || !data.session) throw mapAuthError(error ?? { message: 'expired recovery link' });
      return data.session;
    }
    const session = await this.getSession();
    if (!session)
      throw new AuthError('expired_recovery_link', '此恢复链接无效或已过期，请重新申请。');
    return session;
  }
  async updatePassword(password: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw mapAuthError(error);
  }
}
