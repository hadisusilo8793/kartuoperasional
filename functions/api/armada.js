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
// GET /api/armada
app.get('/', async (c) => {
    const { D1 } = c.env;
    try {
        const { search = '' } = c.req.query();
        let stmt;
        if (search) {
            stmt = D1.prepare("SELECT * FROM armada WHERE nomor_armada LIKE ? OR plat LIKE ? ORDER BY nomor_armada ASC").bind(`%${search}%`, `%${search}%`);
        } else {
            stmt = D1.prepare("SELECT * FROM armada ORDER BY nomor_armada ASC");
        }
        const { results } = await stmt.all();
        return c.json({ success: true, data: results });
    } catch (e) {
        return c.json({ success: false, error: e.message }, 500);
    }
});
// POST /api/armada
app.post('/', async (c) => {
    const { D1 } = c.env;
    try {
        const { nomor_armada, jenis, plat, status } = await c.req.json();
        if (!nomor_armada || !jenis || !plat) {
            return c.json({ success: false, error: 'Nomor armada, jenis, and plat are required' }, 400);
        }
        const check = await D1.prepare("SELECT id FROM armada WHERE nomor_armada = ?").bind(nomor_armada).first();
        if (check) {
            return c.json({ success: false, error: 'Nomor armada sudah terdaftar' }, 409);
        }
        await D1.prepare("INSERT INTO armada (nomor_armada, jenis, plat, status) VALUES (?, ?, ?, ?)")
            .bind(nomor_armada, jenis.toUpperCase(), plat.toUpperCase(), status ? status.toUpperCase() : 'AKTIF')
            .run();
        await logAction(D1, 'INFO', `Armada baru ditambahkan: ${nomor_armada}`);
        return c.json({ success: true, message: 'Armada berhasil ditambahkan' }, 201);
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal menambahkan armada: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
// PUT /api/armada/:id
app.put('/:id', async (c) => {
    const { D1 } = c.env;
    const { id } = c.req.param();
    try {
        const { nomor_armada, jenis, plat, status } = await c.req.json();
        await D1.prepare("UPDATE armada SET nomor_armada = ?, jenis = ?, plat = ?, status = ? WHERE id = ?")
            .bind(nomor_armada, jenis.toUpperCase(), plat.toUpperCase(), status.toUpperCase(), id)
            .run();
        await logAction(D1, 'INFO', `Data armada ID ${id} diperbarui.`);
        return c.json({ success: true, message: 'Armada berhasil diperbarui' });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal memperbarui armada ID ${id}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
// DELETE /api/armada/:id
app.delete('/:id', async (c) => {
    const { D1 } = c.env;
    const { id } = c.req.param();
    try {
        const armada = await D1.prepare("SELECT nomor_armada FROM armada WHERE id = ?").bind(id).first();
        await D1.prepare("DELETE FROM armada WHERE id = ?").bind(id).run();
        await logAction(D1, 'INFO', `Armada ${armada.nomor_armada} (ID: ${id}) dihapus.`);
        return c.json({ success: true, message: 'Armada berhasil dihapus' });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal menghapus armada ID ${id}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
export default app;