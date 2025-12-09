import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Toaster, toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('HADI SUSILO');
  const [password, setPassword] = useState('Wiwokdetok8793');
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (localStorage.getItem('authToken')) {
      navigate('/dashboard');
    }
  }, [navigate]);
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await api<{ token: string }>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        toast.success('Login successful!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      } else {
        throw new Error('Login failed: No token received.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-gray-900 p-4">
      <Toaster richColors position="top-center" />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-[#0B2340]/10" />
      <Card className="w-full max-w-md mx-auto shadow-2xl rounded-2xl border-border/20 animate-fade-in z-10 bg-card/80 backdrop-blur-lg">
        <CardHeader className="text-center space-y-2 pt-8">
          <CardTitle className="text-3xl font-bold" style={{ color: '#0B2340' }}>
            Kartu Operasional
          </CardTitle>
          <CardDescription>Silakan login untuk melanjutkan</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 text-base"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-base"
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
              disabled={isLoading}
              style={{ backgroundColor: '#0B2340', color: 'white' }}
            >
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground/80">
        <p>&copy; 2025 Hadi Susilo. All Rights Reserved.</p>
      </footer>
    </div>
  );
}