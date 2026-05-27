import 'dotenv/config';
import { supabase } from './db.js';
import { GROUPS }    from '../src/data/groups.js';
import { SUBGROUPS } from '../src/data/subgroups.js';
import { ASSETS }    from '../src/data/assets.js';

export async function seedIfEmpty() {
  // ── Groups — idempotent ───────────────────────────────────────────────────
  const { error: groupError } = await supabase
    .from('groups')
    .upsert(GROUPS, { onConflict: 'id' });
  if (groupError) throw groupError;
  console.log('  ✓ Groups seeded');

  // ── Subgroups — idempotent ────────────────────────────────────────────────
  const { error: subgroupError } = await supabase
    .from('subgroups')
    .upsert(SUBGROUPS, { onConflict: 'id' });
  if (subgroupError) throw subgroupError;
  console.log('  ✓ Subgroups seeded');

  // ── Assets — idempotent ───────────────────────────────────────────────────
  // meta is jsonb in Postgres — pass the object directly, no JSON.stringify
  const assetsPayload = ASSETS.map((a) => ({
    ...a,
    currency:   a.currency   ?? null,
    sort_order: a.sort_order ?? 0,
    sector:     a.sector     ?? null,
    meta:       a.meta       ?? null,
  }));

  const { error: assetError } = await supabase
    .from('assets')
    .upsert(assetsPayload, { onConflict: 'id' });
  if (assetError) throw assetError;
  console.log('  ✓ Assets seeded');
}

/** After seeding, verify counts and log them */
export async function logTaxonomyCounts() {
  const [
    { count: groupCount },
    { count: subgroupCount },
    { count: assetCount },
    { count: globalGroupCount },
    { count: brazilGroupCount },
    { count: globalAssetCount },
    { count: brazilAssetCount },
  ] = await Promise.all([
    supabase.from('groups').select('*', { count: 'exact', head: true }),
    supabase.from('subgroups').select('*', { count: 'exact', head: true }),
    supabase.from('assets').select('*', { count: 'exact', head: true }),
    supabase.from('groups').select('*', { count: 'exact', head: true }).eq('terminal_view', 'global'),
    supabase.from('groups').select('*', { count: 'exact', head: true }).eq('terminal_view', 'brazil'),
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('terminal_view', 'global'),
    supabase.from('assets').select('*', { count: 'exact', head: true }).eq('terminal_view', 'brazil'),
  ]);
  console.log(`  📊 Groups:    ${groupCount} (${globalGroupCount} global · ${brazilGroupCount} brazil)`);
  console.log(`  📊 Subgroups: ${subgroupCount}`);
  console.log(`  📊 Assets:    ${assetCount} (${globalAssetCount} global · ${brazilAssetCount} brazil)`);
  return { groupCount, subgroupCount, assetCount, globalGroupCount, brazilGroupCount, globalAssetCount, brazilAssetCount };
}
