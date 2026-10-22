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

export const BankDetailPage = observer(function BankDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { bankId = '' } = useParams();
  const accountsStore = useStore(StoreName.Accounts);
  const [activeTab, setActiveTab] = useState('overview');
  const bank = accountsStore.getBank(bankId);
  const accounts = accountsStore.getAccountsForBank(bankId);

  if (!bank) return <div className="state-callout">{t(I18nKey.EmptyState)}</div>;

  const balance = accounts.reduce((total, account) => total + account.balance, 0);

  return (
    <div className="page-stack">
      <FinanceBreadcrumbs
        items={[
          { text: t(I18nKey.BreadcrumbOverview), url: '/overview' },
          { text: t(I18nKey.BreadcrumbAccounts), url: '/accounts' },
          { text: bank.name },
        ]}
      />
      <section className="page-intro">
        <span className="section-kicker">{t(I18nKey.BankDetailKicker)}</span>
        <T font="Header/H2" as="h2">
          {bank.name}
        </T>
        <p>{t(I18nKey.BankDetailDescription)}</p>
        <StatusIndicator dimension="s" text={t(I18nKey.Demo)} />
      </section>
      <section className="detail-summary-grid">
        <article className="metric-card metric-card--primary">
          <span className="card-kicker">{t(I18nKey.AccountsBalance)}</span>
          <strong>{formatMoney(balance)}</strong>
          <span className="metric-note">
            {accounts.length} {t(I18nKey.AccountsAccounts).toLocaleLowerCase()}
          </span>
        </article>
        <article className="plain-panel">
          <span className="section-kicker">{t(I18nKey.AccountsLastSynced)}</span>
          <T font="Header/H5" as="h3">
            {bank.lastSyncedAt}
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
              <span className="section-kicker">{t(I18nKey.AccountsAccounts)}</span>
              <T font="Header/H4" as="h3">
                {t(I18nKey.AccountsAccounts)}
              </T>
            </div>
          </div>
          {accounts.map((account) => (
            <div className="detail-list-row" key={account.id}>
              <div>
                <strong>{account.name}</strong>
                <span>
                  {account.type} · {account.currency}
                </span>
              </div>
              <div className="detail-list-row-actions">
                <strong>{formatMoney(account.balance, account.currency)}</strong>
                <Button
                  appearance="tertiary"
                  dimension="s"
                  onClick={() => navigate(`/accounts/${account.id}`)}
                >
                  {t(I18nKey.AccountsOpen)}
                </Button>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="plain-panel">
          <T font="Header/H4" as="h3">
            {activeTab === 'activity'
              ? t(I18nKey.AccountDetailRecentTransactions)
              : t(I18nKey.AccountDetailHistory)}
          </T>
          <p className="panel-copy">{t(I18nKey.AccountsDemoNote)}</p>
        </section>
      )}
    </div>
  );
});
