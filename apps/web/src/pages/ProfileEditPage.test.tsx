import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { LIGHT_THEME } from '@admiral-ds/react-ui';

import { RootStore } from '@/app/stores/RootStore';
import { StoreProvider } from '@/app/stores/StoreProvider';
import { i18n, Language } from '@/shared/i18n';
import type { Profile } from '@/shared/services/ProfileService';

import { ProfileEditPage } from './ProfileEditPage';

const profile: Profile = {
  id: 'user-1',
  email: 'ada@example.com',
  displayName: 'Ada',
  goals: ['accounts'],
  locale: 'ru',
  timezone: 'UTC',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderPage(store: RootStore) {
  return render(
    <StoreProvider store={store}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={LIGHT_THEME}>
          <MemoryRouter initialEntries={['/profile/edit']}>
            <Routes>
              <Route element={<ProfileEditPage />} path="/profile/edit" />
              <Route element={<p>Profile page</p>} path="/profile" />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </I18nextProvider>
    </StoreProvider>,
  );
}

describe('ProfileEditPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage(Language.Ru);
  });

  it('loads profile data and validates the display name before saving', async () => {
    const user = userEvent.setup();
    const store = new RootStore();
    vi.spyOn(store.services.profile, 'get').mockResolvedValue(profile);
    const update = vi.spyOn(store.services.profile, 'update');
    vi.spyOn(store.services.profile, 'updatePreferences').mockResolvedValue(profile);
    renderPage(store);

    const name = await screen.findByLabelText('Имя');
    expect(name).toHaveValue('Ada');
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));

    expect(await screen.findByText('Введите имя длиной от 1 до 80 символов.')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it('saves profile and preferences, then navigates to the profile page', async () => {
    const user = userEvent.setup();
    const store = new RootStore();
    vi.spyOn(store.services.profile, 'get').mockResolvedValue(profile);
    vi.spyOn(store.services.profile, 'update').mockResolvedValue({
      ...profile,
      displayName: 'Grace',
    });
    vi.spyOn(store.services.profile, 'updatePreferences').mockResolvedValue({
      ...profile,
      displayName: 'Grace',
      locale: 'en',
    });
    renderPage(store);

    const name = await screen.findByLabelText('Имя');
    await user.clear(name);
    await user.type(name, 'Grace');
    await user.selectOptions(screen.getByLabelText('Язык'), 'en');
    await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));

    expect(await screen.findByText('Profile page')).toBeInTheDocument();
  });

  it('shows an alert when the profile mutation fails', async () => {
    const user = userEvent.setup();
    const store = new RootStore();
    vi.spyOn(store.services.profile, 'get').mockResolvedValue(profile);
    vi.spyOn(store.services.profile, 'update').mockRejectedValue(
      new Error('PROFILE_UPDATE_FAILED'),
    );
    renderPage(store);

    await screen.findByLabelText('Имя');
    await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));

    expect(
      await screen.findByText(
        'Не удалось сохранить профиль. Проверьте данные и повторите попытку.',
      ),
    ).toHaveAttribute('role', 'alert');
  });

  it('disables the save action while the mutation is pending', async () => {
    const user = userEvent.setup();
    const store = new RootStore();
    vi.spyOn(store.services.profile, 'get').mockResolvedValue(profile);
    let resolveUpdate!: (value: Profile) => void;
    const update = vi.spyOn(store.services.profile, 'update').mockReturnValue(
      new Promise<Profile>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    vi.spyOn(store.services.profile, 'updatePreferences').mockResolvedValue(profile);
    renderPage(store);

    await screen.findByLabelText('Имя');
    const save = screen.getByRole('button', { name: 'Сохранить изменения' });
    await user.click(save);
    expect(save).toBeDisabled();
    expect(update).toHaveBeenCalledOnce();
    resolveUpdate(profile);
    expect(await screen.findByText('Profile page')).toBeInTheDocument();
  });
});
