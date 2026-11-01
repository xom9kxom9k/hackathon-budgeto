import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';

export const GlobalLoader = observer(function GlobalLoader() {
  const loader = useStore(StoreName.Loader);
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!loader.isLoading) {
      setVisible(false);
      return;
    }
    const timeout = window.setTimeout(() => setVisible(true), 350);
    return () => window.clearTimeout(timeout);
  }, [loader.isLoading]);
  return visible ? (
    <div className="request-status" role="status" data-testid="global-loader">
      {t(I18nKey.LoadingState)}
    </div>
  ) : null;
});
