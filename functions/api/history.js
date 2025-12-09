import { Hono } from 'hono';
const app = new Hono();
app.get('/', async (c) => {
    const { D1 } = c.env;
    try {
        const {
            page = 1,
            limit = 10,
            kartu_search,
            driver_search,
            armada_search,
            date_from,
            date_to
        } = c.req.query();
        const offset = (page - 1) * limit;
        let baseQuery = `
            FROM transaksi t
            JOIN kartu k ON t.kartu_id = k.id
            JOIN driver d ON t.driver_id = d.id
            JOIN armada a ON t.armada_id = a.id
            WHERE t.status = 'SELESAI'
        `;
        const conditions = [];
        const bindings = [];
        if (kartu_search) {
            conditions.push("(k.nomor LIKE ? OR k.serial LIKE ?)");
            bindings.push(`%${kartu_search}%`, `%${kartu_search}%`);
        }
        if (driver_search) {
            conditions.push("(d.nama LIKE ? OR d.nik LIKE ?)");
            bindings.push(`%${driver_search}%`, `%${driver_search}%`);
        }
        if (armada_search) {
            conditions.push("(a.nomor_armada LIKE ? OR a.plat LIKE ?)");
            bindings.push(`%${armada_search}%`, `%${armada_search}%`);
        }
        if (date_from) {
            conditions.push("t.waktu_pinjam >= ?");
            bindings.push(`${date_from}T00:00:00.000Z`);
        }
        if (date_to) {
            conditions.push("t.waktu_pinjam <= ?");
            bindings.push(`${date_to}T23:59:59.999Z`);
        }
        if (conditions.length > 0) {
            baseQuery += " AND " + conditions.join(" AND ");
        }
        const dataQuery = `
            SELECT
                t.id, t.waktu_pinjam, t.waktu_kembali,
                a.nomor_armada, a.plat,
                d.nama as nama_driver, d.nik,
                k.nomor as nomor_kartu, k.serial as serial_kartu,
                t.gate_in_out, t.parkir,
                t.total_tol, t.total_parkir, t.total_biaya
            ${baseQuery}
            ORDER BY t.waktu_pinjam DESC LIMIT ? OFFSET ?
        `;
        const countQuery = `SELECT COUNT(t.id) as total ${baseQuery}`;
        const dataBindings = [...bindings, limit, offset];
        const countBindings = [...bindings];
        const [dataResult, countResult] = await D1.batch([
            D1.prepare(dataQuery).bind(...dataBindings),
            D1.prepare(countQuery).bind(...countBindings)
        ]);
        const data = dataResult.results.map(item => {
            let gate_in = null, gate_out = null;
            try {
                const gates = JSON.parse(item.gate_in_out || '[]');
                if (gates.length > 0) {
                    gate_in = gates[0]?.gate_id; // Simplified for now
                    gate_out = gates[gates.length - 1]?.gate_id;
                }
            } catch (e) {}
            return { ...item, gate_in, gate_out };
        });
        const total = countResult.results[0]?.total || 0;
        return c.json({
            success: true,
            data,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (e) {
        console.error("History Error:", e);
        return c.json({ success: false, error: e.message }, 500);
    }
});
export default app;