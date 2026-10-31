import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { LIGHT_THEME } from '@admiral-ds/react-ui';

import { RootStore } from '@/app/stores/RootStore';
import { StoreProvider } from '@/app/stores/StoreProvider';
import { i18n, Language } from '@/shared/i18n';

import { RegisterPage } from './RegisterPage';

function renderPage(store: RootStore) {
  return render(
    <StoreProvider store={store}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={LIGHT_THEME}>
          <MemoryRouter initialEntries={['/register']}>
            <Routes>
              <Route element={<RegisterPage />} path="/register" />
              <Route element={<p>Настройка защиты</p>} path="/register/totp" />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </I18nextProvider>
    </StoreProvider>,
  );
}

describe('RegisterPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage(Language.Ru);
  });

  it('shows localized validation errors without calling the service', async () => {
    const user = userEvent.setup();
    const store = new RootStore();
    const register = vi.spyOn(store.services.auth, 'register');
    renderPage(store);

    await user.type(screen.getByLabelText('Пароль'), 'short');
    await user.type(screen.getByLabelText('Повторите пароль'), 'short');
    await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));

    expect(await screen.findByText('Введите email')).toBeInTheDocument();
    expect(screen.getAllByText('Пароль должен содержать минимум 12 символов')).toHaveLength(2);
    expect(register).not.toHaveBeenCalled();
  });

  it('navigates to protection setup after a successful submit', async () => {
    const user = userEvent.setup();
    const store = new RootStore();
    vi.spyOn(store.services.auth, 'register').mockResolvedValue({
      challengeToken: 'challenge-token',
      otpauthUri: 'otpauth://totp/Budgetto:test@example.com?secret=SECRET',
    });
    renderPage(store);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'long-password-123');
    await user.type(screen.getByLabelText('Повторите пароль'), 'long-password-123');
    await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));

    expect(await screen.findByText('Настройка защиты')).toBeInTheDocument();
  });
});
