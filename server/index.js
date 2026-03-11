import express from 'express';
import cors    from 'cors';
import { initSchema } from './db.js';
import { seedIfEmpty, logTaxonomyCounts } from './seed.js';
import authRoutes     from './routes/auth.js';
import groupRoutes    from './routes/groups.js';
import subgroupRoutes from './routes/subgroups.js';
import assetRoutes    from './routes/assets.js';
import taxonomyRoutes from './routes/taxonomy.js';
import usersRouter    from './routes/users.js';

const PORT = process.env.PORT || 4000;
const app  = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',      authRoutes);
app.use('/api/v1/groups',    groupRoutes);
app.use('/api/v1/subgroups', subgroupRoutes);
app.use('/api/v1/assets',    assetRoutes);
app.use('/api/v1/taxonomy',  taxonomyRoutes);
app.use('/api/v1/users',     usersRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function start() {
  initSchema();
  await seedIfEmpty();
  logTaxonomyCounts();

  app.listen(PORT, () => {
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
    console.log('├──────────────────────────────────────────────────────┤');
    console.log('│  ⚠️  Default admin credentials are active:            │');
    console.log('│     email:    admin@terminal.local                   │');
    console.log('│     password: Admin1234!                             │');
    console.log('└──────────────────────────────────────────────────────┘');
    console.log('');
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
