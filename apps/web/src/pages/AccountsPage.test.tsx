import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { LIGHT_THEME } from '@admiral-ds/react-ui';
import { RootStore } from '@/app/stores/RootStore';
import { StoreProvider } from '@/app/stores/StoreProvider';
import { i18n } from '@/shared/i18n';
import { AccountsPage } from './AccountsPage';

describe('AccountsPage', () => {
  it('renders accounts returned by the API without demo hierarchy', async () => {
    const store = new RootStore();
    vi.spyOn(store.services.accounts, 'list').mockResolvedValue([
      { id: 'account-1', name: 'Основной счёт', currency: 'RUB' },
    ]);

    render(
      <StoreProvider store={store}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider theme={LIGHT_THEME}>
            <MemoryRouter>
              <AccountsPage />
            </MemoryRouter>
          </ThemeProvider>
        </I18nextProvider>
      </StoreProvider>,
    );

    await waitFor(() => expect(screen.getByText('Основной счёт')).toBeInTheDocument());
    expect(screen.getByText('RUB')).toBeInTheDocument();
    expect(screen.queryByText('Demo bank A')).not.toBeInTheDocument();
    expect(screen.queryByText('Баланс')).not.toBeInTheDocument();
  });
});
