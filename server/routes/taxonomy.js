import { Router } from 'express';
import { supabase } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/taxonomy[?view=global|brazil|all]  — full nested tree: Groups → Subgroups → Assets
router.get('/', authenticate, async (req, res) => {
  const { view } = req.query; // 'global', 'brazil', or omitted/'all'

  let groupsQuery   = supabase.from('groups').select('*').order('sort_order');
  let subgroupsQuery = supabase.from('subgroups').select('*').order('sort_order');
  let assetsQuery   = supabase.from('assets').select('*').eq('active', true).order('symbol');

  if (view === 'global' || view === 'brazil') {
    groupsQuery = groupsQuery.eq('terminal_view', view);
    assetsQuery = assetsQuery.eq('terminal_view', view);
  }

  const [groupsRes, subgroupsRes, assetsRes] = await Promise.all([
    groupsQuery,
    subgroupsQuery,
    assetsQuery,
  ]);

  if (groupsRes.error)    return res.status(500).json({ error: 'DB_ERROR', message: groupsRes.error.message });
  if (subgroupsRes.error) return res.status(500).json({ error: 'DB_ERROR', message: subgroupsRes.error.message });
  if (assetsRes.error)    return res.status(500).json({ error: 'DB_ERROR', message: assetsRes.error.message });

  const groups    = groupsRes.data;
  const assets    = assetsRes.data;

  // Subgroups inherit terminal_view from their parent group.
  // When a view filter is active, keep only subgroups whose group_id
  // is in the filtered groups set — avoids returning Brazil subgroups
  // on a ?view=global request (or vice-versa).
  let subgroups = subgroupsRes.data;
  if (view === 'global' || view === 'brazil') {
    const validGroupIds = new Set(groups.map((g) => g.id));
    subgroups = subgroups.filter((sg) => validGroupIds.has(sg.group_id));
  }

  // Build lookup maps
  const subgroupsByGroup = {};
  for (const sg of subgroups) {
    if (!subgroupsByGroup[sg.group_id]) subgroupsByGroup[sg.group_id] = [];
    subgroupsByGroup[sg.group_id].push({ ...sg, assets: [] });
  }

  const subgroupMap = {};
  for (const gid of Object.keys(subgroupsByGroup)) {
    for (const sg of subgroupsByGroup[gid]) subgroupMap[sg.id] = sg;
  }

  for (const asset of assets) {
    const sg = subgroupMap[asset.subgroup_id];
    if (sg) sg.assets.push(asset);
  }

  const tree = groups.map((g) => ({
    ...g,
    subgroups: subgroupsByGroup[g.id] || [],
  }));

  res.json(tree);
});

// GET /api/v1/taxonomy/tree — full 3-level nested tree: L1 → Groups → Subgroups (with asset_count)
router.get('/tree', authenticate, async (req, res) => {
  try {
    const [l1Res, groupsRes, subgroupsRes, countsRes] = await Promise.all([
      supabase.from('l1_nodes').select('*').order('sort_order'),
      supabase.from('groups').select('*').order('l1_id').order('sort_order'),
      supabase.from('subgroups').select('*').order('group_id').order('sort_order'),
      supabase.from('assets').select('subgroup_id'),
    ]);

    if (l1Res.error)       return res.status(500).json({ error: l1Res.error.message });
    if (groupsRes.error)   return res.status(500).json({ error: groupsRes.error.message });
    if (subgroupsRes.error) return res.status(500).json({ error: subgroupsRes.error.message });
    if (countsRes.error)   return res.status(500).json({ error: countsRes.error.message });

    // Build asset_count map: subgroup_id → count
    const assetCountMap = {};
    for (const { subgroup_id } of countsRes.data) {
      assetCountMap[subgroup_id] = (assetCountMap[subgroup_id] ?? 0) + 1;
    }

    // Build subgroups-by-group map
    const subgroupsByGroup = {};
    for (const sg of subgroupsRes.data) {
      if (!subgroupsByGroup[sg.group_id]) subgroupsByGroup[sg.group_id] = [];
      subgroupsByGroup[sg.group_id].push({
        id:           sg.id,
        display_name: sg.display_name,
        slug:         sg.slug,
        icon:         sg.icon,
        color:        sg.color,
        sort_order:   sg.sort_order,
        section_id:   sg.section_id,
        data_source:  sg.data_source,
        asset_count:  assetCountMap[sg.id] ?? 0,
      });
    }

    // Build groups-by-l1 map
    const groupsByL1 = {};
    for (const g of groupsRes.data) {
      if (!groupsByL1[g.l1_id]) groupsByL1[g.l1_id] = [];
      groupsByL1[g.l1_id].push({
        id:           g.id,
        display_name: g.display_name,
        slug:         g.slug,
        l1_id:        g.l1_id,
        terminal_view: g.terminal_view,
        block_id:     g.block_id,
        sort_order:   g.sort_order,
        icon:         g.icon,
        color:        g.color,
        subgroups:    subgroupsByGroup[g.id] || [],
      });
    }

    // Assemble tree
    const tree = l1Res.data.map((l1) => ({
      id:           l1.id,
      display_name: l1.display_name,
      sort_order:   l1.sort_order,
      groups:       groupsByL1[l1.id] || [],
    }));

    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
