import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { Toaster, toast } from 'sonner';
import 'chart.js/auto';
import Chart from 'chart.js/auto';
import { Card } from '@/components/ui/card';
/**
 * Types for dashboard response
 */
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
/**
 * DashboardPage
 *
 * - Uses api<T>() to fetch /api/dashboard
 * - Renders 4 stat cards, latest logs, low-balance list, and a Chart.js pie
 * - Cleans up Chart instance on unmount
 */
export function DashboardPage(): JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api<DashboardData>('/api/dashboard')
      .then((d) => {
        if (!mounted) return;
        setData(d);
        setError(null);
      })
      .catch((err: any) => {
        console.error('Dashboard fetch error', err);
        setError(err?.message || 'Gagal memuat dashboard');
        toast.error(err?.message || 'Gagal memuat dashboard');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  // Chart rendering + cleanup
  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    // Destroy previous instance if any
    if (chartRef.current) {
      try {
        chartRef.current.destroy();
      } catch (e) {
        // ignore
      }
      chartRef.current = null;
    }
    const totalTol = data.chartData?.tol ?? 0;
    const totalParkir = data.chartData?.parkir ?? 0;
    // If both zero, do not render a pie chart; show a placeholder by leaving chartRef null
    if (totalTol === 0 && totalParkir === 0) {
      return;
    }
    chartRef.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Tol', 'Parkir'],
        datasets: [
          {
            data: [totalTol, totalParkir],
            backgroundColor: ['#0B2340', '#06B6D4'],
            borderColor: '#ffffff',
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 12, color: '#0f172a' },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const label = ctx.label || '';
                const value = ctx.parsed ?? 0;
                return `${label}: Rp ${new Intl.NumberFormat('id-ID').format(Number(value))}`;
              },
            },
          },
        },
      },
    });
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data]);
  const formatCurrency = (n = 0) => `Rp ${new Intl.NumberFormat('id-ID').format(n)}`;
  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <Toaster richColors position="top-right" />
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm">Hadi Susilo</div>
            <img
              src="https://ui-avatars.com/api/?name=Hadi+Susilo&background=0B2340&color=fff"
              alt="avatar"
              className="h-9 w-9 rounded-full"
            />
          </div>
        </header>
        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <>
              <Card className="card-ui animate-pulse"><div className="h-24 bg-slate-200 rounded-lg" /></Card>
              <Card className="card-ui animate-pulse"><div className="h-24 bg-slate-200 rounded-lg" /></Card>
              <Card className="card-ui animate-pulse"><div className="h-24 bg-slate-200 rounded-lg" /></Card>
              <Card className="card-ui animate-pulse"><div className="h-24 bg-slate-200 rounded-lg" /></Card>
            </>
          ) : error ? (
            <div className="col-span-4 p-6 rounded-lg bg-rose-50 text-rose-700">{error}</div>
          ) : (
            <>
              <Card className="card-ui flex items-center gap-4 p-4">
                <div className="p-3 rounded-full bg-cyan-100 text-cyan-600"><svg className="w-6 h-6" /></div>
                <div>
                  <div className="text-sm text-muted-foreground">Kartu Aktif</div>
                  <div className="text-3xl font-bold">{data?.stats.kartuAktif ?? 0}</div>
                </div>
              </Card>
              <Card className="card-ui flex items-center gap-4 p-4">
                <div className="p-3 rounded-full bg-cyan-100 text-cyan-600"><svg className="w-6 h-6" /></div>
                <div>
                  <div className="text-sm text-muted-foreground">Driver Aktif</div>
                  <div className="text-3xl font-bold">{data?.stats.driverAktif ?? 0}</div>
                </div>
              </Card>
              <Card className="card-ui flex items-center gap-4 p-4">
                <div className="p-3 rounded-full bg-cyan-100 text-cyan-600"><svg className="w-6 h-6" /></div>
                <div>
                  <div className="text-sm text-muted-foreground">Armada Aktif</div>
                  <div className="text-3xl font-bold">{data?.stats.armadaAktif ?? 0}</div>
                </div>
              </Card>
              <Card className="card-ui flex items-center gap-4 p-4">
                <div className="p-3 rounded-full bg-cyan-100 text-cyan-600"><svg className="w-6 h-6" /></div>
                <div>
                  <div className="text-sm text-muted-foreground">Transaksi Hari Ini</div>
                  <div className="text-3xl font-bold">{data?.stats.transaksiHariIni ?? 0}</div>
                </div>
              </Card>
            </>
          )}
        </section>
        {/* Charts & Logs */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 card-ui p-4">
            <h2 className="text-lg font-semibold mb-4">Biaya Tol vs Parkir</h2>
            <div className="h-80 flex items-center justify-center">
              {loading ? (
                <div className="w-full animate-pulse">
                  <div className="h-64 bg-slate-200 rounded-lg" />
                </div>
              ) : data?.chartData.tol === 0 && data?.chartData.parkir === 0 ? (
                <div className="text-sm text-slate-500">Belum ada data biaya transaksi.</div>
              ) : (
                <canvas ref={canvasRef => (canvasRef ? (canvasRef as HTMLCanvasElement).getContext && (canvasRef as HTMLCanvasElement).getContext('2d') : null) as unknown as HTMLCanvasElement} />
              )}
              {/* Use a hidden canvas element ref to mount Chart. Render an actual canvas element below */}
              {!loading && data && (data.chartData.tol !== 0 || data.chartData.parkir !== 0) && (
                <canvas ref={canvasRef} className="w-full h-80"></canvas>
              )}
            </div>
          </div>
          <div className="card-ui p-4">
            <h2 className="text-lg font-semibold mb-4">Log Terbaru</h2>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-slate-200 rounded"></div>
                      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    </div>
                  </div>
                ))
              ) : data && data.logs.length > 0 ? (
                data.logs.map((log) => (
                  <div key={log.id ?? log.waktu} className="text-sm border-b border-slate-100 pb-2">
                    <p className="font-medium truncate text-slate-700">{log.pesan}</p>
                    <p className="text-xs text-slate-400">{new Date(log.waktu).toLocaleString('id-ID')}</p>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">Tidak ada log terbaru.</div>
              )}
            </div>
          </div>
        </section>
        {/* Low Balance */}
        <section className="mt-8 card-ui p-4">
          <h2 className="text-lg font-semibold mb-4 text-amber-600">Kartu Saldo Rendah</h2>
          <div id="low-balance" className="space-y-2">
            {loading ? (
              <div className="animate-pulse h-8 bg-slate-200 rounded w-full" />
            ) : data && data.lowBalance.length > 0 ? (
              data.lowBalance.map((c, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded-lg hover:bg-amber-50">
                  <span className="text-slate-600">Kartu <strong>{c.nomor}</strong></span>
                  <span className="font-semibold text-amber-700">{formatCurrency(c.saldo)}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">Tidak ada kartu dengan saldo rendah.</div>
            )}
          </div>
        </section>
        <footer className="text-center py-6 text-sm text-slate-500">
          &copy; 2025 Hadi Susilo. All Rights Reserved.
        </footer>
      </div>
    </main>
  );
}