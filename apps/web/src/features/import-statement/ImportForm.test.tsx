import { importFileSchema } from './ImportForm';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { runInAction } from 'mobx';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from 'styled-components';
import { LIGHT_THEME } from '@admiral-ds/react-ui';
import { ImportForm } from './ImportForm';
import { RootStore } from '@/app/stores/RootStore';
import { StoreProvider } from '@/app/stores/StoreProvider';
import { StoreName } from '@/app/stores/StoreName';
import { i18n } from '@/shared/i18n';
import type { ImportJob } from '@/shared/services/ImportService';

describe('ImportForm', () => {
  it('rejects unsupported file extensions', async () => {
    const result = importFileSchema.safeParse({
      file: new File(['data'], 'statement.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
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

  it('accepts CSV and PDF statements in the upload schema', () => {
    expect(
      importFileSchema.safeParse({
        file: new File(['date,amount'], 'statement.csv', { type: 'text/csv' }),
      }).success,
    ).toBe(true);
    expect(
      importFileSchema.safeParse({
        file: new File(['%PDF-1.7'], 'statement.pdf', { type: 'application/pdf' }),
      }).success,
    ).toBe(true);
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
        format: 'budgetto-xlsx',
        parserId: 'xlsx-header-map',
        parserVersion: '1.0.0',
        templateId: 'generic-xlsx-table',
        profileId: 'budgetto-xlsx',
        profileVersion: '1.0.0',
        confidence: 0.98,
        total: 2,
        valid: 1,
        invalid: 1,
        rows: [
          {
            sourceRow: 2,
            sourceRef: { kind: 'xlsx', sheet: 'Операции', record: 2 },
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
            sourceRef: { kind: 'xlsx', sheet: 'Операции', record: 3 },
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
    expect(screen.getByText(/Профиль обработки: budgetto-xlsx/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Показать строки'), 'invalid');
    expect(screen.getByRole('combobox', { name: 'Счёт 2' })).toHaveValue('Карта');
    expect(screen.queryByDisplayValue('2026-01-01')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Выбрать строки 2' }));
    expect(screen.getByText(/Выбрано: 1/)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Сортировка' }), 'date:desc');
    expect(screen.getByRole('combobox', { name: 'Сортировка' })).toHaveValue('date:desc');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Изменить у выбранных' }),
      'accountName',
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Новое значение' }), 'Карта');
    await user.click(screen.getByRole('button', { name: 'Применить к выбранным' }));
    expect(screen.getByRole('button', { name: 'Сохранить исправления' })).toBeEnabled();
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
        format: 'budgetto-xlsx',
        parserId: 'xlsx-header-map',
        parserVersion: '1.0.0',
        templateId: 'generic-xlsx-table',
        confidence: 0.98,
        total: 1,
        valid: 1,
        invalid: 0,
        rows: [
          {
            sourceRow: 2,
            sourceRef: { kind: 'xlsx', sheet: 'Операции', record: 2 },
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

  it('accepts a dropped PDF and keeps source editing linked to the preview row', async () => {
    const store = new RootStore();
    store.get(StoreName.Accounts).status = 'success';
    store.get(StoreName.Categories).status = 'success';
    const pdfJob: ImportJob = {
      id: 'job-pdf',
      fileName: 'statement.pdf',
      status: 'preview',
      errorCode: null,
      preview: {
        format: 'generic-pdf',
        parserId: 'pdf-text-table',
        parserVersion: '1.0.0',
        templateId: 'generic-pdf-text-table',
        profileId: 'sber-pdf-v1',
        total: 1,
        valid: 1,
        invalid: 0,
        rows: [
          {
            sourceRow: 2,
            sourceRef: { kind: 'pdf', page: 1, record: 2 },
            date: '2026-10-22',
            type: 'expense',
            amount: 1000,
            accountName: null,
            destinationAccountName: null,
            categoryName: null,
            note: 'Перевод',
            valid: true,
            errors: [],
            warnings: [],
          },
        ],
      },
    };

    render(
      <StoreProvider store={store}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider theme={LIGHT_THEME}>
            <ImportForm onJobCreated={() => undefined} onNewImport={() => undefined} />
          </ThemeProvider>
        </I18nextProvider>
      </StoreProvider>,
    );

    const dropzone = screen.getByText('Перетащите файл сюда или выберите его').closest('label');
    expect(dropzone).toBeInTheDocument();
    fireEvent.drop(dropzone!, {
      dataTransfer: {
        files: [new File(['%PDF-1.7'], 'dropped.pdf', { type: 'application/pdf' })],
      },
    });
    expect(store.get(StoreName.Import).selectedFile?.name).toBe('dropped.pdf');

    act(() => {
      runInAction(() => {
        store.get(StoreName.Import).job = pdfJob;
      });
    });
    const sourceButton = screen.getByRole('button', { name: 'Открыть источник строки 2' });
    const user = userEvent.setup();
    await user.click(sourceButton);
    const sourceAmount = screen.getByLabelText('Сумма 2 — Исправить выбранную строку');
    await user.clear(sourceAmount);
    await user.type(sourceAmount, '1250');

    expect(screen.getByLabelText('Сумма 2')).toHaveValue('1250');
  });
});
