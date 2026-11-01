import { Button, StatusIndicator, T } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey } from '@/shared/i18n';

export const VaultKeyPanel = observer(function VaultKeyPanel() {
  const { t } = useTranslation();
  const vault = useStore(StoreName.Vault);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function copyRecoveryPhrase() {
    if (!vault.recoveryPhrase) return;
    try {
      await navigator.clipboard.writeText(vault.recoveryPhrase);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }

  async function unlock() {
    const unlocked = await vault.unlock(recoveryPhrase);
    if (unlocked) setRecoveryPhrase('');
  }

  return (
    <section className="plain-panel vault-key-panel" aria-labelledby="vault-key-title">
      <T font="Header/H5" as="h2" id="vault-key-title">
        {t(I18nKey.VaultKeyTitle)}
      </T>
      <p className="panel-copy">{t(I18nKey.VaultKeyDescription)}</p>

      {vault.status === 'unknown' ? <p role="status">{t(I18nKey.SecurityLoading)}</p> : null}
      {vault.status === 'error' ? (
        <div className="state-callout state-callout--error" role="alert">
          <p>{t(I18nKey.SecurityLoadError)}</p>
          <Button type="button" appearance="secondary" onClick={() => void vault.retryBootstrap()}>
            {t(I18nKey.TransactionsRetry)}
          </Button>
        </div>
      ) : null}
      {vault.status === 'uninitialized' ? (
        <Button
          type="button"
          appearance="primary"
          dimension="m"
          disabled={vault.keyBusy}
          onClick={() => void vault.create()}
        >
          {t(I18nKey.VaultKeyCreate)}
        </Button>
      ) : null}

      {vault.status === 'locked' ? (
        <div className="vault-key-unlock">
          <StatusIndicator dimension="s" text={t(I18nKey.VaultKeyLocked)} />
          <p className="panel-copy">{t(I18nKey.VaultKeySession)}</p>
          <label className="form-field">
            <span>{t(I18nKey.VaultKeyRecoveryInput)}</span>
            <input
              autoComplete="off"
              type="password"
              onChange={(event) => setRecoveryPhrase(event.target.value)}
              value={recoveryPhrase}
            />
          </label>
          <Button
            type="button"
            appearance="secondary"
            dimension="m"
            disabled={vault.keyBusy || !recoveryPhrase.trim()}
            onClick={() => void unlock()}
          >
            {t(I18nKey.VaultKeyUnlock)}
          </Button>
          {vault.errorCode ? (
            <p className="form-error" role="alert">
              {t(
                vault.errorCode === 'VAULT_RECOVERY_INVALID'
                  ? I18nKey.VaultKeyRecoveryInvalid
                  : I18nKey.SecurityLoadError,
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      {vault.status === 'unlocked' ? (
        <div className="vault-key-unlocked">
          <StatusIndicator dimension="s" text={t(I18nKey.VaultKeyUnlocked)} />
          {vault.recoveryPhrase ? (
            <>
              <p className="panel-copy">{t(I18nKey.VaultKeyRecoveryWarning)}</p>
              {copyState === 'error' && (
                <p className="form-error" role="alert">
                  {t(I18nKey.AuthCopyFailed)}
                </p>
              )}
              <code className="vault-recovery-key">{vault.recoveryPhrase}</code>
              <Button
                type="button"
                appearance="secondary"
                dimension="m"
                onClick={() => void copyRecoveryPhrase()}
              >
                {copyState === 'copied' ? t(I18nKey.AuthCopied) : t(I18nKey.AuthCopyRecovery)}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
});
