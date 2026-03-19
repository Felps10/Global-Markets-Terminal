import { Router } from 'express';
import { supabase } from '../db.js';

const router = Router();

// GET /api/v1/taxonomy[?view=global|brazil|all]  — full nested tree: Groups → Subgroups → Assets
router.get('/', async (req, res) => {
  const { view } = req.query; // 'global', 'brazil', or omitted/'all'

  let groupsQuery   = supabase.from('groups').select('*').order('sort_order');
  let subgroupsQuery = supabase.from('subgroups').select('*').order('sort_order');
  let assetsQuery   = supabase.from('assets').select('*').order('symbol');

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
  const subgroups = subgroupsRes.data;
  const assets    = assetsRes.data;

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

export default router;
