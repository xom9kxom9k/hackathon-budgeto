import { Button, T } from '@admiral-ds/react-ui';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { I18nKey } from '@/shared/i18n';

const features = [
  [I18nKey.LandingStatementsTitle, I18nKey.LandingStatementsDescription],
  [I18nKey.LandingTraceabilityTitle, I18nKey.LandingTraceabilityDescription],
  [I18nKey.LandingVaultTitle, I18nKey.LandingVaultDescription],
] as const;

export function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="section-kicker">{t(I18nKey.LandingKicker)}</span>
          <T font="Header/H1" as="h1">
            {t(I18nKey.LandingTitle)}
          </T>
          <p>{t(I18nKey.LandingDescription)}</p>
          <div className="landing-actions">
            <Button appearance="primary" dimension="m" onClick={() => navigate('/register')}>
              {t(I18nKey.LandingPrimaryAction)}
            </Button>
            <Button appearance="secondary" dimension="m" onClick={() => navigate('/login')}>
              {t(I18nKey.LandingSecondaryAction)}
            </Button>
          </div>
        </div>
        <div className="landing-aside" aria-label={t(I18nKey.LandingPrivacyNote)}>
          <span className="landing-aside-mark">B</span>
          <T font="Header/H5" as="h2">
            {t(I18nKey.BrandName)}
          </T>
          <p>{t(I18nKey.LandingPrivacyNote)}</p>
        </div>
      </section>
      <section className="landing-features" aria-label={t(I18nKey.LandingKicker)}>
        {features.map(([title, description]) => (
          <article className="landing-feature" key={title}>
            <span className="section-kicker">{t(title)}</span>
            <T font="Header/H5" as="h2">
              {t(title)}
            </T>
            <p>{t(description)}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
