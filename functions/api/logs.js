 // GET /api/logs
export const onRequestGet = async ({ env, request }) => {
  try {
    // If D1 binding is missing (e.g., in local preview), return empty logs
    if (!env?.D1) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const { results } = await env.D1.prepare(
      "SELECT * FROM logs ORDER BY waktu DESC LIMIT ? OFFSET ?"
    ).bind(limit, offset).all();

    return new Response(JSON.stringify({ success: true, data: results }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    // Ensure server errors are logged and client receives JSON with message
    try { console.error('Error in /api/logs', e); } catch (err) {}
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};