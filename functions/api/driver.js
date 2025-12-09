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
// GET /api/driver
app.get('/', async (c) => {
    const { D1 } = c.env;
    try {
        const { search = '' } = c.req.query();
        let stmt;
        if (search) {
            stmt = D1.prepare("SELECT * FROM driver WHERE nama LIKE ? OR nik LIKE ? ORDER BY nama ASC").bind(`%${search}%`, `%${search}%`);
        } else {
            stmt = D1.prepare("SELECT * FROM driver ORDER BY nama ASC");
        }
        const { results } = await stmt.all();
        return c.json({ success: true, data: results });
    } catch (e) {
        return c.json({ success: false, error: e.message }, 500);
    }
});
// POST /api/driver
app.post('/', async (c) => {
    const { D1 } = c.env;
    try {
        const { nik, nama, status } = await c.req.json();
        if (!nik || !nama) {
            return c.json({ success: false, error: 'NIK and nama are required' }, 400);
        }
        const check = await D1.prepare("SELECT id FROM driver WHERE nik = ?").bind(nik).first();
        if (check) {
            return c.json({ success: false, error: 'NIK sudah terdaftar' }, 409);
        }
        await D1.prepare("INSERT INTO driver (nik, nama, status) VALUES (?, ?, ?)")
            .bind(nik.toUpperCase(), nama, status ? status.toUpperCase() : 'AKTIF')
            .run();
        await logAction(D1, 'INFO', `Driver baru ditambahkan: ${nama} (${nik})`);
        return c.json({ success: true, message: 'Driver berhasil ditambahkan' }, 201);
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal menambahkan driver: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
// PUT /api/driver/:id
app.put('/:id', async (c) => {
    const { D1 } = c.env;
    const { id } = c.req.param();
    try {
        const { nik, nama, status } = await c.req.json();
        await D1.prepare("UPDATE driver SET nik = ?, nama = ?, status = ? WHERE id = ?")
            .bind(nik.toUpperCase(), nama, status.toUpperCase(), id)
            .run();
        await logAction(D1, 'INFO', `Data driver ID ${id} diperbarui.`);
        return c.json({ success: true, message: 'Driver berhasil diperbarui' });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal memperbarui driver ID ${id}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
// DELETE /api/driver/:id
app.delete('/:id', async (c) => {
    const { D1 } = c.env;
    const { id } = c.req.param();
    try {
        const driver = await D1.prepare("SELECT nama FROM driver WHERE id = ?").bind(id).first();
        await D1.prepare("DELETE FROM driver WHERE id = ?").bind(id).run();
        await logAction(D1, 'INFO', `Driver ${driver.nama} (ID: ${id}) dihapus.`);
        return c.json({ success: true, message: 'Driver berhasil dihapus' });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal menghapus driver ID ${id}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
export default app;