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
// GET /api/kartu
app.get('/', async (c) => {
    const { D1 } = c.env;
    try {
        const { search = '', status = '', status_pinjam = '', id = '' } = c.req.query();
        let query = "SELECT * FROM kartu";
        const conditions = [];
        const bindings = [];
        if (id) {
            conditions.push("id = ?");
            bindings.push(id);
        }
        if (search) {
            conditions.push("(nomor LIKE ? OR serial LIKE ?)");
            bindings.push(`%${search}%`, `%${search}%`);
        }
        if (status) {
            conditions.push("status = ?");
            bindings.push(status.toUpperCase());
        }
        if (status_pinjam) {
            conditions.push("status_pinjam = ?");
            bindings.push(status_pinjam.toUpperCase());
        }
        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }
        query += " ORDER BY nomor ASC";
        const stmt = D1.prepare(query).bind(...bindings);
        const { results } = await stmt.all();
        return c.json({ success: true, data: results });
    } catch (e) {
        return c.json({ success: false, error: e.message }, 500);
    }
});
// POST /api/kartu
app.post('/', async (c) => {
    const { D1 } = c.env;
    try {
        const { nomor, serial, jenis, saldo } = await c.req.json();
        if (!nomor || !serial || !jenis) {
            return c.json({ success: false, error: 'Nomor, serial, and jenis are required' }, 400);
        }
        const check = await D1.prepare("SELECT id FROM kartu WHERE nomor = ? OR serial = ?").bind(nomor.toUpperCase(), serial.toUpperCase()).first();
        if (check) {
            return c.json({ success: false, error: 'Nomor atau serial kartu sudah ada' }, 409);
        }
        const saldoInt = saldo ? parseInt(String(saldo).replace(/\D/g, ''), 10) : 0;
        await D1.prepare("INSERT INTO kartu (nomor, serial, jenis, saldo, status, status_pinjam) VALUES (?, ?, ?, ?, 'AKTIF', 'TERSEDIA')")
            .bind(nomor.toUpperCase(), serial.toUpperCase(), jenis.toUpperCase(), saldoInt)
            .run();
        await logAction(D1, 'INFO', `Kartu baru ditambahkan: ${nomor}`);
        return c.json({ success: true, message: 'Kartu berhasil ditambahkan' }, 201);
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal menambahkan kartu: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
// POST /api/kartu/import
app.post('/import', async (c) => {
    const { D1 } = c.env;
    try {
        const items = await c.req.json();
        if (!Array.isArray(items) || items.length === 0) {
            return c.json({ success: false, error: 'Data import tidak valid' }, 400);
        }
        const { results: existingKartu } = await D1.prepare("SELECT nomor, serial FROM kartu").all();
        const existingNomor = new Set(existingKartu.map(k => k.nomor));
        const existingSerial = new Set(existingKartu.map(k => k.serial));
        const stmts = [];
        const errors = [];
        let successCount = 0;
        items.forEach((item, index) => {
            const nomor = item.nomor?.toUpperCase();
            const serial = item.serial?.toUpperCase();
            if (!nomor || !serial || !item.jenis) {
                errors.push(`Baris ${index + 1}: Kolom nomor, serial, dan jenis wajib diisi.`);
                return;
            }
            if (existingNomor.has(nomor) || existingSerial.has(serial)) {
                errors.push(`Baris ${index + 1}: Nomor/Serial '${nomor}/${serial}' sudah ada.`);
                return;
            }
            const saldo = item.saldo ? parseInt(String(item.saldo).replace(/\D/g, ''), 10) : 0;
            stmts.push(
                D1.prepare("INSERT INTO kartu (nomor, serial, jenis, saldo) VALUES (?, ?, ?, ?)")
                  .bind(nomor, serial, item.jenis.toUpperCase(), saldo)
            );
            existingNomor.add(nomor);
            existingSerial.add(serial);
            successCount++;
        });
        if (stmts.length > 0) {
            await D1.batch(stmts);
        }
        const message = `Import selesai. Berhasil: ${successCount}. Gagal: ${errors.length}.`;
        await logAction(D1, 'INFO', message + (errors.length > 0 ? ` Errors: ${errors.join(', ')}` : ''));
        return c.json({ success: true, message, errors });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal import kartu: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
// PUT /api/kartu/:id
app.put('/:id', async (c) => {
    const { D1 } = c.env;
    const { id } = c.req.param();
    try {
        const { nomor, serial, jenis, status, saldo, status_pinjam } = await c.req.json();
        const card = await D1.prepare("SELECT status_pinjam FROM kartu WHERE id = ?").bind(id).first();
        if (!card) {
            return c.json({ success: false, error: 'Kartu tidak ditemukan' }, 404);
        }
        const saldoInt = parseInt(String(saldo).replace(/\D/g, ''), 10);
        if (card.status_pinjam === 'DIPINJAM') {
             await D1.prepare("UPDATE kartu SET saldo = ?, status = ? WHERE id = ?")
                .bind(saldoInt, status.toUpperCase(), id)
                .run();
        } else {
            await D1.prepare("UPDATE kartu SET nomor = ?, serial = ?, jenis = ?, status = ?, saldo = ?, status_pinjam = ? WHERE id = ?")
                .bind(nomor.toUpperCase(), serial.toUpperCase(), jenis.toUpperCase(), status.toUpperCase(), saldoInt, status_pinjam.toUpperCase(), id)
                .run();
        }
        await logAction(D1, 'INFO', `Data kartu ID ${id} diperbarui.`);
        return c.json({ success: true, message: 'Kartu berhasil diperbarui' });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal memperbarui kartu ID ${id}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
// DELETE /api/kartu/:id
app.delete('/:id', async (c) => {
    const { D1 } = c.env;
    const { id } = c.req.param();
    try {
        const card = await D1.prepare("SELECT status_pinjam, nomor FROM kartu WHERE id = ?").bind(id).first();
        if (!card) {
            return c.json({ success: false, error: 'Kartu tidak ditemukan' }, 404);
        }
        if (card.status_pinjam === 'DIPINJAM') {
            return c.json({ success: false, error: 'Kartu tidak dapat dihapus karena sedang dipinjam' }, 400);
        }
        await D1.prepare("DELETE FROM kartu WHERE id = ?").bind(id).run();
        await logAction(D1, 'INFO', `Kartu ${card.nomor} (ID: ${id}) dihapus.`);
        return c.json({ success: true, message: 'Kartu berhasil dihapus' });
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal menghapus kartu ID ${id}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
export default app;