import { Button } from '@admiral-ds/react-ui';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { I18nKey } from '@/shared/i18n';

export function ReferenceTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const categories = location.pathname.startsWith('/categories');

  return (
    <div className="reference-tabs" role="tablist" aria-label={t(I18nKey.AccountsTitle)}>
      <Button
        appearance={categories ? 'secondary' : 'primary'}
        dimension="s"
        role="tab"
        aria-selected={!categories}
        onClick={() => navigate('/accounts')}
      >
        {t(I18nKey.AccountsAccounts)}
      </Button>
      <Button
        appearance={categories ? 'primary' : 'secondary'}
        dimension="s"
        role="tab"
        aria-selected={categories}
        onClick={() => navigate('/categories')}
      >
        {t(I18nKey.CategoriesTitle)}
      </Button>
    </div>
  );
}
