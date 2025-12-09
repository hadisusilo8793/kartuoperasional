# Kartu Operasional

[![[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hadisusilo8793/kartuoperasional)]](https://deploy.workers.cloudflare.com/?url=${repositoryUrl})

A production-ready, lightweight web application for managing daily operations including card loans, drivers, fleets, gates, and transactions. Built with a focus on simplicity, performance, and ease of use for non-technical users. The app provides full CRUD operations for master data, transactional workflows for loans and returns, dynamic settings from the database, comprehensive logging, and a polished dashboard with visualizations.

## Description

Kartu Operasional is a Cloudflare-hosted web app designed for operational management in Indonesian (UI labels and messages in Bahasa Indonesia). It features:

- **Core Functionality**: Manage cards (kartu), drivers, fleets (armada), gates, and transactions with loan (pinjam) and return (pengembalian) flows.
- **Dashboard**: Overview metrics (active counts, daily transactions), low-balance alerts, latest logs, and a pie chart for toll vs. parking costs.
- **Security**: JWT-based admin authentication (single admin: Username "HADI SUSILO", Password "Wiwokdetok8793").
- **Database**: Cloudflare D1 for SQL storage with tables for kartu, driver, armada, gate, transaksi, pinjaman_aktif, setting, and logs.
- **UI/UX**: Desktop-first design with fixed collapsible sidebar, sticky header, rounded cards (18px), navy/cyan color scheme, skeleton loading, anti-double-click buttons, non-closable modals, and modern toasts.
- **Additional Features**: CSV import for masters, dynamic rows for returns with live calculations, searchable history with export, settings management (max_per_hari, min_saldo, max_saldo), full logging of actions, and SQL backup export via API.

The app is intentionally minimalistic—no heavy frameworks on the frontend beyond React for interactivity—ensuring fast loads and simple maintenance. Fully deployable to Cloudflare Pages for free hosting on `*.pages.dev`.

## Key Features

- **Authentication**: Secure JWT login for single admin access.
- **Master Data CRUD**: Full create/read/update/delete for cards, drivers, fleets, and gates with CSV import, duplicate validation, and constraints (e.g., no delete/edit of borrowed cards).
- **Transaction Management**:
  - Loan creation with autosuggest for driver/armada/kartu, optional initial gate, and status updates.
  - Return processing with dynamic gate/parkir rows, auto-calculations (tol, parkir, total biaya, saldo akhir), and confirmation modal.
- **History & Reporting**: Paginated transaction list with search/export, dashboard summaries, and Chart.js pie chart.
- **Settings & Logs**: Dynamic app settings from DB, searchable logs page with copy functionality, and 5 latest logs on dashboard.
- **Backup**: API endpoint (`/api/db/backup`) for full SQL database export.
- **Input Handling**: Nominal fields prevent leading zeros (except 0/empty), identity fields allow them; server-side sanitization.
- **Polish**: Skeleton loaders, responsive design (desktop-first), Inter font, and micro-interactions via Tailwind and Framer Motion.

## Technology Stack

- **Frontend**: React 18, TypeScript, Shadcn/UI components, Tailwind CSS 3, React Router 6, TanStack Query, Zustand (state management), Lucide React (icons), Framer Motion (animations), Sonner (toasts), Recharts/Chart.js (charts).
- **Backend**: Hono (routing), Cloudflare Workers/Pages Functions, JWT (via jose), Cloudflare D1 (SQLite database).
- **Build & Dev**: Vite (bundler), Bun (package manager), Wrangler (Cloudflare CLI).
- **Other**: Immer (immutable updates), Zod (validation), Date-fns (dates), UUID (IDs).

The app uses a single Durable Object for shared storage patterns, ensuring scalability without direct KV/DO access.

## Quick Start

### Prerequisites

- Bun installed (https://bun.sh/)
- Cloudflare account (free tier sufficient)
- Wrangler CLI: `bun add -g wrangler`

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd kartu-operasional
   ```

2. Install dependencies:
   ```
   bun install
   ```

3. Set up Cloudflare bindings:
   - Create a D1 database: `wrangler d1 create kartu-operasional-db`
   - Bind D1 in `wrangler.jsonc` (or via dashboard): Add `"D1_DATABASE": { "binding": "DB", "database_name": "kartu-operasional-db", "database_id": "<your-db-id>" }`
   - Set environment variable for JWT secret: `wrangler secret put APP_SECRET` (generate a strong secret, e.g., via `openssl rand -hex 32`).

4. Run database migrations (if schema not predefined):
   - Execute initial SQL schema from the blueprint (tables: kartu, driver, armada, gate, transaksi, pinjaman_aktif, setting, logs).
   - Example via Wrangler: `wrangler d1 execute kartu-operasional-db --command="-- Your SQL here"`

5. Start development server:
   ```
   bun run dev
   ```
   Access at `http://localhost:3000` (or configured port).

### Usage Examples

- **Login**: Navigate to `/login` (or dashboard redirects), use credentials: Username `HADI SUSILO`, Password `Wiwokdetok8793`.
- **Dashboard**: View metrics, logs, and pie chart (tol vs. parkir). Data fetches from `/api/dashboard`.
- **Create Loan**: Go to Transaksi Pinjam, select driver/armada/kartu via autosuggest, enter tujuan, submit—triggers `/api/transaksi/pinjam`.
- **Process Return**: In Pengembalian, select active loan, add dynamic gate/parkir rows, confirm via modal—updates via `/api/transaksi/pengembalian`.
- **Master CRUD**: Navigate to e.g., Master Kartu; use inline forms or modals for operations, import CSV via file upload.
- **Settings**: Edit max_per_hari, min_saldo, max_saldo—saved to `/api/settings`.
- **Logs & Backup**: View/search logs at Logs page; download backup via link calling `/api/db/backup`.

All actions log to the `logs` table and show toasts (success/error).

## Development Instructions

- **Local Development**:
  - Run `bun run dev` for hot-reloading frontend (Vite) and worker simulation.
  - Backend routes at `/api/*` (Hono); test with tools like Postman.
  - Use `bun run cf-typegen` to update types from Wrangler bindings.

- **Adding Routes/Entities**:
  - Extend `worker/entities.ts` for new IndexedEntity classes (e.g., for transaksi).
  - Add routes in `worker/user-routes.ts` using helpers like `ok()`, `bad()` from `core-utils.ts`.
  - Frontend: Add pages/routes in `src/main.tsx` (React Router); use `api()` from `src/lib/api-client.ts` for calls.
  - State: Use Zustand stores (primitive selectors only to avoid re-render loops).
  - UI: Leverage Shadcn components (e.g., `Button`, `Card`, `Table`); customize via Tailwind.

- **Database Operations**:
  - All queries use D1 prepared statements: `env.DB.prepare(query).bind(params).all()` or `.run()`.
  - Seed initial data (e.g., settings) via migration or API endpoint.

- **Linting & Building**:
  - Lint: `bun run lint`
  - Build: `bun run build` (generates `./dist` for Pages).
  - Preview: `bun run preview`

- **Common Patterns**:
  - Error Handling: Use `ErrorBoundary` and `RouteErrorBoundary` (pre-implemented).
  - API Responses: Always `ApiResponse<T>` with `success`, `data`, `error`.
  - Avoid: Infinite loops (no setState in render, primitive Zustand selectors), modifying `wrangler.jsonc` or core utils.

## Deployment

Deploy to Cloudflare Pages for free hosting:

1. **Prepare**:
   - Ensure `bun run build` succeeds.
   - Set secrets/env vars in Cloudflare Dashboard: `APP_SECRET` for JWT, D1 binding (`DB`).

2. **Deploy via Wrangler**:
   ```
   bun run deploy
   ```
   This builds and deploys the Worker + Pages.

3. **Via Dashboard**:
   - Connect GitHub repo to Cloudflare Pages.
   - Set build command: `bun run build`
   - Output directory: `dist`
   - Functions directory: `worker`
   - Bind D1 database and secrets in Pages > Settings > Functions.

4. **Post-Deploy**:
   - Access at `https://<project-name>.pages.dev`.
   - Run initial DB setup (migrations) via Wrangler or dashboard.
   - Test login and core flows.

For updates: Push to GitHub; auto-deploys via Pages integration.

[![[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hadisusilo8793/kartuoperasional)]](https://deploy.workers.cloudflare.com/?url=${repositoryUrl})

## Contributing

- Fork the repo and create a feature branch.
- Follow TypeScript/Tailwind conventions; no new dependencies without review.
- Test thoroughly: Local dev, API endpoints, UI responsiveness.
- Submit PR with clear description.

## License

MIT License. See [LICENSE](LICENSE) for details.

## Support

For issues, open a GitHub issue. For Cloudflare-specific help, refer to [Cloudflare Docs](https://developers.cloudflare.com/). Footer credit: © 2025 Hadi Susilo. All Rights Reserved.