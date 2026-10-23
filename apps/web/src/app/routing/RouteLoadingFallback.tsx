import { Spinner } from '@admiral-ds/react-ui';
import { useTranslation } from 'react-i18next';

import { I18nKey } from '@/shared/i18n';

export function RouteLoadingFallback() {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" aria-live="polite" className="route-loading" role="status">
      <Spinner dimension="l" />
      <span>{t(I18nKey.LoadingState)}</span>
    </div>
  );
}
