import { Button, StatusIndicator, T } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib/formatMoney';
import { DetailTabs } from '@/shared/ui/DetailTabs';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { TransactionTable } from '@/widgets/transactions/TransactionTable';

export const AccountDetailPage = observer(function AccountDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accountId = '' } = useParams();
  const accountsStore = useStore(StoreName.Accounts);
  const overviewStore = useStore(StoreName.Overview);
  const [activeTab, setActiveTab] = useState('overview');
  const account = accountsStore.getAccount(accountId);
  const bank = account ? accountsStore.getBank(account.bankId) : undefined;
  const products = accountsStore.getProductsForAccount(accountId);

  if (!account || !bank) return <div className="state-callout">{t(I18nKey.EmptyState)}</div>;

  return (
    <div className="page-stack">
      <FinanceBreadcrumbs
        items={[
          { text: t(I18nKey.BreadcrumbOverview), url: '/overview' },
          { text: t(I18nKey.BreadcrumbAccounts), url: '/accounts' },
          { text: bank.name, url: `/banks/${bank.id}` },
          { text: account.name },
        ]}
      />
      <section className="page-intro">
        <span className="section-kicker">{t(I18nKey.AccountDetailKicker)}</span>
        <T font="Header/H2" as="h2">
          {account.name}
        </T>
        <p>
          {bank.name} · {account.type}
        </p>
        <StatusIndicator dimension="s" text={t(I18nKey.Demo)} />
      </section>
      <section className="detail-summary-grid">
        <article className="metric-card metric-card--primary">
          <span className="card-kicker">{t(I18nKey.AccountsBalance)}</span>
          <strong>{formatMoney(account.balance, account.currency)}</strong>
          <span className="metric-note">{account.currency}</span>
        </article>
        <article className="plain-panel">
          <span className="section-kicker">{t(I18nKey.AccountsLastSynced)}</span>
          <T font="Header/H5" as="h3">
            {account.lastSyncedAt}
          </T>
          <p className="panel-copy">{t(I18nKey.AccountsDemoNote)}</p>
        </article>
      </section>
      <DetailTabs
        activeTab={activeTab}
        labels={{
          overview: t(I18nKey.OverviewCurrentBalance),
          activity: t(I18nKey.NavigationTransactions),
          history: t(I18nKey.AccountDetailHistory),
        }}
        onChange={setActiveTab}
        tabs={['overview', 'activity', 'history']}
      />
      {activeTab === 'overview' ? (
        <section className="plain-panel detail-list-panel">
          <div className="section-heading section-heading--compact">
            <div>
              <span className="section-kicker">{t(I18nKey.AccountsProducts)}</span>
              <T font="Header/H4" as="h3">
                {t(I18nKey.AccountDetailProducts)}
              </T>
            </div>
          </div>
          {products.length === 0 ? (
            <div className="state-callout">{t(I18nKey.AccountsNoProducts)}</div>
          ) : (
            products.map((product) => (
              <div className="detail-list-row" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.type}</span>
                </div>
                <div className="detail-list-row-actions">
                  <strong>{formatMoney(product.balance, product.currency)}</strong>
                  <Button
                    appearance="tertiary"
                    dimension="s"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    {t(I18nKey.AccountsOpen)}
                  </Button>
                </div>
              </div>
            ))
          )}
        </section>
      ) : activeTab === 'activity' ? (
        <section className="plain-panel">
          <div className="section-heading section-heading--compact">
            <div>
              <span className="section-kicker">{t(I18nKey.NavigationTransactions)}</span>
              <T font="Header/H4" as="h3">
                {t(I18nKey.AccountDetailRecentTransactions)}
              </T>
            </div>
          </div>
          <TransactionTable transactions={overviewStore.transactions} />
        </section>
      ) : (
        <section className="plain-panel">
          <T font="Header/H4" as="h3">
            {t(I18nKey.AccountDetailHistory)}
          </T>
          <p className="panel-copy">{t(I18nKey.AccountsDemoNote)}</p>
        </section>
      )}
    </div>
  );
});
