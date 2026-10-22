import { Button, T } from '@admiral-ds/react-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { I18nKey } from '@/shared/i18n';
import { PageIntro } from '@/shared/ui/PageIntro';

export function SecurityPage() {
  const { t } = useTranslation();
  const [accessRevoked, setAccessRevoked] = useState(false);

  return (
    <PageIntro
      description={t(I18nKey.SecurityDescription)}
      kicker={t(I18nKey.SecurityKicker)}
      title={t(I18nKey.SecurityTitle)}
    >
      <section className="security-grid">
        <article className="plain-panel">
          <span className="section-kicker">{t(I18nKey.SecurityAiAccess)}</span>
          <T font="Header/H5" as="h2">
            {t(accessRevoked ? I18nKey.SecurityRevoked : I18nKey.SecurityGranted)}
          </T>
          <p className="panel-copy">{t(I18nKey.SecurityAccessDescription)}</p>
          <Button
            appearance={accessRevoked ? 'secondary' : 'danger'}
            dimension="m"
            onClick={() => setAccessRevoked((value) => !value)}
          >
            {t(accessRevoked ? I18nKey.SecurityRestore : I18nKey.SecurityRevoke)}
          </Button>
        </article>
        <article className="plain-panel">
          <span className="section-kicker">{t(I18nKey.SecurityEvents)}</span>
          <T font="Header/H5" as="h2">
            {t(I18nKey.SecurityJournalEmpty)}
          </T>
          <p className="panel-copy">{t(I18nKey.SecurityJournalDescription)}</p>
        </article>
      </section>
    </PageIntro>
  );
}
