import { Hono } from 'hono';
const app = new Hono();
// GET /api/history
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
        let query = `
            SELECT 
                t.id,
                t.waktu_pinjam,
                t.waktu_kembali,
                a.nomor_armada,
                a.plat,
                d.nama as nama_driver,
                d.nik,
                k.nomor as nomor_kartu,
                k.serial as serial_kartu,
                t.gate_in_out,
                t.total_tol,
                t.total_parkir,
                t.total_biaya
            FROM transaksi t
            JOIN kartu k ON t.kartu_id = k.id
            JOIN driver d ON t.driver_id = d.id
            JOIN armada a ON t.armada_id = a.id
            WHERE t.status = 'SELESAI'
        `;
        const countQuery = `
            SELECT COUNT(t.id) as total
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
            bindings.push(date_from);
        }
        if (date_to) {
            conditions.push("t.waktu_pinjam <= ?");
            bindings.push(date_to);
        }
        if (conditions.length > 0) {
            const whereClause = " AND " + conditions.join(" AND ");
            query += whereClause;
            // countQuery += whereClause;
        }
        query += " ORDER BY t.waktu_pinjam DESC LIMIT ? OFFSET ?";
        bindings.push(limit, offset);
        const dataStmt = D1.prepare(query).bind(...bindings);
        // const countStmt = D1.prepare(countQuery).bind(...bindings.slice(0, -2)); // Exclude limit and offset
        const [{ results: data }, { results: totalResult }] = await D1.batch([
            dataStmt,
            D1.prepare(countQuery).bind(...bindings.slice(0, -2))
        ]);
        const total = totalResult[0].total;
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
        return c.json({ success: false, error: e.message }, 500);
    }
});
export default app;