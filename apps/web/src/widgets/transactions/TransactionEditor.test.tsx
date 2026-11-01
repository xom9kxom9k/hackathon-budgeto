import { LIGHT_THEME } from '@admiral-ds/react-ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { runInAction } from 'mobx';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { TransactionsStore } from '@/app/stores/TransactionsStore';
import { RootStore } from '@/app/stores/RootStore';
import { StoreProvider } from '@/app/stores/StoreProvider';
import { ApiError } from '@/shared/api/errors';
import { i18n, I18nKey, Language } from '@/shared/i18n';
import { TransactionEditor } from './TransactionEditor';

function setup() {
  const create = vi.spyOn(TransactionsStore.prototype, 'create').mockResolvedValue();
  const store = new RootStore();
  runInAction(() => {
    store.vault.status = 'unlocked';
    store.accounts.accounts = [
      { id: 'a', name: 'Основной', currency: 'RUB' },
      { id: 'b', name: 'Наличные', currency: 'RUB' },
    ];
  });
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <StoreProvider store={store}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider theme={LIGHT_THEME}>
          <TransactionEditor onClose={onClose} onSaved={onSaved} />
        </ThemeProvider>
      </I18nextProvider>
    </StoreProvider>,
  );
  return { store, create, onClose, onSaved, user: userEvent.setup() };
}

afterEach(() => vi.restoreAllMocks());

beforeEach(async () => {
  await i18n.changeLanguage(Language.Ru);
});

describe('TransactionEditor', () => {
  it('keeps entries and displays the API validation error when saving fails', async () => {
    const { create, onSaved, onClose, user } = setup();
    create.mockRejectedValue(new ApiError('Bad request', 400, { message: ['Invalid account'] }));
    await user.type(screen.getByLabelText('Сумма'), '180');
    await user.selectOptions(screen.getByLabelText('Счёт'), 'a');
    await user.type(screen.getByLabelText('Заметка'), 'Продукты');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid account');
    expect(screen.getByLabelText('Сумма')).toHaveValue(180);
    expect(screen.getByLabelText('Заметка')).toHaveValue('Продукты');
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
  it('requires an amount and source account before any request', async () => {
    const { create, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(create).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Сумма'), '12');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(create).not.toHaveBeenCalled();
  });
  it('removes the selected source from transfer destinations and clears a stale destination', async () => {
    const { create, user } = setup();
    await user.selectOptions(screen.getByLabelText('Операция'), 'transfer');
    await user.selectOptions(screen.getByLabelText('Счёт'), 'a');
    const destination = screen.getByLabelText(i18n.t(I18nKey.ImportsDestinationAccount));
    expect(destination).not.toHaveTextContent('Основной');
    await user.selectOptions(destination, 'b');
    await user.selectOptions(screen.getByLabelText('Счёт'), 'b');
    expect(destination).toHaveValue('');
    expect(create).not.toHaveBeenCalled();
  });
  it('blocks repeated submissions while a save is pending', async () => {
    const { create, onSaved, user } = setup();
    let resolve!: () => void;
    create.mockImplementation(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    await user.type(screen.getByLabelText('Сумма'), '180');
    await user.selectOptions(screen.getByLabelText('Счёт'), 'a');
    const form = screen.getByRole('button', { name: 'Сохранить' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(create).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Сохранение…' })).toBeDisabled();
    resolve();
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });
});
