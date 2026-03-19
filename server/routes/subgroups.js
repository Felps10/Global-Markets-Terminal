import { Router } from 'express';
import { supabase } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/subgroups[?groupId=&sectionId=]
router.get('/', async (req, res) => {
  const { groupId, sectionId } = req.query;

  let query = supabase
    .from('subgroups')
    .select('*, assets(id)')
    .order('sort_order');

  if (groupId)   query = query.eq('group_id',   groupId);
  if (sectionId) query = query.eq('section_id', sectionId);

  const { data: subgroups, error } = await query;
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  // Mimic the asset_count column the old SQL query provided
  const result = subgroups.map((s) => ({
    ...s,
    asset_count: s.assets?.length ?? 0,
    assets: undefined,
  }));
  res.json(result);
});

// GET /api/v1/subgroups/:id
router.get('/:id', async (req, res) => {
  const { data: subgroup, error } = await supabase
    .from('subgroups')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error || !subgroup) return res.status(404).json({ error: 'NOT_FOUND', message: 'Subgroup not found' });
  res.json(subgroup);
});

// POST /api/v1/subgroups
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { display_name, description, slug, group_id, icon, color, section_id, data_source, sort_order } = req.body;
  if (!display_name || !slug || !group_id) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'display_name, slug, and group_id are required' });
  }

  const { data: groupExists } = await supabase
    .from('groups')
    .select('id')
    .eq('id', group_id)
    .single();
  if (!groupExists) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: `Group "${group_id}" does not exist` });
  }

  const { data: existing } = await supabase
    .from('subgroups')
    .select('id')
    .eq('slug', slug)
    .single();
  if (existing) {
    return res.status(409).json({ error: 'SLUG_CONFLICT', message: `Slug "${slug}" is already in use` });
  }

  const { data: created, error } = await supabase
    .from('subgroups')
    .insert({
      id:          slug,
      display_name,
      description: description  || null,
      slug,
      group_id,
      icon:        icon         || null,
      color:       color        || null,
      section_id:  section_id   || null,
      data_source: data_source  || null,
      sort_order:  sort_order   ?? 0,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.status(201).json(created);
});

// PUT /api/v1/subgroups/:id
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { display_name, description, slug, group_id, icon, color, section_id, data_source, sort_order } = req.body;

  const { data: subgroup, error: fetchError } = await supabase
    .from('subgroups')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (fetchError || !subgroup) return res.status(404).json({ error: 'NOT_FOUND', message: 'Subgroup not found' });

  if (slug && slug !== subgroup.slug) {
    const { data: conflict } = await supabase
      .from('subgroups')
      .select('id')
      .eq('slug', slug)
      .neq('id', req.params.id)
      .single();
    if (conflict) {
      return res.status(409).json({ error: 'SLUG_CONFLICT', message: `Slug "${slug}" is already in use` });
    }
  }

  if (group_id) {
    const { data: groupExists } = await supabase
      .from('groups')
      .select('id')
      .eq('id', group_id)
      .single();
    if (!groupExists) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: `Group "${group_id}" does not exist` });
    }
  }

  const { data: updated, error } = await supabase
    .from('subgroups')
    .update({
      display_name: display_name || subgroup.display_name,
      description:  description  !== undefined ? description  : subgroup.description,
      slug:         slug         || subgroup.slug,
      group_id:     group_id     || subgroup.group_id,
      icon:         icon         !== undefined ? icon         : subgroup.icon,
      color:        color        !== undefined ? color        : subgroup.color,
      section_id:   section_id   !== undefined ? section_id  : subgroup.section_id,
      data_source:  data_source  !== undefined ? data_source : subgroup.data_source,
      sort_order:   sort_order   !== undefined ? sort_order  : subgroup.sort_order,
      updated_at:   new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.json(updated);
});

// DELETE /api/v1/subgroups/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const { data: subgroup, error: fetchError } = await supabase
    .from('subgroups')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (fetchError || !subgroup) return res.status(404).json({ error: 'NOT_FOUND', message: 'Subgroup not found' });

  // Safety: block deletion if subgroup contains assets
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('id, symbol, name')
    .eq('subgroup_id', req.params.id);
  if (assetsError) return res.status(500).json({ error: 'DB_ERROR', message: assetsError.message });

  if (assets.length > 0) {
    return res.status(409).json({
      error:      'SUBGROUP_HAS_ASSETS',
      message:    `This subgroup contains ${assets.length} asset(s). Relocate them before deleting.`,
      assetCount: assets.length,
      assets,
    });
  }

  const { error } = await supabase.from('subgroups').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.status(204).send();
});

export default router;
