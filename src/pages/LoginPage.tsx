import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Toaster, toast } from 'sonner';
/**
 * LoginPage
 *
 * - Calls POST /api/auth with { username, password }
 * - On success saves token to localStorage key 'authToken'
 * - Navigates to /dashboard
 * - Shows sonner toasts for feedback
 *
 * Exported as named component (used by router in src/main.tsx)
 */
export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>('HADI SUSILO');
  const [password, setPassword] = useState<string>('Wiwokdetok8793');
  const [loading, setLoading] = useState<boolean>(false);
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username?.trim(), password: password ?? '' }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.token) {
        const message = payload?.error || payload?.message || 'Login gagal. Periksa username/password.';
        toast.error(message);
        setLoading(false);
        return;
      }
      // Save token to localStorage (key used by api-client is 'authToken')
      try {
        localStorage.setItem('authToken', payload.token);
      } catch (err) {
        // Non-fatal: still navigate
        console.warn('Failed saving token to localStorage', err);
      }
      toast.success('Login berhasil');
      // small delay to allow toast to show nicely
      setTimeout(() => navigate('/dashboard'), 350);
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <Toaster richColors position="top-right" />
      <div className="w-full max-w-md">
        <Card className="shadow-2xl rounded-2xl border-border/10">
          <CardHeader className="text-center p-6">
            <CardTitle className="text-2xl font-bold" style={{ color: '#0B2340' }}>
              Kartu Operasional
            </CardTitle>
            <CardDescription>Silakan login untuk melanjutkan</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-2 h-11"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 h-11"
                  required
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={loading}
                  className="btn-primary inline-flex items-center"
                >
                  {loading ? 'Memproses...' : 'Login'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <footer className="mt-6 text-center text-sm text-slate-500">
          &copy; 2025 Hadi Susilo. All Rights Reserved.
        </footer>
      </div>
    </div>
  );
}