import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api-client';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
type Log = {
  id: number;
  waktu: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  pesan: string;
};
const formatDate = (dateString: string) => new Date(dateString).toLocaleString('id-ID', {
  year: 'numeric', month: 'short', day: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
});
export function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api<Log[]>('/api/logs?limit=200');
      if (data && Array.isArray(data)) {
        setLogs(data);
      } else {
        setLogs([]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat log.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchLogs();
  }, []);
  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;
    return logs.filter(log =>
      (log.pesan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.level || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);
  const copyLogsToClipboard = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast.info("Tidak ada log untuk disalin.");
      return;
    }
    const logText = filteredLogs.map(log => `[${formatDate(log.waktu)}] [${log.level}] ${log.pesan}`).join('\n');
    navigator.clipboard.writeText(logText)
      .then(() => toast.success('Log disalin ke clipboard.'))
      .catch(() => toast.error('Gagal menyalin log.'));
  };
  const getLevelVariant = (level: Log['level']): "default" | "destructive" | "secondary" => {
    switch (level) {
      case 'ERROR': return 'destructive';
      case 'WARNING': return 'secondary';
      case 'INFO':
      default:
        return 'default';
    }
  };
  return (
    <AppLayout pageTitle="Logs">
      <Toaster richColors position="top-right" />
      <Card className="rounded-[18px] shadow-soft">
        <CardHeader>
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <CardTitle>Log Aktivitas Sistem</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Cari log..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64"
              />
              <Button variant="outline" onClick={copyLogsToClipboard}>
                <Copy className="w-4 h-4 mr-2" /> Salin Log
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Waktu</TableHead>
                  <TableHead className="w-[120px]">Level</TableHead>
                  <TableHead>Pesan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="h-48 text-center text-muted-foreground">Tidak ada log yang cocok.</TableCell></TableRow>
                ) : (
                  filteredLogs.map(log => (
                    <TableRow key={log.id} className="hover:bg-accent/50 transition-colors">
                      <TableCell className="whitespace-nowrap">{formatDate(log.waktu)}</TableCell>
                      <TableCell>
                        <Badge variant={getLevelVariant(log.level)}>{log.level}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.pesan}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}