import bcrypt from 'bcryptjs';
import { getDb } from './db.js';
import { GROUPS }    from '../src/data/groups.js';
import { SUBGROUPS } from '../src/data/subgroups.js';
import { ASSETS }    from '../src/data/assets.js';

export async function seedIfEmpty() {
  const db = getDb();

  // ── Users ─────────────────────────────────────────────────────────────────
  const existingAdmin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!existingAdmin) {
    const hash = await bcrypt.hash('Admin1234!', 12);
    db.prepare(`INSERT INTO users (email, password, role) VALUES (?, ?, ?)`)
      .run('admin@terminal.local', hash, 'admin');
    console.log('  ✓ Default admin user created: admin@terminal.local');
  }

  // ── Groups — idempotent ───────────────────────────────────────────────────
  const insertGroup = db.prepare(`
    INSERT OR REPLACE INTO groups (id, display_name, description, slug, updated_at)
    VALUES (@id, @display_name, @description, @slug, CURRENT_TIMESTAMP)
  `);
  const seedGroups = db.transaction((rows) => {
    for (const row of rows) insertGroup.run(row);
  });
  seedGroups(GROUPS);

  // ── Subgroups — idempotent ────────────────────────────────────────────────
  const insertSubgroup = db.prepare(`
    INSERT OR REPLACE INTO subgroups (id, display_name, description, slug, group_id, icon, color, updated_at)
    VALUES (@id, @display_name, @description, @slug, @group_id, @icon, @color, CURRENT_TIMESTAMP)
  `);
  const seedSubgroups = db.transaction((rows) => {
    for (const row of rows) insertSubgroup.run(row);
  });
  seedSubgroups(SUBGROUPS);

  // ── Assets — idempotent ───────────────────────────────────────────────────
  const insertAsset = db.prepare(`
    INSERT OR REPLACE INTO assets (id, symbol, name, subgroup_id, group_id, type, currency, exchange, meta, updated_at)
    VALUES (@id, @symbol, @name, @subgroup_id, @group_id, @type, @currency, @exchange, @meta, CURRENT_TIMESTAMP)
  `);
  const seedAssets = db.transaction((rows) => {
    for (const row of rows) {
      insertAsset.run({
        currency: null,
        meta:     row.meta ? JSON.stringify(row.meta) : null,
        ...row,
      });
    }
  });
  seedAssets(ASSETS);
}

/** After seeding, verify counts and log them */
export function logTaxonomyCounts() {
  const db = getDb();
  const groupCount    = db.prepare('SELECT COUNT(*) as n FROM groups').get().n;
  const subgroupCount = db.prepare('SELECT COUNT(*) as n FROM subgroups').get().n;
  const assetCount    = db.prepare('SELECT COUNT(*) as n FROM assets').get().n;
  console.log(`  📊 Taxonomy: ${groupCount} groups, ${subgroupCount} subgroups, ${assetCount} assets — OK`);
  return { groupCount, subgroupCount, assetCount };
}
