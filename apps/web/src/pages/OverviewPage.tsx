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
  const { t } = useTranslation();
  const overviewStore = useStore(StoreName.Overview);
  const defaultPeriod = useMemo(getCurrentMonthPeriod, []);
  const [period, setPeriod] = useQueryStates(
    {
      from: parseAsString.withDefault(defaultPeriod.from),
      to: parseAsString.withDefault(defaultPeriod.to),
    },
    { history: 'replace', shallow: true },
  );

  useEffect(() => {
    void overviewStore.load(period);
  }, [overviewStore, period]);

  const updatePeriod = (key: 'from' | 'to', value: string) => {
    void setPeriod({ [key]: value || null });
  };

  const netLabel = `${overviewStore.net >= 0 ? '+' : ''}${formatMoney(overviewStore.net)}`;
  const isEmpty = overviewStore.status === 'empty';
  const isError = overviewStore.status === 'error';

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
          <Button appearance="primary" dimension="m" onClick={() => navigate('/imports')}>
            {t(I18nKey.OverviewOpenImports)}
          </Button>
        </div>
      </section>

      <section className="overview-period-panel" aria-labelledby="overview-period-title">
        <div>
          <span className="section-kicker">{t(I18nKey.OverviewPeriod)}</span>
          <T font="Header/H4" as="h2" id="overview-period-title">
            {t(I18nKey.OverviewAccountsCount, { count: overviewStore.accountsCount })}
          </T>
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

      {isError ? (
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
          <section className="overview-anchor-grid" aria-label={t(I18nKey.OverviewNetMovement)}>
            <article className="metric-card metric-card--primary overview-net-card">
              <span className="card-kicker">{t(I18nKey.OverviewNetMovement)}</span>
              <strong>{netLabel}</strong>
              <span className="metric-note">{t(I18nKey.OverviewNetMovementDescription)}</span>
              <span className="metric-note">
                {t(I18nKey.OverviewAccountsCount, { count: overviewStore.accountsCount })}
              </span>
            </article>

            <article className="plain-panel overview-movement-card">
              <div className="section-heading section-heading--compact">
                <div>
                  <span className="section-kicker">{t(I18nKey.OverviewRecentMovement)}</span>
                  <T font="Header/H4" as="h3">
                    {t(I18nKey.OverviewCashflow)}
                  </T>
                </div>
              </div>
              <div className="movement-values">
                <div>
                  <span>{t(I18nKey.OverviewIncome)}</span>
                  <strong className="amount amount--positive">
                    +{formatMoney(overviewStore.income)}
                  </strong>
                </div>
                <div>
                  <span>{t(I18nKey.OverviewExpenses)}</span>
                  <strong className="amount amount--negative">
                    -{formatMoney(overviewStore.expenses)}
                  </strong>
                </div>
              </div>
              <Button appearance="tertiary" dimension="m" onClick={() => navigate('/transactions')}>
                {t(I18nKey.OverviewOpenTransactions)}
              </Button>
            </article>
          </section>

          <CashflowChart data={overviewStore.cashflow} compact />

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
