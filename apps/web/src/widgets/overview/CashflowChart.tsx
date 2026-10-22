import { Badge, T } from '@admiral-ds/react-ui';
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

import { I18nKey } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib/formatMoney';
import type { CashflowPoint } from '@/entities/transaction/model/types';

interface CashflowChartProps {
  compact?: boolean;
  data: CashflowPoint[];
}

export function CashflowChart({ compact = false, data }: CashflowChartProps) {
  const { t } = useTranslation();

  return (
    <section
      className={`chart-panel${compact ? ' chart-panel--compact' : ''}`}
      aria-labelledby="cashflow-title"
    >
      <div className="section-heading">
        <div>
          <span className="section-kicker">{t(I18nKey.OverviewCashflow)}</span>
          <T font="Header/H4" as="h2" id="cashflow-title">
            {t(I18nKey.OverviewCashflow)}
          </T>
          <p className="panel-copy">{t(I18nKey.OverviewCashflowDescription)}</p>
        </div>
        <Badge appearance="info" dimension="m">
          {t(I18nKey.DemoData)}
        </Badge>
      </div>
      {data.length === 0 ? (
        <div className="state-callout">{t(I18nKey.EmptyState)}</div>
      ) : (
        <>
          <div className="chart-frame" aria-hidden="true">
            <ResponsiveContainer height={compact ? 190 : 280} width="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid
                  stroke="var(--admiral-color-Neutral_Neutral20)"
                  strokeDasharray="3 3"
                />
                <XAxis dataKey="period" stroke="var(--admiral-color-Neutral_Neutral60)" />
                <YAxis
                  axisLine={false}
                  tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
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
                  formatter={(value: number) => formatMoney(value)}
                  itemStyle={{ color: 'var(--admiral-color-Neutral_Neutral90)' }}
                  labelStyle={{ color: 'var(--admiral-color-Neutral_Neutral70)' }}
                />
                <Legend />
                <Bar
                  dataKey="income"
                  fill="var(--admiral-color-Success_Success50Main)"
                  name={t(I18nKey.OverviewIncome)}
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--admiral-color-Error_Error50)"
                  name={t(I18nKey.OverviewExpenses)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
              {data.map((point) => (
                <tr key={point.period}>
                  <td>{point.period}</td>
                  <td>{formatMoney(point.income)}</td>
                  <td>{formatMoney(point.expenses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
