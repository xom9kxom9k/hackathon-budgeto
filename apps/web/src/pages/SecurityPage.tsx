import { Button, T } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { PageIntro } from '@/shared/ui/PageIntro';

export const SecurityPage = observer(function SecurityPage() {
  const { t } = useTranslation();
  const security = useStore(StoreName.Security);
  const vault = useStore(StoreName.Vault);
  const auth = useStore(StoreName.Auth);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState(false);
  useEffect(() => {
    void security.load();
  }, [security]);
  const activeSessions = security.sessions.filter(
    (session) => !session.revokedAt && new Date(session.expiresAt).getTime() > Date.now(),
  );
  const vaultLabel =
    vault.status === 'unlocked'
      ? I18nKey.VaultKeyUnlocked
      : vault.status === 'locked'
        ? I18nKey.VaultKeyLocked
        : vault.status === 'uninitialized'
          ? I18nKey.SecurityVaultUninitialized
          : vault.status === 'error'
            ? I18nKey.SecurityLoadError
            : I18nKey.SecurityLoading;
  async function revokeSessions() {
    if (!window.confirm(t(I18nKey.SecurityRevokeConfirm))) return;
    setRevoking(true);
    setRevokeError(false);
    try {
      await security.revokeAll();
      await auth.logout();
    } catch {
      setRevokeError(true);
    } finally {
      setRevoking(false);
    }
  }
  return (
    <PageIntro
      breadcrumbs={
        <FinanceBreadcrumbs
          items={[
            { text: t(I18nKey.BreadcrumbOverview), url: '/overview' },
            { text: t(I18nKey.NavigationSecurity) },
          ]}
        />
      }
      description={t(I18nKey.SecurityDescription)}
      kicker={t(I18nKey.SecurityKicker)}
      title={t(I18nKey.SecurityTitle)}
    >
      {security.loading ? (
        <p role="status">{t(I18nKey.SecurityLoading)}</p>
      ) : security.errorCode ? (
        <div className="state-callout state-callout--error" role="alert">
          <p>{t(I18nKey.SecurityLoadError)}</p>
          <Button appearance="secondary" onClick={() => void security.load()}>
            {t(I18nKey.TransactionsRetry)}
          </Button>
        </div>
      ) : security.status ? (
        <section className="security-grid">
          <article className="plain-panel">
            <span className="section-kicker">{t(I18nKey.SecurityTwoFactor)}</span>
            <T font="Header/H4" as="h2">
              {t(security.status.totpEnabled ? I18nKey.SecurityEnabled : I18nKey.SecurityDisabled)}
            </T>
            <p className="panel-copy">{t(I18nKey.SecurityTwoFactorDescription)}</p>
          </article>
          <article className="plain-panel">
            <span className="section-kicker">{t(I18nKey.SecurityActiveSessions)}</span>
            <T font="Header/H4" as="h2">
              {activeSessions.length}
            </T>
            <p className="panel-copy">{t(I18nKey.SecuritySessionsDescription)}</p>
            {revokeError && (
              <p className="form-error" role="alert">
                {t(I18nKey.SecurityLoadError)}
              </p>
            )}
            <button
              type="button"
              className="danger-button"
              disabled={revoking || activeSessions.length === 0}
              onClick={() => void revokeSessions()}
            >
              {t(I18nKey.SecurityRevokeSessions)}
            </button>
          </article>
          <article className="plain-panel">
            <span className="section-kicker">{t(I18nKey.SecurityRecovery)}</span>
            <T font="Header/H4" as="h2">
              {t(
                security.status.recoveryAvailable
                  ? I18nKey.SecurityRecoveryAvailable
                  : I18nKey.SecurityRecoveryUnavailable,
              )}
            </T>
            <p className="panel-copy">{t(I18nKey.SecurityRecoveryDescription)}</p>
          </article>
          <article className="plain-panel">
            <span className="section-kicker">{t(I18nKey.SecurityVaultStatus)}</span>
            <T font="Header/H4" as="h2">
              {t(vaultLabel)}
            </T>
            <p className="panel-copy">{t(I18nKey.SecurityVaultDescription)}</p>
            <Link className="text-link" to="/vault-history">
              {t(I18nKey.SecurityManageVault)}
            </Link>
          </article>
        </section>
      ) : null}
    </PageIntro>
  );
});
