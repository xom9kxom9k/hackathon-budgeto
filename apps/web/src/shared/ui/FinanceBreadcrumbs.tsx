import { Breadcrumbs } from '@admiral-ds/react-ui';
import { useTranslation } from 'react-i18next';

import { I18nKey } from '@/shared/i18n';
import { useIsCompactLayout } from '@/shared/hooks/useMediaQuery';

interface FinanceBreadcrumbsProps {
  items: Array<{ text: string; url?: string }>;
}

export function FinanceBreadcrumbs({ items }: FinanceBreadcrumbsProps) {
  const { t } = useTranslation();
  const isCompactLayout = useIsCompactLayout();

  return (
    <Breadcrumbs
      aria-label={t(I18nKey.BreadcrumbBack)}
      className="finance-breadcrumbs"
      dimension="m"
      items={items}
      mobile={isCompactLayout}
    />
  );
}
