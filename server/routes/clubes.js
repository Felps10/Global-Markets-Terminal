import { Router }   from 'express';
import { supabase } from '../db.js';
import { authenticate, requireAdmin, requireRole } from '../middleware/auth.js';
import {
  addBusinessDays,
  computeMovimentacaoPreview,
  validateCVMRules,
  classifyOperacionalSeverity,
  computePenalidadeAtraso,
  computeSetupChecklist,
} from '../../src/services/quotizacaoEngine.js';

const router = Router();

// ── HELPERS (private) ───────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0];
}

function round6(x) {
  return Math.round(x * 1_000_000) / 1_000_000;
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

function sortBySeverity(items) {
  const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  return [...items].sort((a, b) => (order[a.severity] ?? 2) - (order[b.severity] ?? 2));
}

async function getActiveEstatuto(clube_id) {
  const { data, error } = await supabase
    .from('estatuto_versoes')
    .select('*')
    .eq('clube_id', clube_id)
    .is('valid_until', null)
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function writeAuditLog({ clube_id, user_id, action, table_name, record_id, before_state, after_state }) {
  const { error } = await supabase.from('audit_log').insert({
    clube_id:     clube_id ?? null,
    user_id:      user_id ?? null,
    action,
    table_name:   table_name ?? null,
    record_id:    record_id ?? null,
    before_state: before_state ?? null,
    after_state:  after_state ?? null,
  });
  if (error) console.error('[audit_log] Failed to write:', error.message);
}

// ── CLUBE ROUTES ─────────────────────────────────────────────────────────────

// GET /api/v1/clubes
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('clubes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  res.json(data);
});

// GET /api/v1/clubes/:id
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('clubes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  if (!data) return res.status(404).json({ error: 'NOT_FOUND', message: 'Clube not found' });
  res.json(data);
});

// POST /api/v1/clubes
router.post('/', authenticate, requireRole('club_manager'), async (req, res) => {
  const {
    nome, cnpj, corretora, data_constituicao,
    valor_cota_inicial, benchmark_ibov, benchmark_cdi,
  } = req.body;

  if (!nome) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'nome is required' });
  }

  const { data, error } = await supabase
    .from('clubes')
    .insert({
      nome,
      cnpj:               cnpj               ?? null,
      corretora:          corretora          ?? null,
      data_constituicao:  data_constituicao  ?? null,
      valor_cota_inicial: valor_cota_inicial ?? 1000.0,
      benchmark_ibov:     benchmark_ibov     ?? true,
      benchmark_cdi:      benchmark_cdi      ?? true,
      created_by:         req.user.id,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  res.status(201).json(data);
});

// PUT /api/v1/clubes/:id
router.put('/:id', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id } = req.params;
  const allowed = ['nome', 'cnpj', 'corretora', 'data_constituicao', 'benchmark_ibov', 'benchmark_cdi', 'status'];
  const updates = {};
  for (const field of allowed) {
    if (field in req.body) updates[field] = req.body[field];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('clubes')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  if (!data) return res.status(404).json({ error: 'NOT_FOUND', message: 'Clube not found' });
  res.json(data);
});

// ── POSICOES ROUTES ───────────────────────────────────────────────────────────

// GET /api/v1/clubes/:id/posicoes
router.get('/:id/posicoes', authenticate, async (req, res) => {
  const { id } = req.params;

  const { data: posicoes, error: posError } = await supabase
    .from('posicoes')
    .select('*')
    .eq('clube_id', id)
    .order('peso_alvo', { ascending: false });
  if (posError) return res.status(500).json({ error: 'DB_ERROR', message: posError.message });

  if (posicoes.length === 0) return res.json([]);

  const assetIds = posicoes.map((p) => p.asset_id);
  const { data: assets, error: assetError } = await supabase
    .from('assets')
    .select('id, symbol, name, group_id, subgroup_id, type, exchange')
    .in('id', assetIds);
  if (assetError) return res.status(500).json({ error: 'DB_ERROR', message: assetError.message });

  const assetMap = Object.fromEntries(assets.map((a) => [a.id, a]));
  const result = posicoes.map((p) => ({ ...p, asset: assetMap[p.asset_id] ?? null }));
  res.json(result);
});

// PUT /api/v1/clubes/:id/posicoes  — full replacement
router.put('/:id/posicoes', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id } = req.params;
  const { posicoes, data_referencia } = req.body;

  // Validation 1: array must be present and non-empty
  if (!posicoes || !Array.isArray(posicoes) || posicoes.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'posicoes array is required' });
  }

  // Validation 2: each peso_alvo must be > 0 and <= 1
  for (const p of posicoes) {
    if (p.peso_alvo <= 0 || p.peso_alvo > 1) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Each peso_alvo must be > 0 and <= 1' });
    }
  }

  // Validation 3: weights must sum to 1.0 (±0.001 tolerance)
  const total = posicoes.reduce((sum, p) => sum + p.peso_alvo, 0);
  if (Math.abs(total - 1.0) > 0.001) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'peso_alvo values must sum to 1.0' });
  }

  // Validation 4: no duplicate asset_ids
  const assetIds = posicoes.map((p) => p.asset_id);
  if (new Set(assetIds).size !== assetIds.length) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Duplicate asset_id detected' });
  }

  // Validation 5: all asset_ids must exist in assets table
  const { data: existingAssets, error: assetCheckError } = await supabase
    .from('assets')
    .select('id')
    .in('id', assetIds);
  if (assetCheckError) return res.status(500).json({ error: 'DB_ERROR', message: assetCheckError.message });
  const foundIds = new Set(existingAssets.map((a) => a.id));
  for (const aid of assetIds) {
    if (!foundIds.has(aid)) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: `Invalid asset_id: ${aid}` });
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const ref = data_referencia ?? today;

  // Step 1: Delete all existing posicoes for this clube
  const { error: delError } = await supabase
    .from('posicoes')
    .delete()
    .eq('clube_id', id);
  if (delError) return res.status(500).json({ error: 'DB_ERROR', message: delError.message });

  // Step 2: Insert new posicoes
  const rows = posicoes.map((p) => ({
    clube_id:       Number(id),
    asset_id:       p.asset_id,
    peso_alvo:      p.peso_alvo,
    data_referencia: ref,
  }));
  const { error: insertError } = await supabase.from('posicoes').insert(rows);
  if (insertError) return res.status(500).json({ error: 'DB_ERROR', message: insertError.message });

  // Fetch and return the newly inserted set
  const { data: newPosicoes, error: fetchError } = await supabase
    .from('posicoes')
    .select('*')
    .eq('clube_id', id)
    .order('peso_alvo', { ascending: false });
  if (fetchError) return res.status(500).json({ error: 'DB_ERROR', message: fetchError.message });
  res.json(newPosicoes);
});

// ── COTISTAS ROUTES ───────────────────────────────────────────────────────────

// GET /api/v1/clubes/:id/cotistas
router.get('/:id/cotistas', authenticate, async (req, res) => {
  const { id } = req.params;

  const [cotistasRes, navRes] = await Promise.all([
    supabase.from('cotistas').select('*').eq('clube_id', id).eq('ativo', true).order('data_entrada', { ascending: true }),
    supabase.from('nav_historico').select('valor_cota').eq('clube_id', id).order('data', { ascending: false }).limit(1),
  ]);
  if (cotistasRes.error) return res.status(500).json({ error: 'DB_ERROR', message: cotistasRes.error.message });
  if (navRes.error)      return res.status(500).json({ error: 'DB_ERROR', message: navRes.error.message });

  const cotistas      = cotistasRes.data;
  const latestNav     = navRes.data?.[0] ?? null;
  const valorCotaAtual = latestNav ? parseFloat(latestNav.valor_cota) : null;

  const cotistasWithValor = cotistas.map((c) => ({
    ...c,
    valor_atual: valorCotaAtual !== null
      ? parseFloat(c.cotas_detidas) * valorCotaAtual
      : null,
  }));

  const totalCotas      = cotistas.reduce((sum, c) => sum + parseFloat(c.cotas_detidas), 0);
  const patrimonioTotal = valorCotaAtual !== null ? totalCotas * valorCotaAtual : null;

  res.json({
    cotistas: cotistasWithValor,
    summary: {
      total_cotistas:   cotistas.length,
      total_cotas:      totalCotas,
      patrimonio_total: patrimonioTotal,
      valor_cota_atual: valorCotaAtual,
    },
  });
});

// POST /api/v1/clubes/:id/cotistas
router.post('/:id/cotistas', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id } = req.params;
  const { nome, cotas_detidas, data_entrada } = req.body;

  if (!nome) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'nome is required' });
  }
  if (cotas_detidas === undefined || cotas_detidas === null || parseFloat(cotas_detidas) <= 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'cotas_detidas must be greater than 0' });
  }
  if (!data_entrada) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'data_entrada is required' });
  }

  const { data, error } = await supabase
    .from('cotistas')
    .insert({ clube_id: Number(id), nome, cotas_detidas, data_entrada, ativo: true })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  res.status(201).json(data);
});

// PUT /api/v1/clubes/:id/cotistas/:cid
router.put('/:id/cotistas/:cid', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id, cid } = req.params;
  const allowed = ['nome', 'cotas_detidas', 'data_entrada', 'ativo'];
  const updates = {};
  for (const field of allowed) {
    if (field in req.body) updates[field] = req.body[field];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('cotistas')
    .update(updates)
    .eq('id', cid)
    .eq('clube_id', id)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  if (!data) return res.status(404).json({ error: 'NOT_FOUND', message: 'Cotista not found' });
  res.json(data);
});

// ── NAV ROUTES ────────────────────────────────────────────────────────────────
// NOTE: /nav/latest is defined BEFORE any future /nav/:date route to ensure
// Express matches the static segment before the dynamic parameter.

// GET /api/v1/clubes/:id/nav
router.get('/:id/nav', authenticate, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('nav_historico')
    .select('*')
    .eq('clube_id', id)
    .order('data', { ascending: true });
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  res.json(data);
});

// GET /api/v1/clubes/:id/nav/latest  — must stay above any /:id/nav/:date route
router.get('/:id/nav/latest', authenticate, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('nav_historico')
    .select('*')
    .eq('clube_id', id)
    .order('data', { ascending: false })
    .limit(1);
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'No NAV entries found' });
  }
  res.json(data[0]);
});

// POST /api/v1/clubes/:id/nav
router.post('/:id/nav', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id } = req.params;
  const navDate = req.body.data;
  const {
    valor_cota, patrimonio_total, cotas_emitidas,
    retorno_diario, retorno_acumulado,
    retorno_ibov, retorno_cdi, percentual_rv,
  } = req.body;

  if (!navDate) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'data is required' });
  }
  if (!valor_cota || parseFloat(valor_cota) <= 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'valor_cota must be greater than 0' });
  }

  // Conflict check: unique (clube_id, data)
  const { data: existing, error: checkError } = await supabase
    .from('nav_historico')
    .select('id')
    .eq('clube_id', id)
    .eq('data', navDate)
    .maybeSingle();
  if (checkError) return res.status(500).json({ error: 'DB_ERROR', message: checkError.message });
  if (existing) {
    return res.status(409).json({
      error:   'CONFLICT',
      message: 'NAV entry already exists for this date. Use PUT to update.',
    });
  }

  const { data, error } = await supabase
    .from('nav_historico')
    .insert({
      clube_id:          Number(id),
      data:              navDate,
      valor_cota,
      patrimonio_total:  patrimonio_total  ?? null,
      cotas_emitidas:    cotas_emitidas    ?? null,
      retorno_diario:    retorno_diario    ?? null,
      retorno_acumulado: retorno_acumulado ?? null,
      retorno_ibov:      retorno_ibov      ?? null,
      retorno_cdi:       retorno_cdi       ?? null,
      percentual_rv:     percentual_rv     ?? null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  res.status(201).json(data);
});

// ── COMPLIANCE ROUTE ──────────────────────────────────────────────────────────

// GET /api/v1/clubes/:id/compliance
router.get('/:id/compliance', authenticate, async (req, res) => {
  const { id } = req.params;

  // Fetch posicoes
  const { data: posicoes, error: posError } = await supabase
    .from('posicoes')
    .select('*')
    .eq('clube_id', id)
    .order('peso_alvo', { ascending: false });
  if (posError) return res.status(500).json({ error: 'DB_ERROR', message: posError.message });

  if (posicoes.length === 0) {
    return res.json({
      compliant:         false,
      status:            'NO_POSITIONS',
      percentual_rv:     0,
      percentual_outras: 0,
      positions_detail:  [],
    });
  }

  // Fetch asset details for group_id classification
  const assetIds = posicoes.map((p) => p.asset_id);
  const { data: assets, error: assetError } = await supabase
    .from('assets')
    .select('id, symbol, name, group_id, subgroup_id, type, exchange')
    .in('id', assetIds);
  if (assetError) return res.status(500).json({ error: 'DB_ERROR', message: assetError.message });

  const assetMap = Object.fromEntries(assets.map((a) => [a.id, a]));

  // Compute percentual_rv in JS from posicoes data (not from nav_historico)
  let percentual_rv     = 0;
  let percentual_outras = 0;

  const positions_detail = posicoes.map((p) => {
    const asset  = assetMap[p.asset_id];
    const is_rv  = asset?.group_id === 'equities';
    const peso   = parseFloat(p.peso_alvo);
    if (is_rv) percentual_rv     += peso;
    else       percentual_outras += peso;
    return {
      asset_id:  p.asset_id,
      symbol:    asset?.symbol    ?? null,
      name:      asset?.name      ?? null,
      group_id:  asset?.group_id  ?? null,
      peso_alvo: peso,
      is_rv,
    };
  });

  let compliant, status;
  if (percentual_rv >= 0.67) {
    compliant = true;
    status    = 'OK';
  } else if (percentual_rv >= 0.60) {
    compliant = false;
    status    = 'WARNING';
  } else {
    compliant = false;
    status    = 'BREACH';
  }

  res.json({
    compliant,
    status,
    percentual_rv,
    percentual_outras,
    minimum_required: 0.67,
    positions_detail,
  });
});

// ── ROUTE GROUP 1 — ESTATUTO ────────────────────────────────────────────────

// GET /api/v1/clubes/:id/estatuto/active
router.get('/:id/estatuto/active', authenticate, async (req, res) => {
  const { id } = req.params;
  const onDate = req.query.on;

  let query = supabase
    .from('estatuto_versoes')
    .select('*')
    .eq('clube_id', id);

  if (onDate) {
    query = query.lte('valid_from', onDate);
  } else {
    const todayStr = today();
    query = query
      .lte('valid_from', todayStr)
      .or(`valid_until.is.null,valid_until.gte.${todayStr}`);
  }

  const { data, error } = await query
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  if (!data) return res.status(404).json({ error: 'NOT_FOUND', message: 'No active statute found for this clube' });
  res.json(data);
});

// GET /api/v1/clubes/:id/estatuto/history
router.get('/:id/estatuto/history', authenticate, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('estatuto_versoes')
    .select('*')
    .eq('clube_id', id)
    .order('valid_from', { ascending: false });
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  res.json(data ?? []);
});

// POST /api/v1/clubes/:id/estatuto
router.post('/:id/estatuto', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id } = req.params;
  const {
    valid_from, prazo_conversao_dias, prazo_pagamento_dias, carencia_dias,
    taxa_administracao, taxa_performance, benchmark_performance,
    permite_derivativos, politica_investimento,
    irrf_rate, regime_tributario, versao_nota,
  } = req.body;

  if (!valid_from) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'valid_from is required' });
  }
  if (isNaN(Date.parse(valid_from))) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'valid_from must be a valid date string' });
  }

  // Check for date conflict
  const { data: existing, error: existErr } = await supabase
    .from('estatuto_versoes')
    .select('valid_from')
    .eq('clube_id', id)
    .gte('valid_from', valid_from)
    .limit(1)
    .maybeSingle();
  if (existErr) return res.status(500).json({ error: 'DB_ERROR', message: existErr.message });
  if (existing) {
    return res.status(409).json({ error: 'CONFLICT', message: 'A statute with an equal or later valid_from already exists' });
  }

  // Close the currently active statute
  const currentActive = await getActiveEstatuto(Number(id));
  if (currentActive) {
    const closingDate = new Date(valid_from + 'T12:00:00Z');
    closingDate.setUTCDate(closingDate.getUTCDate() - 1);
    const closingDateStr = closingDate.toISOString().split('T')[0];
    const { error: closeErr } = await supabase
      .from('estatuto_versoes')
      .update({ valid_until: closingDateStr })
      .eq('id', currentActive.id);
    if (closeErr) return res.status(500).json({ error: 'DB_ERROR', message: closeErr.message });
  }

  // Insert new statute — carry forward defaults from previous active statute
  const prev = currentActive ?? {};
  const row = {
    clube_id: Number(id),
    valid_from,
    valid_until: null,
    prazo_conversao_dias: prazo_conversao_dias ?? prev.prazo_conversao_dias ?? 1,
    prazo_pagamento_dias: prazo_pagamento_dias ?? prev.prazo_pagamento_dias ?? 5,
    carencia_dias:        carencia_dias ?? prev.carencia_dias ?? 0,
    taxa_administracao:   taxa_administracao ?? prev.taxa_administracao ?? 0,
    taxa_performance:     taxa_performance ?? prev.taxa_performance ?? 0,
    benchmark_performance: benchmark_performance ?? prev.benchmark_performance ?? 'cdi',
    permite_derivativos:  permite_derivativos ?? prev.permite_derivativos ?? false,
    politica_investimento: politica_investimento ?? prev.politica_investimento ?? '',
    irrf_rate:            irrf_rate ?? prev.irrf_rate ?? 0.15,
    regime_tributario:    regime_tributario ?? prev.regime_tributario ?? 'fia',
    versao_nota:          versao_nota ?? prev.versao_nota ?? null,
  };

  const { data: created, error: insertErr } = await supabase
    .from('estatuto_versoes')
    .insert(row)
    .select()
    .single();
  if (insertErr) return res.status(500).json({ error: 'DB_ERROR', message: insertErr.message });

  writeAuditLog({
    clube_id: Number(id),
    user_id: req.user.id,
    action: 'estatuto.create',
    table_name: 'estatuto_versoes',
    record_id: String(created.id),
    after_state: created,
  });

  res.status(201).json(created);
});

// ── ROUTE GROUP 2 — MOVIMENTAÇÕES ───────────────────────────────────────────

// GET /api/v1/clubes/:id/movimentacoes
router.get('/:id/movimentacoes', authenticate, async (req, res) => {
  const { id } = req.params;
  const { status, tipo, cotista_id, periodo } = req.query;

  let query = supabase
    .from('movimentacoes')
    .select('*')
    .eq('clube_id', id);

  if (status)     query = query.eq('status', status);
  if (tipo)       query = query.eq('tipo', tipo);
  if (cotista_id) query = query.eq('cotista_id', cotista_id);

  const { data: movs, error: movErr } = await query.order('data_solicitacao', { ascending: false });
  if (movErr) return res.status(500).json({ error: 'DB_ERROR', message: movErr.message });

  let filtered = movs ?? [];
  if (periodo) {
    filtered = filtered.filter(m => m.data_solicitacao?.slice(0, 7) === periodo);
  }

  // JS-side join for cotista_nome
  const { data: cotistas, error: cotErr } = await supabase
    .from('cotistas')
    .select('id, nome')
    .eq('clube_id', id);
  if (cotErr) return res.status(500).json({ error: 'DB_ERROR', message: cotErr.message });
  const nameMap = Object.fromEntries((cotistas ?? []).map(c => [c.id, c.nome]));

  const result = filtered.map(m => ({ ...m, cotista_nome: nameMap[m.cotista_id] ?? null }));
  res.json(result);
});

// POST /api/v1/clubes/:id/movimentacoes
router.post('/:id/movimentacoes', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id } = req.params;
  const { cotista_id, tipo, valor_brl, data_solicitacao, em_especie, aprovacao_unanime, observacao } = req.body;

  // Validation
  if (!cotista_id) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'cotista_id is required' });
  if (!tipo || !['aporte', 'resgate'].includes(tipo)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'tipo must be "aporte" or "resgate"' });
  }
  if (!valor_brl || Number(valor_brl) <= 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'valor_brl must be greater than 0' });
  }

  const dataSol = data_solicitacao ?? today();
  const emEspecie = em_especie ?? true;

  // 1. Active estatuto
  let estatuto;
  try { estatuto = await getActiveEstatuto(Number(id)); } catch (e) {
    return res.status(500).json({ error: 'DB_ERROR', message: e.message });
  }
  if (!estatuto) {
    return res.status(400).json({ error: 'NO_STATUTE', message: 'Clube has no active statute. Create one before recording movimentações.' });
  }

  // 2. Active cotistas
  const { data: cotistas, error: cotErr } = await supabase
    .from('cotistas').select('*').eq('clube_id', id).eq('ativo', true);
  if (cotErr) return res.status(500).json({ error: 'DB_ERROR', message: cotErr.message });

  // 3. Latest NAV
  const { data: navRows, error: navErr } = await supabase
    .from('nav_historico').select('valor_cota').eq('clube_id', id)
    .order('data', { ascending: false }).limit(1);
  if (navErr) return res.status(500).json({ error: 'DB_ERROR', message: navErr.message });
  if (!navRows || navRows.length === 0) {
    return res.status(400).json({ error: 'NO_NAV', message: 'No NAV recorded for this clube. Record initial NAV before creating movimentações.' });
  }
  const valorCota = parseFloat(navRows[0].valor_cota);

  // 4. Preview
  const preview = computeMovimentacaoPreview(
    tipo, Number(valor_brl), valorCota, cotistas, cotista_id,
    estatuto, dataSol, emEspecie, aprovacao_unanime,
  );

  // 5. CVM violation check
  if (!preview.allowed) {
    return res.status(400).json({
      error: 'CVM_VIOLATION',
      violations: preview.violations,
      warnings: preview.warnings,
      preview,
    });
  }

  // 6. Insert movimentacao
  const row = {
    clube_id: Number(id),
    cotista_id: Number(cotista_id),
    tipo,
    data_solicitacao: dataSol,
    data_conversao: preview.dataConversaoMin,
    status: 'aguardando_recursos',
    valor_brl: Number(valor_brl),
    em_especie: emEspecie,
    aprovacao_unanime: aprovacao_unanime ?? null,
    observacao: observacao ?? null,
  };

  const { data: created, error: insertErr } = await supabase
    .from('movimentacoes').insert(row).select().single();
  if (insertErr) return res.status(500).json({ error: 'DB_ERROR', message: insertErr.message });

  // 7. Audit log
  writeAuditLog({
    clube_id: Number(id),
    user_id: req.user.id,
    action: 'movimentacao.create',
    table_name: 'movimentacoes',
    record_id: String(created.id),
    after_state: created,
  });

  // 8. Return
  res.status(201).json({ movimentacao: created, preview });
});

// PATCH /api/v1/clubes/:id/movimentacoes/:mid/status
router.patch('/:id/movimentacoes/:mid/status', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id, mid } = req.params;
  const { status: newStatus, data_pagamento } = req.body;

  // Fetch existing movimentacao
  const { data: mov, error: movErr } = await supabase
    .from('movimentacoes').select('*').eq('id', mid).eq('clube_id', id).maybeSingle();
  if (movErr) return res.status(500).json({ error: 'DB_ERROR', message: movErr.message });
  if (!mov) return res.status(404).json({ error: 'NOT_FOUND', message: 'Movimentação not found' });

  // Immutability check
  if (mov.status === 'pago' || mov.status === 'cancelado') {
    return res.status(409).json({ error: 'IMMUTABLE', message: 'This movimentação is finalized and cannot be changed.' });
  }

  // ── Transition: any → cancelado ────────────────────────────────────────────
  if (newStatus === 'cancelado') {
    // If convertido, reverse cotas and cash
    if (mov.status === 'convertido') {
      const reverseDelta = -mov.cotas_delta;

      // a. Reverse cotista cotas
      const { data: cotista, error: cErr } = await supabase
        .from('cotistas').select('cotas_detidas').eq('id', mov.cotista_id).single();
      if (cErr) return res.status(500).json({ error: 'DB_ERROR', message: cErr.message });
      const restoredCotas = parseFloat(cotista.cotas_detidas) + reverseDelta;
      const { error: cUpErr } = await supabase
        .from('cotistas').update({ cotas_detidas: restoredCotas }).eq('id', mov.cotista_id);
      if (cUpErr) return res.status(500).json({ error: 'DB_ERROR', message: cUpErr.message });

      // b. Reverse clube totals
      const { data: clube, error: clErr } = await supabase
        .from('clubes').select('cotas_emitidas_total, cash_balance').eq('id', id).single();
      if (clErr) return res.status(500).json({ error: 'DB_ERROR', message: clErr.message });
      const revTotal = parseFloat(clube.cotas_emitidas_total ?? 0) + reverseDelta;
      const revCash = parseFloat(clube.cash_balance ?? 0) + (mov.tipo === 'aporte' ? -mov.valor_brl : mov.valor_brl);
      const { error: clUpErr } = await supabase
        .from('clubes').update({ cotas_emitidas_total: revTotal, cash_balance: revCash }).eq('id', id);
      if (clUpErr) return res.status(500).json({ error: 'DB_ERROR', message: clUpErr.message });

      // c. Reversing ledger entry
      const { error: ledErr } = await supabase.from('ledger_entries').insert({
        clube_id: Number(id),
        data: today(),
        tipo: `cancelamento_${mov.tipo}`,
        valor_brl: mov.tipo === 'aporte' ? -mov.valor_brl : mov.valor_brl,
        running_balance: revCash,
        ref_id: Number(mid),
        ref_type: 'movimentacao',
        descricao: `Cancelamento - ${mov.tipo}`,
      });
      if (ledErr) return res.status(500).json({ error: 'DB_ERROR', message: ledErr.message });

      // d. Soft-delete tranche for aportes
      if (mov.tipo === 'aporte') {
        const { error: trErr } = await supabase
          .from('cotas_tranches')
          .update({ cotas_restantes: 0 })
          .eq('movimentacao_id', mid);
        if (trErr) return res.status(500).json({ error: 'DB_ERROR', message: trErr.message });
      }
    }

    const { data: updated, error: upErr } = await supabase
      .from('movimentacoes').update({ status: 'cancelado' }).eq('id', mid).select().single();
    if (upErr) return res.status(500).json({ error: 'DB_ERROR', message: upErr.message });

    writeAuditLog({ clube_id: Number(id), user_id: req.user.id, action: 'movimentacao.cancelado', table_name: 'movimentacoes', record_id: String(mid), after_state: updated });
    return res.json(updated);
  }

  // ── Transition: aguardando_recursos → recursos_confirmados ─────────────────
  if (newStatus === 'recursos_confirmados') {
    if (mov.status !== 'aguardando_recursos') {
      return res.status(400).json({ error: 'INVALID_TRANSITION', message: `Cannot transition from ${mov.status} to recursos_confirmados` });
    }

    const { data: navRows } = await supabase
      .from('nav_historico').select('valor_cota').eq('clube_id', id)
      .order('data', { ascending: false }).limit(1);
    const valorCota = parseFloat(navRows?.[0]?.valor_cota ?? 0);
    const cotasDelta = mov.tipo === 'aporte'
      ? round6(mov.valor_brl / valorCota)
      : -round6(mov.valor_brl / valorCota);

    const { data: updated, error: upErr } = await supabase
      .from('movimentacoes')
      .update({ status: 'recursos_confirmados', valor_cota: valorCota, cotas_delta: cotasDelta })
      .eq('id', mid).select().single();
    if (upErr) return res.status(500).json({ error: 'DB_ERROR', message: upErr.message });
    return res.json(updated);
  }

  // ── Transition: recursos_confirmados → convertido ──────────────────────────
  if (newStatus === 'convertido') {
    if (mov.status !== 'recursos_confirmados') {
      return res.status(400).json({ error: 'INVALID_TRANSITION', message: `Cannot transition from ${mov.status} to convertido` });
    }

    const { data: cotista, error: cErr } = await supabase
      .from('cotistas').select('*').eq('id', mov.cotista_id).single();
    if (cErr) return res.status(500).json({ error: 'DB_ERROR', message: cErr.message });

    const newCotas = parseFloat(cotista.cotas_detidas) + mov.cotas_delta;
    if (newCotas < 0) {
      return res.status(400).json({ error: 'INVALID_STATE', message: 'Conversion would result in negative cotas balance.' });
    }

    // a. Update cotista cotas
    const { error: cUpErr } = await supabase
      .from('cotistas').update({ cotas_detidas: newCotas }).eq('id', mov.cotista_id);
    if (cUpErr) return res.status(500).json({ error: 'DB_ERROR', message: cUpErr.message });

    // b. Update clube totals
    const { data: clube, error: clErr } = await supabase
      .from('clubes').select('cotas_emitidas_total, cash_balance').eq('id', id).single();
    if (clErr) return res.status(500).json({ error: 'DB_ERROR', message: clErr.message });
    const newTotal = parseFloat(clube.cotas_emitidas_total ?? 0) + mov.cotas_delta;
    const newCash = parseFloat(clube.cash_balance ?? 0) + (mov.tipo === 'aporte' ? mov.valor_brl : -mov.valor_brl);

    const { error: clUpErr } = await supabase
      .from('clubes').update({ cotas_emitidas_total: newTotal, cash_balance: newCash }).eq('id', id);
    if (clUpErr) return res.status(500).json({ error: 'DB_ERROR', message: clUpErr.message });

    // c. Insert cotas_tranches (aportes only)
    if (mov.tipo === 'aporte') {
      const { error: trErr } = await supabase.from('cotas_tranches').insert({
        cotista_id: Number(mov.cotista_id),
        clube_id: Number(id),
        movimentacao_id: Number(mid),
        data_aquisicao: mov.data_conversao ?? today(),
        cotas_adquiridas: Math.abs(mov.cotas_delta),
        cotas_restantes: Math.abs(mov.cotas_delta),
        valor_cota_aquisicao: mov.valor_cota,
        custo_total_brl: mov.valor_brl,
      });
      if (trErr) return res.status(500).json({ error: 'DB_ERROR', message: trErr.message });
    }

    // d. Insert ledger entry
    const { error: ledErr } = await supabase.from('ledger_entries').insert({
      clube_id: Number(id),
      data: today(),
      tipo: mov.tipo,
      valor_brl: mov.tipo === 'aporte' ? mov.valor_brl : -mov.valor_brl,
      running_balance: newCash,
      ref_id: Number(mid),
      ref_type: 'movimentacao',
      descricao: `${mov.tipo === 'aporte' ? 'Aporte' : 'Resgate'} - ${cotista.nome}`,
    });
    if (ledErr) return res.status(500).json({ error: 'DB_ERROR', message: ledErr.message });

    // e. Upsert cotistas_historico for all active cotistas
    const { data: allCotistas, error: allCErr } = await supabase
      .from('cotistas').select('*').eq('clube_id', id).eq('ativo', true);
    if (allCErr) return res.status(500).json({ error: 'DB_ERROR', message: allCErr.message });

    const totalCotas = allCotistas.reduce((s, c) => s + parseFloat(c.cotas_detidas), 0);
    const todayStr = today();
    for (const c of allCotistas) {
      const cotas = parseFloat(c.cotas_detidas);
      const { error: hErr } = await supabase.from('cotistas_historico').upsert({
        clube_id: Number(id),
        cotista_id: c.id,
        data: todayStr,
        cotas_detidas: cotas,
        equity_pct: totalCotas > 0 ? cotas / totalCotas : 0,
        valor_atual: cotas * mov.valor_cota,
      }, { onConflict: 'clube_id,cotista_id,data' });
      if (hErr) console.error('[cotistas_historico] upsert error:', hErr.message);
    }

    // f. Update movimentacao status
    const { data: updated, error: upErr } = await supabase
      .from('movimentacoes').update({ status: 'convertido' }).eq('id', mid).select().single();
    if (upErr) return res.status(500).json({ error: 'DB_ERROR', message: upErr.message });

    writeAuditLog({ clube_id: Number(id), user_id: req.user.id, action: 'movimentacao.convertido', table_name: 'movimentacoes', record_id: String(mid), after_state: updated });
    return res.json(updated);
  }

  // ── Transition: convertido → pago (resgates only) ─────────────────────────
  if (newStatus === 'pago') {
    if (mov.status !== 'convertido') {
      return res.status(400).json({ error: 'INVALID_TRANSITION', message: `Cannot transition from ${mov.status} to pago` });
    }
    if (mov.tipo !== 'resgate') {
      return res.status(400).json({ error: 'INVALID_TRANSITION', message: 'Only resgates can be marked as pago.' });
    }

    let estatuto;
    try { estatuto = await getActiveEstatuto(Number(id)); } catch (e) {
      return res.status(500).json({ error: 'DB_ERROR', message: e.message });
    }

    const todayStr = today();
    const penalty = computePenalidadeAtraso(
      mov.valor_brl,
      mov.data_conversao,
      data_pagamento ?? todayStr,
      estatuto?.prazo_pagamento_dias ?? 5,
    );

    const { data: updated, error: upErr } = await supabase
      .from('movimentacoes').update({
        status: 'pago',
        data_pagamento: data_pagamento ?? todayStr,
        penalidade_atraso: penalty.isLate ? penalty.penalidade : null,
      }).eq('id', mid).select().single();
    if (upErr) return res.status(500).json({ error: 'DB_ERROR', message: upErr.message });

    writeAuditLog({ clube_id: Number(id), user_id: req.user.id, action: 'movimentacao.pago', table_name: 'movimentacoes', record_id: String(mid), after_state: updated });
    return res.json(updated);
  }

  // Unknown transition
  return res.status(400).json({ error: 'INVALID_TRANSITION', message: `Unknown or invalid status transition to "${newStatus}"` });
});

// ── ROUTE GROUP 3 — LEDGER ──────────────────────────────────────────────────

// GET /api/v1/clubes/:id/ledger
router.get('/:id/ledger', authenticate, async (req, res) => {
  const { id } = req.params;

  const [entriesRes, clubeRes] = await Promise.all([
    supabase.from('ledger_entries').select('*').eq('clube_id', id).order('data', { ascending: false }).order('id', { ascending: false }),
    supabase.from('clubes').select('cash_balance').eq('id', id).single(),
  ]);

  if (entriesRes.error) return res.status(500).json({ error: 'DB_ERROR', message: entriesRes.error.message });
  if (clubeRes.error) return res.status(500).json({ error: 'DB_ERROR', message: clubeRes.error.message });

  res.json({
    entries: entriesRes.data ?? [],
    current_balance: parseFloat(clubeRes.data?.cash_balance ?? 0),
  });
});

// ── ROUTE GROUP 4 — OPERACIONAL ─────────────────────────────────────────────

// GET /api/v1/clubes/:id/operacional
router.get('/:id/operacional', authenticate, async (req, res) => {
  const { id } = req.params;

  const results = await Promise.allSettled([
    // A. Pending movimentacoes
    supabase.from('movimentacoes').select('*').eq('clube_id', id).in('status', ['aguardando_recursos', 'recursos_confirmados', 'convertido']),
    // B. Active estatuto
    supabase.from('estatuto_versoes').select('*').eq('clube_id', id).is('valid_until', null).order('valid_from', { ascending: false }).limit(1).maybeSingle(),
    // C. Active cotistas
    supabase.from('cotistas').select('*').eq('clube_id', id).eq('ativo', true),
    // D. Posicoes with asset group_id
    supabase.from('posicoes').select('*').eq('clube_id', id),
    // E. Clube row
    supabase.from('clubes').select('*').eq('id', id).single(),
    // F. Latest ledger entry
    supabase.from('ledger_entries').select('*').eq('clube_id', id).order('data', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const extract = (r) => r.status === 'fulfilled' ? r.value : { data: null, error: r.reason };

  const pendingMovs = extract(results[0]).data ?? [];
  const estatuto    = extract(results[1]).data;
  const cotistas    = extract(results[2]).data ?? [];
  const posicoes    = extract(results[3]).data ?? [];
  const clube       = extract(results[4]).data;
  const lastLedger  = extract(results[5]).data;

  // Fetch asset group_ids for posicoes
  const assetIds = posicoes.map(p => p.asset_id).filter(Boolean);
  let assetMap = {};
  if (assetIds.length > 0) {
    const { data: assets } = await supabase.from('assets').select('id, group_id').in('id', assetIds);
    assetMap = Object.fromEntries((assets ?? []).map(a => [a.id, a]));
  }
  const posWithAssets = posicoes.map(p => ({ ...p, asset: assetMap[p.asset_id] ?? null }));

  // Fetch cotista names for pending movimentacoes
  const cotistaNameMap = Object.fromEntries(cotistas.map(c => [c.id, c.nome]));

  const todayStr = today();
  const todayDate = new Date(todayStr + 'T12:00:00Z');

  // ── pendentes ──────────────────────────────────────────────────────────────
  const pendentes = pendingMovs.map(m => {
    const dataSol = new Date(m.data_solicitacao + 'T12:00:00Z');
    const diasPendente = Math.floor((todayDate - dataSol) / (1000 * 60 * 60 * 24));

    let isOverdue = false;
    if (m.status === 'aguardando_recursos') {
      isOverdue = diasPendente > (estatuto?.prazo_conversao_dias ?? 1);
    } else if (m.status === 'convertido' && m.tipo === 'resgate' && m.data_conversao) {
      const convDate = new Date(m.data_conversao + 'T12:00:00Z');
      const deadline = new Date(convDate);
      deadline.setUTCDate(deadline.getUTCDate() + (estatuto?.prazo_pagamento_dias ?? 5));
      isOverdue = todayDate > deadline;
    }

    return {
      movimentacao_id: m.id,
      cotista_nome: cotistaNameMap[m.cotista_id] ?? null,
      tipo: m.tipo,
      valor_brl: m.valor_brl,
      status: m.status,
      data_solicitacao: m.data_solicitacao,
      data_conversao: m.data_conversao,
      diasPendente,
      isOverdue,
      severity: classifyOperacionalSeverity({
        tipo: isOverdue ? 'overdue_payment' : 'pending_conversion',
        status: isOverdue ? 'vencido' : m.status,
        diasAtraso: isOverdue ? diasPendente : 0,
        diasParaPrazo: isOverdue ? -1 : null,
      }),
    };
  });

  // ── alertas_compliance ─────────────────────────────────────────────────────
  const alertas_compliance = [];
  if (clube && cotistas.length > 0) {
    const checks = validateCVMRules(clube, cotistas, posWithAssets);

    if (checks.rvCompliance.status !== 'ok') {
      alertas_compliance.push({
        tipo: 'compliance_breach',
        titulo: 'Enquadramento RV',
        descricao: checks.rvCompliance.message,
        severity: classifyOperacionalSeverity({ tipo: 'compliance_breach', rvPct: checks.rvCompliance.value * 100 }),
      });
    }
    if (checks.maxOwnership.status !== 'ok') {
      alertas_compliance.push({
        tipo: 'ownership_cap',
        titulo: 'Concentração de Cotas',
        descricao: checks.maxOwnership.message,
        severity: classifyOperacionalSeverity({
          tipo: checks.maxOwnership.status === 'critical' ? 'compliance_breach' : 'generic',
          maxEquityPct: checks.maxOwnership.value * 100,
        }),
      });
    }
    if (checks.memberCount.status !== 'ok') {
      alertas_compliance.push({
        tipo: 'member_count',
        titulo: 'Número de Cotistas',
        descricao: checks.memberCount.message,
        severity: classifyOperacionalSeverity({ memberCount: checks.memberCount.value }),
      });
    }
  }

  // ── proximos_prazos ────────────────────────────────────────────────────────
  const proximos_prazos = [];
  const now = new Date();

  // 1. Annual assembly — 120 days after fiscal year end (Dec 31)
  {
    let assemblyYear = now.getUTCFullYear();
    let deadline = new Date(Date.UTC(assemblyYear, 0, 1)); // Jan 1
    deadline.setUTCDate(deadline.getUTCDate() + 120);       // + 120 days = ~Apr 30
    if (todayDate > deadline) {
      assemblyYear++;
      deadline = new Date(Date.UTC(assemblyYear, 0, 1));
      deadline.setUTCDate(deadline.getUTCDate() + 120);
    }
    const diasParaPrazo = Math.ceil((deadline - todayDate) / (1000 * 60 * 60 * 24));
    proximos_prazos.push({
      tipo: 'assembly_deadline',
      titulo: 'Assembleia Ordinária',
      descricao: `Prazo: ${deadline.toISOString().split('T')[0]}`,
      diasParaPrazo,
      severity: classifyOperacionalSeverity({ tipo: 'assembly_deadline', diasParaPrazo }),
    });
  }

  // 2. Monthly Annex B — last business day of current month
  {
    const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    // Walk back if weekend
    while (lastDay.getUTCDay() === 0 || lastDay.getUTCDay() === 6) {
      lastDay.setUTCDate(lastDay.getUTCDate() - 1);
    }
    const diasParaPrazo = Math.ceil((lastDay - todayDate) / (1000 * 60 * 60 * 24));
    proximos_prazos.push({
      tipo: 'monthly_close',
      titulo: 'Fechamento Mensal / Anexo B',
      descricao: `Próximo fechamento: ${lastDay.toISOString().split('T')[0]}`,
      diasParaPrazo,
      severity: classifyOperacionalSeverity({ tipo: 'monthly_close', diasParaPrazo }),
    });
  }

  // 3. Periodic tax dates — last business day of May and November (Lei 14.754/2023)
  {
    const year = now.getUTCFullYear();
    const candidates = [
      new Date(Date.UTC(year, 4, 31)),     // May 31
      new Date(Date.UTC(year, 10, 30)),    // Nov 30
      new Date(Date.UTC(year + 1, 4, 31)), // May next year
    ];
    // Walk each back to a business day
    for (const d of candidates) {
      while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
        d.setUTCDate(d.getUTCDate() - 1);
      }
    }
    const upcoming = candidates.find(d => d >= todayDate) ?? candidates[candidates.length - 1];
    const diasParaPrazo = Math.ceil((upcoming - todayDate) / (1000 * 60 * 60 * 24));
    proximos_prazos.push({
      tipo: 'tax_date',
      titulo: 'Tributação Periódica (Lei 14.754/2023)',
      descricao: `Próximo evento: ${upcoming.toISOString().split('T')[0]}`,
      diasParaPrazo,
      severity: classifyOperacionalSeverity({ tipo: 'tax_date', diasParaPrazo }),
    });
  }

  // ── caixa ──────────────────────────────────────────────────────────────────
  const caixa = {
    current_balance: parseFloat(clube?.cash_balance ?? 0),
    last_entry: lastLedger ?? null,
  };

  res.json({
    pendentes: sortBySeverity(pendentes),
    alertas_compliance: sortBySeverity(alertas_compliance),
    proximos_prazos: sortBySeverity(proximos_prazos),
    caixa,
  });
});

// ── ROUTE GROUP 5 — SETUP CHECKLIST ─────────────────────────────────────────

// GET /api/v1/clubes/:id/setup-checklist
router.get('/:id/setup-checklist', authenticate, async (req, res) => {
  const { id } = req.params;

  const [estatutoRes, cotistasRes, posicoesRes, navRes] = await Promise.all([
    supabase.from('estatuto_versoes').select('*', { count: 'exact', head: true }).eq('clube_id', id),
    supabase.from('cotistas').select('*', { count: 'exact', head: true }).eq('clube_id', id).eq('ativo', true),
    supabase.from('posicoes').select('*', { count: 'exact', head: true }).eq('clube_id', id),
    supabase.from('nav_historico').select('*', { count: 'exact', head: true }).eq('clube_id', id),
  ]);

  for (const r of [estatutoRes, cotistasRes, posicoesRes, navRes]) {
    if (r.error) return res.status(500).json({ error: 'DB_ERROR', message: r.error.message });
  }

  const checklist = computeSetupChecklist({
    estatutos:  estatutoRes.count ?? 0,
    cotistas:   cotistasRes.count ?? 0,
    posicoes:   posicoesRes.count ?? 0,
    navEntries: navRes.count ?? 0,
  });

  res.json(checklist);
});

// ── ROUTE GROUP 6 — DOCUMENTOS ──────────────────────────────────────────────

// GET /api/v1/clubes/:id/documentos
router.get('/:id/documentos', authenticate, async (req, res) => {
  const { id } = req.params;
  const { cotista_id } = req.query;

  let query = supabase
    .from('documentos_gerados')
    .select('*')
    .eq('clube_id', id)
    .order('gerado_em', { ascending: false });

  if (cotista_id) query = query.eq('cotista_id', cotista_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  res.json(data ?? []);
});

// POST /api/v1/clubes/:id/documentos
router.post('/:id/documentos', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id } = req.params;
  const { tipo, periodo, cotista_id, payload_json } = req.body;

  const validTipos = ['informe_rendimentos', 'extrato_mensal', 'balancete', 'ata_assembleia', 'termo_adesao', 'anexo_b'];
  if (!tipo || !validTipos.includes(tipo)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: `tipo must be one of: ${validTipos.join(', ')}` });
  }

  // Application-level duplicate check (clube_id + tipo + periodo + cotista_id)
  let dupQuery = supabase.from('documentos_gerados').select('id', { count: 'exact', head: true })
    .eq('clube_id', id).eq('tipo', tipo);
  if (periodo)    dupQuery = dupQuery.eq('periodo', periodo);
  else            dupQuery = dupQuery.is('periodo', null);
  if (cotista_id) dupQuery = dupQuery.eq('cotista_id', cotista_id);
  else            dupQuery = dupQuery.is('cotista_id', null);
  const { count: dupCount, error: dupErr } = await dupQuery;
  if (dupErr) return res.status(500).json({ error: 'DB_ERROR', message: dupErr.message });
  if (dupCount > 0) {
    return res.status(409).json({ error: 'CONFLICT', message: 'Document already generated for this period.' });
  }

  const shareToken = crypto.randomUUID();
  const retencaoAte = new Date();
  retencaoAte.setUTCFullYear(retencaoAte.getUTCFullYear() + 5);
  const retencaoStr = retencaoAte.toISOString().split('T')[0];

  const row = {
    clube_id: Number(id),
    tipo,
    periodo: periodo ?? null,
    cotista_id: cotista_id ? Number(cotista_id) : null,
    payload_json: payload_json ?? null,
    share_token: shareToken,
    retencao_ate: retencaoStr,
  };

  const { data: created, error: insertErr } = await supabase
    .from('documentos_gerados')
    .insert(row)
    .select()
    .single();

  if (insertErr) {
    // Check for unique constraint violation
    if (insertErr.code === '23505') {
      return res.status(409).json({ error: 'CONFLICT', message: 'Document already generated for this period.' });
    }
    return res.status(500).json({ error: 'DB_ERROR', message: insertErr.message });
  }

  res.status(201).json(created);
});

// PATCH /api/v1/clubes/:id/documentos/:did/enviado
router.patch('/:id/documentos/:did/enviado', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id, did } = req.params;

  const { data, error } = await supabase
    .from('documentos_gerados')
    .update({ enviado_em: new Date().toISOString(), delivery_status: 'enviado' })
    .eq('id', did)
    .eq('clube_id', id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  if (!data) return res.status(404).json({ error: 'NOT_FOUND', message: 'Document not found' });
  res.json(data);
});

// ── ROUTE GROUP 7 — MEU ROLE ────────────────────────────────────────────────

// GET /api/v1/clubes/:id/meu-role
router.get('/:id/meu-role', authenticate, async (req, res) => {
  const { id } = req.params;

  // Two-step lookup: find cotista IDs for this user, then find their role
  const { data: cotistasForUser, error: cErr } = await supabase
    .from('cotistas')
    .select('id')
    .eq('clube_id', id)
    .eq('auth_user_id', req.user.id);

  if (cErr) return res.status(500).json({ error: 'DB_ERROR', message: cErr.message });

  if (!cotistasForUser || cotistasForUser.length === 0) {
    return res.json({ role: 'admin' }); // fallback for pre-role-system users
  }

  const cotistaIds = cotistasForUser.map(c => c.id);
  const { data: roles, error: rErr } = await supabase
    .from('clube_roles')
    .select('role')
    .eq('clube_id', id)
    .in('cotista_id', cotistaIds)
    .limit(1)
    .maybeSingle();

  if (rErr) return res.status(500).json({ error: 'DB_ERROR', message: rErr.message });
  if (!roles) return res.json({ role: 'admin' }); // fallback

  res.json({ role: roles.role });
});

// ── ROUTE GROUP 8 — ASSEMBLEIAS ──��──────────────────────────────────────────

// GET /api/v1/clubes/:id/assembleias
router.get('/:id/assembleias', authenticate, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('assembleias')
    .select('*')
    .eq('clube_id', id)
    .order('data_realizacao', { ascending: false });
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  const todayStr = today();
  const todayDate = new Date(todayStr + 'T12:00:00Z');
  const enriched = (data ?? []).map(a => {
    let diasParaB3 = null;
    let b3Urgency = null;
    if (a.status === 'realizada' && !a.b3_enviada_em) {
      const realizacao = new Date(a.data_realizacao + 'T12:00:00Z');
      const diffDays = Math.floor((todayDate - realizacao) / (1000 * 60 * 60 * 24));
      diasParaB3 = 10 - diffDays;
      b3Urgency = diasParaB3 < 0 ? 'overdue' : diasParaB3 < 3 ? 'urgent' : diasParaB3 < 7 ? 'warning' : 'ok';
    } else if (a.b3_enviada_em) {
      b3Urgency = null;
    }
    return { ...a, diasParaB3, b3Urgency };
  });

  res.json(enriched);
});

// POST /api/v1/clubes/:id/assembleias
router.post('/:id/assembleias', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id } = req.params;
  const { tipo, data_realizacao, data_convocacao, pauta } = req.body;

  if (!data_realizacao) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'data_realizacao is required' });
  if (!tipo || !['ordinaria', 'extraordinaria'].includes(tipo)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'tipo must be ordinaria or extraordinaria' });
  }
  if (!Array.isArray(pauta) || pauta.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'pauta must be a non-empty array' });
  }

  let warning = null;
  if (tipo === 'ordinaria') {
    const realDate = new Date(data_realizacao + 'T12:00:00Z');
    const prevDec31 = new Date(Date.UTC(realDate.getUTCFullYear() - 1, 11, 31));
    const diffDays = Math.floor((realDate - prevDec31) / (1000 * 60 * 60 * 24));
    if (diffDays > 120) warning = 'AGO_PRAZO_EXCEDIDO';
  }

  const { data, error } = await supabase
    .from('assembleias')
    .insert({
      clube_id: Number(id),
      tipo,
      data_realizacao,
      data_convocacao: data_convocacao ?? null,
      pauta,
      status: 'agendada',
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  writeAuditLog({ clube_id: Number(id), user_id: req.user.id, action: 'assembleia.create', table_name: 'assembleias', record_id: String(data.id), after_state: data });

  const response = { ...data };
  if (warning) response.warning = warning;
  res.status(201).json(response);
});

// GET /api/v1/clubes/:id/assembleias/:aid
router.get('/:id/assembleias/:aid', authenticate, async (req, res) => {
  const { id, aid } = req.params;

  const { data: assembleia, error: aErr } = await supabase
    .from('assembleias')
    .select('*')
    .eq('id', aid)
    .eq('clube_id', id)
    .maybeSingle();
  if (aErr) return res.status(500).json({ error: 'DB_ERROR', message: aErr.message });
  if (!assembleia) return res.status(404).json({ error: 'NOT_FOUND', message: 'Assembleia not found' });

  // Fetch votes with cotista names
  const { data: votosRaw, error: vErr } = await supabase
    .from('assembleias_votos')
    .select('*')
    .eq('assembleia_id', aid);
  if (vErr) return res.status(500).json({ error: 'DB_ERROR', message: vErr.message });

  const { data: cotistasData } = await supabase
    .from('cotistas')
    .select('id, nome')
    .eq('clube_id', id);
  const nameMap = Object.fromEntries((cotistasData ?? []).map(c => [c.id, c.nome]));

  const votos = (votosRaw ?? []).map(v => ({
    ...v,
    cotista_nome: nameMap[v.cotista_id] ?? null,
  }));

  // Compute pauta_summary
  const pautaItems = Array.isArray(assembleia.pauta) ? assembleia.pauta : [];
  const totalCotistas = (cotistasData ?? []).length;
  const pauta_summary = pautaItems.map((item, idx) => {
    const itemVotes = votos.filter(v => v.pauta_item_idx === idx);
    const favor = itemVotes.filter(v => v.voto === 'favor').length;
    const contra = itemVotes.filter(v => v.voto === 'contra').length;
    const abstencao = itemVotes.filter(v => v.voto === 'abstencao').length;
    const pendente = totalCotistas - favor - contra - abstencao;
    return { ...item, idx, favor, contra, abstencao, pendente };
  });

  // B3 urgency
  let diasParaB3 = null, b3Urgency = null;
  if (assembleia.status === 'realizada' && !assembleia.b3_enviada_em) {
    const todayDate = new Date(today() + 'T12:00:00Z');
    const realizacao = new Date(assembleia.data_realizacao + 'T12:00:00Z');
    const diffDays = Math.floor((todayDate - realizacao) / (1000 * 60 * 60 * 24));
    diasParaB3 = 10 - diffDays;
    b3Urgency = diasParaB3 < 0 ? 'overdue' : diasParaB3 < 3 ? 'urgent' : diasParaB3 < 7 ? 'warning' : 'ok';
  }

  res.json({ ...assembleia, votos, pauta_summary, diasParaB3, b3Urgency });
});

// PATCH /api/v1/clubes/:id/assembleias/:aid
router.patch('/:id/assembleias/:aid', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id, aid } = req.params;
  const { status: newStatus, ata, b3_enviada_em, membros_notif_em, quorum_presente, data_convocacao } = req.body;

  const { data: current, error: fErr } = await supabase
    .from('assembleias').select('*').eq('id', aid).eq('clube_id', id).maybeSingle();
  if (fErr) return res.status(500).json({ error: 'DB_ERROR', message: fErr.message });
  if (!current) return res.status(404).json({ error: 'NOT_FOUND', message: 'Assembleia not found' });

  const updates = { updated_at: new Date().toISOString() };

  if (newStatus) {
    const transitions = {
      agendada: ['convocada', 'cancelada'],
      convocada: ['votacao_aberta', 'cancelada'],
      votacao_aberta: ['realizada', 'cancelada'],
      realizada: [],
      cancelada: [],
    };
    const allowed = transitions[current.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({ error: 'INVALID_TRANSITION', message: `Cannot transition from ${current.status} to ${newStatus}` });
    }
    updates.status = newStatus;
  }

  if (ata !== undefined) updates.ata = ata;
  if (b3_enviada_em) updates.b3_enviada_em = new Date().toISOString();
  if (membros_notif_em) updates.membros_notif_em = new Date().toISOString();
  if (quorum_presente !== undefined) updates.quorum_presente = Number(quorum_presente);
  if (data_convocacao !== undefined) updates.data_convocacao = data_convocacao;

  const { data: updated, error: uErr } = await supabase
    .from('assembleias').update(updates).eq('id', aid).select().single();
  if (uErr) return res.status(500).json({ error: 'DB_ERROR', message: uErr.message });

  writeAuditLog({ clube_id: Number(id), user_id: req.user.id, action: 'assembleia.update', table_name: 'assembleias', record_id: String(aid), after_state: updated });

  res.json(updated);
});

// POST /api/v1/clubes/:id/assembleias/:aid/votos
router.post('/:id/assembleias/:aid/votos', authenticate, async (req, res) => {
  const { id, aid } = req.params;
  const { cotista_id, pauta_item_idx, voto } = req.body;

  // Validate assembly status
  const { data: assembleia, error: aErr } = await supabase
    .from('assembleias').select('status, pauta').eq('id', aid).eq('clube_id', id).maybeSingle();
  if (aErr) return res.status(500).json({ error: 'DB_ERROR', message: aErr.message });
  if (!assembleia) return res.status(404).json({ error: 'NOT_FOUND', message: 'Assembleia not found' });

  if (assembleia.status !== 'votacao_aberta') {
    return res.status(409).json({ error: 'VOTACAO_NAO_ABERTA', message: 'Voting is not open for this assembly' });
  }

  const pautaLen = Array.isArray(assembleia.pauta) ? assembleia.pauta.length : 0;
  if (pauta_item_idx < 0 || pauta_item_idx >= pautaLen) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: `pauta_item_idx must be 0-${pautaLen - 1}` });
  }
  if (!['favor', 'contra', 'abstencao'].includes(voto)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'voto must be favor, contra, or abstencao' });
  }

  const { data, error } = await supabase
    .from('assembleias_votos')
    .upsert({
      assembleia_id: Number(aid),
      cotista_id: Number(cotista_id),
      pauta_item_idx,
      voto,
    }, { onConflict: 'assembleia_id,cotista_id,pauta_item_idx' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  res.status(201).json(data);
});

// ── ROUTE GROUP 9 — REENQUADRAMENTO ─────────────────────────────────────────

// GET /api/v1/clubes/:id/reenquadramento
router.get('/:id/reenquadramento', authenticate, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('reenquadramento_events')
    .select('*')
    .eq('clube_id', id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  const todayDate = new Date(today() + 'T12:00:00Z');
  const enriched = (data ?? []).map(ev => {
    let diasAberto = null;
    if (ev.status !== 'resolvido') {
      const det = new Date(ev.data_deteccao + 'T12:00:00Z');
      diasAberto = Math.floor((todayDate - det) / (1000 * 60 * 60 * 24));
    }
    return { ...ev, diasAberto };
  });
  res.json(enriched);
});

// POST /api/v1/clubes/:id/reenquadramento
router.post('/:id/reenquadramento', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id } = req.params;
  const { tipo_violacao, descricao, data_deteccao } = req.body;

  if (!tipo_violacao) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'tipo_violacao is required' });
  if (!descricao) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'descricao is required' });

  const { data, error } = await supabase
    .from('reenquadramento_events')
    .insert({
      clube_id: Number(id),
      tipo_violacao,
      descricao,
      data_deteccao: data_deteccao ?? today(),
      status: 'aberto',
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  writeAuditLog({ clube_id: Number(id), user_id: req.user.id, action: 'reenquadramento.create', table_name: 'reenquadramento_events', record_id: String(data.id), after_state: data });
  res.status(201).json(data);
});

// GET /api/v1/clubes/:id/reenquadramento/:rid
router.get('/:id/reenquadramento/:rid', authenticate, async (req, res) => {
  const { id, rid } = req.params;
  const { data, error } = await supabase
    .from('reenquadramento_events')
    .select('*')
    .eq('id', rid)
    .eq('clube_id', id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  if (!data) return res.status(404).json({ error: 'NOT_FOUND', message: 'Reenquadramento event not found' });

  let diasAberto = null;
  if (data.status !== 'resolvido') {
    const todayDate = new Date(today() + 'T12:00:00Z');
    const det = new Date(data.data_deteccao + 'T12:00:00Z');
    diasAberto = Math.floor((todayDate - det) / (1000 * 60 * 60 * 24));
  }
  res.json({ ...data, diasAberto });
});

// PATCH /api/v1/clubes/:id/reenquadramento/:rid
router.patch('/:id/reenquadramento/:rid', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id, rid } = req.params;
  const { status: newStatus, acao_tomada, evidencia_url, data_resolucao } = req.body;

  const { data: current, error: fErr } = await supabase
    .from('reenquadramento_events').select('*').eq('id', rid).eq('clube_id', id).maybeSingle();
  if (fErr) return res.status(500).json({ error: 'DB_ERROR', message: fErr.message });
  if (!current) return res.status(404).json({ error: 'NOT_FOUND', message: 'Event not found' });

  const updates = { updated_at: new Date().toISOString() };

  if (newStatus) {
    const transitions = { aberto: ['em_correcao'], em_correcao: ['resolvido'], resolvido: [] };
    const allowed = transitions[current.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({ error: 'INVALID_TRANSITION', message: `Cannot transition from ${current.status} to ${newStatus}` });
    }
    if (newStatus === 'resolvido') {
      const finalAcao = acao_tomada ?? current.acao_tomada;
      if (!finalAcao) {
        return res.status(400).json({ error: 'ACAO_REQUIRED', message: 'acao_tomada is required to mark as resolvido' });
      }
      updates.data_resolucao = data_resolucao ?? today();
    }
    updates.status = newStatus;
  }

  if (acao_tomada !== undefined) updates.acao_tomada = acao_tomada;
  if (evidencia_url !== undefined) updates.evidencia_url = evidencia_url;

  const { data: updated, error: uErr } = await supabase
    .from('reenquadramento_events').update(updates).eq('id', rid).select().single();
  if (uErr) return res.status(500).json({ error: 'DB_ERROR', message: uErr.message });

  writeAuditLog({ clube_id: Number(id), user_id: req.user.id, action: 'reenquadramento.update', table_name: 'reenquadramento_events', record_id: String(rid), after_state: updated });
  res.json(updated);
});

// ── ROUTE GROUP 10 — TRIBUTAÇÃO ───────────────────────────────────────��──────

// POST /api/v1/clubes/:id/tributacao/simular
router.post('/:id/tributacao/simular', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id } = req.params;
  const dataRef = req.body.data_referencia ?? today();

  try {
    const estatuto = await getActiveEstatuto(Number(id));
    if (!estatuto) return res.status(400).json({ error: 'NO_STATUTE', message: 'No active statute found' });

    const [cotRes, trRes, navRes] = await Promise.all([
      supabase.from('cotistas').select('*').eq('clube_id', id).eq('ativo', true),
      supabase.from('cotas_tranches').select('*').eq('clube_id', id).gt('cotas_restantes', 0),
      supabase.from('nav_historico').select('valor_cota').eq('clube_id', id).order('data', { ascending: false }).limit(1),
    ]);

    const cotistas = cotRes.data ?? [];
    const tranches = trRes.data ?? [];
    const valorCota = parseFloat(navRes.data?.[0]?.valor_cota ?? 0);
    if (!valorCota) return res.status(400).json({ error: 'NO_NAV', message: 'No NAV recorded' });

    const irrfRate = estatuto.irrf_rate ?? 0.15;
    const regime = estatuto.regime_tributario ?? 'fia';

    const perMember = cotistas.map(c => {
      const memberTranches = tranches.filter(t => Number(t.cotista_id) === Number(c.id));
      let totalCotas = parseFloat(c.cotas_detidas ?? 0);
      let costBasis = 0;
      let earliest = null;
      for (const t of memberTranches) {
        costBasis += parseFloat(t.cotas_restantes) * parseFloat(t.valor_cota_aquisicao);
        if (!earliest || t.data_aquisicao < earliest) earliest = t.data_aquisicao;
      }
      if (memberTranches.length === 0) costBasis = totalCotas * valorCota;

      const currentValue = totalCotas * valorCota;
      const gain = currentValue - costBasis;
      if (gain <= 0) {
        return { cotista_id: c.id, cotista_nome: c.nome, cotas_detidas: totalCotas, currentValue, costBasis, gain: 0, taxBrl: 0, cotasACancelar: 0, newCotas: totalCotas, irrfRate, hasGain: false };
      }

      let effectiveRate = irrfRate;
      if (regime !== 'fia' && earliest) {
        const days = Math.floor((new Date(dataRef) - new Date(earliest)) / 86400000);
        effectiveRate = days <= 180 ? 0.225 : days <= 360 ? 0.200 : days <= 720 ? 0.175 : 0.150;
      }

      const taxBrl = gain * effectiveRate;
      const cotasACancelar = taxBrl / valorCota;
      return { cotista_id: c.id, cotista_nome: c.nome, cotas_detidas: totalCotas, currentValue, costBasis, gain, taxBrl, cotasACancelar, newCotas: totalCotas - cotasACancelar, irrfRate: effectiveRate, hasGain: true };
    });

    res.json({
      dataReferencia: dataRef, regime, irrfRate, perMember,
      totalTaxBrl: perMember.reduce((s, m) => s + m.taxBrl, 0),
      totalCotasACancelar: perMember.reduce((s, m) => s + m.cotasACancelar, 0),
      membersWithGain: perMember.filter(m => m.hasGain).length,
      totalMembers: cotistas.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// POST /api/v1/clubes/:id/tributacao/executar
router.post('/:id/tributacao/executar', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id } = req.params;
  const dataRef = req.body.data_referencia ?? today();

  try {
    // Re-compute (same logic as simular)
    const estatuto = await getActiveEstatuto(Number(id));
    if (!estatuto) return res.status(400).json({ error: 'NO_STATUTE', message: 'No active statute found' });

    const [cotRes, trRes, navRes, clubeRes] = await Promise.all([
      supabase.from('cotistas').select('*').eq('clube_id', id).eq('ativo', true),
      supabase.from('cotas_tranches').select('*').eq('clube_id', id).gt('cotas_restantes', 0),
      supabase.from('nav_historico').select('valor_cota').eq('clube_id', id).order('data', { ascending: false }).limit(1),
      supabase.from('clubes').select('cash_balance, cotas_emitidas_total').eq('id', id).single(),
    ]);

    const cotistas = cotRes.data ?? [];
    const tranches = trRes.data ?? [];
    const valorCota = parseFloat(navRes.data?.[0]?.valor_cota ?? 0);
    if (!valorCota) return res.status(400).json({ error: 'NO_NAV', message: 'No NAV recorded' });

    const irrfRate = estatuto.irrf_rate ?? 0.15;
    const regime = estatuto.regime_tributario ?? 'fia';
    let cashBalance = parseFloat(clubeRes.data?.cash_balance ?? 0);
    let cotasTotal = parseFloat(clubeRes.data?.cotas_emitidas_total ?? 0);
    let totalTaxBrl = 0;
    let membersAffected = 0;
    let darfsGerados = 0;
    const periodo = dataRef.slice(0, 7);

    for (const c of cotistas) {
      const memberTranches = tranches.filter(t => Number(t.cotista_id) === Number(c.id));
      let totalCotas = parseFloat(c.cotas_detidas ?? 0);
      let costBasis = 0;
      let earliest = null;
      for (const t of memberTranches) {
        costBasis += parseFloat(t.cotas_restantes) * parseFloat(t.valor_cota_aquisicao);
        if (!earliest || t.data_aquisicao < earliest) earliest = t.data_aquisicao;
      }
      if (memberTranches.length === 0) costBasis = totalCotas * valorCota;

      const currentValue = totalCotas * valorCota;
      const gain = currentValue - costBasis;
      if (gain <= 0) continue;

      let effectiveRate = irrfRate;
      if (regime !== 'fia' && earliest) {
        const days = Math.floor((new Date(dataRef) - new Date(earliest)) / 86400000);
        effectiveRate = days <= 180 ? 0.225 : days <= 360 ? 0.200 : days <= 720 ? 0.175 : 0.150;
      }

      const taxBrl = round2(gain * effectiveRate);
      const cotasACancelar = round6(taxBrl / valorCota);
      const newCotas = round6(totalCotas - cotasACancelar);

      // 1. Deduct cotas from cotista
      const { error: e1 } = await supabase.from('cotistas').update({ cotas_detidas: newCotas }).eq('id', c.id);
      if (e1) throw new Error(`Failed to update cotista ${c.id}: ${e1.message}`);

      // 2. Ledger entry
      cashBalance -= taxBrl;
      const { error: e2 } = await supabase.from('ledger_entries').insert({
        clube_id: Number(id), data: dataRef, tipo: 'irrf',
        valor_brl: -taxBrl, running_balance: round2(cashBalance),
        ref_type: 'tributacao', descricao: `IRRF periódico - ${c.nome}`,
      });
      if (e2) throw new Error(`Failed to insert ledger: ${e2.message}`);

      // 3. DARF document
      const { error: e3 } = await supabase.from('documentos_gerados').insert({
        clube_id: Number(id), tipo: 'darf', periodo, cotista_id: c.id,
        payload_json: { cotista_nome: c.nome, gain: round2(gain), taxBrl, effectiveRate, cotas_canceladas: cotasACancelar },
        share_token: crypto.randomUUID(),
        retencao_ate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0],
      });
      if (e3) console.error(`DARF insert failed for ${c.id}: ${e3.message}`);

      totalTaxBrl += taxBrl;
      cotasTotal -= cotasACancelar;
      membersAffected++;
      darfsGerados++;
    }

    // Update clube totals
    await supabase.from('clubes').update({
      cash_balance: round2(cashBalance),
      cotas_emitidas_total: round6(cotasTotal),
    }).eq('id', id);

    // Audit log
    writeAuditLog({ clube_id: Number(id), user_id: req.user.id, action: 'tributacao.executar', table_name: 'clubes', record_id: String(id), after_state: { totalTaxBrl, membersAffected, dataRef } });

    res.status(201).json({ totalTaxBrl: round2(totalTaxBrl), membersAffected, darfsGerados, dataReferencia: dataRef });
  } catch (err) {
    res.status(500).json({ error: 'EXECUTION_ERROR', message: err.message });
  }
});

// GET /api/v1/clubes/:id/tributacao/historico
router.get('/:id/tributacao/historico', authenticate, async (req, res) => {
  const { id } = req.params;
  // Fetch from audit_log for tributacao events
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('clube_id', id)
    .eq('action', 'tributacao.executar')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  res.json(data ?? []);
});

// ── ROUTE GROUP 11 — DOCUMENT ARCHIVE + IR ──────────────────────────────────

// GET /api/v1/clubes/:id/documentos/archive
router.get('/:id/documentos/archive', authenticate, async (req, res) => {
  const { id } = req.params;
  const { tipo, periodo, cotista_id, limit: lim } = req.query;
  const maxRows = Math.min(Number(lim) || 50, 200);

  let query = supabase
    .from('documentos_gerados')
    .select('*')
    .eq('clube_id', id)
    .order('created_at', { ascending: false })
    .limit(maxRows);

  if (tipo) query = query.eq('tipo', tipo);
  if (periodo) query = query.eq('periodo', periodo);
  if (cotista_id) query = query.eq('cotista_id', cotista_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });

  // Join cotista names
  const cotistaIds = [...new Set((data ?? []).filter(d => d.cotista_id).map(d => d.cotista_id))];
  let nameMap = {};
  if (cotistaIds.length > 0) {
    const { data: cots } = await supabase.from('cotistas').select('id, nome').in('id', cotistaIds);
    nameMap = Object.fromEntries((cots ?? []).map(c => [c.id, c.nome]));
  }

  const enriched = (data ?? []).map(d => ({
    ...d,
    cotista_nome: d.cotista_id ? (nameMap[d.cotista_id] ?? null) : null,
  }));

  res.json(enriched);
});

// POST /api/v1/clubes/:id/documentos/ir/:year
router.post('/:id/documentos/ir/:year', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id, year } = req.params;
  const yearNum = Number(year);

  try {
    // Fetch cotistas
    const { data: cotistas, error: cErr } = await supabase
      .from('cotistas').select('*').eq('clube_id', id).eq('ativo', true);
    if (cErr) throw cErr;

    // Fetch nav closest to Dec 31
    const dec31 = `${yearNum}-12-31`;
    const { data: navRows } = await supabase
      .from('nav_historico').select('valor_cota, data')
      .eq('clube_id', id).lte('data', dec31)
      .order('data', { ascending: false }).limit(1);
    const valorCotaDec31 = parseFloat(navRows?.[0]?.valor_cota ?? 0);

    // Fetch tranches
    const { data: tranches } = await supabase
      .from('cotas_tranches').select('*').eq('clube_id', id);

    const generated = [];
    const retencaoAte = `${yearNum + 5}-12-31`;

    for (const c of (cotistas ?? [])) {
      const memberTranches = (tranches ?? []).filter(
        t => Number(t.cotista_id) === Number(c.id) && t.data_aquisicao <= dec31 && t.cotas_restantes > 0
      );

      const cotasEm31Dez = memberTranches.reduce((s, t) => s + parseFloat(t.cotas_restantes), 0) || parseFloat(c.cotas_detidas ?? 0);
      const custoMedio = memberTranches.length > 0
        ? memberTranches.reduce((s, t) => s + parseFloat(t.cotas_restantes) * parseFloat(t.valor_cota_aquisicao), 0) / cotasEm31Dez
        : valorCotaDec31;
      const valorTotal = cotasEm31Dez * valorCotaDec31;
      const ganhoNaoRealizado = valorTotal - (cotasEm31Dez * custoMedio);

      const payload = {
        ano: yearNum,
        cotista_nome: c.nome,
        cotas_em_31dez: round6(cotasEm31Dez),
        valor_cota_31dez: round2(valorCotaDec31),
        valor_total_31dez: round2(valorTotal),
        custo_medio_aquisicao: round2(custoMedio),
        ganho_nao_realizado: round2(ganhoNaoRealizado),
      };

      const { data: doc, error: dErr } = await supabase
        .from('documentos_gerados')
        .upsert({
          clube_id: Number(id),
          tipo: 'declaracao_ir',
          periodo: String(yearNum),
          cotista_id: c.id,
          payload_json: payload,
          share_token: crypto.randomUUID(),
          retencao_ate: retencaoAte,
        }, { onConflict: 'clube_id,tipo,periodo,cotista_id', ignoreDuplicates: false })
        .select()
        .single();

      if (!dErr && doc) generated.push(doc);
    }

    res.status(201).json({ generated: generated.length, year: yearNum, cotistas: generated });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// ── ROUTE GROUP 12 — ANNUAL CLOSE ───────────────────────────────────────────

// GET /api/v1/clubes/:id/annual-close/:year
router.get('/:id/annual-close/:year', authenticate, async (req, res) => {
  const { id, year } = req.params;
  const yearNum = Number(year);

  try {
    // 1. Pending movimentacoes
    const { count: movPending } = await supabase
      .from('movimentacoes')
      .select('*', { count: 'exact', head: true })
      .eq('clube_id', id)
      .gte('data_solicitacao', `${yearNum}-01-01`)
      .lte('data_solicitacao', `${yearNum}-12-31`)
      .not('status', 'in', '("pago","cancelado")');

    // 2. Compliance check
    const { data: lastNav } = await supabase
      .from('nav_historico').select('percentual_rv')
      .eq('clube_id', id).order('data', { ascending: false }).limit(1);
    const complianceOk = (lastNav?.[0]?.percentual_rv ?? 0) >= 0.67 || !lastNav?.length;

    // 3. AGO realizada
    const { count: agoCount } = await supabase
      .from('assembleias')
      .select('*', { count: 'exact', head: true })
      .eq('clube_id', id)
      .eq('tipo', 'ordinaria')
      .eq('status', 'realizada')
      .or(`and(data_realizacao.gte.${yearNum}-01-01,data_realizacao.lte.${yearNum}-12-31),and(data_realizacao.gte.${yearNum + 1}-01-01,data_realizacao.lte.${yearNum + 1}-04-30)`);

    // 4. Relatório anual
    const { count: relCount } = await supabase
      .from('documentos_gerados')
      .select('*', { count: 'exact', head: true })
      .eq('clube_id', id)
      .eq('tipo', 'relatorio_anual')
      .like('periodo', `${yearNum}%`);

    // 5. IR declarations
    const { count: irCount } = await supabase
      .from('documentos_gerados')
      .select('*', { count: 'exact', head: true })
      .eq('clube_id', id)
      .eq('tipo', 'declaracao_ir')
      .eq('periodo', String(yearNum));

    const { count: activeCotistas } = await supabase
      .from('cotistas')
      .select('*', { count: 'exact', head: true })
      .eq('clube_id', id)
      .eq('ativo', true);

    const movimentacoesPendentes = movPending ?? 0;
    const assembleiaAgoRealizada = (agoCount ?? 0) > 0;
    const relatorioAnualGerado = (relCount ?? 0) > 0;
    const declaracoesIrGeradas = (irCount ?? 0) >= (activeCotistas ?? 1);

    const checks = [
      movimentacoesPendentes === 0,
      complianceOk,
      assembleiaAgoRealizada,
      relatorioAnualGerado,
      declaracoesIrGeradas,
    ];

    res.json({
      year: yearNum,
      complete: checks.every(Boolean),
      completedCount: checks.filter(Boolean).length,
      steps: [
        { key: 'movimentacoes_pendentes', label: 'Sem pendências operacionais', done: movimentacoesPendentes === 0, detail: movimentacoesPendentes > 0 ? `${movimentacoesPendentes} pendente(s)` : null, ctaPath: '/clube', ctaTab: 'operacional' },
        { key: 'compliance_ok', label: 'Enquadramento RV ≥ 67%', done: complianceOk, ctaPath: '/clube/reenquadramento' },
        { key: 'assembleia_ago_realizada', label: 'AGO realizada', done: assembleiaAgoRealizada, ctaPath: '/clube/governanca' },
        { key: 'relatorio_anual_gerado', label: 'Relatório anual gerado', done: relatorioAnualGerado, ctaPath: '/clube/report' },
        { key: 'declaracoes_ir_geradas', label: 'Declarações IR geradas', done: declaracoesIrGeradas, ctaPath: '/clube/report' },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

// ── ROUTE GROUP 13 — AUDIT LOG + LGPD EXPORT ────────────────────────────────

// GET /api/v1/clubes/:id/audit-log
router.get('/:id/audit-log', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  let query = supabase
    .from('audit_log')
    .select('*')
    .eq('clube_id', id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (req.query.action) query = query.eq('action', req.query.action);
  if (req.query.table_name) query = query.eq('table_name', req.query.table_name);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'DB_ERROR', message: error.message });
  res.json(data ?? []);
});

// GET /api/v1/clubes/:id/cotistas/:cid/export
router.get('/:id/cotistas/:cid/export', authenticate, requireRole('club_manager'), async (req, res) => {
  const { id, cid } = req.params;

  try {
    const [cotRes, movRes, trRes, histRes, docRes, votRes] = await Promise.all([
      supabase.from('cotistas').select('*').eq('id', cid).eq('clube_id', id).single(),
      supabase.from('movimentacoes').select('*').eq('clube_id', id).eq('cotista_id', cid),
      supabase.from('cotas_tranches').select('*').eq('clube_id', id).eq('cotista_id', cid),
      supabase.from('cotistas_historico').select('*').eq('clube_id', id).eq('cotista_id', cid),
      supabase.from('documentos_gerados').select('*').eq('clube_id', id).eq('cotista_id', cid),
      supabase.from('assembleias_votos').select('*').eq('cotista_id', cid),
    ]);

    if (cotRes.error) return res.status(500).json({ error: 'DB_ERROR', message: cotRes.error.message });
    if (!cotRes.data) return res.status(404).json({ error: 'NOT_FOUND', message: 'Cotista not found' });

    const exportData = {
      cotista: cotRes.data,
      movimentacoes: movRes.data ?? [],
      cotas_tranches: trRes.data ?? [],
      cotistas_historico: histRes.data ?? [],
      documentos: docRes.data ?? [],
      votos: votRes.data ?? [],
      exported_at: new Date().toISOString(),
      exported_by: req.user.id,
    };

    const nome = cotRes.data.nome?.replace(/\s+/g, '_') ?? 'cotista';
    res.setHeader('Content-Disposition', `attachment; filename="lgpd_${nome}_${new Date().getFullYear()}.json"`);
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

export default router;
