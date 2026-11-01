import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { i18n, Language } from '@/shared/i18n';
import type { Transaction } from '@/entities/transaction/model/types';
import { TransactionTable } from './TransactionTable';

const expense: Transaction = {
  id: 't1',
  date: '2026-11-01',
  kind: 'expense',
  amount: 180,
  note: 'Продукты',
  account: { id: 'a', name: 'Основной', currency: 'RUB' },
  destinationAccount: null,
  category: null,
};
beforeEach(async () => {
  await i18n.changeLanguage(Language.Ru);
});
describe('TransactionTable', () => {
  it('shows an expense as a deduction even when the API amount is positive', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <TransactionTable transactions={[expense]} />
      </I18nextProvider>,
    );
    expect(screen.getAllByText(/−180,00/)).toHaveLength(2);
    expect(screen.queryByText(/\+180,00/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('shows both accounts for a transfer without calling it income', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <TransactionTable
          transactions={[
            {
              ...expense,
              kind: 'transfer',
              destinationAccount: { id: 'b', name: 'Наличные', currency: 'RUB' },
            },
          ]}
        />
      </I18nextProvider>,
    );
    expect(screen.getAllByText(/Основной → Наличные/)).toHaveLength(2);
    expect(screen.queryByText(/\+180,00/)).not.toBeInTheDocument();
  });
});
