import { Button, Drawer, DrawerContent, DrawerTitle, T } from '@admiral-ds/react-ui';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import type { Transaction } from '@/entities/transaction/model/types';
import { I18nKey } from '@/shared/i18n';
import { TransactionAmount } from '@/shared/ui/TransactionAmount';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { TransactionTable } from '@/widgets/transactions/TransactionTable';
import { TransactionEditor } from '@/widgets/transactions/TransactionEditor';

const pageSize = 50;

export const TransactionsPage = observer(function TransactionsPage() {
  const { t } = useTranslation();
  const accountsStore = useStore(StoreName.Accounts);
  const transactionsStore = useStore(StoreName.Transactions);
  const categoriesStore = useStore(StoreName.Categories);
  const [urlFilters, setUrlFilters] = useQueryStates({
    account: parseAsString,
    from: parseAsString,
    kind: parseAsString,
    new: parseAsString,
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(pageSize),
    q: parseAsString,
    to: parseAsString,
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  useEffect(() => {
    if (
      urlFilters.new === '1' &&
      accountsStore.status !== 'loading' &&
      accountsStore.status !== 'idle'
    ) {
      setEditorOpen(true);
      void setUrlFilters({ new: null });
    }
  }, [urlFilters.new, accountsStore.status, setUrlFilters]);
  const [saved, setSaved] = useState(false);

  const filters = useMemo(
    () => ({
      accountId: urlFilters.account ?? undefined,
      from: urlFilters.from ?? undefined,
      kind:
        urlFilters.kind === 'income' ||
        urlFilters.kind === 'expense' ||
        urlFilters.kind === 'transfer'
          ? (urlFilters.kind as Transaction['kind'])
          : undefined,
      page: urlFilters.page,
      pageSize: urlFilters.pageSize,
      query: urlFilters.q ?? undefined,
      to: urlFilters.to ?? undefined,
    }),
    [
      urlFilters.account,
      urlFilters.from,
      urlFilters.kind,
      urlFilters.page,
      urlFilters.pageSize,
      urlFilters.q,
      urlFilters.to,
    ],
  );

  useEffect(() => {
    void accountsStore.load();
    void categoriesStore.load();
  }, [accountsStore, categoriesStore]);

  useEffect(() => {
    void transactionsStore.load(filters);
  }, [filters, transactionsStore]);

  const updateFilters = (updates: Parameters<typeof setUrlFilters>[0]) => {
    void setUrlFilters({ ...updates, page: 1 });
  };
  const totalPages = Math.max(1, Math.ceil(transactionsStore.total / transactionsStore.pageSize));

  return (
    <div className="page-stack">
      <FinanceBreadcrumbs
        items={[
          { text: t(I18nKey.BreadcrumbOverview), url: '/overview' },
          { text: t(I18nKey.NavigationTransactions) },
        ]}
      />
      <section className="page-intro page-intro--transaction">
        <span className="section-kicker">{t(I18nKey.TransactionsKicker)}</span>
        <T font="Header/H2" as="h2">
          {t(I18nKey.TransactionsTitle)}
        </T>
        <p>{t(I18nKey.TransactionsDescription)}</p>
        <Button
          appearance="primary"
          dimension="m"
          onClick={() => {
            setSaved(false);
            setEditorOpen(true);
          }}
        >
          {t(I18nKey.TransactionsNew)}
        </Button>
      </section>

      {saved && (
        <div className="state-callout state-callout--success" role="status">
          {t(I18nKey.TransactionSaved)}
        </div>
      )}
      <section className="filter-panel" aria-label={t(I18nKey.ActivityFilters)}>
        <div className="section-heading section-heading--compact">
          <div>
            <T font="Header/H5" as="h2">
              {t(I18nKey.ActivityFilters)}
            </T>
          </div>
        </div>
        <div className="filter-grid">
          <label className="form-field">
            <span>{t(I18nKey.Search)}</span>
            <input
              placeholder={t(I18nKey.ActivitySearch)}
              value={urlFilters.q ?? ''}
              onChange={(event) => void setUrlFilters({ q: event.target.value || null, page: 1 })}
            />
          </label>
          <label className="filter-select">
            <span>{t(I18nKey.ActivityAllTypes)}</span>
            <select
              aria-label={t(I18nKey.ActivityAllTypes)}
              onChange={(event) =>
                void updateFilters({
                  kind: event.target.value === 'all' ? null : event.target.value,
                })
              }
              value={urlFilters.kind ?? 'all'}
            >
              <option value="all">{t(I18nKey.ActivityAllTypes)}</option>
              <option value="income">{t(I18nKey.OverviewIncome)}</option>
              <option value="expense">{t(I18nKey.OverviewExpenses)}</option>
              <option value="transfer">{t(I18nKey.ActivityTransfer)}</option>
            </select>
          </label>
          <label className="filter-select">
            <span>{t(I18nKey.ActivityAllAccounts)}</span>
            <select
              aria-label={t(I18nKey.ActivityAllAccounts)}
              onChange={(event) =>
                void updateFilters({
                  account: event.target.value === 'all' ? null : event.target.value,
                })
              }
              value={urlFilters.account ?? 'all'}
            >
              <option value="all">{t(I18nKey.ActivityAllAccounts)}</option>
              {accountsStore.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currency}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-date">
            <span>{t(I18nKey.ActivityFrom)}</span>
            <input
              aria-label={t(I18nKey.ActivityFrom)}
              type="date"
              max={urlFilters.to ?? undefined}
              value={urlFilters.from ?? ''}
              onChange={(event) =>
                void setUrlFilters({
                  from: event.target.value || null,
                  page: 1,
                })
              }
            />
          </label>
          <label className="filter-date">
            <span>{t(I18nKey.ActivityTo)}</span>
            <input
              aria-label={t(I18nKey.ActivityTo)}
              type="date"
              min={urlFilters.from ?? undefined}
              value={urlFilters.to ?? ''}
              onChange={(event) => void setUrlFilters({ to: event.target.value || null, page: 1 })}
            />
          </label>
        </div>
      </section>

      {transactionsStore.status === 'error' ? (
        <div className="state-callout state-callout--error">
          <span>{t(I18nKey.TransactionsLoadError)}</span>
          <Button appearance="secondary" dimension="s" onClick={() => transactionsStore.retry()}>
            {t(I18nKey.TransactionsRetry)}
          </Button>
        </div>
      ) : null}

      {transactionsStore.status === 'success' || transactionsStore.status === 'empty' ? (
        <section className="plain-panel">
          <TransactionTable
            onSelect={setSelectedTransaction}
            transactions={transactionsStore.items}
          />
          {transactionsStore.status === 'success' && totalPages > 1 ? (
            <div className="pagination-row" aria-label={t(I18nKey.TransactionsPagination)}>
              <Button
                appearance="tertiary"
                dimension="s"
                disabled={transactionsStore.page <= 1}
                onClick={() => void setUrlFilters({ page: transactionsStore.page - 1 })}
              >
                {t(I18nKey.TransactionsPrevious)}
              </Button>
              <span>
                {transactionsStore.page} / {totalPages}
              </span>
              <Button
                appearance="tertiary"
                dimension="s"
                disabled={transactionsStore.page >= totalPages}
                onClick={() => void setUrlFilters({ page: transactionsStore.page + 1 })}
              >
                {t(I18nKey.TransactionsNext)}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {selectedTransaction && (
        <Drawer
          backdrop
          closeOnBackdropClick
          closeOnEscapeKeyDown
          displayCloseIcon
          isOpen={Boolean(selectedTransaction)}
          locale={{ closeButtonAriaLabel: t(I18nKey.Close) }}
          onClose={() => setSelectedTransaction(null)}
          position="right"
        >
          <DrawerTitle>{t(I18nKey.ActivityDetail)}</DrawerTitle>
          <DrawerContent>
            {selectedTransaction ? (
              <div className="preview-drawer-content">
                <T font="Header/H4" as="h3">
                  {selectedTransaction.note || t(I18nKey.TransactionNoDescription)}
                </T>
                <dl className="detail-definition-list">
                  <div>
                    <dt>{t(I18nKey.Date)}</dt>
                    <dd>{selectedTransaction.date}</dd>
                  </div>
                  <div>
                    <dt>{t(I18nKey.Category)}</dt>
                    <dd>
                      {selectedTransaction.category?.name || t(I18nKey.TransactionNoCategory)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t(I18nKey.Account)}</dt>
                    <dd>{selectedTransaction.account.name}</dd>
                  </div>
                  <div>
                    <dt>{t(I18nKey.Amount)}</dt>
                    <dd>
                      <TransactionAmount transaction={selectedTransaction} />{' '}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </DrawerContent>
        </Drawer>
      )}

      {editorOpen && (
        <TransactionEditor
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            setSaved(true);
          }}
        />
      )}
    </div>
  );
});
