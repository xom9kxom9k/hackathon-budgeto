import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { I18nKey } from '@/shared/i18n';

interface FinanceBreadcrumbsProps {
  items: Array<{ text: string; url?: string }>;
}
export function FinanceBreadcrumbs({ items }: FinanceBreadcrumbsProps) {
  const { t } = useTranslation();
  return (
    <nav className="finance-breadcrumbs" aria-label={t(I18nKey.BreadcrumbBack)}>
      <ol>
        {items.map((item, index) => (
          <li key={`${item.text}-${index}`}>
            {item.url ? (
              <Link to={item.url}>{item.text}</Link>
            ) : (
              <span aria-current="page">{item.text}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
