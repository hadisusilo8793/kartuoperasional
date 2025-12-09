import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Toaster, toast } from 'sonner';
import { Loader2 } from 'lucide-react';
// This is a placeholder auth logic. In a real app, use a proper auth provider.
const auth = {
  saveToken: (token: string) => localStorage.setItem('authToken', token),
  login: async (username?: string, password?: string) => {
    // This is a mock login. In a real app, you'd call an API.
    // The backend logic is in functions/api/auth.js
    const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (data.success && data.token) {
        auth.saveToken(data.token);
    }
    return data;
  }
};
export function HomePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('HADI SUSILO');
  const [password, setPassword] = useState('Wiwokdetok8793');
  const [isLoading, setIsLoading] = useState(false);
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await auth.login(username, password);
      if (data.success) {
        toast.success('Login successful!');
        // A small delay to let the user see the success message
        setTimeout(() => {
          // In a real app, you would redirect to a dashboard page
          // For this template, we'll just log it.
          console.log('Login successful, redirecting...');
          // Since this is a vanilla JS app, we will redirect manually
          window.location.href = '/index.html';
        }, 1000);
      } else {
        toast.error(data.error || 'Invalid credentials');
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
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-navy-500/10" />
      <Card className="w-full max-w-md mx-auto shadow-2xl rounded-2xl border-border/20 animate-fade-in z-10">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold" style={{ color: '#0B2340' }}>
            Kartu Operasional
          </CardTitle>
          <CardDescription>Silakan login untuk melanjutkan</CardDescription>
        </CardHeader>
        <CardContent>
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
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold transition-all duration-300"
              disabled={isLoading}
              style={{ backgroundColor: '#0B2340', color: 'white' }}
            >
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground/80">
        <p>Built with ❤️ at Cloudflare</p>
      </footer>
    </div>
  );
}