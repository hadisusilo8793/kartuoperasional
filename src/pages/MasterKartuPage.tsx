import React, { useState, useEffect, useRef, DragEvent } from 'react';
import { api } from '@/lib/api-client';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Upload, Save, X, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Papa from 'papaparse';
import { AppLayout } from '@/components/layout/AppLayout';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
type Kartu = {
  id: number;
  nomor: string;
  serial: string;
  jenis: string;
  status: 'AKTIF' | 'NONAKTIF';
  saldo: number;
  status_pinjam: 'TERSEDIA' | 'DIPINJAM';
};
const formatCurrency = (value: number | string) => {
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
};
const parseCurrency = (value: string) => parseInt(value.replace(/\D/g, ''), 10) || 0;
export function MasterKartuPage() {
  const [kartuList, setKartuList] = useState<Kartu[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Kartu>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api<Kartu[]>('/api/kartu');
      setKartuList(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat data kartu.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleAddNew = () => {
    setEditingId('new');
    setEditFormData({
      nomor: '',
      serial: '',
      jenis: '',
      status: 'AKTIF',
      status_pinjam: 'TERSEDIA',
      saldo: 0,
    });
  };
  const handleEdit = (kartu: Kartu) => {
    setEditingId(kartu.id);
    setEditFormData({ ...kartu, saldo: formatCurrency(kartu.saldo) as any });
  };
  const handleCancel = () => {
    setEditingId(null);
    setEditFormData({});
  };
  const handleSave = async () => {
    try {
      const payload = {
        ...editFormData,
        saldo: typeof editFormData.saldo === 'string' ? parseCurrency(editFormData.saldo) : editFormData.saldo,
      };
      if (editingId === 'new') {
        await api('/api/kartu', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Kartu berhasil ditambahkan.');
      } else {
        await api(`/api/kartu/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Kartu berhasil diperbarui.');
      }
      setEditingId(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan data.');
    }
  };
  const handleDelete = async (id: number) => {
    try {
      await api(`/api/kartu/${id}`, { method: 'DELETE' });
      toast.success('Kartu berhasil dihapus.');
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus kartu.');
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number = value;
    if (['nomor', 'serial', 'jenis'].includes(name)) {
      processedValue = value.toUpperCase();
    }
    if (name === 'saldo') {
      processedValue = formatCurrency(value);
    }
    setEditFormData({ ...editFormData, [name]: processedValue });
  };
  const handleSelectChange = (name: string, value: string) => {
    setEditFormData({ ...editFormData, [name]: value });
  };
  const handleFileSelected = (file: File | null) => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const response = await api<{ message: string; errors: string[] }>('/api/kartu/import', {
            method: 'POST',
            body: JSON.stringify(results.data),
          });
          toast.success(response.message);
          if (response.errors && response.errors.length > 0) {
            toast.warning(`Beberapa data gagal diimpor:\n- ${response.errors.join('\n- ')}`);
          }
          fetchData();
        } catch (error) {
          toast.error(error instanceof Error ? `Import gagal: ${error.message}` : 'Import gagal');
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        toast.error(`Gagal mem-parsing CSV: ${error.message}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  };
  const handleFileDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileSelected(e.dataTransfer.files[0]);
  };
  const renderRow = (kartu: Kartu) => {
    const isEditing = editingId === kartu.id;
    const isDipinjam = kartu.status_pinjam === 'DIPINJAM';
    if (isEditing) {
      return (
        <motion.tr key={kartu.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-50">
          <TableCell><Input name="nomor" value={editFormData.nomor} onChange={handleInputChange} disabled={isDipinjam} className="uppercase-input disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100" /></TableCell>
          <TableCell><Input name="serial" value={editFormData.serial} onChange={handleInputChange} disabled={isDipinjam} className="uppercase-input disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100" /></TableCell>
          <TableCell><Input name="jenis" value={editFormData.jenis} onChange={handleInputChange} disabled={isDipinjam} className="uppercase-input disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100" /></TableCell>
          <TableCell>
            <Select name="status" value={editFormData.status} onValueChange={(v) => handleSelectChange('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="AKTIF">AKTIF</SelectItem><SelectItem value="NONAKTIF">NONAKTIF</SelectItem></SelectContent>
            </Select>
          </TableCell>
          <TableCell>
            <Select name="status_pinjam" value={editFormData.status_pinjam} onValueChange={(v) => handleSelectChange('status_pinjam', v)} disabled={isDipinjam}>
              <SelectTrigger className="disabled:opacity-50 disabled:cursor-not-allowed"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="TERSEDIA">TERSEDIA</SelectItem><SelectItem value="DIPINJAM">DIPINJAM</SelectItem></SelectContent>
            </Select>
          </TableCell>
          <TableCell><Input name="saldo" value={editFormData.saldo?.toString()} onChange={handleInputChange} className="text-right" /></TableCell>
          <TableCell className="text-center">
            <div className="flex justify-center gap-2">
              <Button size="icon" variant="ghost" onClick={handleSave} className="text-green-600 hover:text-green-700 hover:scale-105 transition-transform"><Save className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={handleCancel} className="text-red-600 hover:text-red-700 hover:scale-105 transition-transform"><X className="w-4 h-4" /></Button>
            </div>
          </TableCell>
        </motion.tr>
      );
    }
    return (
      <TableRow key={kartu.id} className="hover:bg-accent/50 transition-colors">
        <TableCell>{kartu.nomor}</TableCell>
        <TableCell>{kartu.serial}</TableCell>
        <TableCell>{kartu.jenis}</TableCell>
        <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block ${kartu.status === 'AKTIF' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>{kartu.status}</span></TableCell>
        <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block ${kartu.status_pinjam === 'DIPINJAM' ? 'bg-amber-100 text-amber-800' : 'bg-cyan-100 text-cyan-800'}`}>{kartu.status_pinjam}</span></TableCell>
        <TableCell className="text-right font-medium">Rp {formatCurrency(kartu.saldo)}</TableCell>
        <TableCell className="text-center">
          <div className="flex justify-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(kartu)} className="text-cyan-600 hover:text-cyan-800 hover:scale-105 transition-transform"><Edit className="w-4 h-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-800 hover:scale-105 transition-transform" disabled={isDipinjam}><Trash2 className="w-4 h-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data kartu secara permanen.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(kartu.id)}>Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
    );
  };
  return (
    <AppLayout pageTitle="Master Kartu">
      <Toaster richColors position="top-right" />
      <Card className="rounded-[18px] shadow-soft">
        <CardHeader>
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div className="flex items-center gap-2">
              <CardTitle>Data Kartu</CardTitle>
              {!loading && <Badge variant="secondary">{kartuList.length} kartu</Badge>}
            </div>
            <div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => handleFileSelected(e.target.files?.[0] || null)} />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="mr-2"><Upload className="w-4 h-4 mr-2" /> Import CSV</Button>
              <Button onClick={handleAddNew}><Plus className="w-4 h-4 mr-2" /> Tambah Kartu</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-cyan-500 transition-colors mb-6"
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            Tarik & lepas file CSV di sini, atau <span className="text-cyan-600 font-semibold">klik untuk memilih file</span>.
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Status Pinjam</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))
                ) : (
                  <>
                    {editingId === 'new' && (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-50">
                        <TableCell><Input name="nomor" value={editFormData.nomor} onChange={handleInputChange} className="uppercase-input" /></TableCell>
                        <TableCell><Input name="serial" value={editFormData.serial} onChange={handleInputChange} className="uppercase-input" /></TableCell>
                        <TableCell><Input name="jenis" value={editFormData.jenis} onChange={handleInputChange} className="uppercase-input" /></TableCell>
                        <TableCell>
                          <Select name="status" value={editFormData.status} onValueChange={(v) => handleSelectChange('status', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="AKTIF">AKTIF</SelectItem><SelectItem value="NONAKTIF">NONAKTIF</SelectItem></SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select name="status_pinjam" value={editFormData.status_pinjam} onValueChange={(v) => handleSelectChange('status_pinjam', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="TERSEDIA">TERSEDIA</SelectItem><SelectItem value="DIPINJAM">DIPINJAM</SelectItem></SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input name="saldo" value={editFormData.saldo?.toString()} onChange={handleInputChange} className="text-right" /></TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="icon" variant="ghost" onClick={handleSave} className="text-green-600 hover:text-green-700 hover:scale-105 transition-transform"><Save className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={handleCancel} className="text-red-600 hover:text-red-700 hover:scale-105 transition-transform"><X className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    )}
                    {kartuList.length > 0 ? kartuList.map(renderRow) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <p className="text-muted-foreground">Belum ada kartu. Klik untuk menambahkan!</p>
                            <motion.div whileHover={{ scale: 1.05 }}><Button onClick={handleAddNew} variant="outline"><Plus className="w-4 h-4 mr-2"/> Tambah Kartu Pertama</Button></motion.div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}