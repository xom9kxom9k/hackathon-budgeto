import { Button, StatusIndicator, T } from '@admiral-ds/react-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { I18nKey } from '@/shared/i18n';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { PageIntro } from '@/shared/ui/PageIntro';

export function VaultHistoryPage() {
  const { t } = useTranslation();
  const [verificationVisible, setVerificationVisible] = useState(false);

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
        <div className="state-callout">{t(I18nKey.EmptyState)}</div>
      </section>
      <section className="plain-panel plain-panel--accent">
        <span className="section-kicker">{t(I18nKey.VaultIntegrityKicker)}</span>
        <T font="Header/H5" as="h2">
          {t(I18nKey.VaultIntegrityTitle)}
        </T>
        <p className="panel-copy">{t(I18nKey.VaultIntegrityDescription)}</p>
        <StatusIndicator
          dimension="s"
          text={verificationVisible ? t(I18nKey.VaultCheckOpened) : t(I18nKey.SecurityVaultStatus)}
        />
        <Button appearance="secondary" dimension="m" onClick={() => setVerificationVisible(true)}>
          {t(I18nKey.VaultOpenCheck)}
        </Button>
        {verificationVisible ? (
          <div className="state-callout" role="status">
            {t(I18nKey.VaultCheckOpened)}
          </div>
        ) : null}
      </section>
    </PageIntro>
  );
}
