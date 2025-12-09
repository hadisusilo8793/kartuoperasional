import { Hono } from 'hono';
const app = new Hono();
async function logAction(db, level, message) {
    if (!db || typeof db.prepare !== 'function') {
        console.warn('logAction skipped: D1 binding is not available.');
        return;
    }
    try {
        await db.prepare('INSERT INTO logs (waktu, level, pesan) VALUES (?, ?, ?)')
            .bind(new Date().toISOString(), level, message)
            .run();
    } catch (e) {
        console.error("Failed to write to logs:", e.message);
    }
}
const getMockData = () => ({
    stats: { kartuAktif: 5, driverAktif: 3, armadaAktif: 4, transaksiHariIni: 2 },
    logs: [
        { waktu: new Date().toISOString(), level: 'INFO', pesan: 'Mock: Transaksi pinjam baru (ID: 101).' },
        { waktu: new Date().toISOString(), level: 'INFO', pesan: 'Mock: Data kartu ID 2 diperbarui.' },
        { waktu: new Date().toISOString(), level: 'WARNING', pesan: 'Mock: Failed login attempt for user \'guest\'.' },
        { waktu: new Date().toISOString(), level: 'INFO', pesan: 'Mock: User \'HADI SUSILO\' logged in.' },
        { waktu: new Date().toISOString(), level: 'INFO', pesan: 'Mock: Application settings updated.' },
    ],
    lowBalance: [
        { nomor: '007', saldo: 25000 },
        { nomor: '008', saldo: 15000 },
    ],
    chartData: { tol: 150000, parkir: 50000 }
});
app.get('/', async (c) => {
    const { D1 } = c.env;
    if (!D1 || typeof D1.prepare !== 'function' || typeof D1.batch !== 'function') {
        await logAction(D1, 'INFO', 'Mock dashboard data served due to missing D1 binding.');
        return c.json({ success: true, data: getMockData() });
    }
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();
        const stmts = [
            D1.prepare("SELECT COUNT(id) as total FROM kartu WHERE status = 'AKTIF'"),
            D1.prepare("SELECT COUNT(id) as total FROM driver WHERE status = 'AKTIF'"),
            D1.prepare("SELECT COUNT(id) as total FROM armada WHERE status = 'AKTIF'"),
            D1.prepare("SELECT COUNT(id) as total FROM transaksi WHERE status = 'SELESAI' AND waktu_kembali >= ?").bind(todayISO),
            D1.prepare("SELECT * FROM logs ORDER BY waktu DESC LIMIT 5"),
            D1.prepare("SELECT min_saldo FROM setting WHERE id = 1"),
            D1.prepare("SELECT SUM(total_tol) as total_tol, SUM(total_parkir) as total_parkir FROM transaksi WHERE status = 'SELESAI'")
        ];
        const results = await D1.batch(stmts);
        const totalRecords = (results[0]?.results[0]?.total || 0) + (results[1]?.results[0]?.total || 0) + (results[2]?.results[0]?.total || 0);
        if (results.every(r => !r.results || r.results.length === 0) || totalRecords === 0) {
            await logAction(D1, 'INFO', 'Mock dashboard data served due to empty D1 results.');
            return c.json({ success: true, data: getMockData() });
        }
        const [
            kartuAktif,
            driverAktif,
            armadaAktif,
            transaksiHariIni,
            latestLogs,
            settings,
            chartDataAgg
        ] = results.map(r => r.results);
        const minSaldo = settings?.[0]?.min_saldo ?? 30000;
        const { results: lowBalanceCards } = await D1.prepare("SELECT nomor, saldo FROM kartu WHERE saldo < ? AND status = 'AKTIF' ORDER BY saldo ASC").bind(minSaldo).all();
        const dashboardData = {
            stats: {
                kartuAktif: kartuAktif?.[0]?.total || 0,
                driverAktif: driverAktif?.[0]?.total || 0,
                armadaAktif: armadaAktif?.[0]?.total || 0,
                transaksiHariIni: transaksiHariIni?.[0]?.total || 0,
            },
            logs: latestLogs || [],
            lowBalance: lowBalanceCards || [],
            chartData: {
                tol: chartDataAgg?.[0]?.total_tol || 0,
                parkir: chartDataAgg?.[0]?.total_parkir || 0,
            }
        };
        await logAction(D1, 'INFO', 'Dashboard data viewed.');
        return c.json({ success: true, data: dashboardData });
    } catch (e) {
        console.error("Dashboard Error:", e);
        await logAction(D1, 'ERROR', `Failed to fetch dashboard data: ${e.message}`);
        return c.json({ success: false, error: `Gagal mengambil data dashboard: ${e.message}` }, 500);
    }
});
export default app;