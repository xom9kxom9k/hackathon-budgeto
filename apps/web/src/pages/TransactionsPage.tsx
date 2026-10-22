import {
  Badge,
  Drawer,
  DrawerContent,
  DrawerTitle,
  InputField,
  Option,
  Select,
  StatusIndicator,
  T,
} from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import type { Transaction } from '@/entities/transaction/model/types';
import { I18nKey } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib/formatMoney';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { TransactionTable } from '@/widgets/transactions/TransactionTable';

export const TransactionsPage = observer(function TransactionsPage() {
  const { t } = useTranslation();
  const overviewStore = useStore(StoreName.Overview);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return overviewStore.transactions.filter((transaction) => {
      const matchesQuery = normalizedQuery
        ? `${transaction.merchant} ${transaction.category}`
            .toLocaleLowerCase()
            .includes(normalizedQuery)
        : true;
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'income' ? transaction.amount >= 0 : transaction.amount < 0);
      const matchesAccount = accountFilter === 'all' || transaction.currency === accountFilter;

      return matchesQuery && matchesType && matchesAccount;
    });
  }, [accountFilter, overviewStore.transactions, query, typeFilter]);

  return (
    <div className="page-stack">
      <FinanceBreadcrumbs
        items={[
          { text: t(I18nKey.BreadcrumbOverview), url: '/overview' },
          { text: t(I18nKey.NavigationTransactions) },
        ]}
      />
      <section className="page-intro">
        <span className="section-kicker">{t(I18nKey.NavigationActivity)}</span>
        <T font="Header/H2" as="h2">
          {t(I18nKey.TransactionsTitle)}
        </T>
        <p>{t(I18nKey.TransactionsDescription)}</p>
      </section>

      <section className="filter-panel" aria-label={t(I18nKey.ActivityFilters)}>
        <div className="section-heading section-heading--compact">
          <div>
            <span className="section-kicker">{t(I18nKey.ActivityFilters)}</span>
            <T font="Header/H5" as="h2">
              {t(I18nKey.ActivityFilters)}
            </T>
          </div>
          <Badge appearance="info" dimension="s">
            {t(I18nKey.DemoData)}
          </Badge>
        </div>
        <div className="filter-grid">
          <InputField
            dimension="m"
            label={t(I18nKey.Search)}
            placeholder={t(I18nKey.ActivitySearch)}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="filter-select">
            <span>{t(I18nKey.ActivityAllTypes)}</span>
            <Select
              aria-label={t(I18nKey.ActivityAllTypes)}
              dimension="m"
              mode="select"
              onSelectedChange={(value) => setTypeFilter(String(value))}
              value={typeFilter}
            >
              <Option value="all">{t(I18nKey.ActivityAllTypes)}</Option>
              <Option value="income">{t(I18nKey.OverviewIncome)}</Option>
              <Option value="expense">{t(I18nKey.OverviewExpenses)}</Option>
            </Select>
          </label>
          <label className="filter-select">
            <span>{t(I18nKey.ActivityAllAccounts)}</span>
            <Select
              aria-label={t(I18nKey.ActivityAllAccounts)}
              dimension="m"
              mode="select"
              onSelectedChange={(value) => setAccountFilter(String(value))}
              value={accountFilter}
            >
              <Option value="all">{t(I18nKey.ActivityAllAccounts)}</Option>
              <Option value="RUB">RUB</Option>
            </Select>
          </label>
        </div>
      </section>

      <section className="plain-panel">
        <TransactionTable onSelect={setSelectedTransaction} transactions={filteredTransactions} />
      </section>

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
              <StatusIndicator dimension="s" text={t(I18nKey.Demo)} />
              <T font="Header/H4" as="h3">
                {selectedTransaction.merchant}
              </T>
              <dl className="detail-definition-list">
                <div>
                  <dt>{t(I18nKey.Date)}</dt>
                  <dd>{selectedTransaction.date}</dd>
                </div>
                <div>
                  <dt>{t(I18nKey.Category)}</dt>
                  <dd>{selectedTransaction.category}</dd>
                </div>
                <div>
                  <dt>{t(I18nKey.ActivitySource)}</dt>
                  <dd>{t(I18nKey.DemoData)}</dd>
                </div>
                <div>
                  <dt>{t(I18nKey.Amount)}</dt>
                  <dd
                    className={`amount ${selectedTransaction.amount >= 0 ? 'amount--positive' : 'amount--negative'}`}
                  >
                    {selectedTransaction.amount >= 0 ? '+' : ''}
                    {formatMoney(selectedTransaction.amount, selectedTransaction.currency)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
});
