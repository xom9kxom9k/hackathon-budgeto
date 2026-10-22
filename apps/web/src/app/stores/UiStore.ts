import { DARK_THEME, LIGHT_THEME } from '@admiral-ds/react-ui';
import { makeAutoObservable } from 'mobx';

import { Language } from '@/shared/i18n';

export type ThemeMode = 'light' | 'dark';

const themeStorageKey = 'budgeto-theme';
const localeStorageKey = 'budgeto-locale';

function readStorage(key: string): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
}

export class UiStore {
  themeMode: ThemeMode = readStorage(themeStorageKey) === 'dark' ? 'dark' : 'light';
  locale: Language = readStorage(localeStorageKey) === Language.En ? Language.En : Language.Ru;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get theme() {
    return this.themeMode === 'dark' ? DARK_THEME : LIGHT_THEME;
  }

  setThemeMode(mode: ThemeMode): void {
    this.themeMode = mode;
    window.localStorage.setItem(themeStorageKey, mode);
  }

  toggleTheme(): void {
    this.setThemeMode(this.themeMode === 'dark' ? 'light' : 'dark');
  }

  setLocale(locale: Language): void {
    this.locale = locale;
    window.localStorage.setItem(localeStorageKey, locale);
  }
}
