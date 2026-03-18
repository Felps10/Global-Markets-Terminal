import { Router }   from 'express';
import { supabase } from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

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
router.post('/', authenticate, requireAdmin, async (req, res) => {
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
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
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
router.put('/:id/posicoes', authenticate, requireAdmin, async (req, res) => {
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
router.post('/:id/cotistas', authenticate, requireAdmin, async (req, res) => {
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
router.put('/:id/cotistas/:cid', authenticate, requireAdmin, async (req, res) => {
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
router.post('/:id/nav', authenticate, requireAdmin, async (req, res) => {
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

export default router;
