import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { supabase, initSchema, seedIfEmpty } from './db.js';
import authRoutes     from './routes/auth.js';
import groupRoutes    from './routes/groups.js';
import subgroupRoutes from './routes/subgroups.js';
import assetRoutes    from './routes/assets.js';
import taxonomyRoutes from './routes/taxonomy.js';
import l1Routes       from './routes/l1.js';
import usersRouter       from './routes/users.js';
import watchlistRoutes   from './routes/watchlist.js';
import preferencesRoutes from './routes/preferences.js';
import yahooRoutes       from './routes/yahoo.js';
import snapshotRoutes    from './routes/snapshot.js';
import quotesRoutes      from './routes/quotes.js';
import ohlcvRoutes       from './routes/ohlcv.js';
import brazilMacroRoutes from './routes/brazilMacro.js';
import alertsRoutes      from './routes/alerts.js';
import configRoutes      from './routes/config.js';
import { start as startQuoteFetcher, stop as stopQuoteFetcher } from './services/quoteFetchManager.js';

const PORT = process.env.PORT || 4000;
const app  = express();

// Trust Railway's reverse proxy — required for express-rate-limit to see
// real client IPs instead of the proxy IP
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

// Vercel gives each PR/commit deploy a dynamic hashed origin that can't be
// enumerated in ALLOWED_ORIGINS (e.g.
// https://global-markets-terminal-git-<branch>-<hash>-felps10s-projects.vercel.app).
// Allow this project's own preview URLs by pattern — the project prefix and the
// `felps10s-projects` team slug are locked in, so no third-party site can match.
const VERCEL_PREVIEW_RE = /^https:\/\/global-markets-terminal-[a-z0-9-]+-felps10s-projects\.vercel\.app$/;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    if (VERCEL_PREVIEW_RE.test(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',      authRoutes);
app.use('/api/v1/groups',    groupRoutes);
app.use('/api/v1/subgroups', subgroupRoutes);
app.use('/api/v1/assets',    assetRoutes);
app.use('/api/v1/taxonomy',  taxonomyRoutes);
app.use('/api/v1/l1',        l1Routes);
app.use('/api/v1/users',       usersRouter);
app.use('/api/v1/watchlist',   watchlistRoutes);
app.use('/api/v1/preferences', preferencesRoutes);
// Internal use only — capture script (scripts/captureSnapshot.js)
// Do not add authenticate here — script has no Bearer token
// Browser clients must use /proxy/yahoo which requires auth
app.use('/api/yahoo',          yahooRoutes);

// /api/v1/snapshot — PUBLIC (no auth)
// Serves market snapshot to unauthenticated public pages.
// Data is non-sensitive delayed market prices.
app.use('/api/v1/snapshot', snapshotRoutes);

// /api/v1/quotes — PUBLIC (no auth)
// Server-side cached Yahoo + CoinGecko data. All clients read from this
// instead of each hitting external APIs independently through the proxy.
app.use('/api/v1/quotes', quotesRoutes);

// /api/v1/ohlcv — PUBLIC (no auth)
// Daily OHLCV for chart classes the browser can't fetch directly (EU/Asia indices
// via EODHD, whose key is server-only). Cached ~6h. Non-sensitive market data.
app.use('/api/v1/ohlcv', ohlcvRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use('/api/v1/brazil', brazilMacroRoutes);
app.use('/api/v1/alerts', alertsRoutes);
// Data Source Engine config (Phase B) — admin only (enforced per-route).
app.use('/api/v1/config', configRoutes);

// ── External API Proxies (production CORS bypass) ─────────────────────────────
// Public pass-through proxies — no auth required. These forward requests to
// external market data APIs. CORS policy restricts access to ALLOWED_ORIGINS.
// The external APIs themselves require their own API keys (sent by the browser).

// Yahoo Finance — crumb/cookie session logic lives in server/routes/yahoo.js
app.use('/proxy/yahoo', yahooRoutes);

// Simple pass-through proxies.
// Express strips the mount prefix from req.url before passing to the middleware,
// so no pathRewrite is needed.
app.use('/proxy/finnhub',      createProxyMiddleware({ target: 'https://finnhub.io/api/v1',                    changeOrigin: true }));
app.use('/proxy/coingecko',    createProxyMiddleware({ target: 'https://api.coingecko.com/api/v3',             changeOrigin: true }));
app.use('/proxy/fmp',          createProxyMiddleware({ target: 'https://financialmodelingprep.com/stable',     changeOrigin: true }));
app.use('/proxy/brapi',        createProxyMiddleware({ target: 'https://brapi.dev/api',                        changeOrigin: true }));
app.use('/proxy/bcb',          createProxyMiddleware({ target: 'https://api.bcb.gov.br',                       changeOrigin: true }));
app.use('/proxy/awesomeapi',   createProxyMiddleware({ target: 'https://economia.awesomeapi.com.br',           changeOrigin: true }));
app.use('/proxy/alphavantage', createProxyMiddleware({ target: 'https://www.alphavantage.co',                  changeOrigin: true }));
app.use('/proxy/fred',         createProxyMiddleware({ target: 'https://api.stlouisfed.org/fred',              changeOrigin: true }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function start() {
  initSchema();
  await seedIfEmpty();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('┌──────────────────────────────────────────────────────┐');
    console.log(`│  Markets Dashboard API  —  http://localhost:${PORT}      │`);
    console.log('├──────────────────────────────────────────────────────┤');
    console.log('│  Routes mounted:                                     │');
    console.log('│    POST   /api/v1/auth/register                      │');
    console.log('│    POST   /api/v1/auth/login                         │');
    console.log('│    POST   /api/v1/auth/logout                        │');
    console.log('│    GET    /api/v1/auth/me                            │');
    console.log('│    GET    /api/v1/groups                             │');
    console.log('│    GET    /api/v1/subgroups                          │');
    console.log('│    GET    /api/v1/assets                             │');
    console.log('│    GET    /api/v1/taxonomy                           │');
    console.log('│    GET    /api/v1/taxonomy/tree                      │');
    console.log('│    GET    /api/v1/l1                                 │');
    console.log('│    GET    /api/v1/l1/:l1Id/groups                    │');
    console.log('│    GET    /api/v1/l1/:l1Id/groups/:groupId/subgroups │');
    console.log('│    GET    /api/v1/l1/:l1Id/assets                    │');
    console.log('│    GET    /api/v1/health                             │');
    console.log('│    GET    /api/v1/watchlist                          │');
    console.log('│    POST   /api/v1/watchlist                          │');
    console.log('│    DELETE /api/v1/watchlist/:type/:target_id         │');
    console.log('│    GET    /api/v1/preferences                        │');
    console.log('│    PUT    /api/v1/preferences                        │');
    console.log('│    GET    /api/v1/quotes/live                        │');
    console.log('│    GET    /api/yahoo/v7/finance/quote                │');
    console.log('│    GET    /api/yahoo/v8/finance/chart                │');
    console.log('│    ANY    /proxy/yahoo/*  (Yahoo crumb/cookie proxy) │');
    console.log('│    ANY    /proxy/finnhub/*                           │');
    console.log('│    ANY    /proxy/coingecko/*                         │');
    console.log('│    ANY    /proxy/fmp/*                               │');
    console.log('│    ANY    /proxy/brapi/*                             │');
    console.log('│    ANY    /proxy/bcb/*                               │');
    console.log('│    ANY    /proxy/awesomeapi/*                        │');
    console.log('│    ANY    /proxy/alphavantage/*                      │');
    console.log('│    ANY    /proxy/fred/*                              │');
    console.log('├──────────────────────────────────────────────────────┤');
    console.log('│  Database: Supabase (hosted Postgres)                │');
    console.log(`│  CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log('└──────────────────────────────────────────────────────┘');
    console.log('');
  });

  // Verify Supabase connectivity after binding — so Railway healthcheck can reach /api/v1/health
  const { error: pingError } = await supabase.from('groups').select('id').limit(1);
  if (pingError) {
    console.error('[startup] Supabase connectivity check FAILED:', pingError.message);
    console.error('[startup] Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.');
    process.exit(1);
  }
  console.log('[startup] Supabase connectivity check — OK');

  // Start server-side quote fetcher — consolidates all Yahoo/CoinGecko
  // requests into one periodic fetch per interval (N users = 1 request)
  startQuoteFetcher();

  // Graceful shutdown — Railway sends SIGTERM before stopping a deployment
  process.on('SIGTERM', () => {
    console.log('[shutdown] SIGTERM received — closing HTTP server gracefully');
    stopQuoteFetcher();
    server.close(() => {
      console.log('[shutdown] HTTP server closed');
      process.exit(0);
    });
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
