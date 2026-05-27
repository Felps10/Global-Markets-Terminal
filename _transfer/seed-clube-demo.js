// ============================================================
// TRANSFER NOTE
// Source: server/seed.js — seedClubeDemo() function
// Contains realistic fixture data: one clube, cotistas,
// NAV history, and movimentacoes entries.
// Use as the seed script for the new app's development database.
// Update FK references (clube_id, cotista_id) after new schema
// is created. Update posicoes entries to use ticker/nome/tipo
// inline fields instead of asset_id.
// ============================================================

import 'dotenv/config';
import { supabase } from './db.js';

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
