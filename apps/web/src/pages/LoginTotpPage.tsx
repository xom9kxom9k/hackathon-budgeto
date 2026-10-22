import { Button, InputField, T } from '@admiral-ds/react-ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { translateAuthError } from '@/shared/api/authErrors';
import { recoverySchema, totpSchema, type CodeValues } from '@/shared/forms/authSchemas';
import { translateValidationError } from '@/shared/forms/validation';
import { I18nKey } from '@/shared/i18n';
import { TotpPinInput } from '@/shared/ui/TotpPinInput';

export const LoginTotpPage = observer(function LoginTotpPage() {
  const { t } = useTranslation();
  const authStore = useStore(StoreName.Auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [useRecovery, setUseRecovery] = useState(false);
  const form = useForm<CodeValues>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: zodResolver(useRecovery ? recoverySchema : totpSchema),
  });

  useEffect(() => {
    form.reset();
    form.clearErrors();
  }, [form, useRecovery]);

  if (!authStore.challengeToken) {
    return (
      <section className="auth-page">
        <div className="auth-card">
          <T font="Header/H4" as="h1">
            {t(I18nKey.AuthLoginTotpTitle)}
          </T>
          <Button appearance="primary" dimension="m" onClick={() => navigate('/login')}>
            {t(I18nKey.AuthBackToLogin)}
          </Button>
        </div>
      </section>
    );
  }

  const submit = form.handleSubmit(
    async ({ code }) => {
      form.clearErrors('root');
      try {
        if (useRecovery) await authStore.useRecoveryCode(code);
        else await authStore.completeLogin(code);
        const from = location.state?.from;
        const destination = from
          ? `${from.pathname ?? ''}${from.search ?? ''}${from.hash ?? ''}` || '/overview'
          : '/overview';
        navigate(destination, { replace: true });
      } catch (error) {
        form.setError('root', { message: translateAuthError(error, t) });
      }
    },
    () => {
      form.setError('root', {
        message: t(
          useRecovery ? I18nKey.AuthValidationRecoveryInvalid : I18nKey.AuthValidationSummary,
        ),
      });
    },
  );

  return (
    <section className="auth-page" aria-labelledby="totp-login-title">
      <div className="auth-card">
        <span className="section-kicker">{t(I18nKey.BrandName)}</span>
        <T font="Header/H3" as="h1" id="totp-login-title">
          {t(I18nKey.AuthLoginTotpTitle)}
        </T>
        <p className="panel-copy">{t(I18nKey.AuthLoginTotpDescription)}</p>
        <form className="auth-form" onSubmit={submit}>
          {useRecovery ? (
            <InputField
              {...form.register('code')}
              autoComplete="one-time-code"
              extraText={translateValidationError(form.formState.errors.code?.message, t)}
              label={t(I18nKey.AuthRecoveryCode)}
              maxLength={20}
              status={form.formState.errors.code ? 'error' : undefined}
            />
          ) : (
            <>
              <label className="pin-label" htmlFor="login-code">
                {t(I18nKey.AuthCode)}
              </label>
              <Controller
                control={form.control}
                name="code"
                defaultValue=""
                render={({ field }) => (
                  <TotpPinInput
                    {...field}
                    id="login-code"
                    error={translateValidationError(form.formState.errors.code?.message, t)}
                  />
                )}
              />
            </>
          )}
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
        <button
          className="auth-link-button"
          onClick={() => setUseRecovery((value) => !value)}
          type="button"
        >
          {t(useRecovery ? I18nKey.AuthUseAuthenticatorCode : I18nKey.AuthUseRecoveryCode)}
        </button>
        <p className="auth-switch">
          <Link to="/login">{t(I18nKey.AuthBackToLogin)}</Link>
        </p>
      </div>
    </section>
  );
});
