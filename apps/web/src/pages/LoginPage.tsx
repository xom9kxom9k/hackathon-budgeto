import { Button, InputField, T } from '@admiral-ds/react-ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { observer } from 'mobx-react-lite';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { translateAuthError } from '@/shared/api/authErrors';
import { loginSchema, type LoginValues } from '@/shared/forms/authSchemas';
import { translateValidationError } from '@/shared/forms/validation';
import { I18nKey } from '@/shared/i18n';

export const LoginPage = observer(function LoginPage() {
  const { t } = useTranslation();
  const authStore = useStore(StoreName.Auth);
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<LoginValues>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: zodResolver(loginSchema),
  });

  const submit = form.handleSubmit(
    async (values) => {
      form.clearErrors('root');
      try {
        await authStore.login(values.email, values.password);
        navigate('/login/totp', { state: { from: location.state?.from } });
      } catch (error) {
        form.setError('root', { message: translateAuthError(error, t) });
      }
    },
    () => {
      form.setError('root', { message: t(I18nKey.AuthValidationSummary) });
    },
  );

  return (
    <section className="auth-page" aria-labelledby="login-title">
      <div className="auth-card">
        <span className="section-kicker">{t(I18nKey.BrandName)}</span>
        <T font="Header/H3" as="h1" id="login-title">
          {t(I18nKey.AuthLoginTitle)}
        </T>
        <p className="panel-copy">{t(I18nKey.AuthLoginDescription)}</p>
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
            {t(I18nKey.AuthLoginAction)}
          </Button>
        </form>
        <p className="auth-switch">
          {t(I18nKey.AuthNoAccount)} <Link to="/register">{t(I18nKey.AuthRegisterAction)}</Link>
        </p>
      </div>
    </section>
  );
});
