import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard, CreditCard, UserSquare, Truck, Gate,
  ArrowRightLeft, Undo2, History, Settings, ShieldAlert, LogOut, ChevronsLeft
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, useSidebar
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/transaksi", icon: ArrowRightLeft, label: "Transaksi Pinjam" },
  { href: "/pengembalian", icon: Undo2, label: "Pengembalian" },
  { href: "/history", icon: History, label: "Riwayat Transaksi" },
];
const masterDataItems = [
  { href: "/master-kartu", icon: CreditCard, label: "Master Kartu" },
  { href: "/master-driver", icon: UserSquare, label: "Master Driver" },
  { href: "/master-armada", icon: Truck, label: "Master Armada" },
  { href: "/master-gate", icon: Gate, label: "Master Gate" },
];
const bottomNavItems = [
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/logs", icon: ShieldAlert, label: "Logs" },
];
export function AppSidebar(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpen } = useSidebar();
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    toast.success('Logged out successfully');
    navigate('/login');
  };
  const isActive = (path: string) => location.pathname === path;
  return (
    <Sidebar>
      <SidebarHeader style={{ backgroundColor: '#0B2340', color: 'white' }}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <span className="text-xl font-bold">KartuOps</span>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex hover:bg-cyan-500/20" onClick={() => setOpen(false)}>
            <ChevronsLeft className="w-5 h-5" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-4 space-y-2" style={{ backgroundColor: '#0B2340', color: 'white' }}>
        <SidebarMenu>
          {navItems.map(item => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive(item.href)} className={cn("hover:bg-cyan-500/20", isActive(item.href) && "bg-cyan-500/20 text-white font-semibold")}>
                <Link to={item.href}><item.icon className="w-5 h-5" /> <span>{item.label}</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-semibold uppercase text-white/50 tracking-wider">Master Data</SidebarGroupLabel>
          <SidebarMenu>
            {masterDataItems.map(item => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive(item.href)} className={cn("hover:bg-cyan-500/20", isActive(item.href) && "bg-cyan-500/20 text-white font-semibold")}>
                  <Link to={item.href}><item.icon className="w-5 h-5" /> <span>{item.label}</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-white/10" style={{ backgroundColor: '#0B2340', color: 'white' }}>
        <SidebarMenu>
          {bottomNavItems.map(item => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive(item.href)} className={cn("hover:bg-cyan-500/20", isActive(item.href) && "bg-cyan-500/20 text-white font-semibold")}>
                <Link to={item.href}><item.icon className="w-5 h-5" /> <span>{item.label}</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="w-full hover:bg-red-500/20 text-red-400 hover:text-red-300">
              <LogOut className="w-5 h-5" /> <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}