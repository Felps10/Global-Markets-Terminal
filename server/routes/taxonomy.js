import { Router } from 'express';
import { supabase } from '../db.js';

const router = Router();

// GET /api/v1/taxonomy  — full nested tree: Groups → Subgroups → Assets
router.get('/', async (req, res) => {
  // Three separate queries, same JS join logic as before
  const [groupsRes, subgroupsRes, assetsRes] = await Promise.all([
    supabase.from('groups').select('*').order('display_name'),
    supabase.from('subgroups').select('*').order('display_name'),
    supabase.from('assets').select('*').order('symbol'),
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
