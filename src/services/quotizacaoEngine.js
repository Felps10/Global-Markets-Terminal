// ── Quotização Engine ────────────────────────────────────────────────────────
// CVM compliance, movimentação preview, penalty computation, and setup checklist
// for Brazilian investment clubs (clubes de investimento).

/**
 * Add business days (Mon–Fri) to a date string.
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @param {number} days    - number of business days to add
 * @returns {string} ISO date string
 */
export function addBusinessDays(dateStr, days) {
  const date = new Date(dateStr + 'T12:00:00Z');
  let added = 0;
  while (added < days) {
    date.setUTCDate(date.getUTCDate() + 1);
    const dow = date.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return date.toISOString().split('T')[0];
}

/**
 * Compute a preview for an aporte or resgate, enforcing CVM hard rules.
 *
 * @returns {{ allowed: boolean, violations: string[], warnings: string[], dataConversaoMin: string,
 *             cotasDelta?: number, newEquityPct?: number }}
 */
export function computeMovimentacaoPreview(
  tipo, valorBrl, currentValorCota, cotistas, targetCotistaId,
  estatuto, dataSolicitacao, emEspecie, aprovacaoUnanime,
) {
  const violations = [];
  const warnings   = [];

  // ── Conversion date ────────────────────────────────────────────────────────
  const prazoConversao = estatuto?.prazo_conversao_dias ?? 1;
  const dataConversaoMin = addBusinessDays(dataSolicitacao, prazoConversao);

  // ── Cotas delta ────────────────────────────────────────────────────────────
  const cotasDelta = tipo === 'aporte'
    ? Math.round((valorBrl / currentValorCota) * 1_000_000) / 1_000_000
    : -Math.round((valorBrl / currentValorCota) * 1_000_000) / 1_000_000;

  // ── Find target cotista ────────────────────────────────────────────────────
  const target = cotistas.find(c => Number(c.id) === Number(targetCotistaId));
  if (!target) {
    return { allowed: false, violations: ['Cotista not found among active members'], warnings, dataConversaoMin };
  }

  // ── Compute post-operation equity percentages ──────────────────────────────
  const totalCotasNow = cotistas.reduce((s, c) => s + parseFloat(c.cotas_detidas), 0);
  const targetCotasNow = parseFloat(target.cotas_detidas);
  const newTargetCotas = targetCotasNow + cotasDelta;
  const newTotalCotas  = totalCotasNow + cotasDelta;

  if (tipo === 'resgate' && newTargetCotas < 0) {
    violations.push(`Resgate would result in negative cotas (${newTargetCotas.toFixed(6)})`);
  }

  // ── CVM 40% ownership cap (ICVM 494 Art. 29) ──────────────────────────────
  const newEquityPct = newTotalCotas > 0 ? newTargetCotas / newTotalCotas : 0;
  if (newEquityPct > 0.40) {
    violations.push(
      `Cotista would hold ${(newEquityPct * 100).toFixed(2)}% of total cotas, exceeding the CVM 40% cap`
    );
  } else if (newEquityPct > 0.35) {
    warnings.push(
      `Cotista would hold ${(newEquityPct * 100).toFixed(2)}% — approaching the 40% CVM cap`
    );
  }

  // ── CVM member count (min 3, max 50) ───────────────────────────────────────
  const activeMemberCount = cotistas.filter(c => parseFloat(c.cotas_detidas) > 0 || Number(c.id) === Number(targetCotistaId)).length;
  if (tipo === 'resgate' && newTargetCotas <= 0) {
    const postCount = activeMemberCount - 1;
    if (postCount < 3) {
      violations.push(`Resgate would reduce active members to ${postCount}, below the CVM minimum of 3`);
    }
  }

  // ── Em espécie requires unanimous approval ─────────────────────────────────
  if (emEspecie === false && tipo === 'resgate' && !aprovacaoUnanime) {
    warnings.push('Resgate em ativos (não em espécie) typically requires unanimous approval');
  }

  return {
    allowed: violations.length === 0,
    violations,
    warnings,
    dataConversaoMin,
    cotasDelta: Math.abs(cotasDelta),
    newEquityPct,
  };
}

/**
 * Validate CVM compliance rules for a clube.
 *
 * @param {object} clube    - clube row (with cash_balance)
 * @param {object[]} cotistas - active cotistas
 * @param {object[]} posicoes - posicoes with asset.group_id
 * @returns {{ rvCompliance: object, maxOwnership: object, memberCount: object }}
 */
export function validateCVMRules(clube, cotistas, posicoes) {
  const checks = {};

  // ── 67% equities requirement ───────────────────────────────────────────────
  const totalWeight = posicoes.reduce((s, p) => s + parseFloat(p.peso_alvo || 0), 0);
  const rvWeight = posicoes
    .filter(p => p.asset?.group_id === 'equities')
    .reduce((s, p) => s + parseFloat(p.peso_alvo || 0), 0);
  const rvPct = totalWeight > 0 ? rvWeight / totalWeight : 0;

  if (rvPct >= 0.67) {
    checks.rvCompliance = { status: 'ok', value: rvPct, message: `Renda variável at ${(rvPct * 100).toFixed(1)}% (≥67% required)` };
  } else if (rvPct >= 0.60) {
    checks.rvCompliance = { status: 'warning', value: rvPct, message: `Renda variável at ${(rvPct * 100).toFixed(1)}% — below 67% minimum, approaching breach` };
  } else {
    checks.rvCompliance = { status: 'critical', value: rvPct, message: `Renda variável at ${(rvPct * 100).toFixed(1)}% — BREACH of 67% CVM minimum` };
  }

  // ── Max 40% ownership per cotista ──────────────────────────────────────────
  const totalCotas = cotistas.reduce((s, c) => s + parseFloat(c.cotas_detidas), 0);
  let maxPct = 0;
  let maxCotista = null;
  for (const c of cotistas) {
    const pct = totalCotas > 0 ? parseFloat(c.cotas_detidas) / totalCotas : 0;
    if (pct > maxPct) {
      maxPct = pct;
      maxCotista = c;
    }
  }

  if (maxPct <= 0.40) {
    checks.maxOwnership = { status: 'ok', value: maxPct, message: `Max ownership: ${(maxPct * 100).toFixed(1)}% (≤40% limit)` };
  } else if (maxPct <= 0.45) {
    checks.maxOwnership = { status: 'warning', value: maxPct, message: `${maxCotista?.nome} holds ${(maxPct * 100).toFixed(1)}% — above 40% CVM cap` };
  } else {
    checks.maxOwnership = { status: 'critical', value: maxPct, message: `${maxCotista?.nome} holds ${(maxPct * 100).toFixed(1)}% — critical breach of 40% CVM cap` };
  }

  // ── Member count (3–50) ────────────────────────────────────────────────────
  const count = cotistas.filter(c => parseFloat(c.cotas_detidas) > 0).length;
  if (count >= 3 && count <= 50) {
    checks.memberCount = { status: 'ok', value: count, message: `${count} active members (3–50 required)` };
  } else if (count < 3) {
    checks.memberCount = { status: 'critical', value: count, message: `Only ${count} active member(s) — CVM requires minimum 3` };
  } else {
    checks.memberCount = { status: 'critical', value: count, message: `${count} active members — CVM maximum is 50` };
  }

  return checks;
}

/**
 * Classify operational severity for dashboard items.
 * @returns {'CRITICAL' | 'WARNING' | 'INFO'}
 */
export function classifyOperacionalSeverity(item) {
  // Compliance breach
  if (item.tipo === 'compliance_breach') return 'CRITICAL';

  // Overdue payments
  if (item.tipo === 'overdue_payment' || item.status === 'vencido') {
    return item.diasAtraso > 5 ? 'CRITICAL' : 'WARNING';
  }

  // Assembly deadline
  if (item.tipo === 'assembly_deadline') {
    if (item.diasParaPrazo <= 7)  return 'CRITICAL';
    if (item.diasParaPrazo <= 30) return 'WARNING';
    return 'INFO';
  }

  // Monthly close
  if (item.tipo === 'monthly_close') {
    if (item.diasParaPrazo <= 2)  return 'CRITICAL';
    if (item.diasParaPrazo <= 7)  return 'WARNING';
    return 'INFO';
  }

  // Tax dates
  if (item.tipo === 'tax_date') {
    if (item.diasParaPrazo <= 7)  return 'CRITICAL';
    if (item.diasParaPrazo <= 30) return 'WARNING';
    return 'INFO';
  }

  // Pending conversions
  if (item.tipo === 'pending_conversion') return 'INFO';

  // Generic / ownership cap
  if (item.maxEquityPct !== undefined) {
    if (item.maxEquityPct > 40) return 'CRITICAL';
    if (item.maxEquityPct > 35) return 'WARNING';
    return 'INFO';
  }

  // Member count
  if (item.memberCount !== undefined) {
    if (item.memberCount < 3 || item.memberCount > 50) return 'CRITICAL';
    return 'INFO';
  }

  // RV percentage for generic
  if (item.rvPct !== undefined) {
    if (item.rvPct < 60) return 'CRITICAL';
    if (item.rvPct < 67) return 'WARNING';
    return 'INFO';
  }

  return 'INFO';
}

/**
 * Compute late-payment penalty for resgates.
 * @param {number} valorBrl          - original BRL value
 * @param {string} dataConversao     - conversion date ISO string
 * @param {string} dataPagamento     - actual payment date ISO string
 * @param {number} prazoPagamentoDias - allowed days from statute
 * @returns {{ isLate: boolean, diasAtraso: number, penalidade: number }}
 */
export function computePenalidadeAtraso(valorBrl, dataConversao, dataPagamento, prazoPagamentoDias) {
  const deadline = addBusinessDays(dataConversao, prazoPagamentoDias ?? 5);
  const deadlineDate = new Date(deadline + 'T12:00:00Z');
  const paymentDate  = new Date(dataPagamento + 'T12:00:00Z');

  const diffMs = paymentDate - deadlineDate;
  const diasAtraso = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isLate = diasAtraso > 0;

  // 0.5% per business day late, capped at 10% — standard clause
  const rate = Math.min(diasAtraso * 0.005, 0.10);
  const penalidade = isLate ? Math.round(valorBrl * rate * 100) / 100 : 0;

  return { isLate, diasAtraso, penalidade };
}

/**
 * Compute the setup checklist for a new clube.
 * @param {{ estatutos: number, cotistas: number, posicoes: number, navEntries: number }} counts
 * @returns {Array<{ step: string, label: string, done: boolean, required: boolean }>}
 */
export function computeSetupChecklist(counts) {
  return [
    {
      step: 'estatuto',
      label: 'Criar estatuto do clube',
      done: counts.estatutos > 0,
      required: true,
    },
    {
      step: 'cotistas',
      label: 'Cadastrar cotistas (mínimo 3)',
      done: counts.cotistas >= 3,
      required: true,
    },
    {
      step: 'posicoes',
      label: 'Definir carteira alvo',
      done: counts.posicoes > 0,
      required: true,
    },
    {
      step: 'nav',
      label: 'Registrar NAV inicial',
      done: counts.navEntries > 0,
      required: true,
    },
  ];
}
