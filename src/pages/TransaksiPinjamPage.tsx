import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Save } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLayout } from '@/components/layout/AppLayout';
import { Textarea } from '@/components/ui/textarea';
const pinjamSchema = z.object({
  driver_id: z.number({ required_error: "Driver harus dipilih." }),
  armada_id: z.number({ required_error: "Armada harus dipilih." }),
  kartu_id: z.number({ required_error: "Kartu harus dipilih." }),
  tujuan: z.string().min(1, "Tujuan harus diisi."),
});
type PinjamFormValues = z.infer<typeof pinjamSchema>;
type SelectOption = {
  value: number;
  label: string;
};
type Driver = { id: number; nama: string; nik: string; };
type Armada = { id: number; nomor_armada: string; plat: string; };
type Kartu = { id: number; nomor: string; };
export function TransaksiPinjamPage() {
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<SelectOption[]>([]);
  const [armadas, setArmadas] = useState<SelectOption[]>([]);
  const [kartus, setKartus] = useState<SelectOption[]>([]);
  const form = useForm<PinjamFormValues>({
    resolver: zodResolver(pinjamSchema),
  });
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [driverRes, armadaRes, kartuRes] = await Promise.all([
        api<Driver[]>('/api/driver'),
        api<Armada[]>('/api/armada'),
        api<Kartu[]>('/api/kartu?status_pinjam=TERSEDIA')
      ]);
      setDrivers(driverRes.map(d => ({ value: d.id, label: `${d.nama} - ${d.nik}` })));
      setArmadas(armadaRes.map(a => ({ value: a.id, label: `${a.nomor_armada} - ${a.plat}` })));
      setKartus(kartuRes.map(k => ({ value: k.id, label: k.nomor })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchInitialData();
  }, []);
  const onSubmit = async (data: PinjamFormValues) => {
    try {
      await api('/api/transaksi/pinjam', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      toast.success('Peminjaman berhasil dicatat.');
      form.reset();
      fetchInitialData(); // Refresh available cards
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mencatat peminjaman.');
    }
  };
  const ComboboxField = ({ name, label, options, placeholder }: { name: "driver_id" | "armada_id" | "kartu_id", label: string, options: SelectOption[], placeholder: string }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                  {field.value ? options.find(opt => opt.value === field.value)?.label : placeholder}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
              <Command>
                <CommandInput placeholder={`Cari ${label.toLowerCase()}...`} />
                <CommandList>
                  <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        value={option.label}
                        key={option.value}
                        onSelect={() => {
                          form.setValue(name, option.value);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", option.value === field.value ? "opacity-100" : "opacity-0")} />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  return (
    <AppLayout pageTitle="Transaksi Pinjam">
      <Toaster richColors position="top-right" />
      <div className="max-w-3xl mx-auto">
        <Card className="rounded-[18px] shadow-soft">
          <CardHeader>
            <CardTitle>Form Peminjaman Kartu</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-32 ml-auto" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <ComboboxField name="driver_id" label="Pilih Driver" options={drivers} placeholder="Pilih driver..." />
                  <ComboboxField name="armada_id" label="Pilih Armada" options={armadas} placeholder="Pilih armada..." />
                  <ComboboxField name="kartu_id" label="Pilih Kartu (Tersedia)" options={kartus} placeholder="Pilih kartu..." />
                  <FormField
                    control={form.control}
                    name="tujuan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tujuan</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Masukkan tujuan perjalanan..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      <Save className="w-4 h-4 mr-2" />
                      {form.formState.isSubmitting ? 'Menyimpan...' : 'Simpan Peminjaman'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}