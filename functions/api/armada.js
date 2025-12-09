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
        const { search = '', id = '' } = c.req.query();
        if (!D1) {
            // Mock fallback when D1 binding is not available (preview/preview environments)
            const mock = [{ id: 1, nomor_armada: '001', jenis: 'TRUCK', plat: 'B0001', status: 'AKTIF' }];
            let results = mock;
            if (id) {
                results = results.filter(r => String(r.id) === String(id));
            }
            if (search) {
                results = results.filter(r => r.nomor_armada.includes(search) || r.plat.includes(search));
            }
            return c.json({ success: true, data: results });
        }
        let query = "SELECT * FROM armada";
        const bindings = [];
        const conditions = [];
        if (id) {
            conditions.push("id = ?");
            bindings.push(id);
        }
        if (search) {
            conditions.push("(nomor_armada LIKE ? OR plat LIKE ?)");
            bindings.push(`%${search}%`, `%${search}%`);
        }
        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }
        query += " ORDER BY nomor_armada ASC";
        const stmt = D1.prepare(query).bind(...bindings);
        const { results } = await stmt.all();
        return c.json({ success: true, data: results });
    } catch (e) {
        return c.json({ success: false, error: e.message }, 500);
    }
});
// POST /api/armada
app.post('/', async (c) => {
    const { D1 } = c.env;
    if (!D1) {
        return c.json({ success: false, error: 'Database tidak tersedia' }, 503);
    }
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
// POST /api/armada/import
app.post('/import', async (c) => {
    const { D1 } = c.env;
    if (!D1) {
        return c.json({ success: false, error: 'Database tidak tersedia' }, 503);
    }
    try {
        const items = await c.req.json();
        if (!Array.isArray(items) || items.length === 0) {
            return c.json({ success: false, error: 'Data import tidak valid' }, 400);
        }
        const { results: existingArmada } = await D1.prepare("SELECT nomor_armada FROM armada").all();
        const existingNomor = new Set(existingArmada.map(a => a.nomor_armada));
        const stmts = [];
        const errors = [];
        let successCount = 0;
        items.forEach((item, index) => {
            const nomor = item.nomor_armada;
            if (!nomor || !item.jenis || !item.plat) {
                errors.push(`Baris ${index + 1}: Kolom nomor_armada, jenis, dan plat wajib diisi.`);
                return;
            }
            if (existingNomor.has(nomor)) {
                errors.push(`Baris ${index + 1}: Nomor armada '${nomor}' sudah ada.`);
                return;
            }
            stmts.push(
                D1.prepare("INSERT INTO armada (nomor_armada, jenis, plat, status) VALUES (?, ?, ?, ?)")
                  .bind(nomor, item.jenis.toUpperCase(), item.plat.toUpperCase(), (item.status || 'AKTIF').toUpperCase())
            );
            existingNomor.add(nomor);
            successCount++;
        });
        if (stmts.length > 0) {
            await D1.batch(stmts);
        }
        const message = `Import selesai. Berhasil: ${successCount}. Gagal: ${errors.length}.`;
        await logAction(D1, 'INFO', message + (errors.length > 0 ? ` Errors: ${errors.join(', ')}` : ''));
        return c.json({ success: true, message, errors });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal import armada: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
// PUT /api/armada/:id
app.put('/:id', async (c) => {
    const { D1 } = c.env;
    const { id } = c.req.param();
    if (!D1) {
        return c.json({ success: false, error: 'Database tidak tersedia' }, 503);
    }
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
    if (!D1) {
        return c.json({ success: false, error: 'Database tidak tersedia' }, 503);
    }
    try {
        const armada = await D1.prepare("SELECT nomor_armada FROM armada WHERE id = ?").bind(id).first();
        if (!armada) {
            return c.json({ success: false, error: 'Armada tidak ditemukan' }, 404);
        }
        await D1.prepare("DELETE FROM armada WHERE id = ?").bind(id).run();
        await logAction(D1, 'INFO', `Armada ${armada.nomor_armada} (ID: ${id}) dihapus.`);
        return c.json({ success: true, message: 'Armada berhasil dihapus' });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal menghapus armada ID ${id}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
export default app;