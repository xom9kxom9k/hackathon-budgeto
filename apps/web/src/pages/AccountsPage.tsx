import { Button } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { AccountsExplorer } from '@/widgets/accounts/AccountsExplorer';
import { ReferenceForm } from '@/widgets/references/ReferenceForm';
import { ReferenceTabs } from '@/shared/ui/ReferenceTabs';
import type { Account } from '@/entities/account/model/types';

export const AccountsPage = observer(function AccountsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const accountsStore = useStore(StoreName.Accounts);
  const [editing, setEditing] = useState<Account | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    void accountsStore.load();
  }, [accountsStore]);

  const submitForm = async (value: { name: string; currency?: string }) => {
    if (editing) {
      await accountsStore.update(editing.id, { name: value.name });
    } else {
      await accountsStore.create({ name: value.name, currency: value.currency ?? 'RUB' });
    }
    if (accountsStore.mutationStatus === 'success') {
      setFormOpen(false);
      setEditing(null);
    }
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
          <Button appearance="primary" dimension="m" onClick={() => { setEditing(null); setFormOpen(true); }}>{t(I18nKey.AccountsAdd)}</Button>
          <Button appearance="secondary" dimension="m" onClick={() => navigate('/imports')}>{t(I18nKey.OverviewOpenImports)}</Button>
        </div>
      </section>

      <ReferenceTabs />

      {formOpen ? (
        <section className="reference-editor" aria-label={t(editing ? I18nKey.AccountsEdit : I18nKey.AccountsAdd)}>
          <h3>{t(editing ? I18nKey.AccountsEdit : I18nKey.AccountsAdd)}</h3>
          <ReferenceForm
            initial={editing ?? undefined}
            mode="account"
            onCancel={() => { setFormOpen(false); setEditing(null); }}
            onSubmit={(value) => { void submitForm(value); }}
            saving={accountsStore.mutationStatus === 'saving'}
          />
        </section>
      ) : null}
      {accountsStore.mutationStatus === 'error' ? <div className="state-callout state-callout--error">{t(I18nKey.ReferencesMutationError)}</div> : null}

      {accountsStore.status === 'error' ? (
        <div className="state-callout state-callout--error">
          <span>{t(I18nKey.AccountsLoadError)}</span>
          <Button appearance="secondary" dimension="s" onClick={() => accountsStore.retry()}>
            {t(I18nKey.AccountsRetry)}
          </Button>
        </div>
      ) : null}

      {accountsStore.status === 'success' || accountsStore.status === 'empty' ? (
        <AccountsExplorer accounts={accountsStore.accounts} onImport={() => navigate('/imports')} onEdit={(account) => { setEditing(account); setFormOpen(true); }} onArchive={(account) => { if (window.confirm(t(I18nKey.AccountsArchiveConfirm))) void accountsStore.archive(account.id); }} />
      ) : null}
    </div>
  );
});
