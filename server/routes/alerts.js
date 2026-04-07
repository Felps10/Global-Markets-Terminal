import { Router }       from 'express';
import { supabase }     from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/alerts
router.get('/', authenticate, async (req, res) => {
  const query = supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (req.query.active === 'true') {
    query.eq('active', true);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  res.json(data);
});

// POST /api/v1/alerts
router.post('/', authenticate, async (req, res) => {
  const { symbol, condition, threshold } = req.body;

  if (!symbol || typeof symbol !== 'string' || !symbol.trim()) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'symbol is required' });
  }
  if (!['above', 'below'].includes(condition)) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'condition must be above or below' });
  }
  if (typeof threshold !== 'number' || threshold <= 0) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'threshold must be a positive number' });
  }

  const { data, error } = await supabase
    .from('price_alerts')
    .insert({ user_id: req.user.id, symbol: symbol.trim(), condition, threshold })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  res.status(201).json(data);
});

// PATCH /api/v1/alerts/:id
router.patch('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { data: existing, error: fetchErr } = await supabase
    .from('price_alerts')
    .select('id')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (fetchErr || !existing) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Alert not found' });
  }

  const updates = {};
  if (typeof req.body.active === 'boolean') updates.active = req.body.active;
  if (req.body.triggered_at) updates.triggered_at = req.body.triggered_at;

  const { data, error } = await supabase
    .from('price_alerts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  res.json(data);
});

// DELETE /api/v1/alerts/:id
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { data: existing, error: fetchErr } = await supabase
    .from('price_alerts')
    .select('id')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (fetchErr || !existing) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Alert not found' });
  }

  const { error } = await supabase
    .from('price_alerts')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  res.status(204).send();
});

export default router;
