import { z } from 'zod';
export const emailSchema = z.string().trim().email('请输入有效的邮箱地址。');
export const passwordSchema = z.string().min(8, '密码至少需要 8 个字符。');
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '请输入密码。'),
});
export const signUpSchema = z
  .object({ email: emailSchema, password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: '两次输入的密码不一致。',
  });
export const updatePasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: '两次输入的密码不一致。',
  });
