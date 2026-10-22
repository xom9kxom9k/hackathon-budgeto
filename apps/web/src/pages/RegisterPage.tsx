import { Button, InputField, T } from '@admiral-ds/react-ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { observer } from 'mobx-react-lite';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { translateAuthError } from '@/shared/api/authErrors';
import { registerSchema, type RegisterValues } from '@/shared/forms/authSchemas';
import { translateValidationError } from '@/shared/forms/validation';
import { I18nKey } from '@/shared/i18n';

export const RegisterPage = observer(function RegisterPage() {
  const { t } = useTranslation();
  const authStore = useStore(StoreName.Auth);
  const navigate = useNavigate();
  const form = useForm<RegisterValues>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: zodResolver(registerSchema),
  });

  const submit = form.handleSubmit(
    async (values) => {
      form.clearErrors('root');
      try {
        await authStore.register(values.email, values.password);
        navigate('/register/totp', { replace: true });
      } catch (error) {
        form.setError('root', { message: translateAuthError(error, t) });
      }
    },
    () => {
      form.setError('root', { message: t(I18nKey.AuthValidationSummary) });
    },
  );

  return (
    <section className="auth-page" aria-labelledby="register-title">
      <div className="auth-card">
        <span className="section-kicker">{t(I18nKey.BrandName)}</span>
        <T font="Header/H3" as="h1" id="register-title">
          {t(I18nKey.AuthRegisterTitle)}
        </T>
        <p className="panel-copy">{t(I18nKey.AuthRegisterDescription)}</p>
        <form className="auth-form" onSubmit={submit}>
          <InputField
            {...form.register('email')}
            extraText={translateValidationError(form.formState.errors.email?.message, t)}
            label={t(I18nKey.AuthEmail)}
            status={form.formState.errors.email ? 'error' : undefined}
            type="email"
          />
          <InputField
            {...form.register('password')}
            extraText={translateValidationError(form.formState.errors.password?.message, t)}
            label={t(I18nKey.AuthPassword)}
            status={form.formState.errors.password ? 'error' : undefined}
            type="password"
          />
          <InputField
            {...form.register('passwordConfirm')}
            extraText={translateValidationError(form.formState.errors.passwordConfirm?.message, t)}
            label={t(I18nKey.AuthPasswordConfirm)}
            status={form.formState.errors.passwordConfirm ? 'error' : undefined}
            type="password"
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
            {t(I18nKey.AuthRegisterAction)}
          </Button>
        </form>
        <p className="auth-switch">
          {t(I18nKey.AuthHaveAccount)} <Link to="/login">{t(I18nKey.AuthLoginAction)}</Link>
        </p>
      </div>
    </section>
  );
});
