import { LIGHT_THEME } from '@admiral-ds/react-ui';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { runInAction } from 'mobx';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { AccountsStore } from '@/app/stores/AccountsStore';
import { RootStore } from '@/app/stores/RootStore';
import { StoreProvider } from '@/app/stores/StoreProvider';
import { VaultStore } from '@/app/stores/VaultStore';
import { i18n, I18nKey, Language } from '@/shared/i18n';
import { VaultService, type VaultEvent } from '@/shared/services/VaultService';
import { VaultHistoryPage } from './VaultHistoryPage';

const event = {
  id: 'event-1',
  sequence: '1',
  eventType: 'transaction_confirmed',
  importJobId: null,
  importRow: null,
  createdAt: '2026-11-01T12:00:00Z',
  eventHash: 'technical-hash',
} as VaultEvent;
async function setup(verify: () => Promise<{ valid: boolean; checkedEvents: number }>) {
  await i18n.changeLanguage(Language.Ru);
  vi.spyOn(VaultService.prototype, 'listEvents').mockResolvedValue([event]);
  vi.spyOn(VaultService.prototype, 'verifyIntegrity').mockImplementation(verify);
  vi.spyOn(AccountsStore.prototype, 'load').mockResolvedValue();
  const store = new RootStore();
  runInAction(() => {
    store.vault.status = 'locked';
    store.accounts.accounts = [{ id: 'a', name: 'Основной', currency: 'RUB' }];
  });
  await act(async () => {
    render(
      <MemoryRouter>
        <StoreProvider store={store}>
          <I18nextProvider i18n={i18n}>
            <ThemeProvider theme={LIGHT_THEME}>
              <VaultHistoryPage />
            </ThemeProvider>
          </I18nextProvider>
        </StoreProvider>
      </MemoryRouter>,
    );
  });
  return { store, user: userEvent.setup() };
}
afterEach(() => vi.restoreAllMocks());
it('verifies the journal with a locked key without presenting a pending check as an error', async () => {
  await setup(() => new Promise(() => {}));
  expect(await screen.findByText('Ручной ввод')).toBeInTheDocument();
  expect(screen.queryByText('Не удалось проверить целостность журнала.')).not.toBeInTheDocument();
  expect(screen.queryByText('Источник: импорт, строка —')).not.toBeInTheDocument();
  expect(screen.queryByText('technical-hash')).not.toBeInTheDocument();
});
it('shows the successful verification once and decrypts an open entry after unlocking', async () => {
  vi.spyOn(VaultStore.prototype, 'decryptEvent').mockResolvedValue(
    JSON.stringify({
      date: '2026-11-01',
      kind: 'expense',
      amount: '125.50',
      accountId: 'a',
      note: 'Сохранённая копия',
    }),
  );
  const { store, user } = await setup(async () => ({ valid: true, checkedEvents: 1 }));
  expect(await screen.findByText('Проверено записей: 1')).toBeInTheDocument();
  expect(screen.getAllByText('Целостность журнала подтверждена.')).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Открыть детали' }));
  expect(
    screen.getByText('Чтобы прочитать сохранённую копию операции, разблокируйте ключ подписи.'),
  ).toBeInTheDocument();
  act(() =>
    runInAction(() => {
      store.vault.status = 'unlocked';
    }),
  );
  expect(await screen.findByText('Сохранённая копия')).toBeInTheDocument();
  expect(screen.getByText('125,50 ₽', { exact: false })).toBeInTheDocument();
});
it('distinguishes a failed request from a verified broken chain and keeps the key state', async () => {
  const { store } = await setup(async () => {
    throw new Error('offline');
  });
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Не удалось проверить целостность журнала.',
  );
  expect(screen.queryByText('Проверка нашла несоответствие в журнале.')).not.toBeInTheDocument();
  expect(store.vault.status).toBe('locked');
});
it('reports an actual journal mismatch separately from a failed request', async () => {
  await setup(async () => ({ valid: false, checkedEvents: 0 }));
  expect(screen.getByRole('alert')).toHaveTextContent('Проверка нашла несоответствие в журнале.');
  expect(screen.queryByText('Не удалось проверить целостность журнала.')).not.toBeInTheDocument();
});
it('shows a decryption error instead of leaving entry details empty', async () => {
  vi.spyOn(VaultStore.prototype, 'decryptEvent')
    .mockRejectedValueOnce(new Error('tampered'))
    .mockResolvedValue(JSON.stringify({ note: 'Копия прочитана' }));
  const { store, user } = await setup(async () => ({ valid: true, checkedEvents: 1 }));
  act(() =>
    runInAction(() => {
      store.vault.status = 'unlocked';
    }),
  );
  await user.click(screen.getByRole('button', { name: 'Открыть детали' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Не удалось прочитать зашифрованную копию.',
  );
  await user.click(screen.getByRole('button', { name: i18n.t(I18nKey.TransactionsRetry) }));
  expect(await screen.findByText('Копия прочитана')).toBeInTheDocument();
});
