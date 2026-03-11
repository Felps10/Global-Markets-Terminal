import { Router } from 'express';
import { getDb } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/subgroups[?groupId=]
router.get('/', (req, res) => {
  const db        = getDb();
  const { groupId } = req.query;

  let query = `
    SELECT s.*,
           COUNT(a.id) AS asset_count
    FROM   subgroups s
    LEFT   JOIN assets a ON a.subgroup_id = s.id
  `;
  const params = [];
  if (groupId) {
    query += ' WHERE s.group_id = ?';
    params.push(groupId);
  }
  query += ' GROUP BY s.id ORDER BY s.display_name';

  res.json(db.prepare(query).all(...params));
});

// GET /api/v1/subgroups/:id
router.get('/:id', (req, res) => {
  const db       = getDb();
  const subgroup = db.prepare('SELECT * FROM subgroups WHERE id = ?').get(req.params.id);
  if (!subgroup) return res.status(404).json({ error: 'NOT_FOUND', message: 'Subgroup not found' });
  res.json(subgroup);
});

// POST /api/v1/subgroups
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { display_name, description, slug, group_id, icon, color } = req.body;
  if (!display_name || !slug || !group_id) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'display_name, slug, and group_id are required' });
  }

  const db = getDb();

  const groupExists = db.prepare('SELECT id FROM groups WHERE id = ?').get(group_id);
  if (!groupExists) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: `Group "${group_id}" does not exist` });
  }

  const existing = db.prepare('SELECT id FROM subgroups WHERE slug = ?').get(slug);
  if (existing) {
    return res.status(409).json({ error: 'SLUG_CONFLICT', message: `Slug "${slug}" is already in use` });
  }

  try {
    db.prepare(`
      INSERT INTO subgroups (id, display_name, description, slug, group_id, icon, color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(slug, display_name, description || null, slug, group_id, icon || null, color || null);

    const created = db.prepare('SELECT * FROM subgroups WHERE id = ?').get(slug);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// PUT /api/v1/subgroups/:id
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { display_name, description, slug, group_id, icon, color } = req.body;
  const db = getDb();

  const subgroup = db.prepare('SELECT * FROM subgroups WHERE id = ?').get(req.params.id);
  if (!subgroup) return res.status(404).json({ error: 'NOT_FOUND', message: 'Subgroup not found' });

  if (slug && slug !== subgroup.slug) {
    const conflict = db.prepare('SELECT id FROM subgroups WHERE slug = ? AND id != ?').get(slug, req.params.id);
    if (conflict) {
      return res.status(409).json({ error: 'SLUG_CONFLICT', message: `Slug "${slug}" is already in use` });
    }
  }

  if (group_id) {
    const groupExists = db.prepare('SELECT id FROM groups WHERE id = ?').get(group_id);
    if (!groupExists) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: `Group "${group_id}" does not exist` });
    }
  }

  db.prepare(`
    UPDATE subgroups
    SET display_name = ?, description = ?, slug = ?, group_id = ?, icon = ?, color = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    display_name || subgroup.display_name,
    description  !== undefined ? description : subgroup.description,
    slug         || subgroup.slug,
    group_id     || subgroup.group_id,
    icon         !== undefined ? icon  : subgroup.icon,
    color        !== undefined ? color : subgroup.color,
    req.params.id,
  );

  const updated = db.prepare('SELECT * FROM subgroups WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/v1/subgroups/:id
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();

  const subgroup = db.prepare('SELECT * FROM subgroups WHERE id = ?').get(req.params.id);
  if (!subgroup) return res.status(404).json({ error: 'NOT_FOUND', message: 'Subgroup not found' });

  // Safety: block deletion if subgroup contains assets
  const assets = db.prepare(
    'SELECT id, symbol, name FROM assets WHERE subgroup_id = ?'
  ).all(req.params.id);

  if (assets.length > 0) {
    return res.status(409).json({
      error:      'SUBGROUP_HAS_ASSETS',
      message:    `This subgroup contains ${assets.length} asset(s). Relocate them before deleting.`,
      assetCount: assets.length,
      assets,
    });
  }

  db.prepare('DELETE FROM subgroups WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
