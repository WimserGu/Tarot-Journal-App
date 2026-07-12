export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_already_registered'
  | 'email_not_verified'
  | 'weak_password'
  | 'invalid_email'
  | 'unauthorized'
  | 'expired_recovery_link'
  | 'network'
  | 'rate_limited'
  | 'unknown';
export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
type RemoteAuthError = { code?: string; message?: string; status?: number };
export function mapAuthError(error: RemoteAuthError): AuthError {
  const message = error.message?.toLowerCase() ?? '';
  if (error.status === 429 || message.includes('rate limit'))
    return new AuthError('rate_limited', '请求过于频繁，请稍后再试。');
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout'))
    return new AuthError('network', '网络连接失败，请检查网络后重试。');
  if (message.includes('invalid login credentials'))
    return new AuthError('invalid_credentials', '邮箱或密码不正确。');
  if (message.includes('email not confirmed'))
    return new AuthError('email_not_verified', '请先完成邮箱验证。');
  if (message.includes('unauthorized') || message.includes('session missing'))
    return new AuthError('unauthorized', '请先登录后再继续。');
  if (message.includes('already registered') || message.includes('already been registered'))
    return new AuthError('email_already_registered', '无法完成注册，请尝试登录或重置密码。');
  if (message.includes('password') && (message.includes('weak') || message.includes('characters')))
    return new AuthError('weak_password', '密码强度不足，请使用至少 8 个字符。');
  if (message.includes('invalid') && message.includes('email'))
    return new AuthError('invalid_email', '请输入有效的邮箱地址。');
  if (message.includes('expired') || message.includes('otp_expired'))
    return new AuthError('expired_recovery_link', '此恢复链接无效或已过期，请重新申请。');
  return new AuthError('unknown', '暂时无法完成操作，请稍后重试。');
}
