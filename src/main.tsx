import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MasterKartuPage } from '@/pages/MasterKartuPage';
import { MasterDriverPage } from '@/pages/MasterDriverPage';
import { MasterArmadaPage } from '@/pages/MasterArmadaPage';
import { MasterGatePage } from '@/pages/MasterGatePage';
import { SettingsPage } from '@/pages/SettingsPage';
const queryClient = new QueryClient();
const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/dashboard",
    element: <DashboardPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/master-kartu",
    element: <MasterKartuPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/master-driver",
    element: <MasterDriverPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/master-armada",
    element: <MasterArmadaPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/master-gate",
    element: <MasterGatePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/settings",
    element: <SettingsPage />,
    errorElement: <RouteErrorBoundary />,
  },
]);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)