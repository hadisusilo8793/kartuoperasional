// GET /api/logs
export const onRequestGet = async ({ env, request }) => {
  try {
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
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};