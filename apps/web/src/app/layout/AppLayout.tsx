import { Button, T } from '@admiral-ds/react-ui';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import { I18nKey, Language } from '@/shared/i18n';

const navItems = [
  { path: '/overview', label: I18nKey.NavigationOverview },
  { path: '/transactions', label: I18nKey.NavigationTransactions },
  { path: '/imports', label: I18nKey.NavigationImports },
  { path: '/vault-history', label: I18nKey.NavigationVaultHistory },
  { path: '/security', label: I18nKey.NavigationSecurity },
];

export const AppLayout = observer(function AppLayout() {
  const location = useLocation();
  const { t } = useTranslation();
  const uiStore = useStore(StoreName.Ui);
  const activeItem = navItems.find(({ path }) => location.pathname.startsWith(path));

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label={t(I18nKey.Workspace)}>
        <div className="brand-block">
          <span className="brand-wordmark">{t(I18nKey.BrandName)}</span>
          <span className="brand-caption">{t(I18nKey.BrandTagline)}</span>
        </div>
        <nav className="sidebar-nav" aria-label={t(I18nKey.Workspace)}>
          <span className="nav-label">{t(I18nKey.Workspace)}</span>
          {navItems.map((item, index) => (
            <NavLink
              className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
              key={item.path}
              to={item.path}
            >
              <span className="nav-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>{t(I18nKey.DemoData)}</span>
          <span className="sidebar-version">web preview / 0.2</span>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div>
            <span className="eyebrow">{t(I18nKey.Workspace)}</span>
            <T font="Header/H4" as="h1" className="page-title">
              {activeItem ? t(activeItem.label) : t(I18nKey.NavigationOverview)}
            </T>
          </div>
          <div className="topbar-actions">
            <div className="vault-status" aria-label={t(I18nKey.DemoVault)}>
              <span className="status-marker" aria-hidden="true" />
              <span>{t(I18nKey.DemoVault)}</span>
            </div>
            <div className="topbar-control-group" aria-label="Language">
              <Button
                appearance={uiStore.locale === Language.Ru ? 'primary' : 'secondary'}
                dimension="s"
                onClick={() => uiStore.setLocale(Language.Ru)}
                aria-pressed={uiStore.locale === Language.Ru}
              >
                RU
              </Button>
              <Button
                appearance={uiStore.locale === Language.En ? 'primary' : 'secondary'}
                dimension="s"
                onClick={() => uiStore.setLocale(Language.En)}
                aria-pressed={uiStore.locale === Language.En}
              >
                EN
              </Button>
            </div>
            <Button appearance="secondary" dimension="m" onClick={uiStore.toggleTheme}>
              {t(uiStore.themeMode === 'dark' ? I18nKey.ThemeLight : I18nKey.ThemeDark)}
            </Button>
          </div>
        </header>

        <main className="page-content" aria-live="polite">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="route-content"
              exit={{ opacity: 0, y: 4 }}
              initial={{ opacity: 0, y: 4 }}
              key={location.pathname}
              transition={{ duration: 0.16 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="mobile-nav" aria-label={t(I18nKey.MobileNavigation)}>
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => `mobile-nav-link${isActive ? ' is-active' : ''}`}
              key={item.path}
              to={item.path}
            >
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
});
