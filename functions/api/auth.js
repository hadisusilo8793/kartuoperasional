import { SignJWT } from 'jose';
// In a real app, use environment variables for credentials
export const ADMIN_USERNAME = "HADI SUSILO";
export const ADMIN_PASSWORD = "Wiwokdetok8793";
async function logAction(db, level, message) {
  if (!db || typeof db.prepare !== 'function') {
    console.warn('D1 binding not found; skipping logAction.');
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
export const onRequestPost = async ({ request, env }) => {
  try {
    const { username, password } = await request.json();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const secret = new TextEncoder().encode(env.APP_SECRET || 'your-default-secret-key-32-chars');
      const alg = 'HS256';
      const token = await new SignJWT({ username: ADMIN_USERNAME, role: 'admin' })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(secret);
      await logAction(env.D1, 'INFO', `User '${ADMIN_USERNAME}' logged in successfully.`);
      return new Response(JSON.stringify({ success: true, token }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      await logAction(env.D1, 'WARNING', `Failed login attempt for username: '${username}'.`);
      return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    await logAction(env.D1, 'ERROR', `Auth error: ${error.message}`);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};