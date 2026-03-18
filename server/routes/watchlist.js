import { Router }       from 'express';
import { supabase }     from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/watchlist
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('user_watchlists')
    .select('*')
    .eq('user_id', req.user.id)
    .order('pinned_at', { ascending: false });

  if (error) return res.status(500).json({
    error: 'DB_ERROR', message: error.message
  });
  res.json(data);
});

// POST /api/v1/watchlist
// Body: { type: 'asset' | 'subgroup', target_id: string }
router.post('/', authenticate, async (req, res) => {
  const { type, target_id } = req.body;

  if (!type || !target_id)
    return res.status(400).json({
      error:   'BAD_REQUEST',
      message: 'type and target_id are required'
    });

  if (!['asset', 'subgroup'].includes(type))
    return res.status(400).json({
      error:   'BAD_REQUEST',
      message: 'type must be asset or subgroup'
    });

  const { data, error } = await supabase
    .from('user_watchlists')
    .insert({ user_id: req.user.id, type, target_id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505')
      return res.status(409).json({
        error:   'ALREADY_PINNED',
        message: 'Already in watchlist'
      });
    return res.status(500).json({
      error: 'DB_ERROR', message: error.message
    });
  }
  res.status(201).json(data);
});

// DELETE /api/v1/watchlist/:type/:target_id
router.delete('/:type/:target_id', authenticate, async (req, res) => {
  const { type, target_id } = req.params;

  const { error } = await supabase
    .from('user_watchlists')
    .delete()
    .eq('user_id', req.user.id)
    .eq('type', type)
    .eq('target_id', target_id);

  if (error) return res.status(500).json({
    error: 'DB_ERROR', message: error.message
  });
  res.status(204).send();
});

export default router;
