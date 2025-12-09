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
        const { search = '', id = '' } = c.req.query();
        let query = "SELECT * FROM driver";
        const bindings = [];
        const conditions = [];
        if (id) {
            conditions.push("id = ?");
            bindings.push(id);
        }
        if (search) {
            conditions.push("(nama LIKE ? OR nik LIKE ?)");
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
// POST /api/driver
app.post('/', async (c) => {
    const { D1 } = c.env;
    try {
        const { nik, nama, status } = await c.req.json();
        if (!nik || !nama) {
            return c.json({ success: false, error: 'NIK and nama are required' }, 400);
        }
        const check = await D1.prepare("SELECT id FROM driver WHERE nik = ?").bind(nik.toUpperCase()).first();
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
// POST /api/driver/import
app.post('/import', async (c) => {
    const { D1 } = c.env;
    try {
        const items = await c.req.json();
        if (!Array.isArray(items) || items.length === 0) {
            return c.json({ success: false, error: 'Data import tidak valid' }, 400);
        }
        const { results: existingDrivers } = await D1.prepare("SELECT nik FROM driver").all();
        const existingNiks = new Set(existingDrivers.map(d => d.nik));
        const stmts = [];
        const errors = [];
        let successCount = 0;
        items.forEach((item, index) => {
            const nik = item.nik?.toUpperCase();
            if (!nik || !item.nama) {
                errors.push(`Baris ${index + 1}: Kolom nik dan nama wajib diisi.`);
                return;
            }
            if (existingNiks.has(nik)) {
                errors.push(`Baris ${index + 1}: NIK '${nik}' sudah ada.`);
                return;
            }
            stmts.push(
                D1.prepare("INSERT INTO driver (nik, nama, status) VALUES (?, ?, ?)")
                  .bind(nik, item.nama, (item.status || 'AKTIF').toUpperCase())
            );
            existingNiks.add(nik);
            successCount++;
        });
        if (stmts.length > 0) {
            await D1.batch(stmts);
        }
        const message = `Import selesai. Berhasil: ${successCount}. Gagal: ${errors.length}.`;
        await logAction(D1, 'INFO', message + (errors.length > 0 ? ` Errors: ${errors.join(', ')}` : ''));
        return c.json({ success: true, message, errors });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal import driver: ${e.message}`);
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
        if (!driver) {
            return c.json({ success: false, error: 'Driver tidak ditemukan' }, 404);
        }
        await D1.prepare("DELETE FROM driver WHERE id = ?").bind(id).run();
        await logAction(D1, 'INFO', `Driver ${driver.nama} (ID: ${id}) dihapus.`);
        return c.json({ success: true, message: 'Driver berhasil dihapus' });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal menghapus driver ID ${id}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
export default app;