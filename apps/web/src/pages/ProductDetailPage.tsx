import { Button, StatusIndicator, T } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';
import { formatMoney } from '@/shared/lib/formatMoney';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';

export const ProductDetailPage = observer(function ProductDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { productId = '' } = useParams();
  const accountsStore = useStore(StoreName.Accounts);
  const product = accountsStore.getProduct(productId);
  const account = product ? accountsStore.getAccount(product.accountId) : undefined;
  const bank = product ? accountsStore.getBank(product.bankId) : undefined;

  if (!product || !account || !bank)
    return <div className="state-callout">{t(I18nKey.EmptyState)}</div>;

  return (
    <div className="page-stack">
      <FinanceBreadcrumbs
        items={[
          { text: t(I18nKey.BreadcrumbOverview), url: '/overview' },
          { text: t(I18nKey.BreadcrumbAccounts), url: '/accounts' },
          { text: bank.name, url: `/banks/${bank.id}` },
          { text: account.name, url: `/accounts/${account.id}` },
          { text: product.name },
        ]}
      />
      <section className="page-intro">
        <span className="section-kicker">{t(I18nKey.ProductDetailKicker)}</span>
        <T font="Header/H2" as="h2">
          {product.name}
        </T>
        <p>
          {bank.name} · {account.name}
        </p>
        <StatusIndicator dimension="s" text={t(I18nKey.Demo)} />
      </section>
      <section className="detail-summary-grid">
        <article className="metric-card metric-card--primary">
          <span className="card-kicker">{t(I18nKey.ProductDetailBalance)}</span>
          <strong>{formatMoney(product.balance, product.currency)}</strong>
          <span className="metric-note">{product.currency}</span>
        </article>
        <article className="plain-panel">
          <span className="section-kicker">{t(I18nKey.ProductDetailType)}</span>
          <T font="Header/H5" as="h3">
            {product.type}
          </T>
          <p className="panel-copy">
            {t(I18nKey.ProductDetailAccount)}: {account.name}
          </p>
          <Button
            appearance="tertiary"
            dimension="m"
            onClick={() => navigate(`/accounts/${account.id}`)}
          >
            {t(I18nKey.AccountsOpen)}
          </Button>
        </article>
      </section>
      <section className="plain-panel">
        <T font="Header/H4" as="h3">
          {t(I18nKey.AccountDetailHistory)}
        </T>
        <p className="panel-copy">{t(I18nKey.AccountsDemoNote)}</p>
      </section>
    </div>
  );
});
