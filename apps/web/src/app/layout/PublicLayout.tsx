import { IconButton, Option, Select, T } from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey, Language } from '@/shared/i18n';
import { MoonIcon, SunIcon } from '@/shared/ui/BudgetoIcons';

export const PublicLayout = observer(function PublicLayout() {
  const { t } = useTranslation();
  const uiStore = useStore(StoreName.Ui);

  return (
    <div className="public-shell">
      <header className="public-header">
        <Link className="public-brand" to="/">
          <span>{t(I18nKey.BrandName)}</span>
          <small>{t(I18nKey.BrandTagline)}</small>
        </Link>
        <div className="public-controls">
          <Select
            aria-label={t(I18nKey.LanguageSwitcher)}
            dimension="s"
            mode="select"
            onSelectedChange={(value) => uiStore.setLocale(value as Language)}
            value={uiStore.locale}
          >
            <Option value={Language.Ru}>{t(I18nKey.LanguageRussian)}</Option>
            <Option value={Language.En}>{t(I18nKey.LanguageEnglish)}</Option>
          </Select>
          <IconButton
            appearance="secondary"
            aria-label={t(uiStore.themeMode === 'dark' ? I18nKey.ThemeLight : I18nKey.ThemeDark)}
            dimension="m"
            onClick={uiStore.toggleTheme}
            title={t(uiStore.themeMode === 'dark' ? I18nKey.ThemeLight : I18nKey.ThemeDark)}
          >
            {uiStore.themeMode === 'dark' ? <SunIcon /> : <MoonIcon />}
          </IconButton>
        </div>
      </header>
      <main className="public-content">
        <Outlet />
      </main>
      <footer className="public-footer">
        <T font="Body/Body 2 Long" as="p">
          {t(I18nKey.LandingPrivacyNote)}
        </T>
      </footer>
    </div>
  );
});
