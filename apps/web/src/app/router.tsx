import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/app/layout/AppLayout';
import { PublicLayout } from '@/app/layout/PublicLayout';
import { ProtectedRoute } from '@/app/routing/ProtectedRoute';
import { PublicOnlyRoute } from '@/app/routing/PublicOnlyRoute';
import {
  AccountDetailPage,
  AccountsPage,
  BankDetailPage,
  CategoriesPage,
  ImportsPage,
  LandingPage,
  LoginPage,
  LoginTotpPage,
  OverviewPage,
  ProductDetailPage,
  ProfileEditPage,
  ProfilePage,
  RegisterPage,
  RegisterTotpPage,
  SecurityPage,
  TransactionsPage,
  VaultHistoryPage,
  WelcomePage,
} from '@/app/routing/lazyPages';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      {
        element: (
          <PublicOnlyRoute>
            <Outlet />
          </PublicOnlyRoute>
        ),
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/register/totp', element: <RegisterTotpPage /> },
          { path: '/login/totp', element: <LoginTotpPage /> },
        ],
      },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <PublicLayout />
      </ProtectedRoute>
    ),
    children: [{ path: '/welcome', element: <WelcomePage /> }],
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/overview', element: <OverviewPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/profile/edit', element: <ProfileEditPage /> },
      { path: '/accounts', element: <AccountsPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/banks/:bankId', element: <BankDetailPage /> },
      { path: '/accounts/:accountId', element: <AccountDetailPage /> },
      { path: '/products/:productId', element: <ProductDetailPage /> },
      { path: '/transactions', element: <TransactionsPage /> },
      { path: '/imports', element: <ImportsPage /> },
      { path: '/vault-history', element: <VaultHistoryPage /> },
      { path: '/security', element: <SecurityPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
