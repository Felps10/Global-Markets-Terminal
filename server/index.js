import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import { supabase, initSchema, seedIfEmpty } from './db.js';
import { seedClubeDemo } from './seed.js';
import authRoutes     from './routes/auth.js';
import groupRoutes    from './routes/groups.js';
import subgroupRoutes from './routes/subgroups.js';
import assetRoutes    from './routes/assets.js';
import taxonomyRoutes from './routes/taxonomy.js';
import usersRouter       from './routes/users.js';
import watchlistRoutes   from './routes/watchlist.js';
import preferencesRoutes from './routes/preferences.js';
import clubeRoutes       from './routes/clubes.js';
import yahooRoutes       from './routes/yahoo.js';

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

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
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
app.use('/api/v1/users',       usersRouter);
app.use('/api/v1/watchlist',   watchlistRoutes);
app.use('/api/v1/preferences', preferencesRoutes);
app.use('/api/yahoo',          yahooRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use('/api/v1/clubes', clubeRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function start() {
  initSchema();
  await seedIfEmpty();

  // Verify Supabase connectivity before accepting traffic
  const { error: pingError } = await supabase.from('groups').select('id').limit(1);
  if (pingError) {
    console.error('[startup] Supabase connectivity check FAILED:', pingError.message);
    console.error('[startup] Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.');
    process.exit(1);
  }
  console.log('[startup] Supabase connectivity check — OK');

  if (process.env.NODE_ENV !== 'production') {
    await seedClubeDemo();
  }

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
    console.log('│    GET    /api/v1/health                             │');
    console.log('│    GET    /api/v1/watchlist                          │');
    console.log('│    POST   /api/v1/watchlist                          │');
    console.log('│    DELETE /api/v1/watchlist/:type/:target_id         │');
    console.log('│    GET    /api/v1/preferences                        │');
    console.log('│    PUT    /api/v1/preferences                        │');
    console.log('│    GET    /api/v1/clubes                             │');
    console.log('│    POST   /api/v1/clubes                             │');
    console.log('│    GET    /api/yahoo/v7/finance/quote                │');
    console.log('│    GET    /api/yahoo/v8/finance/chart                │');
    console.log('├──────────────────────────────────────────────────────┤');
    console.log('│  Database: Supabase (hosted Postgres)                │');
    console.log(`│  CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log('└──────────────────────────────────────────────────────┘');
    console.log('');
  });

  // Graceful shutdown — Railway sends SIGTERM before stopping a deployment
  process.on('SIGTERM', () => {
    console.log('[shutdown] SIGTERM received — closing HTTP server gracefully');
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
