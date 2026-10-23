import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { I18nKey } from '@/shared/i18n';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';

export function ProductDetailPage() {
  const { t } = useTranslation();
  const { productId = '' } = useParams();

  return (
    <div className="page-stack">
      <FinanceBreadcrumbs
        items={[
          { text: t(I18nKey.BreadcrumbOverview), url: '/overview' },
          { text: t(I18nKey.BreadcrumbAccounts), url: '/accounts' },
          { text: productId },
        ]}
      />
      <div className="state-callout">{t(I18nKey.AccountDetailUnavailable)}</div>
    </div>
  );
}
