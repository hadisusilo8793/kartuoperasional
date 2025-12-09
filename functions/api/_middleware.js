import { jwtVerify } from 'jose';
async function logAction(db, level, message) {
  if (!db || typeof db.prepare !== 'function') {
    console.warn("D1 binding missing, skipping log:", level, message);
    return;
  }
  try {
    await db.prepare('INSERT INTO logs (waktu, level, pesan) VALUES (?, ?, ?)')
      .bind(new Date().toISOString(), level, message)
      .run();
  } catch (e) {
    console.error("Failed to write to logs:", e.message);
  }
}
export const onRequest = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  // Allow public access to auth, assets, and root pages
  if (url.pathname === '/api/auth' || url.pathname.startsWith('/api/auth/') || url.pathname === '/api/db/backup') {
    return await next();
  }
  // If D1 binding is missing (e.g., preview environment), allow public GET requests to proceed
  // but continue to enforce auth for mutating methods (POST/PUT/DELETE).
  if (!env.D1) {
    if (request.method === 'GET') {
      console.warn(`Preview: No D1 binding detected - allowing public GET for path: ${url.pathname}`);
      return await next();
    }
    // For non-GET requests, continue to enforce auth (logAction will handle missing db)
  }
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await logAction(env.D1, 'WARNING', `Auth failed: No token. Path: ${url.pathname}`);
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Missing token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const token = authHeader.split(' ')[1];
  try {
    // Derive secret with fallback: env.APP_SECRET or default
    let secretString = env.APP_SECRET || 'your-default-secret-key-32-chars';
    const secret = new TextEncoder().encode(secretString);
    const { payload } = await jwtVerify(token, secret);
    // Attach user payload to context for use in subsequent functions
    context.data = context.data || {};
    context.data.user = payload;
    return await next();
  } catch (err) {
    await logAction(env.D1, 'ERROR', `Auth failed: Invalid token. Path: ${url.pathname}. Error: ${err.message}`);
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
};