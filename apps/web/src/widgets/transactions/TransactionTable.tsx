import { Table } from '@admiral-ds/react-ui';
import type { Column, TableRow } from '@admiral-ds/react-ui';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { I18nKey } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib/formatMoney';
import type { Transaction } from '@/entities/transaction/model/types';

interface TransactionTableProps {
  onSelect?: (transaction: Transaction) => void;
  transactions: Transaction[];
}

export function TransactionTable({ onSelect, transactions }: TransactionTableProps) {
  const { t } = useTranslation();
  const columns = useMemo<Column[]>(
    () => [
      { name: 'date', title: t(I18nKey.Date), width: 100 },
      { name: 'merchant', title: t(I18nKey.Operation), width: '36%' },
      { name: 'category', title: t(I18nKey.Category), width: '24%' },
      {
        name: 'amount',
        title: t(I18nKey.Amount),
        width: 150,
        cellAlign: 'right',
        renderCell: (value: number, row: TableRow) => {
          const transaction = row as TableRow & Transaction;
          return (
            <span className={`amount ${value >= 0 ? 'amount--positive' : 'amount--negative'}`}>
              {value >= 0 ? '+' : ''}
              {formatMoney(value, transaction.currency)}
            </span>
          );
        },
      },
    ],
    [t],
  );
  const rows = useMemo<TableRow[]>(
    () => transactions.map((transaction) => ({ ...transaction, hover: Boolean(onSelect) })),
    [onSelect, transactions],
  );

  if (transactions.length === 0) {
    return <div className="state-callout">{t(I18nKey.EmptyState)}</div>;
  }

  return (
    <div className="transaction-table-wrap">
      <div className="transaction-table" aria-label={t(I18nKey.OverviewLatestTransactions)}>
        <Table
          columnList={columns}
          dimension="m"
          disableColumnResize
          greyHeader
          rowList={rows}
          onRowClick={
            onSelect
              ? (rowId) => {
                  const transaction = transactions.find((item) => item.id === rowId);
                  if (transaction) onSelect(transaction);
                }
              : undefined
          }
          showLastRowUnderline
        />
      </div>
      <div className="transaction-list-mobile" aria-label={t(I18nKey.OverviewLatestTransactions)}>
        <AnimatePresence initial={false}>
          {transactions.map((transaction) => (
            <motion.button
              animate={{ opacity: 1, y: 0 }}
              className="transaction-mobile-row"
              initial={{ opacity: 0, y: 4 }}
              key={transaction.id}
              layout
              onClick={() => onSelect?.(transaction)}
              type="button"
            >
              <div>
                <strong>{transaction.merchant}</strong>
                <span>
                  {transaction.date} · {transaction.category}
                </span>
              </div>
              <span
                className={`amount ${transaction.amount >= 0 ? 'amount--positive' : 'amount--negative'}`}
              >
                {transaction.amount >= 0 ? '+' : ''}
                {formatMoney(transaction.amount, transaction.currency)}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
