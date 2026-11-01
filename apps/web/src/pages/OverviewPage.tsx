import { Button, T } from '@admiral-ds/react-ui';
import { parseAsString, useQueryStates } from 'nuqs';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib/formatMoney';
import { CashflowChart } from '@/widgets/overview/CashflowChart';
import { TransactionTable } from '@/widgets/transactions/TransactionTable';
import { CategoryBreakdown } from '@/widgets/overview/CategoryBreakdown';
import { SavingsGoalPanel } from '@/widgets/overview/SavingsGoalPanel';

function getCurrentMonthPeriod(): { from: string; to: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month + 1, 0));

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export const OverviewPage = observer(function OverviewPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const overviewStore = useStore(StoreName.Overview);
  const defaultPeriod = useMemo(getCurrentMonthPeriod, []);
  const [period, setPeriod] = useQueryStates(
    {
      from: parseAsString.withDefault(defaultPeriod.from),
      to: parseAsString.withDefault(defaultPeriod.to),
      currency: parseAsString,
    },
    { history: 'replace', shallow: true },
  );

  const filters = useMemo(
    () => ({
      from: period.from,
      to: period.to,
      ...(period.currency ? { currency: period.currency } : {}),
    }),
    [period],
  );
  useEffect(() => {
    void overviewStore.load(filters);
  }, [overviewStore, filters]);

  const updatePeriod = (key: 'from' | 'to', value: string) => {
    void setPeriod({ [key]: value || null });
  };

  const money = (value: number) =>
    formatMoney(value, overviewStore.currency, i18n.resolvedLanguage);
  const netLabel = `${overviewStore.net > 0 ? '+' : ''}${money(overviewStore.net)}`;
  const isEmpty = overviewStore.status === 'empty';
  const isError = overviewStore.status === 'error';
  const preset = (kind: 'current' | 'previous' | '90') => {
    const now = new Date();
    if (kind === 'current') {
      void setPeriod(getCurrentMonthPeriod());
      return;
    }
    const from =
      kind === 'previous'
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
        : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 90));
    const to =
      kind === 'previous'
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
        : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    void setPeriod({ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
  };

  return (
    <div className="page-stack">
      <section className="overview-heading">
        <div>
          <span className="section-kicker">{t(I18nKey.OverviewKicker)}</span>
          <T font="Header/H2" as="h2">
            {t(I18nKey.OverviewTitle)}
          </T>
          <p>{t(I18nKey.OverviewDescription)}</p>
        </div>
        <div className="page-intro-actions">
          <Button appearance="secondary" dimension="m" onClick={() => navigate('/accounts')}>
            {t(I18nKey.OverviewOpenAccounts)}
          </Button>
          <Button
            appearance="primary"
            dimension="m"
            onClick={() => navigate('/transactions?new=1')}
          >
            {t(I18nKey.TransactionsNew)}
          </Button>
        </div>
      </section>

      <section className="overview-period-panel" aria-labelledby="overview-period-title">
        <div className="period-context">
          <span className="section-kicker">{t(I18nKey.OverviewPeriod)}</span>
          <T font="Header/H4" as="h2" id="overview-period-title">
            {t(I18nKey.OverviewAccountsCount, { count: overviewStore.accountsCount })}
          </T>
          {overviewStore.availableCurrencies.length > 1 && (
            <label className="form-field period-currency">
              <span>{t(I18nKey.AnalyticsCurrency)}</span>
              <select
                value={period.currency ?? overviewStore.currency}
                onChange={(event) => void setPeriod({ currency: event.target.value })}
              >
                {overviewStore.availableCurrencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="period-presets">
            <button type="button" onClick={() => preset('current')}>
              {t(I18nKey.AnalyticsThisMonth)}
            </button>
            <button type="button" onClick={() => preset('previous')}>
              {t(I18nKey.AnalyticsLastMonth)}
            </button>
            <button type="button" onClick={() => preset('90')}>
              {t(I18nKey.AnalyticsLast90)}
            </button>
          </div>
        </div>
        <div className="overview-period-controls">
          <label>
            <span>{t(I18nKey.OverviewPeriodFrom)}</span>
            <input
              aria-label={t(I18nKey.OverviewPeriodFrom)}
              max={period.to}
              onChange={(event) => updatePeriod('from', event.target.value)}
              type="date"
              value={period.from}
            />
          </label>
          <label>
            <span>{t(I18nKey.OverviewPeriodTo)}</span>
            <input
              aria-label={t(I18nKey.OverviewPeriodTo)}
              min={period.from}
              onChange={(event) => updatePeriod('to', event.target.value)}
              type="date"
              value={period.to}
            />
          </label>
        </div>
      </section>

      {overviewStore.status === 'loading' || overviewStore.status === 'idle' ? (
        <p role="status">{t(I18nKey.LoadingState)}</p>
      ) : isError ? (
        <section className="state-callout state-callout--error" role="alert">
          <p>{t(I18nKey.OverviewSummaryLoadError)}</p>
          <Button appearance="secondary" dimension="m" onClick={() => void overviewStore.retry()}>
            {t(I18nKey.OverviewSummaryRetry)}
          </Button>
        </section>
      ) : isEmpty ? (
        <section className="state-callout">
          <p>{t(I18nKey.OverviewNoAccounts)}</p>
          <div className="page-intro-actions">
            <Button appearance="secondary" dimension="m" onClick={() => navigate('/accounts')}>
              {t(I18nKey.OverviewOpenAccounts)}
            </Button>
            <Button appearance="primary" dimension="m" onClick={() => navigate('/imports')}>
              {t(I18nKey.OverviewOpenImports)}
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="overview-summary-grid" aria-label={t(I18nKey.OverviewNetMovement)}>
            <article className="metric-card metric-card--primary overview-net-card">
              <span className="card-kicker">{t(I18nKey.OverviewNetMovement)}</span>
              <strong>{netLabel}</strong>
              <span className="metric-note">{t(I18nKey.OverviewNetMovementDescription)}</span>
            </article>
            <article className="metric-card">
              <span className="card-kicker">{t(I18nKey.OverviewIncome)}</span>
              <strong className="amount amount--income">
                {overviewStore.income > 0 ? '+' : ''}
                {money(overviewStore.income)}
              </strong>
            </article>
            <article className="metric-card">
              <span className="card-kicker">{t(I18nKey.OverviewExpenses)}</span>
              <strong className="amount amount--expense">
                {overviewStore.expenses > 0 ? '−' : ''}
                {money(overviewStore.expenses)}
              </strong>
            </article>
          </section>
          <p className="analytics-scope">
            {t(I18nKey.AnalyticsScope, { currency: overviewStore.currency })}
          </p>
          <CashflowChart
            data={overviewStore.cashflow}
            from={period.from}
            to={period.to}
            currency={overviewStore.currency}
            compact
          />
          <div className="analytics-detail-grid">
            <CategoryBreakdown
              expenses={overviewStore.expenseCategories}
              income={overviewStore.incomeCategories}
              currency={overviewStore.currency}
            />
            <SavingsGoalPanel
              key={overviewStore.currency}
              currency={overviewStore.currency}
              net={overviewStore.net}
              from={period.from}
              to={period.to}
            />
          </div>

          <section className="content-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">{t(I18nKey.OverviewRecentRecords)}</span>
                <T font="Header/H4" as="h2">
                  {t(I18nKey.OverviewLatestTransactions)}
                </T>
              </div>
              <Button appearance="tertiary" dimension="m" onClick={() => navigate('/transactions')}>
                {t(I18nKey.OverviewOpenTransactions)}
              </Button>
            </div>
            <TransactionTable transactions={overviewStore.transactions} />
          </section>
        </>
      )}
    </div>
  );
});
