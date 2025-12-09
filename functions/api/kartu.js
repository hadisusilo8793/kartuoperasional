import { Hono } from 'hono';
const app = new Hono();

// In-memory mock store used when D1 binding is not available (preview mode).
const MOCK_KARTU = [];
let MOCK_NEXT_ID = 1;

// Simple logs fallback to avoid failing when D1 missing
async function logAction(db, level, message) {
    try {
        if (db && typeof db.prepare === 'function') {
            await db.prepare('INSERT INTO logs (waktu, level, pesan) VALUES (?, ?, ?)')
                .bind(new Date().toISOString(), level, message)
                .run();
            return;
        }
        // Fallback: print to console (preview mode)
        console.log(`[MOCK LOG] ${new Date().toISOString()} [${level}] ${message}`);
    } catch (e) {
        // Never throw from logger
        console.error("Failed to write to logs:", e?.message || e);
    }
}

// Helper to detect D1 availability
function isD1Available(db) {
    return db && typeof db.prepare === 'function';
}
 // GET /api/kartu
app.get('/', async (c) => {
    const { D1 } = c.env;
    try {
        const { search = '', status = '', status_pinjam = '', id = '' } = c.req.query();

        if (isD1Available(D1)) {
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
        } else {
            // Mock fallback
            let results = MOCK_KARTU.slice();
            if (id) {
                results = results.filter(r => String(r.id) === String(id));
            }
            if (search) {
                const s = String(search).toUpperCase();
                results = results.filter(r => (r.nomor || '').toUpperCase().includes(s) || (r.serial || '').toUpperCase().includes(s));
            }
            if (status) {
                const s = String(status).toUpperCase();
                results = results.filter(r => String(r.status).toUpperCase() === s);
            }
            if (status_pinjam) {
                const s = String(status_pinjam).toUpperCase();
                results = results.filter(r => String(r.status_pinjam).toUpperCase() === s);
            }
            results.sort((a, b) => (a.nomor || '').localeCompare(b.nomor || ''));
            return c.json({ success: true, data: results });
        }
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

        if (isD1Available(D1)) {
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
        } else {
            // Mock fallback
            const nomorU = nomor.toUpperCase();
            const serialU = serial.toUpperCase();
            const exists = MOCK_KARTU.find(k => k.nomor === nomorU || k.serial === serialU);
            if (exists) {
                return c.json({ success: false, error: 'Nomor atau serial kartu sudah ada' }, 409);
            }
            const saldoInt = saldo ? parseInt(String(saldo).replace(/\D/g, ''), 10) : 0;
            const newCard = {
                id: MOCK_NEXT_ID++,
                nomor: nomorU,
                serial: serialU,
                jenis: jenis.toUpperCase(),
                status: 'AKTIF',
                saldo: Number.isNaN(saldoInt) ? 0 : saldoInt,
                status_pinjam: 'TERSEDIA'
            };
            MOCK_KARTU.push(newCard);
            await logAction(D1, 'INFO', `Kartu baru ditambahkan: ${nomorU}`);
            return c.json({ success: true, message: 'Kartu berhasil ditambahkan' }, 201);
        }
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

        const errors = [];
        let successCount = 0;

        if (isD1Available(D1)) {
            const { results: existingKartu } = await D1.prepare("SELECT nomor, serial FROM kartu").all();
            const existingNomor = new Set(existingKartu.map(k => k.nomor));
            const existingSerial = new Set(existingKartu.map(k => k.serial));
            const stmts = [];

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
        } else {
            // Mock fallback
            const existingNomor = new Set(MOCK_KARTU.map(k => k.nomor));
            const existingSerial = new Set(MOCK_KARTU.map(k => k.serial));

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
                const newCard = {
                    id: MOCK_NEXT_ID++,
                    nomor,
                    serial,
                    jenis: item.jenis.toUpperCase(),
                    saldo: Number.isNaN(saldo) ? 0 : saldo,
                    status: 'AKTIF',
                    status_pinjam: 'TERSEDIA'
                };
                MOCK_KARTU.push(newCard);
                existingNomor.add(nomor);
                existingSerial.add(serial);
                successCount++;
            });

            const message = `Import selesai. Berhasil: ${successCount}. Gagal: ${errors.length}.`;
            await logAction(D1, 'INFO', message + (errors.length > 0 ? ` Errors: ${errors.join(', ')}` : ''));
            return c.json({ success: true, message, errors });
        }
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal import kartu: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
 // PUT /api/kartu/:id
app.put('/:id', async (c) => {
    const { D1 } = c.env;
    const id = c.req.param('id');
    try {
        const { nomor, serial, jenis, status, saldo, status_pinjam } = await c.req.json();

        if (isD1Available(D1)) {
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
        } else {
            // Mock fallback
            const idx = MOCK_KARTU.findIndex(k => String(k.id) === String(id));
            if (idx === -1) {
                return c.json({ success: false, error: 'Kartu tidak ditemukan' }, 404);
            }
            const card = MOCK_KARTU[idx];
            const saldoInt = saldo !== undefined && saldo !== null ? parseInt(String(saldo).replace(/\D/g, ''), 10) : card.saldo || 0;

            if (String(card.status_pinjam).toUpperCase() === 'DIPINJAM') {
                // Only allow updating saldo and status when DIPINJAM
                card.saldo = Number.isNaN(saldoInt) ? 0 : saldoInt;
                if (status) card.status = status.toUpperCase();
            } else {
                if (nomor) card.nomor = String(nomor).toUpperCase();
                if (serial) card.serial = String(serial).toUpperCase();
                if (jenis) card.jenis = String(jenis).toUpperCase();
                if (status) card.status = String(status).toUpperCase();
                card.saldo = Number.isNaN(saldoInt) ? 0 : saldoInt;
                if (status_pinjam) card.status_pinjam = String(status_pinjam).toUpperCase();
            }
            MOCK_KARTU[idx] = card;
            await logAction(D1, 'INFO', `Data kartu ID ${id} diperbarui.`);
            return c.json({ success: true, message: 'Kartu berhasil diperbarui' });
        }
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal memperbarui kartu ID ${id}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
 // DELETE /api/kartu/:id
app.delete('/:id', async (c) => {
    const { D1 } = c.env;
    const id = c.req.param('id');
    try {
        if (isD1Available(D1)) {
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
        } else {
            // Mock fallback
            const idx = MOCK_KARTU.findIndex(k => String(k.id) === String(id));
            if (idx === -1) {
                return c.json({ success: false, error: 'Kartu tidak ditemukan' }, 404);
            }
            const card = MOCK_KARTU[idx];
            if (String(card.status_pinjam).toUpperCase() === 'DIPINJAM') {
                return c.json({ success: false, error: 'Kartu tidak dapat dihapus karena sedang dipinjam' }, 400);
            }
            MOCK_KARTU.splice(idx, 1);
            await logAction(D1, 'INFO', `Kartu ${card.nomor} (ID: ${id}) dihapus.`);
            return c.json({ success: true, message: 'Kartu berhasil dihapus' });
        }
    } catch (e) {
        await logAction(D1, 'ERROR', `Gagal menghapus kartu ID ${id}: ${e.message}`);
        return c.json({ success: false, error: e.message }, 500);
    }
});
export default app;