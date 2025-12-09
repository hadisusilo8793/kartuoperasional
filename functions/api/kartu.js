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
        const { search = '', status = '', status_pinjam = '' } = c.req.query();
        let query = "SELECT * FROM kartu";
        const conditions = [];
        const bindings = [];
        if (search) {
            conditions.push("(nomor LIKE ? OR serial LIKE ?)");
            bindings.push(`%${search}%`, `%${search}%`);
        }
        if (status) {
            conditions.push("status = ?");
            bindings.push(status);
        }
        if (status_pinjam) {
            conditions.push("status_pinjam = ?");
            bindings.push(status_pinjam);
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
        // Check for duplicates
        const check = await D1.prepare("SELECT id FROM kartu WHERE nomor = ? OR serial = ?").bind(nomor, serial).first();
        if (check) {
            return c.json({ success: false, error: 'Nomor atau serial kartu sudah ada' }, 409);
        }
        const saldoInt = saldo ? parseInt(saldo, 10) : 0;
        await D1.prepare("INSERT INTO kartu (nomor, serial, jenis, saldo) VALUES (?, ?, ?, ?)")
            .bind(nomor.toUpperCase(), serial.toUpperCase(), jenis.toUpperCase(), saldoInt)
            .run();
        await logAction(D1, 'INFO', `Kartu baru ditambahkan: ${nomor}`);
        return c.json({ success: true, message: 'Kartu berhasil ditambahkan' }, 201);
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal menambahkan kartu: ${e.message}`);
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
        if (card.status_pinjam === 'DIPINJAM') {
             await D1.prepare("UPDATE kartu SET saldo = ?, status = ? WHERE id = ?")
                .bind(parseInt(saldo, 10), status.toUpperCase(), id)
                .run();
        } else {
            await D1.prepare("UPDATE kartu SET nomor = ?, serial = ?, jenis = ?, status = ?, saldo = ?, status_pinjam = ? WHERE id = ?")
                .bind(nomor.toUpperCase(), serial.toUpperCase(), jenis.toUpperCase(), status.toUpperCase(), parseInt(saldo, 10), status_pinjam.toUpperCase(), id)
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