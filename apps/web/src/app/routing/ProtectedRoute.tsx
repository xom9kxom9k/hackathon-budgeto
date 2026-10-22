import { Spinner } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { Navigate, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';

export const ProtectedRoute = observer(function ProtectedRoute({ children }: PropsWithChildren) {
  const authStore = useStore(StoreName.Auth);
  const location = useLocation();
  const { t } = useTranslation();

  if (authStore.isBootstrapping || authStore.status === 'unknown') {
    return (
      <div className="route-loading" aria-live="polite" role="status">
        <Spinner dimension="l" />
        <span>{t(I18nKey.LoadingState)}</span>
      </div>
    );
  }

  if (authStore.status === 'anonymous') {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (authStore.user && !authStore.user.onboardingCompleted && location.pathname !== '/welcome') {
    return <Navigate replace state={{ from: location }} to="/welcome" />;
  }

  return children;
});
