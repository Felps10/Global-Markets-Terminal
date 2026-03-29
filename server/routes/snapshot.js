/**
 * snapshot.js
 * Public endpoint — no authentication required.
 * Returns the latest market snapshot for the
 * landing page ticker and Terminal Mini.
 *
 * GET /api/v1/snapshot
 */

import { Router } from 'express';
import { supabase } from '../db.js';

const router = Router();

// GET /api/v1/snapshot
// Public — intentionally no authenticate middleware.
// Returns yesterday's market prices for public pages.
// Data is not sensitive — equivalent to delayed quotes.
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('market_snapshot')
      .select('snapshot_date, snapshot_label, captured_at, assets')
      .order('captured_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // No snapshot in DB yet — return 503 so frontend
      // falls back to static JSON file gracefully
      return res.status(503).json({
        error:   'SNAPSHOT_UNAVAILABLE',
        message: 'No snapshot captured yet. Run npm run snapshot.',
      });
    }

    return res.json({
      snapshot_date:  data.snapshot_date,
      snapshot_label: data.snapshot_label,
      captured_at:    data.captured_at,
      assets:         data.assets,
    });
  } catch (err) {
    return res.status(500).json({
      error:   'SERVER_ERROR',
      message: err.message,
    });
  }
});

export default router;
