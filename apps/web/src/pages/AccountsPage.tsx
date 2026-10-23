import { Button } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { AccountsExplorer } from '@/widgets/accounts/AccountsExplorer';

export const AccountsPage = observer(function AccountsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const accountsStore = useStore(StoreName.Accounts);

  useEffect(() => {
    void accountsStore.load();
  }, [accountsStore]);

  return (
    <div className="page-stack">
      <FinanceBreadcrumbs
        items={[
          { text: t(I18nKey.BreadcrumbOverview), url: '/overview' },
          { text: t(I18nKey.BreadcrumbAccounts) },
        ]}
      />
      <section className="page-intro page-intro--with-action">
        <div>
          <span className="section-kicker">{t(I18nKey.AccountsKicker)}</span>
          <h2>{t(I18nKey.AccountsTitle)}</h2>
          <p>{t(I18nKey.AccountsDescription)}</p>
        </div>
        <div className="page-intro-actions">
          <Button appearance="primary" dimension="m" onClick={() => navigate('/imports')}>
            {t(I18nKey.OverviewOpenImports)}
          </Button>
        </div>
      </section>

      {accountsStore.status === 'error' ? (
        <div className="state-callout state-callout--error">
          <span>{t(I18nKey.AccountsLoadError)}</span>
          <Button appearance="secondary" dimension="s" onClick={() => accountsStore.retry()}>
            {t(I18nKey.AccountsRetry)}
          </Button>
        </div>
      ) : null}

      {accountsStore.status === 'success' || accountsStore.status === 'empty' ? (
        <AccountsExplorer accounts={accountsStore.accounts} onImport={() => navigate('/imports')} />
      ) : null}
    </div>
  );
});
