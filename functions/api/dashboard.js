import { Hono } from 'hono';
const app = new Hono();
async function logAction(db, level, message) {
    // No-op when DB binding is missing or doesn't implement prepare
    if (!db || typeof db.prepare !== 'function') {
        // Keep silent for non-production, but emit a console.warn for visibility
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
app.get('/', async (c) => {
    const { D1 } = c.env;
    // If D1 is missing or doesn't implement required methods, return safe defaults
    if (!D1 || typeof D1.prepare !== 'function' || typeof D1.batch !== 'function') {
        await logAction(D1, 'WARN', 'Dashboard viewed without D1 binding.');
        const dashboardData = {
            stats: { kartuAktif: 0, driverAktif: 0, armadaAktif: 0, transaksiHariIni: 0 },
            logs: [],
            lowBalance: [],
            chartData: { tol: 0, parkir: 0 }
        };
        return c.json({ success: true, data: dashboardData });
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
        let results;
        try {
            results = await D1.batch(stmts);
        } catch (batchErr) {
            console.error("D1.batch failed:", batchErr);
            results = [];
        }
        const mapped = (results && results.length) ? results.map(r => r.results) : [];
        const [
            kartuAktif = [{ total: 0 }],
            driverAktif = [{ total: 0 }],
            armadaAktif = [{ total: 0 }],
            transaksiHariIni = [{ total: 0 }],
            latestLogs = [],
            settings = [{ min_saldo: 30000 }],
            chartDataAgg = [{ total_tol: 0, total_parkir: 0 }]
        ] = mapped;
        const minSaldo = (settings && settings.length > 0 && typeof settings[0].min_saldo !== 'undefined') ? settings[0].min_saldo : 30000;
        let lowBalanceCards = [];
        try {
            const lowRes = await D1.prepare("SELECT nomor, saldo FROM kartu WHERE saldo < ? AND status = 'AKTIF' ORDER BY saldo ASC").bind(minSaldo).all();
            lowBalanceCards = lowRes?.results || [];
        } catch (lowErr) {
            console.error("Fetching low balance cards failed:", lowErr);
            lowBalanceCards = [];
        }
        const dashboardData = {
            stats: {
                kartuAktif: kartuAktif[0]?.total || 0,
                driverAktif: driverAktif[0]?.total || 0,
                armadaAktif: armadaAktif[0]?.total || 0,
                transaksiHariIni: transaksiHariIni[0]?.total || 0,
            },
            logs: latestLogs || [],
            lowBalance: lowBalanceCards,
            chartData: {
                tol: chartDataAgg[0]?.total_tol || 0,
                parkir: chartDataAgg[0]?.total_parkir || 0,
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