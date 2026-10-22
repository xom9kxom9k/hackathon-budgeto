import { Avatar, Button, StatusIndicator, T } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey, Language } from '@/shared/i18n';
import { FinanceBreadcrumbs } from '@/shared/ui/FinanceBreadcrumbs';
import { PageIntro } from '@/shared/ui/PageIntro';

export const ProfilePage = observer(function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authStore = useStore(StoreName.Auth);
  const uiStore = useStore(StoreName.Ui);
  const email = authStore.user?.email ?? '';
  const displayName = authStore.user?.displayName ?? email;
  const goalKeys: Record<string, I18nKey> = {
    accounts: I18nKey.WelcomeAccounts,
    transactions: I18nKey.WelcomeTransactions,
    imports: I18nKey.WelcomeImports,
  };

  return (
    <PageIntro
      breadcrumbs={
        <FinanceBreadcrumbs
          items={[
            { text: t(I18nKey.BreadcrumbOverview), url: '/overview' },
            { text: t(I18nKey.NavigationProfile) },
          ]}
        />
      }
      description={t(I18nKey.ProfileDescription)}
      kicker={t(I18nKey.ProfileKicker)}
      title={t(I18nKey.ProfileTitle)}
    >
      <section className="profile-grid">
        <article className="plain-panel profile-card">
          <Avatar dimension="l" showTooltip={false} userName={displayName} />
          <div>
            <T font="Header/H4" as="h2">
              {displayName}
            </T>
            {displayName !== email && <p className="panel-copy">{email}</p>}
            {authStore.user?.goals.length ? (
              <p className="panel-copy">
                {authStore.user.goals
                  .map((goal) => t(goalKeys[goal] ?? I18nKey.WelcomeAccounts))
                  .join(' · ')}
              </p>
            ) : null}
            <StatusIndicator dimension="s" text={t(I18nKey.AuthSessionActive)} />
            <Button
              appearance="secondary"
              dimension="m"
              onClick={() => navigate('/welcome', { state: { from: { pathname: '/profile' } } })}
            >
              {t(I18nKey.WelcomeEdit)}
            </Button>
          </div>
        </article>
        <article className="plain-panel">
          <span className="section-kicker">{t(I18nKey.ProfilePreferences)}</span>
          <T font="Header/H5" as="h2">
            {t(uiStore.locale === Language.Ru ? I18nKey.LanguageRussian : I18nKey.LanguageEnglish)}
          </T>
          <p className="panel-copy">{t(I18nKey.ProfilePreferencesDescription)}</p>
          <StatusIndicator
            dimension="s"
            text={uiStore.themeMode === 'dark' ? t(I18nKey.ThemeDark) : t(I18nKey.ThemeLight)}
          />
        </article>
        <article className="plain-panel">
          <span className="section-kicker">{t(I18nKey.ProfileSession)}</span>
          <T font="Header/H5" as="h2">
            {email}
          </T>
          <p className="panel-copy">{t(I18nKey.ProfileSessionDescription)}</p>
          <p className="panel-copy">{t(I18nKey.AuthSecurityNote)}</p>
          <Button
            appearance="secondary"
            dimension="m"
            onClick={async () => {
              try {
                await authStore.logout();
              } finally {
                navigate('/login', { replace: true });
              }
            }}
          >
            {t(I18nKey.AuthSignOut)}
          </Button>
        </article>
      </section>
    </PageIntro>
  );
});
