import type { Transaction } from '@/entities/transaction/model/types';
import { formatMoney } from '@/shared/lib/formatMoney';

export function TransactionAmount({ transaction }: { transaction: Transaction }) {
  const { kind, amount, account } = transaction;
  const sign = kind === 'income' ? '+' : kind === 'expense' ? '−' : '';
  return (
    <span className={`amount amount--${kind}`}>
      {sign}
      {formatMoney(Math.abs(amount), account.currency)}
    </span>
  );
}
