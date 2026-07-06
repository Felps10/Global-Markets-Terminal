/**
 * server/routes/config.js
 *
 * Data Source Engine — Phase B admin API. Mounted at /api/v1/config.
 * Both routes require admin: this config governs the shared, server-side quote routing.
 */

import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { loadConfig, saveConfig } from '../lib/dataSourceConfig.js';
import { invalidate as invalidateSymbols } from '../lib/symbolResolver.js';
import { PROVIDER_CAPS, RECOMMENDED_IDEAL, RECOMMENDED_EFFECTIVE } from '../lib/providerRouting.js';

const router = Router();

// GET /api/v1/config/data-sources — admin only.
// Returns the current overrides + the baked-in recommended defaults + the capability
// matrix, so the Settings UI (Phase C) can render current order, "recommended" hints,
// capability-filtering (hide impossible providers), and "reset to recommended".
router.get('/data-sources', authenticate, requireAdmin, async (_req, res) => {
  try {
    const config = await loadConfig();
    res.json({
      config,
      recommended: { ideal: RECOMMENDED_IDEAL, effective: RECOMMENDED_EFFECTIVE },
      providers: PROVIDER_CAPS,
    });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// PUT /api/v1/config/data-sources — admin only.
// Validates + saves, then busts the config + symbol-resolver caches so the new
// precedence takes effect on the next fetch cycle (not only after the 5-min TTL).
router.put('/data-sources', authenticate, requireAdmin, async (req, res) => {
  try {
    const saved = await saveConfig(req.body, req.user.id);
    invalidateSymbols();
    res.json({ config: saved });
  } catch (err) {
    // validateConfig throws plain Errors for bad input (400); DB failures are 500.
    const badInput = /must be|unknown provider|duplicate/.test(err.message);
    res
      .status(badInput ? 400 : 500)
      .json({ error: badInput ? 'BAD_REQUEST' : 'DB_ERROR', message: err.message });
  }
});

export default router;
