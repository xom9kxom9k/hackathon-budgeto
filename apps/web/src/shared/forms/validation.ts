import type { TFunction } from 'i18next';

import { I18nKey } from '@/shared/i18n';

const translationKeys = new Set<string>(Object.values(I18nKey));

export function translateValidationError(
  message: string | undefined,
  t: TFunction,
  fallback: I18nKey = I18nKey.AuthGenericError,
): string | undefined {
  if (!message) return undefined;

  return translationKeys.has(message) ? t(message) : t(fallback);
}
