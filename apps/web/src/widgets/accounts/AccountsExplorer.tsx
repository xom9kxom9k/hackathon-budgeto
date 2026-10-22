import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  InputField,
  StatusIndicator,
} from '@admiral-ds/react-ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AccountSummary, Bank, FinancialProduct } from '@/entities/account/model/types';
import { I18nKey } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib/formatMoney';

interface AccountsExplorerProps {
  accounts: AccountSummary[];
  banks: Bank[];
  products: FinancialProduct[];
  onOpenAccount: (accountId: string) => void;
  onOpenBank: (bankId: string) => void;
  onOpenProduct: (productId: string) => void;
}

export function AccountsExplorer({
  accounts,
  banks,
  products,
  onOpenAccount,
  onOpenBank,
  onOpenProduct,
}: AccountsExplorerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const visibleBanks = useMemo(
    () =>
      banks.filter((bank) => {
        if (!normalizedQuery) return true;
        const bankAccounts = accounts.filter((account) => account.bankId === bank.id);
        const bankProducts = products.filter((product) => product.bankId === bank.id);
        return [
          bank.name,
          ...bankAccounts.flatMap((account) => [account.name, account.type]),
          ...bankProducts.flatMap((product) => [product.name, product.type]),
        ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      }),
    [accounts, banks, normalizedQuery, products],
  );

  return (
    <section className="accounts-explorer" aria-label={t(I18nKey.AccountsTitle)}>
      <div className="section-heading accounts-explorer-heading">
        <span className="section-kicker">{t(I18nKey.AccountsBanks)}</span>
        <InputField
          dimension="m"
          label={t(I18nKey.Search)}
          placeholder={t(I18nKey.AccountsSearch)}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {visibleBanks.length === 0 ? (
        <div className="state-callout">{t(I18nKey.AccountsEmpty)}</div>
      ) : (
        <Accordion className="accounts-accordion" hideTopDivider>
          {visibleBanks.map((bank) => {
            const bankAccounts = accounts.filter((account) => account.bankId === bank.id);

            return (
              <AccordionItem
                defaultExpanded
                key={bank.id}
                title={
                  <div className="account-group-title">
                    <div>
                      <strong>{bank.name}</strong>
                      <StatusIndicator dimension="s" text={t(I18nKey.Demo)} />
                    </div>
                    <Button
                      appearance="tertiary"
                      dimension="s"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenBank(bank.id);
                      }}
                    >
                      {t(I18nKey.AccountsOpen)}
                    </Button>
                  </div>
                }
              >
                <div className="account-tree">
                  {bankAccounts.map((account) => {
                    const accountProducts = products.filter(
                      (product) => product.accountId === account.id,
                    );

                    return (
                      <div className="account-tree-row" key={account.id}>
                        <div className="account-tree-main">
                          <div>
                            <strong>{account.name}</strong>
                            <span>
                              {account.type} · {account.currency}
                            </span>
                          </div>
                          <div className="account-tree-balance">
                            <span>{t(I18nKey.AccountsBalance)}</span>
                            <strong>{formatMoney(account.balance, account.currency)}</strong>
                          </div>
                        </div>
                        <div className="account-tree-actions">
                          <StatusIndicator dimension="s" text={t(I18nKey.Demo)} />
                          <Button
                            appearance="tertiary"
                            dimension="s"
                            onClick={() => onOpenAccount(account.id)}
                          >
                            {t(I18nKey.AccountsOpen)}
                          </Button>
                        </div>
                        <div className="product-list">
                          <span className="product-list-label">{t(I18nKey.AccountsProducts)}</span>
                          {accountProducts.length === 0 ? (
                            <span className="metric-note">{t(I18nKey.AccountsNoProducts)}</span>
                          ) : (
                            accountProducts.map((product) => (
                              <button
                                className="product-link"
                                key={product.id}
                                onClick={() => onOpenProduct(product.id)}
                                type="button"
                              >
                                <span>{product.name}</span>
                                <Badge appearance="grey" dimension="s">
                                  {product.type}
                                </Badge>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </section>
  );
}
