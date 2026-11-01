import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('Profile edit submission boundaries', () => {
  beforeEach(async () => {
    await i18n.changeLanguage(Language.Ru);
  });
  it('shows load failure without a form', async () => {
    const store = new RootStore();
    vi.spyOn(store.services.profile, 'get').mockRejectedValue(new Error('offline'));
    renderPage(store);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Сохранить изменения' })).not.toBeInTheDocument();
  });
  it('ignores submit during loading and allows cancellation', async () => {
    const store = new RootStore();
    vi.spyOn(store.services.profile, 'get').mockReturnValue(new Promise(() => {}));
    const update = vi.spyOn(store.services.profile, 'update');
    const { container } = renderPage(store);
    fireEvent.submit(container.querySelector('form')!);
    expect(update).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(await screen.findByText('Profile page')).toBeInTheDocument();
  });
  it('normalizes input, toggles goals and prevents duplicate submission through both mutations', async () => {
    const store = new RootStore();
    vi.spyOn(store.services.profile, 'get').mockResolvedValue({ ...profile, displayName: null });
    let finishUpdate!: (value: Profile) => void;
    let finishPreferences!: (value: Profile) => void;
    const update = vi.spyOn(store.services.profile, 'update').mockReturnValue(
      new Promise((r) => {
        finishUpdate = r;
      }),
    );
    const preferences = vi.spyOn(store.services.profile, 'updatePreferences').mockReturnValue(
      new Promise((r) => {
        finishPreferences = r;
      }),
    );
    const { container } = renderPage(store);
    const name = await screen.findByLabelText('Имя');
    await waitFor(() => expect(store.profile.status).toBe('success'));
    fireEvent.change(name, { target: { value: '  Grace  ' } });
    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    fireEvent.change(screen.getByLabelText('Часовой пояс'), { target: { value: '  ' } });
    const form = container.querySelector('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(update).toHaveBeenCalledWith('Grace', ['transactions']);
    await act(async () =>
      finishUpdate({ ...profile, displayName: 'Grace', goals: ['transactions'] }),
    );
    fireEvent.submit(form);
    expect(store.profile.mutationStatus).toBe('saving');
    expect(form.querySelector('button[type="submit"]')).toBeDisabled();
    expect(update).toHaveBeenCalledTimes(1);
    expect(preferences).toHaveBeenCalledWith('ru', 'UTC');
    await act(async () => finishPreferences(profile));
    expect(await screen.findByText('Profile page')).toBeInTheDocument();
  });
  it('retains the form on preferences failure and permits a successful retry', async () => {
    const store = new RootStore();
    vi.spyOn(store.services.profile, 'get').mockResolvedValue(profile);
    const update = vi.spyOn(store.services.profile, 'update').mockResolvedValue(profile);
    const preferences = vi
      .spyOn(store.services.profile, 'updatePreferences')
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValue(profile);
    const { container } = renderPage(store);
    await screen.findByLabelText('Имя');
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Profile page')).not.toBeInTheDocument();
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByText('Profile page')).toBeInTheDocument();
    expect(update).toHaveBeenCalledTimes(2);
    expect(preferences).toHaveBeenCalledTimes(2);
  });
});

it('saves through the real store, services and client after an expired CSRF token', async () => {
  await i18n.changeLanguage(Language.Ru);
  let csrf = 0;
  let writes = 0;
  const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (url, options) => {
    if (String(url).endsWith('/auth/csrf'))
      return new Response(JSON.stringify({ token: ++csrf === 1 ? 'expired' : 'fresh' }));
    if (options?.method === 'PATCH' && ++writes === 1)
      return new Response(JSON.stringify({ code: 'AUTH_CSRF_INVALID' }), { status: 403 });
    return new Response(JSON.stringify(profile));
  });
  vi.stubGlobal('fetch', fetchImpl);
  try {
    const store = new RootStore();
    const { container } = renderPage(store);
    await screen.findByLabelText('Имя');
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByText('Profile page')).toBeInTheDocument();
    expect(csrf).toBe(2);
    expect(writes).toBe(3);
    const patches = fetchImpl.mock.calls.filter(([, options]) => options?.method === 'PATCH');
    expect(patches[0][1]?.body).toBe(patches[1][1]?.body);
    expect(patches[1][1]?.headers).toMatchObject({ 'X-CSRF-Token': 'fresh' });
    expect(patches[2][0]).toMatch(/profile\/preferences$/);
  } finally {
    vi.unstubAllGlobals();
  }
});
