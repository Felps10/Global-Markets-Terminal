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

/** Seed a demo Clube de Investimento — idempotent, safe to re-run */
export async function seedClubeDemo() {
  // ── Idempotency guard ─────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('clubes')
    .select('id')
    .eq('nome', 'Clube GMT Demo')
    .maybeSingle();
  if (existing) {
    console.log('  ℹ Demo clube already exists — skipping');
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  // ── Resolve asset IDs (audit: ivvb11, lfts11, gold11 absent in assets.js) ─
  // Slot D: ivvb11 absent → ewz
  // Slot E: lfts11 absent → bvsp  (warn — affects percentual_rv)
  // Slot F: gold11 absent → gld
  console.warn('  ⚠ LFTS11 not found — using BVSP as CDI slot');

  const positionsArray = [
    { clube_id: null, asset_id: 'petr4',  peso_alvo: 0.25, data_referencia: today }, // Slot A
    { clube_id: null, asset_id: 'vale3',  peso_alvo: 0.20, data_referencia: today }, // Slot B
    { clube_id: null, asset_id: 'itub4',  peso_alvo: 0.15, data_referencia: today }, // Slot C
    { clube_id: null, asset_id: 'ewz',    peso_alvo: 0.15, data_referencia: today }, // Slot D (ivvb11 → ewz)
    { clube_id: null, asset_id: 'bvsp',   peso_alvo: 0.15, data_referencia: today }, // Slot E (lfts11 → bvsp)
    { clube_id: null, asset_id: 'gld',    peso_alvo: 0.10, data_referencia: today }, // Slot F (gold11 → gld)
  ];

  // percentual_rv: 0.80 because Slot E is BVSP (equities/indices, not fixed income)
  const percentual_rv = 0.80;

  // ── Insert clube ──────────────────────────────────────────────────────────
  const { data: clube, error: clubeError } = await supabase
    .from('clubes')
    .insert({
      nome:               'Clube GMT Demo',
      cnpj:               null,
      corretora:          'Corretora Demo DTVM',
      data_constituicao:  today,
      valor_cota_inicial: 1000.0,
      benchmark_ibov:     true,
      benchmark_cdi:      true,
      status:             'ativo',
      created_by:         null,
    })
    .select()
    .single();
  if (clubeError) throw clubeError;

  // ── Insert cotistas ───────────────────────────────────────────────────────
  const { error: cotistasError } = await supabase
    .from('cotistas')
    .insert([
      { clube_id: clube.id, nome: 'Felipe Fundador',  cotas_detidas: 500.0, data_entrada: today, ativo: true },
      { clube_id: clube.id, nome: 'Sócia Demo',       cotas_detidas: 300.0, data_entrada: today, ativo: true },
      { clube_id: clube.id, nome: 'Investidor Teste', cotas_detidas: 200.0, data_entrada: today, ativo: true },
    ]);
  if (cotistasError) throw cotistasError;

  // ── Insert posicoes ───────────────────────────────────────────────────────
  const { error: posicoesError } = await supabase
    .from('posicoes')
    .insert(positionsArray.map((p) => ({ ...p, clube_id: clube.id })));
  if (posicoesError) throw posicoesError;

  // ── Insert seed NAV entry ─────────────────────────────────────────────────
  const { error: navError } = await supabase
    .from('nav_historico')
    .insert({
      clube_id:          clube.id,
      data:              today,
      valor_cota:        1000.0,
      patrimonio_total:  1000000.0,
      cotas_emitidas:    1000.0,
      retorno_diario:    0.0,
      retorno_acumulado: 0.0,
      retorno_ibov:      0.0,
      retorno_cdi:       0.0,
      percentual_rv,
    });
  if (navError) throw navError;

  console.log('  ✓ Demo clube seeded: Clube GMT Demo — 3 cotistas, 6 posições, NAV R$1.000,00');
}
