import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/app/layout/AppLayout';
import { ImportsPage } from '@/pages/ImportsPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { SecurityPage } from '@/pages/SecurityPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { VaultHistoryPage } from '@/pages/VaultHistoryPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: '/overview', element: <OverviewPage /> },
      { path: '/transactions', element: <TransactionsPage /> },
      { path: '/imports', element: <ImportsPage /> },
      { path: '/vault-history', element: <VaultHistoryPage /> },
      { path: '/security', element: <SecurityPage /> },
      { path: '*', element: <Navigate to="/overview" replace /> },
    ],
  },
]);
