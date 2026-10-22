import { Badge, Button, T } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib/formatMoney';
import { CashflowChart } from '@/widgets/overview/CashflowChart';
import { TransactionTable } from '@/widgets/transactions/TransactionTable';

export const OverviewPage = observer(function OverviewPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const healthStore = useStore(StoreName.Health);
  const overviewStore = useStore(StoreName.Overview);

  useEffect(() => {
    void healthStore.refresh();
  }, [healthStore]);

  const healthLabel =
    healthStore.status === 'success'
      ? t(I18nKey.OverviewApiOnline)
      : healthStore.status === 'error'
        ? t(I18nKey.OverviewApiOffline)
        : t(I18nKey.OverviewApiChecking);
  const healthAppearance =
    healthStore.status === 'success'
      ? 'success'
      : healthStore.status === 'error'
        ? 'error'
        : 'warning';

  return (
    <div className="page-stack">
      <section className="demo-banner" aria-label={t(I18nKey.PreviewKicker)}>
        <div>
          <span className="banner-kicker">{t(I18nKey.PreviewKicker)}</span>
          <p>{t(I18nKey.PreviewDescription)}</p>
        </div>
        <Badge appearance="info" dimension="m">
          {t(I18nKey.PreviewBadge)}
        </Badge>
      </section>

      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-kicker">{t(I18nKey.OverviewKicker)}</span>
          <T font="Header/H2" as="h2" className="hero-title">
            {t(I18nKey.OverviewTitle)}
          </T>
          <p className="hero-description">{t(I18nKey.OverviewDescription)}</p>
          <Button appearance="primary" dimension="m" onClick={() => navigate('/imports')}>
            {t(I18nKey.OverviewPrepareImport)}
          </Button>
        </div>
        <div className="hero-balance" aria-label={t(I18nKey.OverviewCurrentBalance)}>
          <span>{t(I18nKey.OverviewCurrentBalance)}</span>
          <strong>{formatMoney(overviewStore.balance)}</strong>
          <small>{t(I18nKey.OverviewDemoAccount)}</small>
        </div>
      </section>

      <section className="overview-grid" aria-label={t(I18nKey.OverviewRecentRecords)}>
        <article className="metric-card metric-card--primary">
          <span className="card-kicker">{t(I18nKey.OverviewExpenses)}</span>
          <strong>{formatMoney(overviewStore.expenses)}</strong>
          <span className="metric-note">{t(I18nKey.OverviewDemoStatement)}</span>
        </article>
        <article className="metric-card">
          <span className="card-kicker">{t(I18nKey.OverviewLastImport)}</span>
          <strong>{t(I18nKey.OverviewNotConnected)}</strong>
          <span className="metric-note">{t(I18nKey.OverviewSelectFile)}</span>
        </article>
        <article className="metric-card metric-card--status">
          <span className="card-kicker">{t(I18nKey.OverviewApiState)}</span>
          <Badge appearance={healthAppearance} dimension="m">
            {healthLabel}
          </Badge>
          <Button appearance="tertiary" dimension="s" onClick={() => void healthStore.refresh()}>
            {t(I18nKey.OverviewRetry)}
          </Button>
        </article>
      </section>

      <CashflowChart data={overviewStore.cashflow} />

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

      <section className="overview-lower-grid">
        <article className="plain-panel">
          <div className="section-heading section-heading--compact">
            <div>
              <span className="section-kicker">{t(I18nKey.OverviewNextStep)}</span>
              <T font="Header/H5" as="h2">
                {t(I18nKey.OverviewPrepareFirstImport)}
              </T>
            </div>
          </div>
          <p className="panel-copy">{t(I18nKey.OverviewPrepareFirstImportDescription)}</p>
          <Button appearance="secondary" dimension="m" onClick={() => navigate('/imports')}>
            {t(I18nKey.OverviewOpenImport)}
          </Button>
        </article>
        <article className="plain-panel plain-panel--accent">
          <span className="section-kicker">{t(I18nKey.OverviewVaultHistory)}</span>
          <T font="Header/H5" as="h2">
            {t(I18nKey.OverviewHistoryTitle)}
          </T>
          <p className="panel-copy">{t(I18nKey.OverviewHistoryDescription)}</p>
          <Button appearance="tertiary" dimension="m" onClick={() => navigate('/vault-history')}>
            {t(I18nKey.OverviewOpenHistory)}
          </Button>
        </article>
      </section>
    </div>
  );
});
