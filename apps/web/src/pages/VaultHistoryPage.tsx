import {
  Badge,
  Button,
  Drawer,
  DrawerContent,
  DrawerTitle,
  StatusIndicator,
  T,
} from '@admiral-ds/react-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { I18nKey } from '@/shared/i18n';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { PageIntro } from '@/shared/ui/PageIntro';

export function VaultHistoryPage() {
  const { t } = useTranslation();
  const [verificationVisible, setVerificationVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<'preview' | 'baseline' | null>(null);

  return (
    <PageIntro
      breadcrumbs={
        <FinanceBreadcrumbs
          items={[
            { text: t(I18nKey.BreadcrumbOverview), url: '/overview' },
            { text: t(I18nKey.NavigationVaultHistory) },
          ]}
        />
      }
      description={t(I18nKey.VaultDescription)}
      kicker={t(I18nKey.VaultKicker)}
      title={t(I18nKey.VaultTitle)}
    >
      <section className="timeline-panel">
        <div className="timeline-item">
          <span className="timeline-date">22 окт · preview</span>
          <div>
            <strong>{t(I18nKey.VaultPreviewEvent)}</strong>
            <p>{t(I18nKey.VaultPreviewEventDescription)}</p>
            <Button appearance="tertiary" dimension="s" onClick={() => setSelectedEvent('preview')}>
              {t(I18nKey.OpenDetails)}
            </Button>
          </div>
        </div>
        <div className="timeline-item">
          <span className="timeline-date">20 окт · baseline</span>
          <div>
            <strong>{t(I18nKey.VaultBaselineEvent)}</strong>
            <p>{t(I18nKey.VaultBaselineEventDescription)}</p>
            <Button
              appearance="tertiary"
              dimension="s"
              onClick={() => setSelectedEvent('baseline')}
            >
              {t(I18nKey.OpenDetails)}
            </Button>
          </div>
        </div>
      </section>
      <section className="plain-panel plain-panel--accent">
        <span className="section-kicker">{t(I18nKey.VaultIntegrityKicker)}</span>
        <T font="Header/H5" as="h2">
          {t(I18nKey.VaultIntegrityTitle)}
        </T>
        <p className="panel-copy">{t(I18nKey.VaultIntegrityDescription)}</p>
        <StatusIndicator
          dimension="s"
          text={verificationVisible ? t(I18nKey.VaultCheckOpened) : t(I18nKey.DemoData)}
        />
        <Badge appearance="info" dimension="s">
          {t(I18nKey.DemoData)}
        </Badge>
        <Button appearance="secondary" dimension="m" onClick={() => setVerificationVisible(true)}>
          {t(I18nKey.VaultOpenCheck)}
        </Button>
        {verificationVisible ? (
          <div className="state-callout" role="status">
            {t(I18nKey.VaultCheckOpened)}
          </div>
        ) : null}
      </section>
      <Drawer
        backdrop
        closeOnBackdropClick
        closeOnEscapeKeyDown
        displayCloseIcon
        isOpen={Boolean(selectedEvent)}
        locale={{ closeButtonAriaLabel: t(I18nKey.Close) }}
        onClose={() => setSelectedEvent(null)}
        position="right"
      >
        <DrawerTitle>{t(I18nKey.OpenDetails)}</DrawerTitle>
        <DrawerContent>
          {selectedEvent ? (
            <div className="preview-drawer-content">
              <StatusIndicator dimension="s" text={t(I18nKey.DemoData)} />
              <T font="Header/H5" as="h3">
                {selectedEvent === 'preview'
                  ? t(I18nKey.VaultPreviewEvent)
                  : t(I18nKey.VaultBaselineEvent)}
              </T>
              <p className="panel-copy">
                {selectedEvent === 'preview'
                  ? t(I18nKey.VaultPreviewEventDescription)
                  : t(I18nKey.VaultBaselineEventDescription)}
              </p>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    </PageIntro>
  );
}
