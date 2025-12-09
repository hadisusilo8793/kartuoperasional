import { Hono } from 'hono';
const app = new Hono();
async function logAction(db, level, message) {
    try {
        await db.prepare('INSERT INTO logs (waktu, level, pesan) VALUES (?, ?, ?)')
            .bind(new Date().toISOString(), level, message)
            .run();
    } catch (e) {
        console.error("Failed to write to logs:", e.message);
    }
}
// GET /api/transaksi/pinjaman-aktif
app.get('/pinjaman-aktif', async (c) => {
    const { D1 } = c.env;
    try {
        const { results } = await D1.prepare(`
            SELECT pa.id, pa.transaksi_id, k.nomor as nomor_kartu, d.nama as nama_driver, a.nomor_armada, a.plat, pa.tujuan, pa.waktu_pinjam
            FROM pinjaman_aktif pa
            JOIN kartu k ON pa.kartu_id = k.id
            JOIN driver d ON pa.driver_id = d.id
            JOIN armada a ON pa.armada_id = a.id
            ORDER BY pa.waktu_pinjam DESC
        `).all();
        return c.json({ success: true, data: results });
    } catch (e) {
        return c.json({ success: false, error: e.message }, 500);
    }
});
// POST /api/transaksi/pinjam
app.post('/pinjam', async (c) => {
    const { D1 } = c.env;
    try {
        const { kartu_id, driver_id, armada_id, tujuan } = await c.req.json();
        const card = await D1.prepare("SELECT saldo, status_pinjam FROM kartu WHERE id = ?").bind(kartu_id).first();
        if (!card || card.status_pinjam !== 'TERSEDIA') {
            return c.json({ success: false, error: 'Kartu tidak tersedia untuk dipinjam' }, 400);
        }
        const waktu_pinjam = new Date().toISOString();
        const trxInsert = await D1.prepare(
            "INSERT INTO transaksi (kartu_id, driver_id, armada_id, saldo_awal, tujuan, status, waktu_pinjam) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(kartu_id, driver_id, armada_id, card.saldo, tujuan, 'AKTIF', waktu_pinjam).run();
        const transaksi_id = trxInsert.meta.last_row_id;
        const pinjamanAktifInsert = D1.prepare(
            "INSERT INTO pinjaman_aktif (transaksi_id, kartu_id, driver_id, armada_id, waktu_pinjam, tujuan) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(transaksi_id, kartu_id, driver_id, armada_id, waktu_pinjam, tujuan);
        const updateKartu = D1.prepare("UPDATE kartu SET status_pinjam = 'DIPINJAM' WHERE id = ?").bind(kartu_id);
        await D1.batch([pinjamanAktifInsert, updateKartu]);
        await logAction(D1, 'INFO', `Transaksi pinjam baru (ID: ${transaksi_id}) untuk kartu ID ${kartu_id}.`);
        return c.json({ success: true, message: 'Peminjaman berhasil dicatat' }, 201);
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal mencatat peminjaman: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
// POST /api/transaksi/pengembalian/:id
app.post('/pengembalian/:id', async (c) => {
    const { D1 } = c.env;
    const { id: transaksi_id } = c.req.param();
    try {
        const { gate_in_out, parkir, kondisi, deskripsi } = await c.req.json();
        const trx = await D1.prepare("SELECT * FROM transaksi WHERE id = ?").bind(transaksi_id).first();
        if (!trx || trx.status !== 'AKTIF') {
            return c.json({ success: false, error: 'Transaksi tidak valid atau sudah selesai' }, 400);
        }
        const total_tol = gate_in_out.reduce((sum, item) => sum + (parseInt(item.biaya, 10) || 0), 0);
        const total_parkir = parkir.reduce((sum, item) => sum + (parseInt(item.biaya, 10) || 0), 0);
        const total_biaya = total_tol + total_parkir;
        const saldo_akhir = trx.saldo_awal - total_biaya;
        const waktu_kembali = new Date().toISOString();
        const updateTrx = D1.prepare(
            `UPDATE transaksi SET 
            gate_in_out = ?, parkir = ?, total_tol = ?, total_parkir = ?, total_biaya = ?, 
            kondisi = ?, deskripsi = ?, status = 'SELESAI', waktu_kembali = ? 
            WHERE id = ?`
        ).bind(JSON.stringify(gate_in_out), JSON.stringify(parkir), total_tol, total_parkir, total_biaya, kondisi, deskripsi, waktu_kembali, transaksi_id);
        const updateKartu = D1.prepare("UPDATE kartu SET saldo = ?, status_pinjam = 'TERSEDIA' WHERE id = ?").bind(saldo_akhir, trx.kartu_id);
        const deletePinjamanAktif = D1.prepare("DELETE FROM pinjaman_aktif WHERE transaksi_id = ?").bind(transaksi_id);
        await D1.batch([updateTrx, updateKartu, deletePinjamanAktif]);
        await logAction(D1, 'INFO', `Transaksi (ID: ${transaksi_id}) telah diselesaikan.`);
        return c.json({ success: true, message: 'Pengembalian berhasil dicatat' });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal mencatat pengembalian: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
export default app;