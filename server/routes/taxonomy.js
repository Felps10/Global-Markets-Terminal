import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// GET /api/v1/taxonomy  — full nested tree: Groups → Subgroups → Assets
router.get('/', (req, res) => {
  const db = getDb();

  const groups    = db.prepare('SELECT * FROM groups    ORDER BY display_name').all();
  const subgroups = db.prepare('SELECT * FROM subgroups ORDER BY display_name').all();
  const assets    = db.prepare('SELECT * FROM assets    ORDER BY symbol').all();

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
