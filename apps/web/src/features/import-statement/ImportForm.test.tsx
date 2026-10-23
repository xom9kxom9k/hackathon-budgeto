import { importFileSchema } from './ImportForm';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { LIGHT_THEME } from '@admiral-ds/react-ui';
import { ImportForm } from './ImportForm';
import { RootStore } from '@/app/stores/RootStore';
import { StoreProvider } from '@/app/stores/StoreProvider';
import { StoreName } from '@/app/stores/StoreName';
import { i18n } from '@/shared/i18n';

describe('ImportForm', () => {
  it('rejects unsupported file extensions', async () => {
    const result = importFileSchema.safeParse({
      file: new File(['data'], 'statement.pdf', { type: 'application/pdf' }),
    });

    expect(result.success).toBe(false);
  });

  it('accepts an Excel statement in the upload schema', () => {
    const result = importFileSchema.safeParse({
      file: new File(['xlsx'], 'statement.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    });

    expect(result.success).toBe(true);
  });

  it('filters invalid rows and translates parser issues', async () => {
    const store = new RootStore();
    store.get(StoreName.Accounts).accounts = [{ id: 'account-1', name: 'Карта', currency: 'RUB' }];
    store.get(StoreName.Accounts).status = 'success';
    store.get(StoreName.Categories).categories = [
      { id: 'category-1', name: 'Еда', kind: 'expense' },
      { id: 'category-2', name: 'Зарплата', kind: 'income' },
    ];
    store.get(StoreName.Categories).status = 'success';
    store.get(StoreName.Import).job = {
      id: 'job-1',
      fileName: 'statement.xlsx',
      status: 'preview',
      errorCode: null,
      preview: {
        format: 'budgeto-xlsx',
        total: 2,
        valid: 1,
        invalid: 1,
        rows: [
          {
            sourceRow: 2,
            date: null,
            type: 'expense',
            amount: 10,
            accountName: 'Карта',
            destinationAccountName: null,
            categoryName: 'Еда',
            note: null,
            valid: false,
            errors: ['INVALID_DATE'],
            warnings: [],
          },
          {
            sourceRow: 3,
            date: '2026-01-01',
            type: 'income',
            amount: 100,
            accountName: 'Карта',
            destinationAccountName: null,
            categoryName: 'Зарплата',
            note: null,
            valid: true,
            errors: [],
            warnings: [],
          },
        ],
      },
    };

    const user = userEvent.setup();
    render(
      <StoreProvider store={store}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider theme={LIGHT_THEME}>
            <ImportForm onJobCreated={() => undefined} onNewImport={() => undefined} />
          </ThemeProvider>
        </I18nextProvider>
      </StoreProvider>,
    );

    expect(screen.getByText('Проверьте дату')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Показать строки'), 'invalid');
    expect(screen.getByRole('combobox', { name: 'Счёт 2' })).toHaveValue('Карта');
    expect(screen.queryByDisplayValue('2026-01-01')).not.toBeInTheDocument();
  });

  it('marks edited rows for recheck and blocks confirmation until saved', async () => {
    const store = new RootStore();
    store.get(StoreName.Accounts).accounts = [{ id: 'account-1', name: 'Карта', currency: 'RUB' }];
    store.get(StoreName.Accounts).status = 'success';
    store.get(StoreName.Categories).categories = [
      { id: 'category-1', name: 'Еда', kind: 'expense' },
    ];
    store.get(StoreName.Categories).status = 'success';
    store.get(StoreName.Vault).status = 'unlocked';
    store.get(StoreName.Import).job = {
      id: 'job-1',
      fileName: 'statement.xlsx',
      status: 'preview',
      errorCode: null,
      preview: {
        format: 'budgeto-xlsx',
        total: 1,
        valid: 1,
        invalid: 0,
        rows: [
          {
            sourceRow: 2,
            date: '2026-01-01',
            type: 'expense',
            amount: 10,
            accountName: 'Карта',
            destinationAccountName: null,
            categoryName: 'Еда',
            note: null,
            valid: true,
            errors: [],
            warnings: [],
          },
        ],
      },
    };

    const user = userEvent.setup();
    render(
      <StoreProvider store={store}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider theme={LIGHT_THEME}>
            <ImportForm onJobCreated={() => undefined} onNewImport={() => undefined} />
          </ThemeProvider>
        </I18nextProvider>
      </StoreProvider>,
    );

    expect(screen.getByRole('button', { name: 'Подтвердить импорт' })).toBeEnabled();
    await user.selectOptions(screen.getByLabelText('Операция 2'), 'transfer');
    expect(screen.getByRole('button', { name: 'Сохранить исправления' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Подтвердить импорт' })).toBeDisabled();
    expect(
      screen.getByText('После изменения сохраните строку для повторной проверки'),
    ).toBeInTheDocument();
  });
});
