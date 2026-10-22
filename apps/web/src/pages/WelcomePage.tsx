import { Button, InputField, T } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { translateAuthError } from '@/shared/api/authErrors';
import { I18nKey } from '@/shared/i18n';

const goals = [
  {
    id: 'accounts',
    title: I18nKey.WelcomeAccounts,
    description: I18nKey.WelcomeAccountsDescription,
  },
  {
    id: 'transactions',
    title: I18nKey.WelcomeTransactions,
    description: I18nKey.WelcomeTransactionsDescription,
  },
  { id: 'imports', title: I18nKey.WelcomeImports, description: I18nKey.WelcomeImportsDescription },
] as const;

export const WelcomePage = observer(function WelcomePage() {
  const { t } = useTranslation();
  const authStore = useStore(StoreName.Auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [displayName, setDisplayName] = useState(authStore.user?.displayName ?? '');
  const [selected, setSelected] = useState<string[]>(authStore.user?.goals ?? []);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayName.trim() || displayName.trim().length > 80) {
      setError(t(I18nKey.WelcomeNameRequired));
      return;
    }
    if (selected.length === 0) {
      setError(t(I18nKey.WelcomeGoalRequired));
      return;
    }
    setError('');
    setSaving(true);
    try {
      await authStore.completeOnboarding(displayName.trim(), selected);
      const from = location.state?.from;
      const destination =
        from && from.pathname !== '/welcome'
          ? `${from.pathname ?? ''}${from.search ?? ''}${from.hash ?? ''}`
          : '/overview';
      navigate(destination, { replace: true });
    } catch (failure) {
      setError(translateAuthError(failure, t));
    } finally {
      setSaving(false);
    }
  }

  function toggleGoal(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((goal) => goal !== id) : [...current, id],
    );
    setError('');
  }

  return (
    <section className="welcome-page" aria-labelledby="welcome-title">
      <div className="welcome-content">
        <span className="section-kicker">{t(I18nKey.BrandName)}</span>
        <T font="Header/H2" as="h1" id="welcome-title">
          {t(I18nKey.WelcomeTitle)}
        </T>
        <p className="welcome-lead">{t(I18nKey.WelcomeDescription)}</p>
        <div className="welcome-guide">
          {goals.map((goal, index) => (
            <article className="welcome-guide-item" key={goal.id}>
              <span className="welcome-number">0{index + 1}</span>
              <div>
                <T font="Header/H5" as="h2">
                  {t(goal.title)}
                </T>
                <p>{t(goal.description)}</p>
              </div>
            </article>
          ))}
        </div>
        <form className="welcome-form" onSubmit={submit}>
          <InputField
            autoComplete="given-name"
            label={t(I18nKey.WelcomeName)}
            extraText={t(I18nKey.WelcomeNameHint)}
            maxLength={80}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setError('');
            }}
            value={displayName}
          />
          <fieldset className="welcome-goals">
            <legend>{t(I18nKey.WelcomeGoals)}</legend>
            <p>{t(I18nKey.WelcomeGoalsHint)}</p>
            <div className="welcome-options">
              {goals.map((goal) => (
                <label className="welcome-option" key={goal.id}>
                  <input
                    checked={selected.includes(goal.id)}
                    onChange={() => toggleGoal(goal.id)}
                    type="checkbox"
                    value={goal.id}
                  />
                  <span>{t(goal.title)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button appearance="primary" dimension="m" disabled={saving} type="submit">
            {t(I18nKey.WelcomeContinue)}
          </Button>
        </form>
      </div>
    </section>
  );
});
