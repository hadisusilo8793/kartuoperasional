import React, { useState, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AppLayout } from '@/components/layout/AppLayout';
const formatCurrency = (value: number | string) => {
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
};
const parseCurrency = (value: string) => parseInt(value.replace(/\D/g, ''), 10) || 0;
const pengembalianSchema = z.object({
  transaksi_id: z.string().min(1, "Transaksi harus dipilih."),
  gate_in_out: z.array(z.object({
    gate_id: z.string().min(1),
    biaya: z.string().min(1),
  })),
  parkir: z.array(z.object({
    lokasi: z.string().min(1),
    biaya: z.string().min(1),
  })),
  kondisi: z.string().optional(),
  deskripsi: z.string().optional(),
}).refine(data => data.gate_in_out.length > 0 || data.parkir.length > 0, {
  message: "Setidaknya satu rincian tol atau parkir harus diisi.",
  path: ["gate_in_out"],
});
type PengembalianFormValues = z.infer<typeof pengembalianSchema>;
type PinjamanAktif = { transaksi_id: number; saldo_awal: number; nomor_kartu: string; nama_driver: string; nomor_armada: string; plat: string; };
type Gate = { id: number; nama: string; };
export function PengembalianPage() {
  const [loading, setLoading] = useState(true);
  const [pinjamanAktif, setPinjamanAktif] = useState<PinjamanAktif[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [selectedPinjaman, setSelectedPinjaman] = useState<PinjamanAktif | null>(null);
  const form = useForm<PengembalianFormValues>({
    resolver: zodResolver(pengembalianSchema),
    defaultValues: {
      transaksi_id: "",
      gate_in_out: [],
      parkir: [],
      kondisi: "",
      deskripsi: "",
    },
  });
  const { fields: gateFields, append: appendGate, remove: removeGate } = useFieldArray({ control: form.control, name: "gate_in_out" });
  const { fields: parkirFields, append: appendParkir, remove: removeParkir } = useFieldArray({ control: form.control, name: "parkir" });
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [pinjamanRes, gateRes] = await Promise.all([
        api<PinjamanAktif[]>('/api/transaksi/pinjaman-aktif'),
        api<Gate[]>('/api/gate')
      ]);
      setPinjamanAktif(pinjamanRes);
      setGates(gateRes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchInitialData();
  }, []);
  const watchForm = form.watch();
  const totalTol = watchForm.gate_in_out.reduce((sum, item) => sum + parseCurrency(item.biaya), 0);
  const totalParkir = watchForm.parkir.reduce((sum, item) => sum + parseCurrency(item.biaya), 0);
  const totalBiaya = totalTol + totalParkir;
  const saldoAkhir = selectedPinjaman ? selectedPinjaman.saldo_awal - totalBiaya : 0;
  const handlePinjamanChange = (transaksiId: string) => {
    const pinjaman = pinjamanAktif.find(p => p.transaksi_id.toString() === transaksiId);
    setSelectedPinjaman(pinjaman || null);
    form.reset({
      transaksi_id: transaksiId,
      gate_in_out: [],
      parkir: [],
      kondisi: "",
      deskripsi: "",
    });
  };
  const onSubmit = async (data: PengembalianFormValues) => {
    const payload = {
      ...data,
      gate_in_out: data.gate_in_out.map(g => ({ ...g, biaya: parseCurrency(g.biaya) })),
      parkir: data.parkir.map(p => ({ ...p, biaya: parseCurrency(p.biaya) })),
    };
    try {
      await api(`/api/transaksi/pengembalian/${data.transaksi_id}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Pengembalian berhasil dicatat.');
      setSelectedPinjaman(null);
      form.reset();
      fetchInitialData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mencatat pengembalian.');
    }
  };
  return (
    <AppLayout pageTitle="Pengembalian Kartu">
      <Toaster richColors position="top-right" />
      <div className="max-w-5xl mx-auto">
        <Card className="rounded-[18px] shadow-soft">
          <CardHeader><CardTitle>Form Pengembalian</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(() => {})} className="space-y-8">
                  <FormField
                    control={form.control}
                    name="transaksi_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pilih Transaksi Pinjaman</FormLabel>
                        <Select onValueChange={(value) => { field.onChange(value); handlePinjamanChange(value); }} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="-- Pilih Transaksi --" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {pinjamanAktif.map(p => (
                              <SelectItem key={p.transaksi_id} value={p.transaksi_id.toString()}>
                                {`${p.nomor_kartu} - ${p.nama_driver} - ${p.nomor_armada} (${p.plat})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {selectedPinjaman && (
                    <div className="space-y-8 animate-fade-in">
                      {/* Gate Section */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold">Rincian Biaya Tol</h3>
                          <Button type="button" variant="outline" size="sm" onClick={() => appendGate({ gate_id: '', biaya: '0' })}><Plus className="w-4 h-4 mr-1" /> Tambah Gate</Button>
                        </div>
                        {gateFields.map((field, index) => (
                          <div key={field.id} className="flex items-start gap-2">
                            <FormField control={form.control} name={`gate_in_out.${index}.gate_id`} render={({ field }) => (
                              <FormItem className="flex-grow"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Gate" /></SelectTrigger></FormControl><SelectContent>{gates.map(g => <SelectItem key={g.id} value={g.id.toString()}>{g.nama}</SelectItem>)}</SelectContent></Select></FormItem>
                            )} />
                            <FormField control={form.control} name={`gate_in_out.${index}.biaya`} render={({ field }) => (
                              <FormItem className="w-40"><FormControl><Input {...field} onChange={e => field.onChange(formatCurrency(e.target.value))} className="text-right" /></FormControl></FormItem>
                            )} />
                            <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => removeGate(index)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        ))}
                      </div>
                      {/* Parkir Section */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold">Rincian Biaya Parkir</h3>
                          <Button type="button" variant="outline" size="sm" onClick={() => appendParkir({ lokasi: '', biaya: '0' })}><Plus className="w-4 h-4 mr-1" /> Tambah Parkir</Button>
                        </div>
                        {parkirFields.map((field, index) => (
                          <div key={field.id} className="flex items-start gap-2">
                            <FormField control={form.control} name={`parkir.${index}.lokasi`} render={({ field }) => (<FormItem className="flex-grow"><FormControl><Input placeholder="Lokasi Parkir" {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name={`parkir.${index}.biaya`} render={({ field }) => (<FormItem className="w-40"><FormControl><Input {...field} onChange={e => field.onChange(formatCurrency(e.target.value))} className="text-right" /></FormControl></FormItem>)} />
                            <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => removeParkir(index)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        ))}
                      </div>
                      {/* Summary & Others */}
                      <div className="border-t pt-6 space-y-3">
                        <div className="flex justify-between items-center text-lg"><span className="text-muted-foreground">Total Tol:</span><span className="font-bold">Rp {formatCurrency(totalTol)}</span></div>
                        <div className="flex justify-between items-center text-lg"><span className="text-muted-foreground">Total Parkir:</span><span className="font-bold">Rp {formatCurrency(totalParkir)}</span></div>
                        <div className="flex justify-between items-center text-2xl"><span className="text-foreground">Total Biaya:</span><span className="font-bold text-cyan-600">Rp {formatCurrency(totalBiaya)}</span></div>
                        <div className="flex justify-between items-center text-lg mt-4 border-t pt-4"><span className="text-muted-foreground">Saldo Akhir Kartu:</span><span className="font-bold text-green-600">Rp {formatCurrency(saldoAkhir)}</span></div>
                      </div>
                      <div className="space-y-4">
                        <FormField control={form.control} name="kondisi" render={({ field }) => (<FormItem><FormLabel>Kondisi Armada</FormLabel><FormControl><Input placeholder="e.g., Baik, Baret di sisi kiri" {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="deskripsi" render={({ field }) => (<FormItem><FormLabel>Deskripsi Tambahan</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                      </div>
                      <div className="flex justify-end">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" onClick={() => form.trigger()} disabled={!form.formState.isValid}><CheckCircle className="w-5 h-5 mr-2" /> Konfirmasi Pengembalian</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Konfirmasi Data</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin data yang dimasukkan sudah benar?</AlertDialogDescription></AlertDialogHeader>
                            <div className="space-y-2 text-sm">
                              <p><strong>Total Biaya:</strong> Rp {formatCurrency(totalBiaya)}</p>
                              <p><strong>Saldo Akhir:</strong> Rp {formatCurrency(saldoAkhir)}</p>
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={form.handleSubmit(onSubmit)}>Ya, Simpan</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}