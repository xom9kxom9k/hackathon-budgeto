import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/app/layout/AppLayout';
import { AccountDetailPage } from '@/pages/AccountDetailPage';
import { AccountsPage } from '@/pages/AccountsPage';
import { BankDetailPage } from '@/pages/BankDetailPage';
import { ImportsPage } from '@/pages/ImportsPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { SecurityPage } from '@/pages/SecurityPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { VaultHistoryPage } from '@/pages/VaultHistoryPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
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
      { path: '*', element: <Navigate to="/overview" replace /> },
    ],
  },
]);
