import { DARK_THEME, LIGHT_THEME } from '@admiral-ds/react-ui';
import { makeAutoObservable } from 'mobx';

import { Language } from '@/shared/i18n';

export type ThemeMode = 'light' | 'dark';

const themeStorageKey = 'budgeto-theme';
const localeStorageKey = 'budgeto-locale';
const sidebarWidthKey = 'budgeto-sidebar-width';
const sidebarStorageKey = 'budgeto-sidebar-collapsed';

function readStorage(key: string): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
}

const lightTheme = {
  ...LIGHT_THEME,
  fontFamily: 'Arial, Helvetica, sans-serif',
  color: {
    ...LIGHT_THEME.color,
    'Primary/Primary 10': '#edf6f1',
    'Primary/Primary 20': '#d6ecdf',
    'Primary/Primary 30': '#aed6bf',
    'Primary/Primary 40': '#72ae8d',
    'Primary/Primary 50': '#32845b',
    'Primary/Primary 60 Main': '#17643f',
    'Primary/Primary 70': '#104e30',
    'Primary/Primary 80': '#0a3922',
    'Neutral/Neutral 05': '#f5f7f6',
    'Neutral/Neutral 50': '#627069',
    'Neutral/Neutral 60': '#536159',
    'Neutral/Neutral 70': '#3e4c44',
  },
};
const darkTheme = {
  ...DARK_THEME,
  fontFamily: 'Arial, Helvetica, sans-serif',
  color: {
    ...DARK_THEME.color,
    'Primary/Primary 10': '#142e22',
    'Primary/Primary 20': '#1d3b2c',
    'Primary/Primary 30': '#2d5540',
    'Primary/Primary 40': '#477e61',
    'Primary/Primary 50': '#6fb48b',
    'Primary/Primary 60 Main': '#86d3a7',
    'Primary/Primary 70': '#a5e4bf',
    'Primary/Primary 80': '#c6f2d7',
    'Neutral/Neutral 50': '#a5b5ab',
    'Neutral/Neutral 60': '#b8c5bd',
    'Neutral/Neutral 70': '#cad5ce',
  },
};

export class UiStore {
  themeMode: ThemeMode = readStorage(themeStorageKey) === 'dark' ? 'dark' : 'light';
  locale: Language = readStorage(localeStorageKey) === Language.En ? Language.En : Language.Ru;
  sidebarWidth = Math.min(340, Math.max(220, Number(readStorage(sidebarWidthKey)) || 248));
  sidebarCollapsed = readStorage(sidebarStorageKey) === 'true';

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get theme() {
    return this.themeMode === 'dark' ? darkTheme : lightTheme;
  }

  setThemeMode(mode: ThemeMode): void {
    this.themeMode = mode;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(themeStorageKey, mode);
    }
  }

  toggleTheme(): void {
    this.setThemeMode(this.themeMode === 'dark' ? 'light' : 'dark');
  }

  setLocale(locale: Language): void {
    this.locale = locale;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(localeStorageKey, locale);
    }
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(sidebarStorageKey, String(collapsed));
    }
  }

  setSidebarWidth(width: number): void {
    this.sidebarWidth = Math.min(340, Math.max(220, Math.round(width)));
    if (typeof window !== 'undefined')
      window.localStorage.setItem(sidebarWidthKey, String(this.sidebarWidth));
  }

  toggleSidebar(): void {
    this.setSidebarCollapsed(!this.sidebarCollapsed);
  }
}
