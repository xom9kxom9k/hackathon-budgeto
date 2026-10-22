import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { LIGHT_THEME } from '@admiral-ds/react-ui';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { RootStore } from './RootStore';
import { StoreProvider } from './StoreProvider';
import { i18n } from '@/shared/i18n';

function LoaderCount() {
  const loaderStore = useStore(StoreName.Loader);
  return <span>{loaderStore.activeRequestCount}</span>;
}

describe('StoreProvider', () => {
  it('provides stores through the typed hook boundary', () => {
    render(
      <StoreProvider store={new RootStore()}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider theme={LIGHT_THEME}>
            <LoaderCount />
          </ThemeProvider>
        </I18nextProvider>
      </StoreProvider>,
    );

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
