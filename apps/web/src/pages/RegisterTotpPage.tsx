import { Badge, Button, StatusIndicator, T } from '@admiral-ds/react-ui';
import { zodResolver } from '@hookform/resolvers/zod';
import QRCode from 'qrcode';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { translateAuthError } from '@/shared/api/authErrors';
import { totpSchema, type CodeValues } from '@/shared/forms/authSchemas';
import { translateValidationError } from '@/shared/forms/validation';
import { I18nKey } from '@/shared/i18n';
import { TotpPinInput } from '@/shared/ui/TotpPinInput';

export const RegisterTotpPage = observer(function RegisterTotpPage() {
  const { t } = useTranslation();
  const authStore = useStore(StoreName.Auth);
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const secret = authStore.otpauthUri
    ? (new URL(authStore.otpauthUri).searchParams.get('secret') ?? '')
    : '';
  const form = useForm<CodeValues>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: zodResolver(totpSchema),
  });

  useEffect(() => {
    if (!authStore.otpauthUri) return;
    void QRCode.toDataURL(authStore.otpauthUri, { margin: 1, width: 220 }).then(setQrCode);
  }, [authStore.otpauthUri]);

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }

  if (authStore.recoveryCodes.length === 0 && (!authStore.challengeToken || !authStore.otpauthUri)) {
    return (
      <section className="auth-page">
        <div className="auth-card">
          <T font="Header/H4" as="h1">
            {t(I18nKey.AuthSetupTotpTitle)}
          </T>
          <Button appearance="primary" dimension="m" onClick={() => navigate('/register')}>
            {t(I18nKey.AuthRegisterAction)}
          </Button>
        </div>
      </section>
    );
  }

  const submit = form.handleSubmit(
    async ({ code }) => {
      form.clearErrors('root');
      try {
        await authStore.completeRegistration(code);
        setCopyState('idle');
        form.reset();
      } catch (error) {
        form.setError('root', { message: translateAuthError(error, t) });
      }
    },
    () => {
      form.setError('root', { message: t(I18nKey.AuthValidationSummary) });
    },
  );

  return (
    <section className="auth-page" aria-labelledby="totp-setup-title">
      <div className="auth-card auth-card--wide">
        <span className="section-kicker">{t(I18nKey.BrandName)}</span>
        <T font="Header/H3" as="h1" id="totp-setup-title">
          {t(I18nKey.AuthSetupTotpTitle)}
        </T>
        <p className="panel-copy">{t(I18nKey.AuthSetupTotpDescription)}</p>
        {authStore.recoveryCodes.length === 0 ? (
          <>
            {qrCode && (
              <div className="totp-qr">
                <img alt={t(I18nKey.AuthScanQr)} src={qrCode} />
              </div>
            )}
            <div className="totp-manual">
              <p className="totp-manual-label">{t(I18nKey.AuthManualSecret)}</p>
              <code className="totp-uri">{secret}</code>
              <Button
                appearance="secondary"
                dimension="m"
                onClick={() => void copyText(secret)}
                type="button"
              >
                {t(copyState === 'copied' ? I18nKey.AuthCopied : I18nKey.AuthCopyKey)}
              </Button>
              {copyState === 'error' && (
                <p className="form-error" role="alert">
                  {t(I18nKey.AuthCopyFailed)}
                </p>
              )}
            </div>
            <form className="auth-form" onSubmit={submit}>
              <label className="pin-label" htmlFor="register-code">
                {t(I18nKey.AuthCode)}
              </label>
              <Controller
                control={form.control}
                name="code"
                defaultValue=""
                render={({ field }) => (
                  <TotpPinInput
                    {...field}
                    id="register-code"
                    error={translateValidationError(form.formState.errors.code?.message, t)}
                  />
                )}
              />
              {form.formState.errors.root && (
                <p aria-live="polite" className="form-error" role="alert">
                  {form.formState.errors.root.message}
                </p>
              )}
              <Button
                appearance="primary"
                dimension="m"
                disabled={authStore.status === 'loading' || form.formState.isSubmitting}
                type="submit"
              >
                {t(I18nKey.AuthContinueAction)}
              </Button>
            </form>
          </>
        ) : (
          <div className="recovery-panel" role="status">
            <StatusIndicator dimension="s" text={t(I18nKey.AuthSessionActive)} />
            <T font="Header/H5" as="h2">
              {t(I18nKey.AuthRecoveryCodesTitle)}
            </T>
            <p className="panel-copy">{t(I18nKey.AuthRecoveryCodesDescription)}</p>
            <div className="recovery-codes">
              {authStore.recoveryCodes.map((code) => (
                <code key={code}>{code}</code>
              ))}
            </div>
            <Button
              appearance="secondary"
              dimension="m"
              onClick={() => void copyText(authStore.recoveryCodes.join('\n'))}
              type="button"
            >
              {t(copyState === 'copied' ? I18nKey.AuthCopied : I18nKey.AuthCopyRecovery)}
            </Button>
            {copyState === 'error' && (
              <p className="form-error" role="alert">
                {t(I18nKey.AuthCopyFailed)}
              </p>
            )}
            <Badge appearance="info" dimension="m">
              {authStore.user?.email}
            </Badge>
            <Button appearance="primary" dimension="m" onClick={() => navigate('/overview')}>
              {t(I18nKey.AuthContinueAction)}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
});
