import {
  Button,
  Drawer,
  DrawerContent,
  DrawerTitle,
  InputField,
  Option,
  Select,
  T,
} from '@admiral-ds/react-ui';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import type { Transaction } from '@/entities/transaction/model/types';
import { I18nKey } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib/formatMoney';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { TransactionTable } from '@/widgets/transactions/TransactionTable';
import type { TransactionInput } from '@/shared/services/TransactionsService';

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
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(pageSize),
    q: parseAsString,
    to: parseAsString,
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<TransactionInput>({
    date: new Date().toISOString().slice(0, 10),
    kind: 'expense',
    amount: 0,
    accountId: '',
    destinationAccountId: null,
    categoryId: null,
    note: null,
    operationId: crypto.randomUUID(),
  });

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
      <section className="page-intro">
        <span className="section-kicker">{t(I18nKey.TransactionsKicker)}</span>
        <T font="Header/H2" as="h2">
          {t(I18nKey.TransactionsTitle)}
        </T>
        <p>{t(I18nKey.TransactionsDescription)}</p>
        <Button
          appearance="primary"
          dimension="m"
          onClick={() => {
            setDraft((value) => ({ ...value, operationId: crypto.randomUUID() }));
            setEditorOpen(true);
          }}
        >
          {t(I18nKey.TransactionsNew)}
        </Button>
      </section>

      <section className="filter-panel" aria-label={t(I18nKey.ActivityFilters)}>
        <div className="section-heading section-heading--compact">
          <div>
            <span className="section-kicker">{t(I18nKey.ActivityFilters)}</span>
            <T font="Header/H5" as="h2">
              {t(I18nKey.ActivityFilters)}
            </T>
          </div>
        </div>
        <div className="filter-grid">
          <InputField
            dimension="m"
            label={t(I18nKey.Search)}
            placeholder={t(I18nKey.ActivitySearch)}
            value={urlFilters.q ?? ''}
            onChange={(event) => void setUrlFilters({ q: event.target.value || null, page: 1 })}
          />
          <label className="filter-select">
            <span>{t(I18nKey.ActivityAllTypes)}</span>
            <Select
              aria-label={t(I18nKey.ActivityAllTypes)}
              dimension="m"
              mode="select"
              onSelectedChange={(value) =>
                void updateFilters({
                  kind: value === 'all' ? null : String(value),
                })
              }
              value={urlFilters.kind ?? 'all'}
            >
              <Option value="all">{t(I18nKey.ActivityAllTypes)}</Option>
              <Option value="income">{t(I18nKey.OverviewIncome)}</Option>
              <Option value="expense">{t(I18nKey.OverviewExpenses)}</Option>
              <Option value="transfer">{t(I18nKey.ActivityTransfer)}</Option>
            </Select>
          </label>
          <label className="filter-select">
            <span>{t(I18nKey.ActivityAllAccounts)}</span>
            <Select
              aria-label={t(I18nKey.ActivityAllAccounts)}
              dimension="m"
              mode="select"
              onSelectedChange={(value) =>
                void updateFilters({
                  account: value === 'all' ? null : String(value),
                })
              }
              value={urlFilters.account ?? 'all'}
            >
              <Option value="all">{t(I18nKey.ActivityAllAccounts)}</Option>
              {accountsStore.accounts.map((account) => (
                <Option key={account.id} value={account.id}>
                  {account.name} · {account.currency}
                </Option>
              ))}
            </Select>
          </label>
          <label className="filter-date">
            <span>{t(I18nKey.ActivityFrom)}</span>
            <input
              aria-label={t(I18nKey.ActivityFrom)}
              type="date"
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
                  <dd>{selectedTransaction.category?.name || t(I18nKey.TransactionNoCategory)}</dd>
                </div>
                <div>
                  <dt>{t(I18nKey.Account)}</dt>
                  <dd>{selectedTransaction.account.name}</dd>
                </div>
                <div>
                  <dt>{t(I18nKey.Amount)}</dt>
                  <dd
                    className={`amount ${selectedTransaction.amount >= 0 ? 'amount--positive' : 'amount--negative'}`}
                  >
                    {selectedTransaction.amount >= 0 ? '+' : ''}
                    {formatMoney(selectedTransaction.amount, selectedTransaction.account.currency)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>

      <Drawer
        backdrop
        closeOnBackdropClick
        closeOnEscapeKeyDown
        displayCloseIcon
        isOpen={editorOpen}
        locale={{ closeButtonAriaLabel: t(I18nKey.Close) }}
        onClose={() => setEditorOpen(false)}
        position="right"
      >
        <DrawerTitle>{t(I18nKey.TransactionsNew)}</DrawerTitle>
        <DrawerContent>
          <form
            className="reference-form"
            onSubmit={(event) => {
              event.preventDefault();
              void transactionsStore.create(draft).then(() => setEditorOpen(false));
            }}
          >
            <label className="filter-select">
              <span>{t(I18nKey.Operation)}</span>
              <Select
                mode="select"
                value={draft.kind}
                onSelectedChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    kind: value as Transaction['kind'],
                    categoryId: value === 'transfer' ? null : current.categoryId,
                  }))
                }
              >
                <Option value="income">{t(I18nKey.OverviewIncome)}</Option>
                <Option value="expense">{t(I18nKey.OverviewExpenses)}</Option>
                <Option value="transfer">{t(I18nKey.ActivityTransfer)}</Option>
              </Select>
            </label>
            <label className="filter-date">
              <span>{t(I18nKey.Date)}</span>
              <input
                required
                type="date"
                value={draft.date}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, date: event.target.value }))
                }
              />
            </label>
            <InputField
              label={t(I18nKey.Amount)}
              type="number"
              min="0.01"
              step="0.01"
              value={draft.amount || ''}
              onChange={(event) =>
                setDraft((current) => ({ ...current, amount: Number(event.target.value) }))
              }
              required
            />
            <label className="filter-select">
              <span>{t(I18nKey.Account)}</span>
              <Select
                mode="select"
                value={draft.accountId}
                onSelectedChange={(value) =>
                  setDraft((current) => ({ ...current, accountId: String(value) }))
                }
              >
                {accountsStore.accounts.map((account) => (
                  <Option key={account.id} value={account.id}>
                    {account.name} · {account.currency}
                  </Option>
                ))}
              </Select>
            </label>
            {draft.kind === 'transfer' ? (
              <label className="filter-select">
                <span>{t(I18nKey.ImportsDestinationAccount)}</span>
                <Select
                  mode="select"
                  value={draft.destinationAccountId ?? ''}
                  onSelectedChange={(value) =>
                    setDraft((current) => ({ ...current, destinationAccountId: String(value) }))
                  }
                >
                  {accountsStore.accounts
                    .filter((account) => account.id !== draft.accountId)
                    .map((account) => (
                      <Option key={account.id} value={account.id}>
                        {account.name} · {account.currency}
                      </Option>
                    ))}
                </Select>
              </label>
            ) : (
              <label className="filter-select">
                <span>{t(I18nKey.Category)}</span>
                <Select
                  mode="select"
                  value={draft.categoryId ?? ''}
                  onSelectedChange={(value) =>
                    setDraft((current) => ({ ...current, categoryId: String(value) }))
                  }
                >
                  {categoriesStore.byKind(draft.kind as 'income' | 'expense').map((category) => (
                    <Option key={category.id} value={category.id}>
                      {category.name}
                    </Option>
                  ))}
                </Select>
              </label>
            )}
            <InputField
              label={t(I18nKey.ImportsNote)}
              value={draft.note ?? ''}
              onChange={(event) =>
                setDraft((current) => ({ ...current, note: event.target.value || null }))
              }
            />
            <Button
              appearance="primary"
              dimension="m"
              disabled={transactionsStore.status === 'loading' || !draft.accountId || !draft.amount}
              type="submit"
            >
              {t(I18nKey.AccountsSave)}
            </Button>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
});
