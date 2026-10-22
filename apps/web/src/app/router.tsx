import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/app/layout/AppLayout';
import { PublicLayout } from '@/app/layout/PublicLayout';
import { ProtectedRoute } from '@/app/routing/ProtectedRoute';
import { PublicOnlyRoute } from '@/app/routing/PublicOnlyRoute';
import { AccountDetailPage } from '@/pages/AccountDetailPage';
import { AccountsPage } from '@/pages/AccountsPage';
import { BankDetailPage } from '@/pages/BankDetailPage';
import { ImportsPage } from '@/pages/ImportsPage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { LoginTotpPage } from '@/pages/LoginTotpPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { RegisterTotpPage } from '@/pages/RegisterTotpPage';
import { SecurityPage } from '@/pages/SecurityPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { VaultHistoryPage } from '@/pages/VaultHistoryPage';

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
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/overview', element: <OverviewPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/accounts', element: <AccountsPage /> },
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
