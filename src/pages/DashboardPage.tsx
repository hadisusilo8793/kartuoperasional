import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { Toaster, toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, UserSquare, Truck, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AppLayout } from '@/components/layout/AppLayout';
type DashboardStats = {
  kartuAktif: number;
  driverAktif: number;
  armadaAktif: number;
  transaksiHariIni: number;
};
type LogRow = {
  id?: number;
  waktu: string;
  level: string;
  pesan: string;
};
type LowBalanceRow = {
  nomor: string;
  saldo: number;
};
type DashboardData = {
  stats: DashboardStats;
  logs: LogRow[];
  lowBalance: LowBalanceRow[];
  chartData: { tol: number; parkir: number };
};
const StatCard = ({ icon, title, value }: { icon: React.ReactNode; title: string; value: number | string }) => (
  <Card className="rounded-[18px] shadow-soft hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-cyan-600">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
    </CardContent>
  </Card>
);
const StatCardSkeleton = () => <Skeleton className="h-[108px] rounded-[18px]" />;
export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const dashboardData = await api<DashboardData>('/api/dashboard');
        setData(dashboardData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
        toast.error(errorMessage);
        if (errorMessage === 'Unauthorized') {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);
  const formatCurrency = (n = 0) => `Rp ${new Intl.NumberFormat('id-ID').format(n)}`;
  const chartData = [
    { name: 'Tol', value: data?.chartData.tol ?? 0 },
    { name: 'Parkir', value: data?.chartData.parkir ?? 0 },
  ];
  const COLORS = ['#0B2340', '#06B6D4'];
  return (
    <AppLayout pageTitle="Dashboard">
      <Toaster richColors position="top-right" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard icon={<CreditCard />} title="Kartu Aktif" value={data?.stats.kartuAktif ?? 0} />
            <StatCard icon={<UserSquare />} title="Driver Aktif" value={data?.stats.driverAktif ?? 0} />
            <StatCard icon={<Truck />} title="Armada Aktif" value={data?.stats.armadaAktif ?? 0} />
            <StatCard icon={<ArrowRightLeft />} title="Transaksi Hari Ini" value={data?.stats.transaksiHariIni ?? 0} />
          </>
        )}
      </div>
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[18px] shadow-soft p-6">
          <h2 className="text-lg font-semibold mb-4">Biaya Tol vs Parkir</h2>
          <div className="h-80">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (chartData[0].value === 0 && chartData[1].value === 0) ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Belum ada data biaya transaksi.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card className="rounded-[18px] shadow-soft p-6">
          <h2 className="text-lg font-semibold mb-4">Log Terbaru</h2>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : data?.logs && data.logs.length > 0 ? (
              data.logs.map((log) => (
                <div key={log.id ?? log.waktu} className="text-sm border-b border-slate-100 pb-2 last:border-b-0">
                  <p className="font-medium truncate text-slate-700">{log.pesan}</p>
                  <p className="text-xs text-slate-400">{new Date(log.waktu).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada log terbaru.</p>
            )}
          </div>
        </Card>
      </div>
      <Card className="mt-8 rounded-[18px] shadow-soft p-6">
        <h2 className="text-lg font-semibold mb-4 text-amber-600 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Kartu Saldo Rendah
        </h2>
        <div>
          {loading ? (
            <Skeleton className="h-8 w-full" />
          ) : data?.lowBalance && data.lowBalance.length > 0 ? (
            data.lowBalance.map((card, index) => (
              <div key={index} className="flex justify-between items-center p-2 rounded-lg hover:bg-amber-50">
                <span className="text-slate-600">Kartu <strong>{card.nomor}</strong></span>
                <span className="font-semibold text-amber-700">{formatCurrency(card.saldo)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Tidak ada kartu dengan saldo rendah.</p>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}