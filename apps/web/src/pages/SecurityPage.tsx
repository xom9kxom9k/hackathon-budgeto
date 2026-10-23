import { Button, StatusIndicator, T } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { PageIntro } from '@/shared/ui/PageIntro';

export const SecurityPage = observer(function SecurityPage() {
  const { t } = useTranslation();
  const securityStore = useStore(StoreName.Security);
  const vaultStore = useStore(StoreName.Vault);
  useEffect(() => { void securityStore.load(); }, [securityStore]);
  const secure = securityStore.status?.totpEnabled ?? false;
  const vaultUnlocked = vaultStore.status === 'unlocked';
  return (
    <PageIntro breadcrumbs={<FinanceBreadcrumbs items={[{ text: t(I18nKey.BreadcrumbOverview), url: '/overview' }, { text: t(I18nKey.NavigationSecurity) }]} />} description={t(I18nKey.SecurityDescription)} kicker={t(I18nKey.SecurityKicker)} title={t(I18nKey.SecurityTitle)}>
      <section className="security-grid">
        <article className="plain-panel"><span className="section-kicker">{t(I18nKey.SecurityAiAccess)}</span><T font="Header/H5" as="h2">{secure ? t(I18nKey.SecurityGranted) : t(I18nKey.SecurityRevoked)}</T><p className="panel-copy">{t(I18nKey.SecurityAccessDescription)}</p><StatusIndicator dimension="s" text={secure ? t(I18nKey.SecurityGranted) : t(I18nKey.SecurityRevoked)} /><Button appearance="danger" dimension="m" onClick={() => void securityStore.revokeAll()}>{t(I18nKey.SecurityRevoke)}</Button></article>
        <article className="plain-panel"><span className="section-kicker">{t(I18nKey.SecurityEvents)}</span><T font="Header/H5" as="h2">{t(I18nKey.SecurityJournalEmpty)}</T><p className="panel-copy">{t(I18nKey.SecurityJournalDescription)}</p></article>
        <article className="plain-panel"><span className="section-kicker">{t(I18nKey.SecuritySessions)}</span><T font="Header/H5" as="h2">{securityStore.sessions.length || t(I18nKey.SecurityJournalEmpty)}</T><p className="panel-copy">{t(I18nKey.SecurityDevices)}</p></article>
        <article className="plain-panel plain-panel--accent"><span className="section-kicker">{t(I18nKey.SecurityVaultStatus)}</span><T font="Header/H5" as="h2">{vaultUnlocked ? t(I18nKey.SecurityGranted) : t(I18nKey.SecurityRevoked)}</T><p className="panel-copy">{t(I18nKey.VaultIntegrityDescription)}</p><StatusIndicator dimension="s" text={vaultUnlocked ? t(I18nKey.SecurityGranted) : t(I18nKey.SecurityRevoked)} /></article>
      </section>
    </PageIntro>
  );
});
