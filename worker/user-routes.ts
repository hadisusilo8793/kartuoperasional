import { Hono } from "hono";
import type { Env } from './core-utils';
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/test', (c) => c.json({ success: true, data: { name: 'Kartu Operasional API' }}));
  // The auth route is now handled dynamically by the module mounter below.
  // This keeps the logic consistent with how other API endpoints are loaded.
  /**
   * Dynamically mount other /api/* function modules located in ../functions/api/*.js
   *
   * Rules:
   * - If module exports a default (assumed to be a Hono app), we mount it with app.route
   *   to both the base path and wildcard path so nested routes work.
   * - If module exports Cloudflare Pages Function handlers (onRequest / onRequestGet / onRequestPost / ...),
   *   we add wrapper routes that dispatch based on HTTP method.
   *
   * This is intentionally best-effort and logs failures instead of throwing so the worker stays up.
   */
  async function tryMountModule(name: string) {
    try {
      const mod: any = await import(`../functions/api/${name}.js`);
      if (!mod) {
        console.warn(`Module ../functions/api/${name}.js imported but is falsy`);
        return;
      }
      // If module has a default export, assume it's a Hono app and mount it
      if (mod.default) {
        try {
          app.route(`/api/${name}`, mod.default);
          console.info(`Mounted Hono app from ../functions/api/${name}.js at /api/${name}`);
          return;
        } catch (err) {
          console.error(`Failed to mount default Hono app ${name}:`, err);
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
          const m = c.req.method;
          const method = String(m).toUpperCase();
          const suffix = methodMap[method] ?? '';
          const fn = (suffix && typeof mod[`onRequest${suffix}`] === 'function') ?
            mod[`onRequest${suffix}`] :
            (typeof mod.onRequest === 'function' ? mod.onRequest : undefined);
          if (!fn) {
            return c.text(`Method ${method} not implemented in module ${name}`, 404);
          }
          const pagesCtx = {
            request: c.req.raw,
            env: c.env,
            params: c.req.param(),
            waitUntil: (p: Promise<any>) => c.executionCtx.waitUntil(p),
            next: () => Promise.resolve(new Response("Not supported in Hono wrapper", { status: 500 })),
            data: {},
          };
          const res = await fn(pagesCtx);
          if (res instanceof Response) return res;
          if (res !== undefined) return c.json(res);
          return c.text('', 204);
        } catch (err) {
          console.error(`Wrapper error for module ${name}:`, err);
          return c.text('Internal server error', 500);
        }
      };
      app.all(`/api/${name}`, wrapper);
      app.all(`/api/${name}/*`, wrapper);
      console.info(`Mounted function-style handlers for ../functions/api/${name}.js at /api/${name}`);
    } catch (err) {
      console.error(`Failed to import ../functions/api/${name}.js:`, err);
    }
  }
  (async () => {
    console.info('Mounting external API modules...');
    const modules = ['auth', 'dashboard', 'kartu', 'driver', 'armada', 'gate', 'transaksi', 'history', 'settings', 'logs', 'db-backup'];
    for (const m of modules) {
      await tryMountModule(m);
    }
    console.info('Finished mounting external API modules.');
  })().catch((e) => {
    console.error('Failed mounting external API modules', e);
  });
}