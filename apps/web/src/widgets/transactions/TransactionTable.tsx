import { useTranslation } from 'react-i18next';
import { I18nKey } from '@/shared/i18n';
import type { Transaction } from '@/entities/transaction/model/types';
import { TransactionAmount } from '@/shared/ui/TransactionAmount';

interface TransactionTableProps {
  onSelect?: (transaction: Transaction) => void;
  transactions: Transaction[];
}
export function TransactionTable({ onSelect, transactions }: TransactionTableProps) {
  const { t } = useTranslation();
  const typeLabel = (kind: Transaction['kind']) =>
    t(
      kind === 'income'
        ? I18nKey.TransactionTypeIncome
        : kind === 'expense'
          ? I18nKey.TransactionTypeExpense
          : I18nKey.ActivityTransfer,
    );
  const accountLabel = (transaction: Transaction) =>
    transaction.destinationAccount
      ? `${transaction.account.name} → ${transaction.destinationAccount.name}`
      : transaction.account.name;
  const noteLabel = (transaction: Transaction) => transaction.note || typeLabel(transaction.kind);
  if (!transactions.length) return <div className="state-callout">{t(I18nKey.EmptyState)}</div>;
  return (
    <div className="transaction-table-wrap">
      <table className="transaction-table finance-table">
        <caption className="sr-only">{t(I18nKey.OverviewLatestTransactions)}</caption>
        <thead>
          <tr>
            <th scope="col">{t(I18nKey.Date)}</th>
            <th scope="col">{t(I18nKey.Operation)}</th>
            <th scope="col">{t(I18nKey.Category)}</th>
            <th scope="col">{t(I18nKey.Account)}</th>
            <th scope="col">{t(I18nKey.Amount)}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>
                <time dateTime={transaction.date}>{transaction.date}</time>
              </td>
              <td>
                {onSelect ? (
                  <button className="transaction-link" onClick={() => onSelect(transaction)}>
                    {noteLabel(transaction)}
                  </button>
                ) : (
                  <strong>{noteLabel(transaction)}</strong>
                )}
                <span className="transaction-kind">{typeLabel(transaction.kind)}</span>
              </td>
              <td>{transaction.category?.name || t(I18nKey.TransactionNoCategory)}</td>
              <td>{accountLabel(transaction)}</td>
              <td>
                <TransactionAmount transaction={transaction} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="transaction-list-mobile">
        {transactions.map((transaction) => {
          const content = (
            <>
              <div>
                <strong>{noteLabel(transaction)}</strong>
                <span>
                  {typeLabel(transaction.kind)} · {transaction.date} ·{' '}
                  {transaction.category?.name || t(I18nKey.TransactionNoCategory)} ·{' '}
                  {accountLabel(transaction)}
                </span>
              </div>
              <TransactionAmount transaction={transaction} />
            </>
          );
          return onSelect ? (
            <button
              className="transaction-mobile-row"
              key={transaction.id}
              onClick={() => onSelect(transaction)}
              type="button"
            >
              {content}
            </button>
          ) : (
            <article className="transaction-mobile-row" key={transaction.id}>
              {content}
            </article>
          );
        })}
      </div>
    </div>
  );
}
