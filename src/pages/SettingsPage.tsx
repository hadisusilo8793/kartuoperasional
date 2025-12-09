import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Download } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { AppLayout } from '@/components/layout/AppLayout';
const settingsSchema = z.object({
  max_per_hari: z.coerce.number().int().min(0, "Tidak boleh negatif"),
  min_saldo: z.string(),
  max_saldo: z.string(),
});
type SettingsFormValues = z.infer<typeof settingsSchema>;
const formatCurrency = (value: number | string) => {
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
};
export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as any,
    defaultValues: {
      max_per_hari: 0,
      min_saldo: '0',
      max_saldo: '0',
    },
  });
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const settings = await api<{ max_per_hari: number; min_saldo: number; max_saldo: number; }>('/api/settings');
        form.reset({
          max_per_hari: settings.max_per_hari,
          min_saldo: formatCurrency(settings.min_saldo),
          max_saldo: formatCurrency(settings.max_saldo),
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Gagal memuat pengaturan.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [form]);
  const onSubmit = async (data: SettingsFormValues) => {
    try {
      const payload = {
        max_per_hari: data.max_per_hari,
        min_saldo: parseInt(String(data.min_saldo).replace(/\D/g, ''), 10) || 0,
        max_saldo: parseInt(String(data.max_saldo).replace(/\D/g, ''), 10) || 0,
      };
      await api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      toast.success('Pengaturan berhasil disimpan.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan pengaturan.');
    }
  };
  return (
    <AppLayout pageTitle="Settings">
      <Toaster richColors position="top-right" />
      <div className="max-w-2xl mx-auto">
        <Card className="rounded-[18px] shadow-soft">
          <CardHeader>
            <CardTitle>Pengaturan Aplikasi</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-32 ml-auto" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="max_per_hari"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maks. Penggunaan Kartu per Hari</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormDescription>Batas berapa kali satu kartu dapat digunakan dalam sehari.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="min_saldo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimal Saldo Peringatan (Rp)</FormLabel>
                        <FormControl>
                          <Input {...field} onChange={e => field.onChange(formatCurrency(e.target.value))} />
                        </FormControl>
                        <FormDescription>Batas saldo minimum sebelum peringatan muncul di dashboard.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="max_saldo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maksimal Saldo Top-up (Rp)</FormLabel>
                        <FormControl>
                          <Input {...field} onChange={e => field.onChange(formatCurrency(e.target.value))} />
                        </FormControl>
                        <FormDescription>Batas saldo maksimal yang diizinkan saat top-up.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      <Save className="w-4 h-4 mr-2" />
                      {form.formState.isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
        <Card className="mt-8 rounded-[18px] shadow-soft">
          <CardHeader>
            <CardTitle>Backup Database</CardTitle>
            <CardDescription>Unduh salinan lengkap database dalam format SQL.</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/api/db/backup" download>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Unduh Backup
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}