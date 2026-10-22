import {
  Avatar,
  Drawer,
  DrawerContent,
  DrawerTitle,
  IconButton,
  Option,
  Select,
  SideMenu,
  T,
} from '@admiral-ds/react-ui';
import type { SideMenuNode } from '@admiral-ds/react-ui';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

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
  SidebarCollapseIcon,
  SidebarExpandIcon,
  SunIcon,
  UserIcon,
  VaultIcon,
} from '@/shared/ui/BudgetoIcons';

function getSelectedMenuItem(pathname: string): string {
  if (
    pathname.startsWith('/accounts') ||
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

function getActiveMenuGroup(pathname: string): string | null {
  if (
    pathname.startsWith('/accounts') ||
    pathname.startsWith('/banks') ||
    pathname.startsWith('/products')
  ) {
    return 'money';
  }
  if (pathname.startsWith('/transactions') || pathname.startsWith('/imports')) {
    return 'activity';
  }
  if (pathname.startsWith('/vault-history') || pathname.startsWith('/security')) {
    return 'trust';
  }
  return null;
}

interface NavigationMenuProps {
  items: SideMenuNode[];
  openGroups: string[];
  onOpenGroupsChange: (groups: string[]) => void;
  onSelectItem: (id: string) => void;
  selectedItem: string;
}

function NavigationMenu({
  items,
  openGroups,
  onOpenGroupsChange,
  onSelectItem,
  selectedItem,
}: NavigationMenuProps) {
  const { t } = useTranslation();

  return (
    <SideMenu
      aria-label={t(I18nKey.Workspace)}
      dimension="m"
      items={items}
      onOpenGroupsChange={onOpenGroupsChange}
      onSelectItem={onSelectItem}
      openGroups={openGroups}
      selectedItem={selectedItem}
    />
  );
}

interface CollapsedNavigationMenuProps {
  onSelectItem: (id: string) => void;
  selectedItem: string;
}

function CollapsedNavigationMenu({ onSelectItem, selectedItem }: CollapsedNavigationMenuProps) {
  const { t } = useTranslation();
  const items = [
    { id: '/overview', label: I18nKey.NavigationOverview, icon: <OverviewIcon /> },
    { id: '/accounts', label: I18nKey.NavigationAccounts, icon: <AccountsIcon /> },
    { id: '/transactions', label: I18nKey.NavigationTransactions, icon: <ActivityIcon /> },
    { id: '/imports', label: I18nKey.NavigationImports, icon: <ImportIcon /> },
    { id: '/vault-history', label: I18nKey.NavigationVaultHistory, icon: <VaultIcon /> },
    { id: '/security', label: I18nKey.NavigationSecurity, icon: <SecurityIcon /> },
  ];

  return (
    <nav aria-label={t(I18nKey.Workspace)} className="collapsed-nav">
      {items.map((item) => {
        const label = t(item.label);
        const selected = selectedItem === item.id;

        return (
          <IconButton
            appearance={selected ? 'primary' : 'secondary'}
            aria-current={selected ? 'page' : undefined}
            aria-label={label}
            className="collapsed-nav-button"
            dimension="m"
            key={item.id}
            onClick={() => onSelectItem(item.id)}
            title={label}
          >
            {item.icon}
          </IconButton>
        );
      })}
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
  const activeMenuGroup = getActiveMenuGroup(location.pathname);
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    activeMenuGroup ? [activeMenuGroup] : [],
  );

  useEffect(() => {
    setOpenGroups(activeMenuGroup ? [activeMenuGroup] : []);
  }, [activeMenuGroup]);

  const menuItems = useMemo<SideMenuNode[]>(
    () => [
      {
        id: '/overview',
        icon: <OverviewIcon />,
        label: t(I18nKey.NavigationOverview),
        type: 'item',
      },
      {
        id: 'money',
        icon: <AccountsIcon />,
        label: t(I18nKey.NavigationMoney),
        type: 'group',
        children: [{ id: '/accounts', label: t(I18nKey.NavigationAccounts), type: 'item' }],
      },
      {
        id: 'activity',
        icon: <ActivityIcon />,
        label: t(I18nKey.NavigationActivity),
        type: 'group',
        children: [
          { id: '/transactions', label: t(I18nKey.NavigationTransactions), type: 'item' },
          { id: '/imports', label: t(I18nKey.NavigationImports), type: 'item' },
        ],
      },
      {
        id: 'trust',
        icon: <VaultIcon />,
        label: t(I18nKey.NavigationTrust),
        type: 'group',
        children: [
          { id: '/vault-history', label: t(I18nKey.NavigationVaultHistory), type: 'item' },
          { id: '/security', label: t(I18nKey.NavigationSecurity), type: 'item' },
        ],
      },
    ],
    [t],
  );

  const handleMenuSelect = (id: string) => {
    if (!id.startsWith('/')) return;
    navigate(id);
    setMobileMenuOpen(false);
  };

  const pageTitle =
    selectedItem === '/profile'
      ? t(I18nKey.ProfileTitle)
      : (menuItems
          .flatMap((item) =>
            item.type === 'group' ? item.children : item.type === 'item' ? [item] : [],
          )
          .find((item) => 'id' in item && item.id === selectedItem)?.label ??
        t(I18nKey.NavigationOverview));

  return (
    <div className={`app-shell${uiStore.sidebarCollapsed ? ' app-shell--sidebar-collapsed' : ''}`}>
      {!isCompactLayout && (
        <aside
          aria-label={t(I18nKey.Workspace)}
          className={`sidebar${uiStore.sidebarCollapsed ? ' sidebar--collapsed' : ''}`}
        >
          <div className="brand-block">
            <div className="brand-header">
              <span className="brand-wordmark">
                {uiStore.sidebarCollapsed ? t(I18nKey.BrandName).slice(0, 1) : t(I18nKey.BrandName)}
              </span>
              <IconButton
                appearance="secondary"
                aria-label={t(
                  uiStore.sidebarCollapsed ? I18nKey.SidebarExpand : I18nKey.SidebarCollapse,
                )}
                className="sidebar-collapse-button"
                dimension="m"
                onClick={uiStore.toggleSidebar}
                title={t(
                  uiStore.sidebarCollapsed ? I18nKey.SidebarExpand : I18nKey.SidebarCollapse,
                )}
              >
                {uiStore.sidebarCollapsed ? <SidebarExpandIcon /> : <SidebarCollapseIcon />}
              </IconButton>
            </div>
            {!uiStore.sidebarCollapsed && (
              <span className="brand-caption">{t(I18nKey.BrandTagline)}</span>
            )}
          </div>
          <div className="sidebar-menu">
            {uiStore.sidebarCollapsed ? (
              <CollapsedNavigationMenu
                onSelectItem={handleMenuSelect}
                selectedItem={selectedItem}
              />
            ) : (
              <NavigationMenu
                items={menuItems}
                onOpenGroupsChange={setOpenGroups}
                onSelectItem={handleMenuSelect}
                openGroups={openGroups}
                selectedItem={selectedItem}
              />
            )}
          </div>
          <SidebarFooter collapsed={uiStore.sidebarCollapsed} uiStore={uiStore} />
        </aside>
      )}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-heading">
            {isCompactLayout && (
              <IconButton
                aria-label={t(I18nKey.NavigationMenu)}
                className="mobile-menu-button"
                dimension="m"
                onClick={() => setMobileMenuOpen(true)}
                title={t(I18nKey.NavigationMenu)}
              >
                <MenuIcon />
              </IconButton>
            )}
            <div>
              <span className="eyebrow">{t(I18nKey.Workspace)}</span>
              <T font="Header/H4" as="h1" className="page-title">
                {pageTitle}
              </T>
            </div>
          </div>
          <div className="topbar-actions">
            <Avatar
              aria-label={t(I18nKey.NavigationProfile)}
              dimension="s"
              onClick={() => navigate('/profile')}
              showTooltip
              title={t(I18nKey.NavigationProfile)}
              icon={<UserIcon />}
              userName={authStore.user?.email ?? t(I18nKey.NavigationProfile)}
            />
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
      </div>

      {isCompactLayout && (
        <Drawer
          backdrop
          closeOnBackdropClick
          closeOnEscapeKeyDown
          displayCloseIcon
          isOpen={mobileMenuOpen}
          locale={{ closeButtonAriaLabel: t(I18nKey.Close) }}
          mobile
          onClose={() => setMobileMenuOpen(false)}
          position="left"
        >
          <DrawerTitle>{t(I18nKey.NavigationMenu)}</DrawerTitle>
          <DrawerContent>
            <div className="mobile-menu-panel">
              <div className="sidebar-menu">
                <NavigationMenu
                  items={menuItems}
                  onOpenGroupsChange={setOpenGroups}
                  onSelectItem={handleMenuSelect}
                  openGroups={openGroups}
                  selectedItem={selectedItem}
                />
              </div>
              <SidebarFooter collapsed={false} uiStore={uiStore} />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
});
