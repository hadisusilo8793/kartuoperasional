import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Upload, Save, X, Edit, Trash2, LogOut } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Papa from 'papaparse';
type Driver = {
  id: number;
  nik: string;
  nama: string;
  status: 'AKTIF' | 'NONAKTIF';
};
export function MasterDriverPage() {
  const navigate = useNavigate();
  const [driverList, setDriverList] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Driver>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api<Driver[]>('/api/driver');
      setDriverList(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat data driver.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    toast.success('Logged out successfully');
    navigate('/login');
  };
  const handleAddNew = () => {
    setEditingId('new');
    setEditFormData({ nik: '', nama: '', status: 'AKTIF' });
  };
  const handleEdit = (driver: Driver) => {
    setEditingId(driver.id);
    setEditFormData(driver);
  };
  const handleCancel = () => {
    setEditingId(null);
    setEditFormData({});
  };
  const handleSave = async () => {
    try {
      if (editingId === 'new') {
        await api('/api/driver', {
          method: 'POST',
          body: JSON.stringify(editFormData),
        });
        toast.success('Driver berhasil ditambahkan.');
      } else {
        await api(`/api/driver/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(editFormData),
        });
        toast.success('Driver berhasil diperbarui.');
      }
      setEditingId(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan data.');
    }
  };
  const handleDelete = async (id: number) => {
    try {
      await api(`/api/driver/${id}`, { method: 'DELETE' });
      toast.success('Driver berhasil dihapus.');
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus driver.');
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const processedValue = name === 'nik' ? value.toUpperCase() : value;
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
          const response = await api<{ message: string; errors: string[] }>('/api/driver/import', {
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
  const renderRow = (driver: Driver) => {
    const isEditing = editingId === driver.id;
    if (isEditing) {
      return (
        <TableRow key={driver.id} className="bg-slate-50">
          <TableCell><Input name="nik" value={editFormData.nik} onChange={handleInputChange} className="uppercase-input" /></TableCell>
          <TableCell><Input name="nama" value={editFormData.nama} onChange={handleInputChange} /></TableCell>
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
      <TableRow key={driver.id}>
        <TableCell>{driver.nik}</TableCell>
        <TableCell>{driver.nama}</TableCell>
        <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block ${driver.status === 'AKTIF' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>{driver.status}</span></TableCell>
        <TableCell className="text-center">
          <div className="flex justify-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleEdit(driver)} className="text-cyan-600 hover:text-cyan-800"><Edit className="w-4 h-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus data driver secara permanen.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(driver.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
    );
  };
  return (
    <div className="bg-slate-50 min-h-screen">
      <Toaster richColors position="top-right" />
      <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-slate-800">Master Driver</h1>
            <div className="flex items-center gap-4">
              <span className="font-medium hidden sm:inline">Hadi Susilo</span>
              <img className="h-9 w-9 rounded-full" src="https://ui-avatars.com/api/?name=Hadi+Susilo&background=0B2340&color=fff" alt="Avatar" />
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout"><LogOut className="w-5 h-5 text-slate-600" /></Button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <Card className="rounded-[18px] shadow-soft">
            <CardHeader>
              <div className="flex flex-wrap gap-4 justify-between items-center">
                <CardTitle>Data Driver</CardTitle>
                <div>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileImport} />
                  <Button variant="outline" onClick={handleImportClick} className="mr-2"><Upload className="w-4 h-4 mr-2" /> Import CSV</Button>
                  <Button onClick={handleAddNew}><Plus className="w-4 h-4 mr-2" /> Tambah Driver</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NIK</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                      ))
                    ) : (
                      <>
                        {editingId === 'new' && (
                          <TableRow className="bg-slate-50">
                            <TableCell><Input name="nik" value={editFormData.nik} onChange={handleInputChange} className="uppercase-input" /></TableCell>
                            <TableCell><Input name="nama" value={editFormData.nama} onChange={handleInputChange} /></TableCell>
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
                        {driverList.map(renderRow)}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}