import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CategoryTotal } from '@/shared/services/OverviewService';
import { formatMoney } from '@/shared/lib/formatMoney';
import { I18nKey } from '@/shared/i18n';

export function CategoryBreakdown({
  expenses,
  income,
  currency,
}: {
  expenses: CategoryTotal[];
  income: CategoryTotal[];
  currency: string;
}) {
  const { t, i18n } = useTranslation();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const rows = kind === 'expense' ? expenses : income;
  const total = rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0);
  return (
    <section className="plain-panel category-breakdown" aria-labelledby="category-breakdown-title">
      <div className="analytics-tabs" aria-label={t(I18nKey.Category)}>
        <button type="button" aria-pressed={kind === 'expense'} onClick={() => setKind('expense')}>
          {t(I18nKey.TransactionTypeExpense)}
        </button>
        <button type="button" aria-pressed={kind === 'income'} onClick={() => setKind('income')}>
          {t(I18nKey.TransactionTypeIncome)}
        </button>
      </div>
      <h2 id="category-breakdown-title">
        {t(kind === 'expense' ? I18nKey.AnalyticsExpenses : I18nKey.AnalyticsIncome)}
      </h2>
      {!rows.length ? (
        <p className="panel-copy">{t(I18nKey.AnalyticsNoCategories)}</p>
      ) : (
        <ol className="category-ranking">
          {rows.map((row) => {
            const percent = total ? Math.round(((row.amount * 100) / total) * 100) : 0;
            return (
              <li key={row.id ?? 'uncategorized'}>
                <div className="category-ranking-heading">
                  <strong>{row.name ?? t(I18nKey.TransactionNoCategory)}</strong>
                  <span>{formatMoney(row.amount, currency, i18n.resolvedLanguage)}</span>
                </div>
                <div className="category-ranking-track" aria-hidden="true">
                  <span style={{ width: `${percent}%` }} />
                </div>
                <span className="metric-note">
                  {percent}% · {t(I18nKey.AnalyticsOperations, { count: row.count })}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
