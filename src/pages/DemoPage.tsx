// This file is part of the template and not used in the final application.
// It can be safely removed.
import { AppLayout } from '@/components/layout/AppLayout';
export function DemoPage() {
  return (
    <AppLayout pageTitle="Demo">
      <div className="p-8">
        <h1 className="text-2xl font-bold">Demo Page</h1>
        <p>This is a placeholder page from the template.</p>
      </div>
    </AppLayout>
  );
}