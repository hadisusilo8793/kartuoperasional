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
        const { search = '', id = '' } = c.req.query();
        let query = "SELECT * FROM gate";
        const bindings = [];
        const conditions = [];
        if (id) {
            conditions.push("id = ?");
            bindings.push(id);
        }
        if (search) {
            conditions.push("(nama LIKE ? OR kode LIKE ?)");
            bindings.push(`%${search}%`, `%${search}%`);
        }
        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }
        query += " ORDER BY nama ASC";
        const stmt = D1.prepare(query).bind(...bindings);
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
        const check = await D1.prepare("SELECT id FROM gate WHERE kode = ?").bind(kode.toUpperCase()).first();
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
// POST /api/gate/import
app.post('/import', async (c) => {
    const { D1 } = c.env;
    try {
        const items = await c.req.json();
        if (!Array.isArray(items) || items.length === 0) {
            return c.json({ success: false, error: 'Data import tidak valid' }, 400);
        }
        const { results: existingGates } = await D1.prepare("SELECT kode FROM gate").all();
        const existingKodes = new Set(existingGates.map(g => g.kode));
        const stmts = [];
        const errors = [];
        let successCount = 0;
        items.forEach((item, index) => {
            const kode = item.kode?.toUpperCase();
            if (!kode || !item.nama || !item.kategori) {
                errors.push(`Baris ${index + 1}: Kolom kode, nama, dan kategori wajib diisi.`);
                return;
            }
            if (existingKodes.has(kode)) {
                errors.push(`Baris ${index + 1}: Kode gate '${kode}' sudah ada.`);
                return;
            }
            stmts.push(
                D1.prepare("INSERT INTO gate (kode, nama, kategori, area, status) VALUES (?, ?, ?, ?, ?)")
                  .bind(kode, item.nama, item.kategori.toUpperCase(), item.area, (item.status || 'AKTIF').toUpperCase())
            );
            existingKodes.add(kode);
            successCount++;
        });
        if (stmts.length > 0) {
            await D1.batch(stmts);
        }
        const message = `Import selesai. Berhasil: ${successCount}. Gagal: ${errors.length}.`;
        await logAction(D1, 'INFO', message + (errors.length > 0 ? ` Errors: ${errors.join(', ')}` : ''));
        return c.json({ success: true, message, errors });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal import gate: ${e.message}`);
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
        if (!gate) {
            return c.json({ success: false, error: 'Gate tidak ditemukan' }, 404);
        }
        await D1.prepare("DELETE FROM gate WHERE id = ?").bind(id).run();
        await logAction(D1, 'INFO', `Gate ${gate.nama} (ID: ${id}) dihapus.`);
        return c.json({ success: true, message: 'Gate berhasil dihapus' });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal menghapus gate ID ${id}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
export default app;