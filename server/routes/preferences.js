import { Router }       from 'express';
import { supabase }     from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const DEFAULTS = {
  theme:           'dark',
  defaultTerminal: 'global',
  refreshInterval: 30,
  language:        'en',
  defaultExchange: 'NYSE',
};

const allowed = ['theme', 'defaultTerminal', 'refreshInterval', 'language', 'defaultExchange'];

// GET /api/v1/preferences
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('prefs')
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116')
    return res.status(500).json({
      error: 'DB_ERROR', message: error.message
    });

  const merged = { ...DEFAULTS, ...(data?.prefs || {}) };

  // Migrate old defaultView → defaultTerminal
  if (merged.defaultView && !merged.defaultTerminal) {
    merged.defaultTerminal = 'global';
  }
  delete merged.defaultView;

  res.json({ prefs: merged });
});

// PUT /api/v1/preferences
// Body: { prefs: { theme?, defaultTerminal?, refreshInterval?, language?, defaultExchange? } }
router.put('/', authenticate, async (req, res) => {
  const incoming = req.body.prefs || {};

  const filtered = Object.fromEntries(
    Object.entries(incoming).filter(([k]) => allowed.includes(k))
  );

  // Validate refreshInterval if provided
  if (filtered.refreshInterval != null) {
    const val = Number(filtered.refreshInterval);
    if (![15, 30, 60].includes(val)) {
      filtered.refreshInterval = 30;
    } else {
      filtered.refreshInterval = val;
    }
  }

  // Fetch existing to merge
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('prefs')
    .eq('user_id', req.user.id)
    .single();

  const existingPrefs = existing?.prefs || {};
  // Clean old key
  delete existingPrefs.defaultView;

  const merged = {
    ...DEFAULTS,
    ...existingPrefs,
    ...filtered
  };

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id:    req.user.id,
        prefs:      merged,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    )
    .select('prefs')
    .single();

  if (error) return res.status(500).json({
    error: 'DB_ERROR', message: error.message
  });
  res.json({ prefs: data.prefs });
});

export default router;
