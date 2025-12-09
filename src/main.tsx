import '@/index.css';
import '@/lib/errorReporter';
import { enableMapSet } from "immer";
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TransaksiPinjamPage } from '@/pages/TransaksiPinjamPage';
import { PengembalianPage } from '@/pages/PengembalianPage';
import { MasterKartuPage } from '@/pages/MasterKartuPage';
import { MasterDriverPage } from '@/pages/MasterDriverPage';
import { MasterArmadaPage } from '@/pages/MasterArmadaPage';
import { MasterGatePage } from '@/pages/MasterGatePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AppLayout } from '@/components/layout/AppLayout';
enableMapSet();
// Placeholder for pages that are not yet implemented in React
export const PlaceholderPage = ({ title }: { title: string }) => (
  <AppLayout pageTitle={title}>
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground mt-2">This page is under construction.</p>
    </div>
  </AppLayout>
);
const queryClient = new QueryClient();
const router = createBrowserRouter([
  { path: "/", element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/login", element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/dashboard", element: <DashboardPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/transaksi", element: <TransaksiPinjamPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/pengembalian", element: <PengembalianPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/history", element: <PlaceholderPage title="Riwayat Transaksi" />, errorElement: <RouteErrorBoundary /> },
  { path: "/master-kartu", element: <MasterKartuPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/master-driver", element: <MasterDriverPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/master-armada", element: <MasterArmadaPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/master-gate", element: <MasterGatePage />, errorElement: <RouteErrorBoundary /> },
  { path: "/settings", element: <SettingsPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/logs", element: <PlaceholderPage title="Logs" />, errorElement: <RouteErrorBoundary /> },
]);
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>
);