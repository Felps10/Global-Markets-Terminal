import { Router } from 'express';
import { getDb } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/assets[?subgroupId=&groupId=]
router.get('/', (req, res) => {
  const db = getDb();
  const { subgroupId, groupId } = req.query;

  let query  = 'SELECT * FROM assets';
  const params = [];
  const wheres = [];

  if (subgroupId) { wheres.push('subgroup_id = ?'); params.push(subgroupId); }
  if (groupId)    { wheres.push('group_id = ?');    params.push(groupId); }
  if (wheres.length) query += ' WHERE ' + wheres.join(' AND ');
  query += ' ORDER BY symbol';

  res.json(db.prepare(query).all(...params));
});

// PATCH /api/v1/assets/:id/relocate  — move a single asset to a new subgroup
router.patch('/:id/relocate', authenticate, requireAdmin, (req, res) => {
  const { targetSubgroupId } = req.body;
  if (!targetSubgroupId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'targetSubgroupId is required' });
  }

  const db    = getDb();
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'NOT_FOUND', message: 'Asset not found' });

  const target = db.prepare('SELECT * FROM subgroups WHERE id = ?').get(targetSubgroupId);
  if (!target) return res.status(400).json({ error: 'BAD_REQUEST', message: `Subgroup "${targetSubgroupId}" not found` });

  db.prepare(`
    UPDATE assets
    SET subgroup_id = ?, group_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(targetSubgroupId, target.group_id, req.params.id);

  const updated = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// PATCH /api/v1/assets/bulk-relocate  — move multiple assets at once
router.patch('/bulk-relocate', authenticate, requireAdmin, (req, res) => {
  const { assetIds, targetSubgroupId } = req.body;
  if (!Array.isArray(assetIds) || assetIds.length === 0 || !targetSubgroupId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'assetIds (array) and targetSubgroupId are required' });
  }

  const db     = getDb();
  const target = db.prepare('SELECT * FROM subgroups WHERE id = ?').get(targetSubgroupId);
  if (!target) return res.status(400).json({ error: 'BAD_REQUEST', message: `Subgroup "${targetSubgroupId}" not found` });

  const relocate = db.prepare(`
    UPDATE assets
    SET subgroup_id = ?, group_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const relocateMany = db.transaction((ids) => {
    for (const id of ids) relocate.run(targetSubgroupId, target.group_id, id);
  });

  relocateMany(assetIds);
  res.json({ moved: assetIds.length, targetSubgroupId });
});

export default router;
