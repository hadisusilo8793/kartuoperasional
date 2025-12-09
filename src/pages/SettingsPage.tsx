import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Download, LogOut } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
const settingsSchema = z.object({
  max_per_hari: z.coerce.number().int().min(0, "Tidak boleh negatif"),
  min_saldo: z.string().transform(val => parseInt(val.replace(/\D/g, ''), 10)),
  max_saldo: z.string().transform(val => parseInt(val.replace(/\D/g, ''), 10)),
});
type SettingsFormValues = z.infer<typeof settingsSchema>;
const formatCurrency = (value: number | string) => {
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
};
export function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
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
      await api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      toast.success('Pengaturan berhasil disimpan.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan pengaturan.');
    }
  };
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    toast.success('Logged out successfully');
    navigate('/login');
  };
  return (
    <div className="bg-slate-50 min-h-screen">
      <Toaster richColors position="top-right" />
      <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-slate-800">Settings</h1>
            <div className="flex items-center gap-4">
              <span className="font-medium hidden sm:inline">Hadi Susilo</span>
              <img className="h-9 w-9 rounded-full" src="https://ui-avatars.com/api/?name=Hadi+Susilo&background=0B2340&color=fff" alt="Avatar" />
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout"><LogOut className="w-5 h-5 text-slate-600" /></Button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
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
      </main>
    </div>
  );
}