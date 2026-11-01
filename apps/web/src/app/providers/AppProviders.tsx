import { DropdownProvider } from '@admiral-ds/react-ui';
import { MotionConfig } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v6';
import { Suspense, useEffect, useState, type PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { RouterProvider } from 'react-router-dom';
import { createGlobalStyle, ThemeProvider } from 'styled-components';

import { GlobalLoader } from '@/app/ui/GlobalLoader';
import { i18n } from '@/shared/i18n';

import { router } from '../router';
import { RouteLoadingFallback } from '../routing/RouteLoadingFallback';
import { RootStore } from '../stores/RootStore';
import { StoreProvider } from '../stores/StoreProvider';

const AppTheme = createGlobalStyle<{ $colors: Record<string, string> }>`
  :root {
    ${({ $colors }) =>
      Object.entries($colors)
        .map(
          ([name, value]) =>
            '--admiral-color-' + name.replace(/\//g, '_').replace(/ /g, '') + ': ' + value + ';',
        )
        .join('\n')}
  }
  html, body, #root { font-family: Arial, Helvetica, sans-serif; }
  button, input, select, textarea { font-family: inherit; }
`;

export const AppProviders = observer(function AppProviders({ children }: PropsWithChildren) {
  const [rootStore] = useState(() => new RootStore());
  const { locale, theme, themeMode } = rootStore.ui;

  useEffect(() => {
    void rootStore.auth.bootstrap();
  }, [rootStore]);

  useEffect(() => {
    if (rootStore.auth.status === 'authenticated') void rootStore.vault.bootstrap();
    if (rootStore.auth.status === 'anonymous') rootStore.vault.lock();
  }, [rootStore, rootStore.auth.status]);

  useEffect(() => {
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  return (
    <StoreProvider store={rootStore}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={theme}>
          <DropdownProvider>
            <MotionConfig reducedMotion="user">
              <div className={`app-root admiral-theme-${themeMode}`}>
                <AppTheme $colors={theme.color} />
                <GlobalLoader />
                <div data-app-content>{children}</div>
              </div>
            </MotionConfig>
          </DropdownProvider>
        </ThemeProvider>
      </I18nextProvider>
    </StoreProvider>
  );
});

export function AppProviderTree() {
  return (
    <AppProviders>
      <NuqsAdapter>
        <Suspense fallback={<RouteLoadingFallback />}>
          <RouterProvider router={router} />
        </Suspense>
      </NuqsAdapter>
    </AppProviders>
  );
}
