async function logAction(db, level, message) {
  try {
    await db.prepare('INSERT INTO logs (waktu, level, pesan) VALUES (?, ?, ?)')
      .bind(new Date().toISOString(), level, message)
      .run();
  } catch (e) {
    console.error("Failed to write to logs:", e.message);
  }
}
// GET /api/settings
export const onRequestGet = async ({ env }) => {
  try {
    if (!env.D1) {
      const fallback = { id: 1, max_per_hari: 0, min_saldo: 30000, max_saldo: 0 };
      return new Response(JSON.stringify({ success: true, data: fallback }));
    }
    const { results } = await env.D1.prepare("SELECT * FROM setting WHERE id = 1").all();
    if (!results || results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Settings not found' }), { status: 404 });
    }
    return new Response(JSON.stringify({ success: true, data: results[0] }));
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};
// PUT /api/settings
export const onRequestPut = async ({ request, env }) => {
  try {
    const settings = await request.json();
    const { max_per_hari, min_saldo, max_saldo } = settings;
    if (max_per_hari == null || min_saldo == null || max_saldo == null) {
        return new Response(JSON.stringify({ success: false, error: 'Missing required settings fields' }), { status: 400 });
    }
    if (!env.D1) {
      // D1 missing — return success for UI preview and do not attempt DB or logging
      console.warn('D1 binding missing. Returning provided settings without persisting.');
      return new Response(JSON.stringify({ success: true, data: settings }));
    }
    await env.D1.prepare(
      "UPDATE setting SET max_per_hari = ?, min_saldo = ?, max_saldo = ? WHERE id = 1"
    ).bind(max_per_hari, min_saldo, max_saldo).run();
    await logAction(env.D1, 'INFO', 'Application settings updated.');
    return new Response(JSON.stringify({ success: true, data: settings }));
  } catch (e) {
    if (env.D1) {
      await logAction(env.D1, 'ERROR', `Failed to update settings: ${e.message}`);
    } else {
      console.error('Failed to update settings (no D1):', e.message);
    }
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};