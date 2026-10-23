import { Button, InputField } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey, Language } from '@/shared/i18n';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { PageIntro } from '@/shared/ui/PageIntro';

const goals = [
  { id: 'accounts', title: I18nKey.WelcomeAccounts },
  { id: 'transactions', title: I18nKey.WelcomeTransactions },
  { id: 'imports', title: I18nKey.WelcomeImports },
] as const;

export const ProfileEditPage = observer(function ProfileEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profileStore = useStore(StoreName.Profile);
  const uiStore = useStore(StoreName.Ui);
  const [displayName, setDisplayName] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [locale, setLocale] = useState(Language.Ru);
  const [timezone, setTimezone] = useState('UTC');
  const [error, setError] = useState('');

  useEffect(() => {
    void profileStore.load();
  }, [profileStore]);

  useEffect(() => {
    if (!profileStore.profile) return;
    setDisplayName(profileStore.profile.displayName ?? '');
    setSelectedGoals(profileStore.profile.goals);
    setLocale(profileStore.profile.locale as Language);
    setTimezone(profileStore.profile.timezone);
  }, [profileStore.profile]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = displayName.trim();
    if (!normalizedName || normalizedName.length > 80) {
      setError(t(I18nKey.ProfileEditNameInvalid));
      return;
    }
    setError('');
    try {
      await profileStore.update(normalizedName, selectedGoals);
      await profileStore.updatePreferences(locale, timezone.trim() || 'UTC');
      uiStore.setLocale(locale);
      navigate('/profile', { replace: true, state: { saved: true } });
    } catch {
      setError(t(I18nKey.ProfileEditSaveError));
    }
  }

  function toggleGoal(id: string) {
    setSelectedGoals((current) =>
      current.includes(id) ? current.filter((goal) => goal !== id) : [...current, id],
    );
    setError('');
  }

  const loading = profileStore.status === 'loading' || profileStore.mutationStatus === 'saving';

  return (
    <PageIntro
      breadcrumbs={
        <FinanceBreadcrumbs
          items={[
            { text: t(I18nKey.BreadcrumbOverview), url: '/overview' },
            { text: t(I18nKey.NavigationProfile), url: '/profile' },
            { text: t(I18nKey.ProfileEditTitle) },
          ]}
        />
      }
      description={t(I18nKey.ProfileEditDescription)}
      kicker={t(I18nKey.ProfileKicker)}
      title={t(I18nKey.ProfileEditTitle)}
    >
      {profileStore.status === 'error' ? (
        <p className="form-error" role="alert">
          {t(I18nKey.ProfileEditLoadError)}
        </p>
      ) : (
        <form className="welcome-form profile-edit-form" onSubmit={submit}>
          <InputField
            autoComplete="name"
            label={t(I18nKey.ProfileEditName)}
            maxLength={80}
            onChange={(event) => setDisplayName(event.target.value)}
            value={displayName}
          />
          <fieldset className="welcome-goals">
            <legend>{t(I18nKey.ProfileEditGoals)}</legend>
            <p>{t(I18nKey.ProfileEditGoalsHint)}</p>
            <div className="welcome-options">
              {goals.map((goal) => (
                <label className="welcome-option" key={goal.id}>
                  <input
                    checked={selectedGoals.includes(goal.id)}
                    onChange={() => toggleGoal(goal.id)}
                    type="checkbox"
                    value={goal.id}
                  />
                  <span>{t(goal.title)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="profile-edit-field">
            <span>{t(I18nKey.ProfileEditLanguage)}</span>
            <select
              className="profile-edit-select"
              onChange={(event) => setLocale(event.target.value as Language)}
              value={locale}
            >
              <option value={Language.Ru}>{t(I18nKey.LanguageRussian)}</option>
              <option value={Language.En}>{t(I18nKey.LanguageEnglish)}</option>
            </select>
          </label>
          <InputField
            autoComplete="off"
            label={t(I18nKey.ProfileEditTimezone)}
            onChange={(event) => setTimezone(event.target.value)}
            value={timezone}
          />
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {profileStore.mutationStatus === 'success' ? (
            <p className="profile-edit-success" role="status">
              {t(I18nKey.ProfileEditSaved)}
            </p>
          ) : null}
          <div className="profile-edit-actions">
            <Button
              appearance="secondary"
              dimension="m"
              onClick={() => navigate('/profile')}
              type="button"
            >
              {t(I18nKey.ProfileEditCancel)}
            </Button>
            <Button appearance="primary" dimension="m" disabled={loading} type="submit">
              {loading ? t(I18nKey.ProfileEditSaving) : t(I18nKey.ProfileEditSave)}
            </Button>
          </div>
        </form>
      )}
    </PageIntro>
  );
});
