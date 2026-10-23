import {
  DarkThemeCssVars,
  DropdownProvider,
  FontsVTBGroup,
  LightThemeCssVars,
} from '@admiral-ds/react-ui';
import { MotionConfig } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v6';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';

import { GlobalLoader } from '@/app/ui/GlobalLoader';
import { i18n } from '@/shared/i18n';

import { router } from '../router';
import { RootStore } from '../stores/RootStore';
import { StoreProvider } from '../stores/StoreProvider';

export const AppProviders = observer(function AppProviders({ children }: PropsWithChildren) {
  const [rootStore] = useState(() => new RootStore());
  const { locale, theme, themeMode } = rootStore.ui;

  useEffect(() => {
    void rootStore.auth.bootstrap();
  }, [rootStore]);

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
                {themeMode === 'dark' ? (
                  <DarkThemeCssVars key="dark-theme-vars" />
                ) : (
                  <LightThemeCssVars key="light-theme-vars" />
                )}
                <FontsVTBGroup />
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
        <RouterProvider router={router} />
      </NuqsAdapter>
    </AppProviders>
  );
}
