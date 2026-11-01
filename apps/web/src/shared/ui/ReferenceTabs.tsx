import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { I18nKey } from '@/shared/i18n';

export function ReferenceTabs() {
  const location = useLocation();
  const { t } = useTranslation();
  const categories = location.pathname.startsWith('/categories');
  return (
    <nav className="reference-tabs" aria-label={t(I18nKey.AccountsTitle)}>
      <Link to="/accounts" aria-current={!categories ? 'page' : undefined}>
        {t(I18nKey.AccountsAccounts)}
      </Link>
      <Link to="/categories" aria-current={categories ? 'page' : undefined}>
        {t(I18nKey.CategoriesTitle)}
      </Link>
    </nav>
  );
}
