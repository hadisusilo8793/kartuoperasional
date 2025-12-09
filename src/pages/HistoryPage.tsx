import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import Papa from 'papaparse';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDebounce } from 'react-use';
import { motion, AnimatePresence } from 'framer-motion';
type Transaksi = {
  id: number;
  waktu_pinjam: string;
  waktu_kembali: string;
  nomor_armada: string;
  plat: string;
  nama_driver: string;
  nik: string;
  nomor_kartu: string;
  serial_kartu: string;
  gate_in_out: string; // JSON string
  parkir: string; // JSON string
  total_tol: number;
  total_parkir: number;
  total_biaya: number;
  gate_in: string | null;
  gate_out: string | null;
};
type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
type SearchFormValues = {
  kartu_search: string;
  driver_search: string;
  armada_search: string;
  date_from: string;
  date_to: string;
};
const formatCurrency = (value: number) => `Rp ${new Intl.NumberFormat('id-ID').format(value)}`;
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
export function HistoryPage() {
  const [data, setData] = useState<Transaksi[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { register, watch } = useForm<SearchFormValues>({
    defaultValues: {
      kartu_search: '',
      driver_search: '',
      armada_search: '',
      date_from: '',
      date_to: '',
    },
  });
  const searchValues = watch();
  const [debouncedSearch, setDebouncedSearch] = useState(searchValues);
  useDebounce(() => {
    setDebouncedSearch(searchValues);
  }, 500, [searchValues]);
  const fetchHistory = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (debouncedSearch.kartu_search) params.set('kartu_search', debouncedSearch.kartu_search);
      if (debouncedSearch.driver_search) params.set('driver_search', debouncedSearch.driver_search);
      if (debouncedSearch.armada_search) params.set('armada_search', debouncedSearch.armada_search);
      if (debouncedSearch.date_from) params.set('date_from', debouncedSearch.date_from);
      if (debouncedSearch.date_to) params.set('date_to', debouncedSearch.date_to);
      const response = await api<{ data: Transaksi[], pagination: PaginationInfo }>(`/api/history?${params.toString()}`);
      setData(response.data || []);
      setPagination(response.pagination || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat riwayat.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);
  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && pagination && newPage <= pagination.totalPages) {
      fetchHistory(newPage);
    }
  };
  const exportToCSV = () => {
    if (data.length === 0) {
      toast.info('Tidak ada data untuk diekspor.');
      return;
    }
    const toastId = toast.loading('Mengekspor data...');
    try {
      const csvData = data.map(item => ({
        "Tanggal": formatDate(item.waktu_pinjam),
        "No Armada": item.nomor_armada,
        "Plat": item.plat,
        "Nama Driver": item.nama_driver,
        "NIK": item.nik,
        "No Kartu": item.nomor_kartu,
        "Serial Kartu": item.serial_kartu,
        "Biaya Tol": item.total_tol,
        "Biaya Parkir": item.total_parkir,
        "Total Biaya": item.total_biaya,
      }));
      const csv = Papa.unparse(csvData);
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `riwayat_transaksi_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Ekspor CSV berhasil.', { id: toastId });
    } catch (error) {
      toast.error('Ekspor gagal.', { id: toastId });
    }
  };
  return (
    <AppLayout pageTitle="Riwayat Transaksi">
      <Toaster richColors position="top-right" />
      <Card className="rounded-[18px] shadow-soft">
        <CardHeader>
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <CardTitle>Tabel Riwayat</CardTitle>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Input placeholder="Cari Kartu/Serial" {...register('kartu_search')} />
            <Input placeholder="Cari Driver/NIK" {...register('driver_search')} />
            <Input placeholder="Cari Armada/Plat" {...register('armada_search')} />
            <div className="flex gap-2">
              <Input type="date" {...register('date_from')} />
              <Input type="date" {...register('date_to')} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Armada</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Kartu</TableHead>
                  <TableHead className="text-right">Total Biaya</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <p className="text-muted-foreground">Belum ada transaksi. Buat yang pertama!</p>
                        <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }}>
                          <Button asChild variant="outline"><Link to="/transaksi">Mulai Peminjaman</Link></Button>
                        </motion.div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence>
                    {data.map((item, index) => (
                      <motion.tr key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="hover:bg-accent/50">
                        <TableCell>{formatDate(item.waktu_pinjam)}</TableCell>
                        <TableCell>{item.nomor_armada} ({item.plat})</TableCell>
                        <TableCell>{item.nama_driver}</TableCell>
                        <TableCell>{item.nomor_kartu}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.total_biaya)}</TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.total > 0 && (
            <div className="flex justify-between items-center mt-6">
              <span className="text-sm text-muted-foreground">
                Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} hasil
              </span>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => handlePageChange(pagination.page - 1)} className={pagination.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:scale-105 transition-transform duration-150'} />
                  </PaginationItem>
                  <PaginationItem><PaginationLink>{pagination.page}</PaginationLink></PaginationItem>
                  <PaginationItem>
                    <PaginationNext onClick={() => handlePageChange(pagination.page + 1)} className={pagination.page >= pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:scale-105 transition-transform duration-150'} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}