import '@/index.css';
import '@/lib/errorReporter';
import { enableMapSet } from "immer";
import React, { StrictMode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TransaksiPinjamPage } from '@/pages/TransaksiPinjamPage';
import { PengembalianPage } from '@/pages/PengembalianPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { MasterKartuPage } from '@/pages/MasterKartuPage';
import { MasterDriverPage } from '@/pages/MasterDriverPage';
import { MasterArmadaPage } from '@/pages/MasterArmadaPage';
import { MasterGatePage } from '@/pages/MasterGatePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LogsPage } from '@/pages/LogsPage';
import { Button } from './components/ui/button';
import { Toaster, toast } from 'sonner';
enableMapSet();
const NotFoundPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-center p-4">
    <h1 className="text-6xl font-bold text-navy">404</h1>
    <p className="text-xl text-slate-600 mt-4">Page Not Found</p>
    <p className="text-slate-500 mt-2">The page you are looking for does not exist.</p>
    <Button asChild className="mt-6">
      <Link to="/dashboard">Go to Dashboard</Link>
    </Button>
  </div>
);
const queryClient = new QueryClient();
const router = createBrowserRouter([
  { path: "/", element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/login", element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/dashboard", element: <DashboardPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/transaksi", element: <TransaksiPinjamPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/pengembalian", element: <PengembalianPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/history", element: <HistoryPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/master-kartu", element: <MasterKartuPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/master-driver", element: <MasterDriverPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/master-armada", element: <MasterArmadaPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/master-gate", element: <MasterGatePage />, errorElement: <RouteErrorBoundary /> },
  { path: "/settings", element: <SettingsPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/logs", element: <LogsPage />, errorElement: <RouteErrorBoundary /> },
  { path: "*", element: <NotFoundPage /> }
]);
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary
        onError={(error, errorInfo) => {
          console.error("Global Error Boundary Caught:", error, errorInfo);
          toast.error(`An unexpected error occurred: ${error.message}`);
        }}
        fallback={(error, errorInfo, retry) => (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-center p-4">
            <h1 className="text-2xl font-bold text-red-600">Application Error</h1>
            <p className="text-slate-600 mt-2">Something went wrong: {error.message}</p>
            <div className="flex gap-2 mt-6">
              <Button onClick={retry} variant="outline">Retry</Button>
              <Button onClick={() => window.location.reload()}>Refresh Page</Button>
            </div>
          </div>
        )}
      >
        <Toaster richColors position="top-center" />
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>
);
export { NotFoundPage };