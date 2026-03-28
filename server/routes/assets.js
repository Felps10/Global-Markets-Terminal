import { Router } from 'express';
import { supabase } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/assets[?subgroupId=&groupId=&terminal_view=]
router.get('/', authenticate, async (req, res) => {
  try {
    const { subgroupId, groupId, terminal_view } = req.query;

    let query = supabase
      .from('assets')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('symbol',     { ascending: true });

    if (subgroupId)    query = query.eq('subgroup_id',   subgroupId);
    if (groupId)       query = query.eq('group_id',      groupId);
    if (terminal_view) query = query.eq('terminal_view', terminal_view);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// POST /api/v1/assets
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { symbol, name, type, exchange, subgroup_id, currency, active, sort_order, sector, meta } = req.body;
  if (!symbol || !name || !subgroup_id) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'symbol, name, and subgroup_id are required' });
  }

  // Derive group_id and terminal_view from subgroup
  const { data: sg, error: sgError } = await supabase
    .from('subgroups')
    .select('*, groups(terminal_view)')
    .eq('id', subgroup_id)
    .single();
  if (sgError || !sg) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: `Subgroup "${subgroup_id}" does not exist` });
  }

  const group_id    = sg.group_id;
  const terminal_view = sg.groups?.terminal_view || 'global';

  // Generate a URL-safe ID from the symbol:
  //   GC=F → gc-f, ^GSPC → gspc, EURUSD=X → eurusd-x, CL=F → cl-f
  const id = symbol
    .toLowerCase()
    .replace(/\^/g, '')       // strip ^ prefix (indices)
    .replace(/=/g, '-')       // = → - (futures, forex)
    .replace(/[^a-z0-9-]/g, '') // strip anything else
    .replace(/-+/g, '-')      // collapse consecutive dashes
    .replace(/^-|-$/g, '');   // trim leading/trailing dashes

  // Check for ID collision before inserting
  const { data: existing } = await supabase
    .from('assets')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (existing) {
    return res.status(409).json({
      error:   'ID_CONFLICT',
      message: `Asset ID "${id}" already exists (generated from symbol "${symbol}").`,
    });
  }

  const { data: created, error } = await supabase
    .from('assets')
    .insert({
      id,
      symbol:        symbol.toUpperCase(),
      name,
      type:          type         || null,
      exchange:      exchange     || null,
      subgroup_id,
      group_id,
      terminal_view,
      currency:      currency     || null,
      active:        active !== undefined ? active : true,
      sort_order:    sort_order   ?? 0,
      sector:        sector       || null,
      meta:          meta         || null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.status(201).json(created);
});

// PUT /api/v1/assets/:id
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { symbol, name, type, exchange, subgroup_id, currency, active, sort_order, sector, meta } = req.body;

  const { data: asset, error: fetchError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (fetchError || !asset) return res.status(404).json({ error: 'NOT_FOUND', message: 'Asset not found' });

  // Re-derive group_id and terminal_view if subgroup_id changes
  let group_id    = asset.group_id;
  let terminal_view = asset.terminal_view;
  const newSubgroupId = subgroup_id || asset.subgroup_id;
  if (subgroup_id && subgroup_id !== asset.subgroup_id) {
    const { data: sg } = await supabase
      .from('subgroups')
      .select('*, groups(terminal_view)')
      .eq('id', subgroup_id)
      .single();
    if (sg) {
      group_id      = sg.group_id;
      terminal_view = sg.groups?.terminal_view || 'global';
    }
  }

  const { data: updated, error } = await supabase
    .from('assets')
    .update({
      symbol:        symbol        ? symbol.toUpperCase() : asset.symbol,
      name:          name          || asset.name,
      type:          type          !== undefined ? type          : asset.type,
      exchange:      exchange      !== undefined ? exchange      : asset.exchange,
      subgroup_id:   newSubgroupId,
      group_id,
      terminal_view,
      currency:      currency      !== undefined ? currency      : asset.currency,
      active:        active        !== undefined ? active        : asset.active,
      sort_order:    sort_order    !== undefined ? sort_order    : asset.sort_order,
      sector:        sector        !== undefined ? sector        : asset.sector,
      meta:          meta          !== undefined ? meta          : asset.meta,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.json(updated);
});

// DELETE /api/v1/assets/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const { data: asset, error: fetchError } = await supabase
    .from('assets')
    .select('id')
    .eq('id', req.params.id)
    .single();
  if (fetchError || !asset) return res.status(404).json({ error: 'NOT_FOUND', message: 'Asset not found' });

  const { error } = await supabase.from('assets').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.status(204).send();
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
    .select('*, groups(terminal_view)')
    .eq('id', targetSubgroupId)
    .single();
  if (targetError || !target) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: `Subgroup "${targetSubgroupId}" not found` });
  }

  const terminal_view = target.groups?.terminal_view || 'global';

  const { data: updated, error } = await supabase
    .from('assets')
    .update({
      subgroup_id:   targetSubgroupId,
      group_id:      target.group_id,
      terminal_view,
      updated_at:    new Date().toISOString(),
    })
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
    .select('*, groups(terminal_view)')
    .eq('id', targetSubgroupId)
    .single();
  if (targetError || !target) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: `Subgroup "${targetSubgroupId}" not found` });
  }

  const terminal_view = target.groups?.terminal_view || 'global';

  const { error } = await supabase
    .from('assets')
    .update({
      subgroup_id:   targetSubgroupId,
      group_id:      target.group_id,
      terminal_view,
      updated_at:    new Date().toISOString(),
    })
    .in('id', assetIds);
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.json({ moved: assetIds.length, targetSubgroupId });
});

export default router;
