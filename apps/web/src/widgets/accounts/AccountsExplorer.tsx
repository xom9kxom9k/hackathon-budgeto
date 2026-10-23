import { Button, InputField, StatusIndicator } from '@admiral-ds/react-ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Account } from '@/entities/account/model/types';
import { I18nKey } from '@/shared/i18n';

interface AccountsExplorerProps {
  accounts: Account[];
  onImport: () => void;
}

export function AccountsExplorer({ accounts, onImport }: AccountsExplorerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleAccounts = useMemo(
    () =>
      accounts.filter((account) =>
        `${account.name} ${account.currency}`.toLocaleLowerCase().includes(normalizedQuery),
      ),
    [accounts, normalizedQuery],
  );

  return (
    <section className="accounts-explorer" aria-label={t(I18nKey.AccountsTitle)}>
      <div className="section-heading accounts-explorer-heading">
        <span className="section-kicker">{t(I18nKey.AccountsAccounts)}</span>
        <InputField
          dimension="m"
          label={t(I18nKey.Search)}
          placeholder={t(I18nKey.AccountsSearch)}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {visibleAccounts.length === 0 ? (
        <div className="state-callout">
          <span>{t(I18nKey.AccountsEmpty)}</span>
          <Button appearance="secondary" dimension="s" onClick={onImport}>
            {t(I18nKey.NavigationImports)}
          </Button>
        </div>
      ) : (
        <div className="real-account-list">
          {visibleAccounts.map((account) => (
            <div className="real-account-row" key={account.id}>
              <div>
                <strong>{account.name}</strong>
                <span>{account.currency}</span>
              </div>
              <StatusIndicator dimension="s" text={t(I18nKey.Connected)} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
