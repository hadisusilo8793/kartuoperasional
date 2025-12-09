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
// GET /api/gate
app.get('/', async (c) => {
    const { D1 } = c.env;
    try {
        const { search = '' } = c.req.query();
        let stmt;
        if (search) {
            stmt = D1.prepare("SELECT * FROM gate WHERE nama LIKE ? OR kode LIKE ? ORDER BY nama ASC").bind(`%${search}%`, `%${search}%`);
        } else {
            stmt = D1.prepare("SELECT * FROM gate ORDER BY nama ASC");
        }
        const { results } = await stmt.all();
        return c.json({ success: true, data: results });
    } catch (e) {
        return c.json({ success: false, error: e.message }, 500);
    }
});
// POST /api/gate
app.post('/', async (c) => {
    const { D1 } = c.env;
    try {
        const { kode, nama, kategori, area, status } = await c.req.json();
        if (!kode || !nama || !kategori) {
            return c.json({ success: false, error: 'Kode, nama, and kategori are required' }, 400);
        }
        const check = await D1.prepare("SELECT id FROM gate WHERE kode = ?").bind(kode).first();
        if (check) {
            return c.json({ success: false, error: 'Kode gate sudah terdaftar' }, 409);
        }
        await D1.prepare("INSERT INTO gate (kode, nama, kategori, area, status) VALUES (?, ?, ?, ?, ?)")
            .bind(kode.toUpperCase(), nama, kategori.toUpperCase(), area, status ? status.toUpperCase() : 'AKTIF')
            .run();
        await logAction(D1, 'INFO', `Gate baru ditambahkan: ${nama}`);
        return c.json({ success: true, message: 'Gate berhasil ditambahkan' }, 201);
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal menambahkan gate: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
// PUT /api/gate/:id
app.put('/:id', async (c) => {
    const { D1 } = c.env;
    const { id } = c.req.param();
    try {
        const { kode, nama, kategori, area, status } = await c.req.json();
        await D1.prepare("UPDATE gate SET kode = ?, nama = ?, kategori = ?, area = ?, status = ? WHERE id = ?")
            .bind(kode.toUpperCase(), nama, kategori.toUpperCase(), area, status.toUpperCase(), id)
            .run();
        await logAction(D1, 'INFO', `Data gate ID ${id} diperbarui.`);
        return c.json({ success: true, message: 'Gate berhasil diperbarui' });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal memperbarui gate ID ${id}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
// DELETE /api/gate/:id
app.delete('/:id', async (c) => {
    const { D1 } = c.env;
    const { id } = c.req.param();
    try {
        const gate = await D1.prepare("SELECT nama FROM gate WHERE id = ?").bind(id).first();
        await D1.prepare("DELETE FROM gate WHERE id = ?").bind(id).run();
        await logAction(D1, 'INFO', `Gate ${gate.nama} (ID: ${id}) dihapus.`);
        return c.json({ success: true, message: 'Gate berhasil dihapus' });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal menghapus gate ID ${id}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
export default app;