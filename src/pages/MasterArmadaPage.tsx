import React, { useState, useEffect, useRef } from 'react';
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
type Armada = {
  id: number;
  nomor_armada: string;
  jenis: string;
  plat: string;
  status: 'AKTIF' | 'NONAKTIF';
};
export function MasterArmadaPage() {
  const [armadaList, setArmadaList] = useState<Armada[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Armada>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api<Armada[]>('/api/armada');
      setArmadaList(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat data armada.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleAddNew = () => {
    setEditingId('new');
    setEditFormData({ nomor_armada: '', jenis: '', plat: '', status: 'AKTIF' });
  };
  const handleEdit = (armada: Armada) => {
    setEditingId(armada.id);
    setEditFormData(armada);
  };
  const handleCancel = () => {
    setEditingId(null);
    setEditFormData({});
  };
  const handleSave = async () => {
    try {
      if (editingId === 'new') {
        await api('/api/armada', {
          method: 'POST',
          body: JSON.stringify(editFormData),
        });
        toast.success('Armada berhasil ditambahkan.');
      } else {
        await api(`/api/armada/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(editFormData),
        });
        toast.success('Armada berhasil diperbarui.');
      }
      setEditingId(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan data.');
    }
  };
  const handleDelete = async (id: number) => {
    try {
      await api(`/api/armada/${id}`, { method: 'DELETE' });
      toast.success('Armada berhasil dihapus.');
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus armada.');
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const processedValue = ['jenis', 'plat'].includes(name) ? value.toUpperCase() : value;
    setEditFormData({ ...editFormData, [name]: processedValue });
  };
  const handleSelectChange = (name: string, value: string) => {
    setEditFormData({ ...editFormData, [name]: value });
  };
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const response = await api<{ message: string; errors: string[] }>('/api/armada/import', {
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
  const renderRow = (armada: Armada) => {
    const isEditing = editingId === armada.id;
    if (isEditing) {
      return (
        <TableRow key={armada.id} className="bg-slate-50">
          <TableCell><Input name="nomor_armada" value={editFormData.nomor_armada} onChange={handleInputChange} /></TableCell>
          <TableCell><Input name="jenis" value={editFormData.jenis} onChange={handleInputChange} className="uppercase-input" /></TableCell>
          <TableCell><Input name="plat" value={editFormData.plat} onChange={handleInputChange} className="uppercase-input" /></TableCell>
          <TableCell>
            <Select name="status" value={editFormData.status} onValueChange={(v) => handleSelectChange('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="AKTIF">AKTIF</SelectItem><SelectItem value="NONAKTIF">NONAKTIF</SelectItem></SelectContent>
            </Select>
          </TableCell>
          <TableCell className="text-center">
            <div className="flex justify-center gap-2">
              <Button size="icon" variant="ghost" onClick={handleSave} className="text-green-600 hover:text-green-700"><Save className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={handleCancel} className="text-red-600 hover:text-red-700"><X className="w-4 h-4" /></Button>
            </div>
          </TableCell>
        </TableRow>
      );
    }
    return (
      <TableRow key={armada.id} className="hover:bg-accent/50 transition-colors">
        <TableCell>{armada.nomor_armada}</TableCell>
        <TableCell>{armada.jenis}</TableCell>
        <TableCell>{armada.plat}</TableCell>
        <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block ${armada.status === 'AKTIF' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>{armada.status}</span></TableCell>
        <TableCell className="text-center">
          <div className="flex justify-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(armada)} className="text-cyan-600 hover:text-cyan-800"><Edit className="w-4 h-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus data armada secara permanen.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(armada.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
    );
  };
  return (
    <AppLayout pageTitle="Master Armada">
      <Toaster richColors position="top-right" />
      <Card className="rounded-[18px] shadow-soft">
        <CardHeader>
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <CardTitle>Data Armada</CardTitle>
            <div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileImport} />
              <Button variant="outline" onClick={handleImportClick} className="mr-2"><Upload className="w-4 h-4 mr-2" /> Import CSV</Button>
              <Button onClick={handleAddNew}><Plus className="w-4 h-4 mr-2" /> Tambah Armada</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor Armada</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Plat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))
                ) : (
                  <>
                    {editingId === 'new' && (
                      <TableRow className="bg-slate-50">
                        <TableCell><Input name="nomor_armada" value={editFormData.nomor_armada} onChange={handleInputChange} /></TableCell>
                        <TableCell><Input name="jenis" value={editFormData.jenis} onChange={handleInputChange} className="uppercase-input" /></TableCell>
                        <TableCell><Input name="plat" value={editFormData.plat} onChange={handleInputChange} className="uppercase-input" /></TableCell>
                        <TableCell>
                          <Select name="status" value={editFormData.status} onValueChange={(v) => handleSelectChange('status', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="AKTIF">AKTIF</SelectItem><SelectItem value="NONAKTIF">NONAKTIF</SelectItem></SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="icon" variant="ghost" onClick={handleSave} className="text-green-600 hover:text-green-700"><Save className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={handleCancel} className="text-red-600 hover:text-red-700"><X className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {armadaList.length > 0 ? armadaList.map(renderRow) : (
                       <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <p className="text-muted-foreground">Belum ada armada. Tambahkan untuk memulai!</p>
                            <Button onClick={handleAddNew} variant="outline"><Plus className="w-4 h-4 mr-2"/> Tambah Armada Pertama</Button>
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