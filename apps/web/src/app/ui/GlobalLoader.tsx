import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { Spinner } from '@admiral-ds/react-ui';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';

export const GlobalLoader = observer(function GlobalLoader() {
  const loaderStore = useStore(StoreName.Loader);
  const { t } = useTranslation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const content = document.querySelector<HTMLElement>('[data-app-content]');

    if (loaderStore.isLoading) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (content) content.inert = true;
      requestAnimationFrame(() => overlayRef.current?.focus());
      return;
    }

    if (content) content.inert = false;
    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, [loaderStore.isLoading]);

  return (
    <AnimatePresence>
      {loaderStore.isLoading ? (
        <motion.div
          animate={{ opacity: 1 }}
          aria-live="polite"
          aria-label={t(I18nKey.LoadingState)}
          aria-busy="true"
          className="global-loader"
          data-testid="global-loader"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onKeyDown={(event) => {
            if (event.key === 'Tab' || event.key === 'Escape') event.preventDefault();
          }}
          ref={overlayRef}
          role="status"
          tabIndex={0}
        >
          <Spinner dimension="l" />
          <span>{t(I18nKey.LoadingState)}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
});
