import { Spinner } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { Navigate, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';

export const PublicOnlyRoute = observer(function PublicOnlyRoute({ children }: PropsWithChildren) {
  const authStore = useStore(StoreName.Auth);
  const { t } = useTranslation();
  const location = useLocation();
  const allowRegistrationRecovery =
    location.pathname === '/register/totp' && authStore.recoveryCodes.length > 0;

  if (authStore.isBootstrapping || authStore.status === 'unknown') {
    return (
      <div className="route-loading" aria-live="polite" role="status">
        <Spinner dimension="l" />
        <span>{t(I18nKey.LoadingState)}</span>
      </div>
    );
  }

  if (authStore.status === 'authenticated' && !allowRegistrationRecovery) {
    return <Navigate replace to="/overview" />;
  }
  return children;
});
