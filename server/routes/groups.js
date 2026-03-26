import { Router } from 'express';
import { supabase } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/groups[?terminalView=global|brazil]
router.get('/', async (req, res) => {
  const { terminalView } = req.query;

  let query = supabase.from('groups').select('*, subgroups(id)').order('sort_order');
  if (terminalView === 'global' || terminalView === 'brazil') {
    query = query.eq('terminal_view', terminalView);
  }

  const { data: groups, error } = await query;
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  // Mimic the subgroup_count column the old SQL query provided
  const result = groups.map((g) => ({
    ...g,
    subgroup_count: g.subgroups?.length ?? 0,
    subgroups: undefined,
  }));
  res.json(result);
});

// GET /api/v1/groups/:id
router.get('/:id', async (req, res) => {
  const { data: group, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error || !group) return res.status(404).json({ error: 'NOT_FOUND', message: 'Group not found' });
  res.json(group);
});

// POST /api/v1/groups
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { display_name, description, slug, l1_id, terminal_view, block_id, sort_order, icon, color } = req.body;
  if (!display_name || !slug) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'display_name and slug are required' });
  }

  const id = slug;

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('groups')
    .select('id')
    .eq('slug', slug)
    .single();
  if (existing) {
    return res.status(409).json({ error: 'SLUG_CONFLICT', message: `Slug "${slug}" is already in use` });
  }

  const { data: created, error } = await supabase
    .from('groups')
    .insert({
      id,
      display_name,
      description:   description   || null,
      slug,
      l1_id:         l1_id         || null,
      terminal_view: terminal_view || 'global',
      block_id:      block_id      || null,
      sort_order:    sort_order    ?? 0,
      icon:          icon          || null,
      color:         color         || null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.status(201).json(created);
});

// PUT /api/v1/groups/:id
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { display_name, description, slug, l1_id, terminal_view, block_id, sort_order, icon, color } = req.body;

  const { data: group, error: fetchError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (fetchError || !group) return res.status(404).json({ error: 'NOT_FOUND', message: 'Group not found' });

  if (slug && slug !== group.slug) {
    const { data: conflict } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .neq('id', req.params.id)
      .single();
    if (conflict) {
      return res.status(409).json({ error: 'SLUG_CONFLICT', message: `Slug "${slug}" is already in use` });
    }
  }

  const { data: updated, error } = await supabase
    .from('groups')
    .update({
      display_name:  display_name  || group.display_name,
      description:   description   !== undefined ? description   : group.description,
      slug:          slug          || group.slug,
      l1_id:         l1_id         !== undefined ? l1_id         : group.l1_id,
      terminal_view: terminal_view !== undefined ? terminal_view : group.terminal_view,
      block_id:      block_id      !== undefined ? block_id      : group.block_id,
      sort_order:    sort_order    !== undefined ? sort_order    : group.sort_order,
      icon:          icon          !== undefined ? icon          : group.icon,
      color:         color         !== undefined ? color         : group.color,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.json(updated);
});

// DELETE /api/v1/groups/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const { data: group, error: fetchError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (fetchError || !group) return res.status(404).json({ error: 'NOT_FOUND', message: 'Group not found' });

  const { count: subgroupCount, error: countError } = await supabase
    .from('subgroups')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', req.params.id);
  if (countError) return res.status(500).json({ error: 'DB_ERROR', message: countError.message });

  if (subgroupCount > 0) {
    return res.status(409).json({
      error:         'GROUP_HAS_SUBGROUPS',
      message:       `This group contains ${subgroupCount} subgroup(s). Remove them before deleting.`,
      subgroupCount,
    });
  }

  const { error } = await supabase.from('groups').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.status(204).send();
});

export default router;
