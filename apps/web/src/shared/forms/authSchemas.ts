import { z } from 'zod';

import { I18nKey } from '@/shared/i18n';

const emailSchema = z
  .string({ required_error: I18nKey.AuthValidationEmailRequired })
  .trim()
  .min(1, I18nKey.AuthValidationEmailRequired)
  .email(I18nKey.AuthValidationEmailInvalid);

const passwordSchema = z
  .string({ required_error: I18nKey.AuthValidationPasswordRequired })
  .min(1, I18nKey.AuthValidationPasswordRequired)
  .min(12, I18nKey.AuthValidationPasswordMin);

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: passwordSchema,
  })
  .superRefine((values, context) => {
    if (values.password !== values.passwordConfirm) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: I18nKey.AuthValidationPasswordMismatch,
        path: ['passwordConfirm'],
      });
    }
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: I18nKey.AuthValidationPasswordRequired })
    .min(1, I18nKey.AuthValidationPasswordRequired),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const totpSchema = z.object({
  code: z
    .string({ required_error: I18nKey.AuthValidationCodeRequired })
    .min(1, I18nKey.AuthValidationCodeRequired)
    .regex(/^\d{6}$/, I18nKey.AuthValidationCodeInvalid),
});

export const recoverySchema = z.object({
  code: z
    .string({ required_error: I18nKey.AuthValidationRecoveryRequired })
    .min(1, I18nKey.AuthValidationRecoveryRequired)
    .regex(/^[A-Za-z0-9-]{8,64}$/, I18nKey.AuthValidationRecoveryInvalid),
});

export type CodeValues = z.infer<typeof totpSchema>;
