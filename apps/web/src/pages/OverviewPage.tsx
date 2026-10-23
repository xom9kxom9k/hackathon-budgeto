import { Button, T } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';
import { CashflowChart } from '@/widgets/overview/CashflowChart';
import { TransactionTable } from '@/widgets/transactions/TransactionTable';

export const OverviewPage = observer(function OverviewPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const overviewStore = useStore(StoreName.Overview);
  const accountsStore = useStore(StoreName.Accounts);

  useEffect(() => {
    void accountsStore.load();
  }, [accountsStore]);

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

      <section className="overview-anchor-grid" aria-label={t(I18nKey.OverviewAvailableMoney)}>
        <article className="metric-card metric-card--primary overview-balance-card">
          <span className="card-kicker">{t(I18nKey.OverviewAvailableMoney)}</span>
          <strong className="overview-balance-unavailable">
            {t(I18nKey.OverviewBalanceUnavailable)}
          </strong>
          <span className="metric-note">
            {accountsStore.accounts.length
              ? t(I18nKey.OverviewAvailableMoneyDescription)
              : t(I18nKey.OverviewNoAccounts)}
          </span>
          <Button appearance="tertiary" dimension="m" onClick={() => navigate('/accounts')}>
            {t(I18nKey.OverviewOpenAccounts)}
          </Button>
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
          <p className="panel-copy">{t(I18nKey.OverviewRecentMovementDescription)}</p>
          <div className="state-callout">{t(I18nKey.OverviewNoCashflow)}</div>
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
        <TransactionTable transactions={overviewStore.transactions.slice(0, 3)} />
      </section>
    </div>
  );
});
