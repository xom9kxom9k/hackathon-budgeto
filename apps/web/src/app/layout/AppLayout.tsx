import {
  Avatar,
  Drawer,
  DrawerContent,
  DrawerTitle,
  IconButton,
  Option,
  Select,
  T,
} from '@admiral-ds/react-ui';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useStore } from '@/app/hooks/useStores';
import { StoreName } from '@/app/stores/StoreName';
import type { UiStore } from '@/app/stores/UiStore';
import { I18nKey, Language } from '@/shared/i18n';
import { useIsCompactLayout } from '@/shared/hooks/useMediaQuery';
import {
  AccountsIcon,
  ActivityIcon,
  ImportIcon,
  LanguageIcon,
  MenuIcon,
  MoonIcon,
  OverviewIcon,
  SecurityIcon,
  SunIcon,
  VaultIcon,
} from '@/shared/ui/BudgetoIcons';

function getSelectedMenuItem(pathname: string): string {
  if (
    pathname.startsWith('/accounts') ||
    pathname.startsWith('/categories') ||
    pathname.startsWith('/banks') ||
    pathname.startsWith('/products')
  ) {
    return '/accounts';
  }
  if (pathname.startsWith('/transactions')) return '/transactions';
  if (pathname.startsWith('/imports')) return '/imports';
  if (pathname.startsWith('/vault-history')) return '/vault-history';
  if (pathname.startsWith('/security')) return '/security';
  if (pathname.startsWith('/profile')) return '/profile';
  return '/overview';
}

const navigationItems = [
  { id: '/overview', label: I18nKey.NavigationOverview, icon: OverviewIcon },
  { id: '/accounts', label: I18nKey.NavigationAccounts, icon: AccountsIcon },
  { id: '/transactions', label: I18nKey.NavigationTransactions, icon: ActivityIcon },
  { id: '/imports', label: I18nKey.NavigationImports, icon: ImportIcon },
  { id: '/vault-history', label: I18nKey.NavigationVaultHistory, icon: VaultIcon },
  { id: '/security', label: I18nKey.NavigationSecurity, icon: SecurityIcon },
];

function NavigationMenu({
  selectedItem,
  collapsed = false,
  onNavigate,
}: {
  selectedItem: string;
  collapsed?: boolean;
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t(I18nKey.Workspace)}
      className={collapsed ? 'workspace-nav workspace-nav--collapsed' : 'workspace-nav'}
    >
      {navigationItems.map(({ id, label, icon: Icon }) => (
        <Link
          key={id}
          to={id}
          onClick={onNavigate}
          aria-current={selectedItem === id ? 'page' : undefined}
          aria-label={t(label)}
          title={collapsed ? t(label) : undefined}
        >
          <Icon />
          {!collapsed && <span>{t(label)}</span>}
        </Link>
      ))}
    </nav>
  );
}

function SidebarSettings({ uiStore, collapsed }: { uiStore: UiStore; collapsed: boolean }) {
  const { t } = useTranslation();
  const currentLanguage = t(
    uiStore.locale === Language.Ru ? I18nKey.LanguageRussian : I18nKey.LanguageEnglish,
  );
  const themeLabel = t(uiStore.themeMode === 'dark' ? I18nKey.ThemeLight : I18nKey.ThemeDark);

  if (collapsed) {
    return (
      <div className="sidebar-settings">
        <IconButton
          appearance="secondary"
          aria-label={`${t(I18nKey.LanguageSwitcher)}: ${currentLanguage}`}
          className="sidebar-setting-icon"
          dimension="m"
          onClick={() =>
            uiStore.setLocale(uiStore.locale === Language.Ru ? Language.En : Language.Ru)
          }
          title={`${t(I18nKey.LanguageSwitcher)}: ${currentLanguage}`}
        >
          <LanguageIcon />
        </IconButton>
        <IconButton
          appearance="secondary"
          aria-label={themeLabel}
          className="sidebar-setting-icon"
          dimension="m"
          onClick={uiStore.toggleTheme}
          title={themeLabel}
        >
          {uiStore.themeMode === 'dark' ? <SunIcon /> : <MoonIcon />}
        </IconButton>
      </div>
    );
  }

  return (
    <div className="sidebar-settings">
      <Select
        className="sidebar-language-select"
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
        aria-label={themeLabel}
        className="sidebar-setting-icon"
        dimension="m"
        onClick={uiStore.toggleTheme}
        title={themeLabel}
      >
        {uiStore.themeMode === 'dark' ? <SunIcon /> : <MoonIcon />}
      </IconButton>
    </div>
  );
}

function SidebarFooter({ uiStore, collapsed }: { uiStore: UiStore; collapsed: boolean }) {
  return (
    <div className="sidebar-footer">
      <SidebarSettings collapsed={collapsed} uiStore={uiStore} />
    </div>
  );
}

export const AppLayout = observer(function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const authStore = useStore(StoreName.Auth);
  const uiStore = useStore(StoreName.Ui);
  const isCompactLayout = useIsCompactLayout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const selectedItem = getSelectedMenuItem(location.pathname);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b' && !event.altKey) {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          target.closest('input, textarea, select, [contenteditable="true"]')
        )
          return;
        event.preventDefault();
        if (isCompactLayout) setMobileMenuOpen((open) => !open);
        else uiStore.toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCompactLayout, uiStore]);
  const pageTitle =
    selectedItem === '/profile'
      ? t(I18nKey.ProfileTitle)
      : t(
          navigationItems.find((item) => item.id === selectedItem)?.label ??
            I18nKey.NavigationOverview,
        );
  const closeMenu = () => setMobileMenuOpen(false);
  return (
    <div
      className={uiStore.sidebarCollapsed ? 'app-shell app-shell--sidebar-collapsed' : 'app-shell'}
      style={{
        gridTemplateColumns: isCompactLayout
          ? undefined
          : (uiStore.sidebarCollapsed ? '76px' : uiStore.sidebarWidth + 'px') + ' minmax(0, 1fr)',
      }}
    >
      <a className="skip-link" href="#main-content">
        {t(I18nKey.SkipToContent)}
      </a>
      {!isCompactLayout && (
        <aside
          className={uiStore.sidebarCollapsed ? 'sidebar sidebar--collapsed' : 'sidebar'}
          aria-label={t(I18nKey.Workspace)}
        >
          <div className="brand-block">
            <div className="brand-header">
              <Link
                to="/overview"
                className="brand-wordmark"
                aria-label={t(I18nKey.NavigationOverview)}
              >
                {uiStore.sidebarCollapsed ? 'B' : t(I18nKey.BrandName)}
              </Link>
              <IconButton
                appearance="secondary"
                className="sidebar-collapse-button"
                dimension="m"
                aria-label={t(
                  uiStore.sidebarCollapsed ? I18nKey.SidebarExpand : I18nKey.SidebarCollapse,
                )}
                aria-expanded={!uiStore.sidebarCollapsed}
                aria-keyshortcuts="Control+b Meta+b"
                title={
                  t(uiStore.sidebarCollapsed ? I18nKey.SidebarExpand : I18nKey.SidebarCollapse) +
                  ' (Ctrl+B)'
                }
                onClick={uiStore.toggleSidebar}
              >
                <MenuIcon />
              </IconButton>
            </div>
            {!uiStore.sidebarCollapsed && (
              <span className="brand-caption">{t(I18nKey.BrandTagline)}</span>
            )}
          </div>
          <div className="sidebar-menu">
            <NavigationMenu
              collapsed={uiStore.sidebarCollapsed}
              selectedItem={selectedItem}
              onNavigate={closeMenu}
            />
          </div>
          <SidebarFooter collapsed={uiStore.sidebarCollapsed} uiStore={uiStore} />
          <div
            className="sidebar-resizer"
            role="separator"
            tabIndex={0}
            aria-label={t(I18nKey.SidebarResize)}
            aria-orientation="vertical"
            aria-valuemin={220}
            aria-valuemax={340}
            aria-valuenow={uiStore.sidebarWidth}
            onDoubleClick={() => uiStore.setSidebarWidth(248)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                uiStore.setSidebarWidth(
                  uiStore.sidebarWidth + (event.key === 'ArrowRight' ? 8 : -8),
                );
              }
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              uiStore.setSidebarCollapsed(false);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                uiStore.setSidebarWidth(event.clientX);
            }}
            onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
          />
        </aside>
      )}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-heading">
            {isCompactLayout && (
              <button
                className="mobile-menu-button"
                onClick={() => setMobileMenuOpen(true)}
                aria-expanded={mobileMenuOpen}
              >
                <MenuIcon />
                <span>{t(I18nKey.NavigationMenu)}</span>
              </button>
            )}
            <div>
              <span className="eyebrow">{t(I18nKey.Workspace)}</span>
              <T font="Header/H4" as="h1" className="page-title">
                {pageTitle}
              </T>
            </div>
          </div>
          <Avatar
            aria-label={t(I18nKey.NavigationProfile)}
            dimension="s"
            onClick={() => navigate('/profile')}
            showTooltip
            title={t(I18nKey.NavigationProfile)}
            userName={
              authStore.user?.displayName ?? authStore.user?.email ?? t(I18nKey.NavigationProfile)
            }
          />
        </header>
        <main className="page-content" id="main-content" tabIndex={-1}>
          <div className="route-content">
            <Outlet />
          </div>
        </main>
      </div>
      {isCompactLayout && (
        <Drawer
          backdrop
          closeOnBackdropClick
          closeOnEscapeKeyDown
          displayCloseIcon
          mobile
          isOpen={mobileMenuOpen}
          locale={{ closeButtonAriaLabel: t(I18nKey.Close) }}
          onClose={closeMenu}
          position="left"
        >
          <DrawerTitle>{t(I18nKey.NavigationMenu)}</DrawerTitle>
          <DrawerContent>
            <div className="mobile-menu-panel">
              <NavigationMenu selectedItem={selectedItem} onNavigate={closeMenu} />
              <SidebarFooter collapsed={false} uiStore={uiStore} />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
});
