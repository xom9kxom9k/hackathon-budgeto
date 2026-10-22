import { Button, T } from '@admiral-ds/react-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { I18nKey } from '@/shared/i18n';
import { PageIntro } from '@/shared/ui/PageIntro';

export function VaultHistoryPage() {
  const { t } = useTranslation();
  const [verificationVisible, setVerificationVisible] = useState(false);

  return (
    <PageIntro
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
          </div>
        </div>
        <div className="timeline-item">
          <span className="timeline-date">20 окт · baseline</span>
          <div>
            <strong>{t(I18nKey.VaultBaselineEvent)}</strong>
            <p>{t(I18nKey.VaultBaselineEventDescription)}</p>
          </div>
        </div>
      </section>
      <section className="plain-panel plain-panel--accent">
        <span className="section-kicker">{t(I18nKey.VaultIntegrityKicker)}</span>
        <T font="Header/H5" as="h2">
          {t(I18nKey.VaultIntegrityTitle)}
        </T>
        <p className="panel-copy">{t(I18nKey.VaultIntegrityDescription)}</p>
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
