import { Badge, Button } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { AccountsExplorer } from '@/widgets/accounts/AccountsExplorer';
import {
  AccountPreviewDrawer,
  type AccountPreviewTarget,
} from '@/widgets/accounts/AccountPreviewDrawer';

export const AccountsPage = observer(function AccountsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const accountsStore = useStore(StoreName.Accounts);
  const [previewTarget, setPreviewTarget] = useState<AccountPreviewTarget | null>(null);

  const openFullPage = (target: AccountPreviewTarget) => {
    setPreviewTarget(null);
    navigate(
      target.type === 'bank'
        ? `/banks/${target.id}`
        : target.type === 'account'
          ? `/accounts/${target.id}`
          : `/products/${target.id}`,
    );
  };

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
          <span className="page-intro-demo-badge">
            <Badge appearance="info" dimension="m">
              {t(I18nKey.DemoData)}
            </Badge>
          </span>
          <Button appearance="primary" dimension="m" onClick={() => navigate('/imports')}>
            {t(I18nKey.OverviewOpenImports)}
          </Button>
        </div>
      </section>

      <div className="state-callout state-callout--info">{t(I18nKey.AccountsDemoNote)}</div>

      <AccountsExplorer
        accounts={accountsStore.accounts}
        banks={accountsStore.banks}
        onOpenAccount={(id) => setPreviewTarget({ id, type: 'account' })}
        onOpenBank={(id) => setPreviewTarget({ id, type: 'bank' })}
        onOpenProduct={(id) => setPreviewTarget({ id, type: 'product' })}
        products={accountsStore.products}
      />

      <AccountPreviewDrawer
        accounts={accountsStore.accounts}
        banks={accountsStore.banks}
        onClose={() => setPreviewTarget(null)}
        onOpenFull={openFullPage}
        products={accountsStore.products}
        target={previewTarget}
      />
    </div>
  );
});
