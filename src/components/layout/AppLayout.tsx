import React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
type AppLayoutProps = {
  children: React.ReactNode;
  pageTitle: string;
};
export function AppLayout({ children, pageTitle }: AppLayoutProps): JSX.Element {
  return (
    <SidebarProvider>
      <div className="bg-slate-50 min-h-screen">
        <AppSidebar />
        <SidebarInset className="flex flex-col h-screen">
          <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-2">
                  <div className="md:hidden">
                    <SidebarTrigger />
                  </div>
                  <h1 className="text-xl font-semibold text-slate-800">{pageTitle}</h1>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium hidden sm:inline">Hadi Susilo</span>
                  <img className="h-9 w-9 rounded-full" src="https://ui-avatars.com/api/?name=Hadi+Susilo&background=0B2340&color=fff" alt="Avatar" />
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-8 md:py-10 lg:py-12">
                {children}
              </div>
            </div>
            <footer className="text-center py-6 text-sm text-slate-500">
              &copy; 2025 Hadi Susilo. All Rights Reserved.
            </footer>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}