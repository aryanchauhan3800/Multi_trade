# Render Production Deployment Guide for Nexus Exchange Backend

This guide outlines the production adaptations implemented in the codebase and provides step-by-step instructions for hosting the backend on [Render](https://render.com).

---

## 1. What Changes Were Made to Make the Code Production-Ready

1. **Infrastructure as Code Blueprint (`render.yaml`)**:
   - Added automated Render Blueprint configuration specifying the web service, Node runtime, auto-deployments, database linkages, pre-deploy migrations, and health check routes.

2. **Server Port & Host Binding**:
   - Updated [packages/server/src/server.ts](file:///Users/aryanchauhan/Developer/XNESS/packages/server/src/server.ts) to bind explicitly to `HOST=0.0.0.0` and dynamic `PORT` (Render defaults to `10000`). This ensures the reverse proxy routes traffic properly to the container.

3. **Dynamic CORS Configuration**:
   - Added support for `CORS_ORIGIN` environment variables, handling wildcard `*` or comma-separated allowed origins (e.g., your Vercel/Render frontend domain) while safely supporting credentials and headers.

4. **Health Check Probes**:
   - Added `/api/health` and `/healthz` endpoints reporting server status, process uptime, broker connectivity, market data streaming status, and PostgreSQL database connection state for zero-downtime health probing.

5. **Graceful Shutdown**:
   - Implemented `SIGTERM` and `SIGINT` handlers that close incoming HTTP connections, disconnect all active WebSocket sessions, and cleanly terminate Prisma database pools before process termination.

6. **Prisma & Monorepo Build Scripts**:
   - Added `build:server`, `start:server`, and `db:deploy` to root [package.json](file:///Users/aryanchauhan/Developer/XNESS/package.json).
   - Moved `prisma` into production dependencies in [packages/server/package.json](file:///Users/aryanchauhan/Developer/XNESS/packages/server/package.json) so the schema engine is available during build and deployment.

7. **Docker Container Hardening**:
   - Fixed missing `tsconfig.json` references in [Dockerfile.server](file:///Users/aryanchauhan/Developer/XNESS/Dockerfile.server).
   - Added Alpine runtime libraries (`openssl`, `libc6-compat`) necessary for Prisma query engines.
   - Built a deterministic multi-stage build that generates Prisma clients prior to compilation.

8. **Frontend Integration (`config.ts`)**:
   - Created [packages/client/src/config.ts](file:///Users/aryanchauhan/Developer/XNESS/packages/client/src/config.ts) and typed environment declarations in [packages/client/src/vite-env.d.ts](file:///Users/aryanchauhan/Developer/XNESS/packages/client/src/vite-env.d.ts).
   - The frontend automatically switches to `VITE_API_URL` and `VITE_WS_URL` when configured, or auto-detects the host in production.

---

## 2. Deployment Instructions (Two Options)

### Option A: 1-Click Deployment via Render Blueprint (Recommended)

1. Push your repository to **GitHub** or **GitLab**.
2. Log into your [Render Dashboard](https://dashboard.render.com/).
3. In the top navigation, click **New +** and select **Blueprint**.
4. Connect your repository (`Multi_trade` / `XNESS`).
5. Render will automatically detect the [render.yaml](file:///Users/aryanchauhan/Developer/XNESS/render.yaml) file and display the planned resources:
   - **`nexus-exchange-backend`** (Web Service)
   - **`nexus-postgres`** (Managed PostgreSQL Database)
6. Click **Apply Blueprint**.
7. Render will provision the database, generate cryptographic keys for `JWT_SECRET` and `COOKIE_SECRET`, run `npm run db:deploy`, and start the backend service.

---

### Option B: Manual Web Service Setup via Render Dashboard

If you prefer to configure the service manually or already have a PostgreSQL database (e.g., Neon, Supabase):

1. **Create Web Service**:
   - On the Render dashboard, click **New +** -> **Web Service**.
   - Select your Git repository.

2. **Configure Service Settings**:
   - **Name**: `nexus-backend` (or your preferred name)
   - **Region**: Choose the region closest to your users (e.g., `Oregon (US West)` or `Frankfurt (EU)`)
   - **Branch**: `main` (or your working branch)
   - **Root Directory**: Leave blank (monorepo root)
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm run build:server
     ```
   - **Pre-Deploy Command** (under Advanced):
     ```bash
     npm run db:deploy
     ```
   - **Start Command**:
     ```bash
     npm run start:server
     ```

3. **Configure Environment Variables**:
   Under the **Environment** tab, add the following key-value pairs:

   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimizations |
   | `PORT` | `10000` | Port assigned by Render |
   | `HOST` | `0.0.0.0` | Binds to all network interfaces |
   | `ENVIRONMENT_MODE` | `PAPER_TRADING` | `PAPER_TRADING` or `LIVE` |
   | `CORS_ORIGIN` | `*` | Or your client URL: `https://your-frontend.onrender.com` |
   | `DATABASE_URL` | `postgresql://...` | Connection string to your PostgreSQL database |
   | `JWT_SECRET` | *(Random 32+ character string)* | Signs session JWT tokens |
   | `COOKIE_SECRET` | *(Random 32+ character string)* | Session signing secret |

   *(Optional Broker & Payment keys)*:
   - `BINANCE_API_KEY` & `BINANCE_API_SECRET`
   - `ALPACA_API_KEY` & `ALPACA_API_SECRET`
   - `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`

4. **Health Check Path**:
   - Under **Advanced Settings**, set **Health Check Path** to `/api/health`.

5. **Deploy**:
   - Click **Create Web Service**.

---

## 3. Verifying Your Deployment

Once Render finishes deploying:

1. **Verify HTTP API**:
   Open `https://<your-service-name>.onrender.com/api/health` in your browser. You should receive:
   ```json
   {
     "status": "ONLINE",
     "uptimeSeconds": 14,
     "environment": "PAPER_TRADING",
     "brokerConnected": true,
     "marketDataConnected": true,
     "databaseConnected": true,
     "timestamp": 1729500000000
   }
   ```

2. **Verify API Root**:
   Visiting `https://<your-service-name>.onrender.com/` shows system discovery info, available endpoints, and the active WebSocket gateway URL.

3. **Verify WebSocket Stream**:
   The market WebSocket gateway is active at:
   `wss://<your-service-name>.onrender.com/ws/market`

---

## 4. Connecting Your Frontend Client

When you deploy your client frontend (e.g., to Vercel, Netlify, or Render Static Site), set these environment variables:

```env
VITE_API_URL=https://<your-service-name>.onrender.com
VITE_WS_URL=wss://<your-service-name>.onrender.com/ws/market
```

The client will automatically route all authentication, order placement, margin checks, and live price streams to your Render backend.

---

## 5. Render Free-Tier Cold-Starts (~50s) & Keep-Alive Automation

### How Render Free Tier Works
Render's free tier spins down (puts to sleep) web services after **15 minutes of zero HTTP traffic**. When a user arrives, the server takes **~50 seconds** to boot up (cold start).

### How Our Codebase Solves This Problem

1. **Client-Side 50-Second Countdown & 10-Second Warmup Loop**:
   - When users open the web application, the frontend immediately probes `/api/ping`.
   - If the backend is asleep, the frontend displays an interactive **Render Cold-Start HUD**:
     - Shows an animated 50-second countdown and progress bar.
     - Pings the server **every 10 seconds** until HTTP 200 is received.
     - Automatically resumes data streams, fetches tickers, and reconnects WebSockets the instant the server wakes up.
   - Shows a live latency badge in the top navigation (`⚡ Server: 35ms` or `⏳ Waking: ~32s`).

2. **Continuous 10-Second Heartbeat While Browsing**:
   - Once online, the client continues sending a lightweight `/api/ping` request every 10 seconds.
   - This prevents Render from putting the backend to sleep as long as anyone has the platform open.

3. **Backend Server-Side Self-Ping Worker (`packages/server/src/gateway/keep-alive.ts`)**:
   - When deployed on Render, Render automatically assigns `RENDER_EXTERNAL_URL`.
   - The backend runs a background worker that pings itself every 10 minutes (`KEEP_ALIVE_INTERVAL_MINUTES=10`), keeping the container active.

4. **100% 24/7 Awake Setup with Free External Cron Monitors**:
   If you want your backend to **NEVER sleep** even when no users have the browser open:
   - Go to [Cron-Job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com) (both 100% free).
   - Create a HTTP monitor:
     - **URL**: `https://<your-service-name>.onrender.com/api/ping`
     - **Interval**: Every `10 minutes`
   - Render gives **750 free instance hours per month** (a 31-day month has 744 hours), which is enough to run one free service 24/7 without incurring charges.

