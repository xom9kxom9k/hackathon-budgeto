import { T } from '@admiral-ds/react-ui';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

import { I18nKey } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib/formatMoney';
import type { CashflowPoint } from '@/entities/transaction/model/types';
import { cashflowBuckets } from '@/shared/lib/analytics';

interface CashflowChartProps {
  compact?: boolean;
  data: CashflowPoint[];
  from: string;
  to: string;
  currency: string;
}

export function CashflowChart({ compact = false, data, from, to, currency }: CashflowChartProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'ru';
  const { points, step } = useMemo(() => cashflowBuckets(data, from, to), [data, from, to]);
  const dateLabel = (value: string) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
      new Date(value),
    );

  return (
    <section
      className={`chart-panel${compact ? ' chart-panel--compact' : ''}`}
      aria-labelledby="cashflow-title"
    >
      <div className="section-heading">
        <div>
          <T font="Header/H4" as="h2" id="cashflow-title">
            {t(I18nKey.OverviewCashflow)}
          </T>
          <p className="panel-copy">
            {t(step === 1 ? I18nKey.AnalyticsDaily : I18nKey.AnalyticsGrouped, { days: step })}
          </p>
        </div>
      </div>
      {!data.some((point) => point.income || point.expenses) ? (
        <div className="state-callout">{t(I18nKey.OverviewNoCashflow)}</div>
      ) : (
        <>
          <div className="chart-frame" aria-hidden="true">
            <ResponsiveContainer height={compact ? 260 : 300} width="100%">
              <BarChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barGap={3}>
                <CartesianGrid stroke="var(--admiral-color-Neutral_Neutral20)" vertical={false} />
                <XAxis
                  dataKey="period"
                  tickFormatter={dateLabel}
                  minTickGap={28}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  stroke="var(--admiral-color-Neutral_Neutral60)"
                />
                <YAxis
                  axisLine={false}
                  tickFormatter={(value: number) =>
                    new Intl.NumberFormat(locale, {
                      notation: 'compact',
                      maximumFractionDigits: 1,
                    }).format(value)
                  }
                  width={64}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  stroke="var(--admiral-color-Neutral_Neutral60)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--admiral-color-Neutral_Neutral00)',
                    border: '1px solid var(--admiral-color-Neutral_Neutral30)',
                    borderRadius: 'var(--admiral-border-radius-Medium)',
                    color: 'var(--admiral-color-Neutral_Neutral90)',
                  }}
                  formatter={(value: number) => formatMoney(value, currency, locale)}
                  labelFormatter={(value) => {
                    const point = points.find((item) => item.period === value);
                    return point
                      ? `${dateLabel(point.period)}${step > 1 ? ` – ${dateLabel(point.end)}` : ''}`
                      : String(value);
                  }}
                  itemStyle={{ color: 'var(--admiral-color-Neutral_Neutral90)' }}
                  labelStyle={{ color: 'var(--admiral-color-Neutral_Neutral70)' }}
                />
                <Legend iconType="square" wrapperStyle={{ paddingTop: 16 }} />
                <Bar
                  dataKey="income"
                  fill="var(--admiral-color-Primary_Primary60Main)"
                  maxBarSize={24}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                  name={t(I18nKey.OverviewIncome)}
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--admiral-color-Error_Error60Main)"
                  maxBarSize={24}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                  name={t(I18nKey.OverviewExpenses)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details className="chart-data-details">
            <summary>{t(I18nKey.AnalyticsTable)}</summary>
            <table className="chart-data-table">
              <caption>{t(I18nKey.OverviewCashflow)}</caption>
              <thead>
                <tr>
                  <th>{t(I18nKey.Date)}</th>
                  <th>{t(I18nKey.OverviewIncome)}</th>
                  <th>{t(I18nKey.OverviewExpenses)}</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={point.period}>
                    <td>
                      {dateLabel(point.period)}
                      {step > 1 ? ` – ${dateLabel(point.end)}` : ''}
                    </td>
                    <td>{formatMoney(point.income, currency, locale)}</td>
                    <td>{formatMoney(point.expenses, currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
