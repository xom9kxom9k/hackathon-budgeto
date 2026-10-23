import { lazyPage } from './lazyPage';

export const AccountDetailPage = lazyPage(
  () => import('@/pages/AccountDetailPage'),
  'AccountDetailPage',
);
export const AccountsPage = lazyPage(() => import('@/pages/AccountsPage'), 'AccountsPage');
export const BankDetailPage = lazyPage(() => import('@/pages/BankDetailPage'), 'BankDetailPage');
export const CategoriesPage = lazyPage(() => import('@/pages/CategoriesPage'), 'CategoriesPage');
export const ImportsPage = lazyPage(() => import('@/pages/ImportsPage'), 'ImportsPage');
export const LandingPage = lazyPage(() => import('@/pages/LandingPage'), 'LandingPage');
export const LoginPage = lazyPage(() => import('@/pages/LoginPage'), 'LoginPage');
export const LoginTotpPage = lazyPage(() => import('@/pages/LoginTotpPage'), 'LoginTotpPage');
export const OverviewPage = lazyPage(() => import('@/pages/OverviewPage'), 'OverviewPage');
export const ProductDetailPage = lazyPage(
  () => import('@/pages/ProductDetailPage'),
  'ProductDetailPage',
);
export const ProfileEditPage = lazyPage(() => import('@/pages/ProfileEditPage'), 'ProfileEditPage');
export const ProfilePage = lazyPage(() => import('@/pages/ProfilePage'), 'ProfilePage');
export const RegisterPage = lazyPage(() => import('@/pages/RegisterPage'), 'RegisterPage');
export const RegisterTotpPage = lazyPage(
  () => import('@/pages/RegisterTotpPage'),
  'RegisterTotpPage',
);
export const SecurityPage = lazyPage(() => import('@/pages/SecurityPage'), 'SecurityPage');
export const TransactionsPage = lazyPage(
  () => import('@/pages/TransactionsPage'),
  'TransactionsPage',
);
export const VaultHistoryPage = lazyPage(
  () => import('@/pages/VaultHistoryPage'),
  'VaultHistoryPage',
);
export const WelcomePage = lazyPage(() => import('@/pages/WelcomePage'), 'WelcomePage');
