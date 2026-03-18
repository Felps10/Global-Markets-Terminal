import { Router } from 'express';
import { supabase } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/assets[?subgroupId=&groupId=]
router.get('/', async (req, res) => {
  const { subgroupId, groupId } = req.query;

  let query = supabase.from('assets').select('*').order('symbol');

  if (subgroupId) query = query.eq('subgroup_id', subgroupId);
  if (groupId)    query = query.eq('group_id', groupId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.json(data);
});

// PATCH /api/v1/assets/:id/relocate  — move a single asset to a new subgroup
router.patch('/:id/relocate', authenticate, requireAdmin, async (req, res) => {
  const { targetSubgroupId } = req.body;
  if (!targetSubgroupId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'targetSubgroupId is required' });
  }

  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (assetError || !asset) return res.status(404).json({ error: 'NOT_FOUND', message: 'Asset not found' });

  const { data: target, error: targetError } = await supabase
    .from('subgroups')
    .select('*')
    .eq('id', targetSubgroupId)
    .single();
  if (targetError || !target) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: `Subgroup "${targetSubgroupId}" not found` });
  }

  const { data: updated, error } = await supabase
    .from('assets')
    .update({ subgroup_id: targetSubgroupId, group_id: target.group_id, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.json(updated);
});

// PATCH /api/v1/assets/bulk-relocate  — move multiple assets at once
router.patch('/bulk-relocate', authenticate, requireAdmin, async (req, res) => {
  const { assetIds, targetSubgroupId } = req.body;
  if (!Array.isArray(assetIds) || assetIds.length === 0 || !targetSubgroupId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'assetIds (array) and targetSubgroupId are required' });
  }

  const { data: target, error: targetError } = await supabase
    .from('subgroups')
    .select('*')
    .eq('id', targetSubgroupId)
    .single();
  if (targetError || !target) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: `Subgroup "${targetSubgroupId}" not found` });
  }

  const { error } = await supabase
    .from('assets')
    .update({ subgroup_id: targetSubgroupId, group_id: target.group_id, updated_at: new Date().toISOString() })
    .in('id', assetIds);
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.json({ moved: assetIds.length, targetSubgroupId });
});

export default router;
