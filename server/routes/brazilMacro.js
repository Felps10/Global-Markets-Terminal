// server/routes/brazilMacro.js
// GET /api/v1/brazil/macro — BCB SGS macro data + BRL FX rates (BRAPI primary, AwesomeAPI fallback)

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { fetchBCBMacro, fetchBRLRates } from '../services/bcbService.js';
import { getTesouroTitulos } from '../services/tesouroService.js';

const router = Router();

// GET /macro
router.get('/macro', authenticate, async (_req, res) => {
  const errors = [];

  const [bcbResult, fxResult] = await Promise.allSettled([
    fetchBCBMacro(),
    fetchBRLRates(),
  ]);

  const bcb = bcbResult.status === 'fulfilled' ? bcbResult.value : null;
  const fx  = fxResult.status === 'fulfilled'  ? fxResult.value  : null;

  if (bcbResult.status === 'rejected') errors.push(`bcb: ${bcbResult.reason?.message || 'unknown'}`);
  if (fxResult.status === 'rejected')  errors.push(`fx: ${fxResult.reason?.message || 'unknown'}`);
  if (!bcb) errors.push('bcb: no data');
  if (!fx || Object.keys(fx).length === 0) errors.push('fx: no data');

  // 500 only if both services failed entirely
  if (!bcb && (!fx || Object.keys(fx).length === 0)) {
    return res.status(500).json({
      error: 'SERVICE_UNAVAILABLE',
      message: 'Both BCB and FX services failed',
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    bcb: bcb || null,
    fx: fx && Object.keys(fx).length > 0 ? fx : null,
    timestamp: new Date().toISOString(),
    errors,
  });
});

// GET /titulos — Tesouro Direto bonds (latest snapshot; warmed in the background,
// served stale-while-revalidating, so this almost never blocks on the download).
router.get('/titulos', authenticate, async (_req, res) => {
  try {
    const data = await getTesouroTitulos();
    if (!data || !data.titulos?.length) {
      // Cold start still downloading the 14MB CSV — tell the client to retry.
      return res.status(202).json({ warming: true, titulos: [], timestamp: new Date().toISOString() });
    }
    res.json({ ...data, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(502).json({
      error: 'TESOURO_UNAVAILABLE',
      message: err?.message || 'Failed to fetch Tesouro Direto data',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
