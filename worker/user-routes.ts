import { Hono } from "hono";
import type { Env } from './core-utils';
import { UserEntity, ChatBoardEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';

export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/test', (c) => c.json({ success: true, data: { name: 'CF Workers Demo' }}));

app.post('/api/auth', async (c) => {
  try {
    const body = await c.req.json();
    const username = (body?.username ?? '').toString();
    const password = (body?.password ?? '').toString();

      // Dynamically load admin credentials from functions/api/auth.js so we don't duplicate secrets.
      // No top-level import to avoid type/runtime issues.
      // @ts-expect-error - allow importing JS module without types
      const authMod = (await import('../functions/api/auth.js')) as any;
      const ADMIN_USERNAME = authMod?.ADMIN_USERNAME;
      const ADMIN_PASSWORD = authMod?.ADMIN_PASSWORD;

    const success = username === ADMIN_USERNAME && password === ADMIN_PASSWORD;

    // Attempt to log the auth attempt to D1 if available (non-fatal)
    const msg = `auth attempt ${username} ${success ? 'success' : 'failed'}`;
    try {
      const db = (c.env as any).D1 ?? (c.env as any).DB ?? null;
      if (db && typeof db.prepare === 'function') {
        await db.prepare('INSERT INTO logs (waktu, level, pesan) VALUES (?, ?, ?)').bind(new Date().toISOString(), 'info', msg).run();
      }
    } catch (e) {
      // intentionally swallow logging errors so auth still works
      console.error('Auth log failed', e);
    }

    if (!success) {
      return c.json({ success: false, message: 'Invalid credentials' }, 401);
    }

    // Dynamically import jose inside the handler (no top-level import)
    const { SignJWT } = await import('jose');
    // Prefer APP_SECRET from environment, then ADMIN_PASSWORD, then a default 32-char key.
    const rawSecret = (c.env as any)?.APP_SECRET || 'your-default-secret-key-32-chars';
    const secret = new TextEncoder().encode(String(rawSecret));

    const token = await new SignJWT({ sub: username, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(secret);

    return c.json({ success: true, token });
  } catch (err) {
    console.error('Auth error', err);
    return c.json({ success: false, message: 'Server error' }, 500);
  }
});

  // USERS
  app.get('/api/users', async (c) => {
    await UserEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await UserEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : undefined);
    return ok(c, page);
  });

  app.post('/api/users', async (c) => {
    const { name } = (await c.req.json()) as { name?: string };
    if (!name?.trim()) return bad(c, 'name required');
    return ok(c, await UserEntity.create(c.env, { id: crypto.randomUUID(), name: name.trim() }));
  });

  // CHATS
  app.get('/api/chats', async (c) => {
    await ChatBoardEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await ChatBoardEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : undefined);
    return ok(c, page);
  });

  app.post('/api/chats', async (c) => {
    const { title } = (await c.req.json()) as { title?: string };
    if (!title?.trim()) return bad(c, 'title required');
    const created = await ChatBoardEntity.create(c.env, { id: crypto.randomUUID(), title: title.trim(), messages: [] });
    return ok(c, { id: created.id, title: created.title });
  });

  // MESSAGES
  app.get('/api/chats/:chatId/messages', async (c) => {
    const chat = new ChatBoardEntity(c.env, c.req.param('chatId'));
    if (!await chat.exists()) return notFound(c, 'chat not found');
    return ok(c, await chat.listMessages());
  });

  app.post('/api/chats/:chatId/messages', async (c) => {
    const chatId = c.req.param('chatId');
    const { userId, text } = (await c.req.json()) as { userId?: string; text?: string };
    if (!isStr(userId) || !text?.trim()) return bad(c, 'userId and text required');
    const chat = new ChatBoardEntity(c.env, chatId);
    if (!await chat.exists()) return notFound(c, 'chat not found');
    return ok(c, await chat.sendMessage(userId, text.trim()));
  });

  // DELETE: Users
  app.delete('/api/users/:id', async (c) => ok(c, { id: c.req.param('id'), deleted: await UserEntity.delete(c.env, c.req.param('id')) }));

  app.post('/api/users/deleteMany', async (c) => {
    const { ids } = (await c.req.json()) as { ids?: string[] };
    const list = ids?.filter(isStr) ?? [];
    if (list.length === 0) return bad(c, 'ids required');
    return ok(c, { deletedCount: await UserEntity.deleteMany(c.env, list), ids: list });
  });

  // DELETE: Chats
  app.delete('/api/chats/:id', async (c) => ok(c, { id: c.req.param('id'), deleted: await ChatBoardEntity.delete(c.env, c.req.param('id')) }));

  app.post('/api/chats/deleteMany', async (c) => {
    const { ids } = (await c.req.json()) as { ids?: string[] };
    const list = ids?.filter(isStr) ?? [];
    if (list.length === 0) return bad(c, 'ids required');
    return ok(c, { deletedCount: await ChatBoardEntity.deleteMany(c.env, list), ids: list });
  });

  /**
   * Dynamically mount other /api/* function modules located in ../functions/api/*.js
   *
   * Rules:
   * - If module exports a default (assumed to be a Hono app), we mount it with app.route
   *   to both the base path and wildcard path so nested routes work.
   * - If module exports Cloudflare Pages Function handlers (onRequest / onRequestGet / onRequestPost / ...),
   *   we add wrapper routes that dispatch based on HTTP method.
   * - Skip mounting 'auth' because this file already implements /api/auth.
   *
   * This is intentionally best-effort and logs failures instead of throwing so the worker stays up.
   */

  async function tryMountModule(name: string) {
    if (name === 'auth') return; // skip, already handled above
    try {
      console.info(`tryMountModule: importing ${name}`);
      const mod: any = await import(`../functions/api/${name}.js`);
      console.info(`tryMountModule: imported ${name}, hasDefault=${!!mod.default}`);
      if (!mod) {
        console.warn(`Module ../functions/api/${name}.js imported but is falsy`);
        return;
      }

      // If module has a default export, assume it's a Hono app and mount it
      if (mod.default) {
        try {
          // Instead of app.route (which may not provide correct env bindings for imported Hono apps),
          // mount a forwarding handler that rewrites the incoming URL to remove the /api/{name}
          // prefix and forwards the request to the imported Hono app's fetch method. This keeps
          // correct environment binding and allows nested routes to work.
          const forwarder = async (c: any) => {
            try {
              const originalReq = (c.req && (c.req.raw || c.req.rawRequest || c.req.request)) ? (c.req.raw || c.req.rawRequest || c.req.request) : c.req;
              const origUrl = originalReq && originalReq.url ? new URL(originalReq.url) : new URL(c.req.url ?? '/');
              // remove the prefix /api/{name} from pathname
              const prefix = `/api/${name}`;
              let newPath = origUrl.pathname.replace(new RegExp('^' + prefix), '') || '/';
              const forwardedUrl = `${origUrl.origin}${newPath}${origUrl.search}`;
              // build a new Request preserving method, headers, and body (safely copy method/headers/body)
              const init: RequestInit = {
                method: (originalReq && (originalReq as Request).method) ? (originalReq as Request).method : (c.req && (c.req as any).method) ? (c.req as any).method : 'GET',
                headers: (originalReq && (originalReq as Request).headers) ? (originalReq as Request).headers : (c.req && (c.req as any).headers) ? (c.req as any).headers : undefined,
              };
              try {
                // Clone original request to safely read body without consuming it
                const cloned = typeof (originalReq as any)?.clone === 'function' ? (originalReq as Request).clone() : undefined;
                if (cloned && init.method && (String(init.method).toUpperCase() !== 'GET' && String(init.method).toUpperCase() !== 'HEAD')) {
                  // Try to extract body as ArrayBuffer (best-effort); ignore errors
                  const buf = await cloned.arrayBuffer().catch(() => null);
                  if (buf) init.body = buf;
                }
              } catch (e) {
                // ignore body extraction errors
              }
              const forwardedReq = new Request(forwardedUrl, init);
              // call the imported Hono app's fetch with the forwarded request and original env
              const res = await mod.default.fetch(forwardedReq, c.env);
              if (res instanceof Response) return res;
              // fallback to JSON if non-Response returned
              return c.json(res);
            } catch (err) {
              console.error(`Error forwarding request to Hono app ../functions/api/${name}.js:`, err);
              return c.text('Internal server error', 500);
            }
          };
          // mount forwarder to both base and wildcard path
          app.all(`/api/${name}`, forwarder);
          app.all(`/api/${name}/*`, forwarder);
          console.info(`Mounted Hono app forwarder for ../functions/api/${name}.js at /api/${name}`);
          return;
        } catch (err) {
          console.error(`Failed to mount forwarder for default Hono app ${name}:`, err);
          // continue to try function-style mounting as fallback
        }
      }

      // If module exports CF Pages style handlers, mount wrapper routes
      const methodMap: Record<string, string> = {
        GET: 'Get',
        POST: 'Post',
        PUT: 'Put',
        DELETE: 'Delete',
        PATCH: 'Patch',
        OPTIONS: 'Options'
      };

      const wrapper = async (c: any) => {
        try {
          const m = (c.req && (c.req.method || c.method)) ? (c.req.method || c.method) : (c.method || 'GET');
          const method = String(m).toUpperCase();
          const suffix = methodMap[method] ?? '';
          // prefer explicit onRequest<Method>, otherwise fall back to onRequest
          const fn = (suffix && typeof mod[`onRequest${suffix}`] === 'function') ?
            mod[`onRequest${suffix}`] :
            (typeof mod.onRequest === 'function' ? mod.onRequest : undefined);

          if (!fn) {
            // not implemented in module
            return c.text(`Not implemented in module ${name}`, 404);
          }

          // Try calling handler with Hono context first (many modules may accept it).
          // If that fails, attempt calling with a Pages-style context object.
          try {
            const res = await fn(c);
            if (res instanceof Response) return res;
            // If handler returned a plain object, respond with JSON
            if (res !== undefined) return c.json(res);
          } catch (e) {
            // fallback: build a Pages-style context and call handler
            try {
              const pagesCtx = {
                request: (c.req && (c.req.raw || c.req.rawRequest || c.req.request)) ? (c.req.raw || c.req.rawRequest || c.req.request) : c.req,
                env: c.env,
                params: c.req.param ? (c.req.param.bind(c.req)) : (c.req.params ?? {}),
                waitUntil: (p: Promise<any>) => { /* best-effort stub */ }
              };
              const res2 = await fn(pagesCtx);
              if (res2 instanceof Response) return res2;
              if (res2 !== undefined) return c.json(res2);
            } catch (e2) {
              console.error(`Error invoking handler for module ${name}:`, e2);
              return c.text(`Handler error in module ${name}`, 500);
            }
          }

          // If handler didn't return anything, reply 204
          return c.text('', 204);
        } catch (err) {
          console.error(`Wrapper error for module ${name}:`, err);
          return c.text('Internal server error', 500);
        }
      };

      // mount wrapper to both base and wildcard path
      app.all(`/api/${name}`, wrapper);
      app.all(`/api/${name}/*`, wrapper);
      console.info(`Mounted function-style handlers for ../functions/api/${name}.js at /api/${name}`);
    } catch (err) {
      console.error(`Failed to import ../functions/api/${name}.js:`, err);
    }
  }

  // Kick off mounting asynchronously (don't block route registration)
  (async () => {
    console.info('Starting to mount external API modules');
    const modules = ['dashboard', 'kartu', 'driver', 'armada', 'gate', 'transaksi', 'history', 'settings', 'logs'];
    for (const m of modules) {
      // best-effort, don't await sequentially too long; still await to preserve load order
      await tryMountModule(m);
    }
  })().catch((e) => {
    console.error('Failed mounting external API modules', e);
  });
}
