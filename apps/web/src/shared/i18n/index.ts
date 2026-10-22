import i18next from 'i18next';

import { resources } from './resources';
import { Language } from './types';

export * from './types';

export const i18n = i18next.createInstance({
  resources,
  lng: Language.Ru,
  fallbackLng: Language.Ru,
  interpolation: { escapeValue: false },
});

void i18n.init();
