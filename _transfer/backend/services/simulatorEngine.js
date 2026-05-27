// ── Simulator Engine ─────────────────────────────────────────────────────────
// Pure functions for the GMT Clube scenario simulator.
// No React, no API calls — import only from quotizacaoEngine.

import {
  computeMovimentacaoPreview,
  addBusinessDays,
} from './quotizacaoEngine.js';

const RV_GROUP_IDS = new Set(['equities', 'br-mercado']);

/**
 * Simulate a full portfolio rebalance.
 */
export function simulateRebalance(currentPositions, proposedWeights, patrimonio, estatuto, brokerage = 0.003) {
  // Validate weight sum
  const weightSum = Object.values(proposedWeights).reduce((s, w) => s + w, 0);
  if (Math.abs(weightSum - 1.0) > 0.005) {
    return {
      valid: false,
      weightError: `Pesos somam ${(weightSum * 100).toFixed(2)}% — devem somar 100%`,
      trades: [], totalBuys: 0, totalSells: 0, estimatedCost: 0, cashImpact: 0,
      newRVPct: 0, cvmStatus: 'breach', cvmMessage: '', derivativesViolation: false,
    };
  }

  // Build a map of current positions by asset_id
  const currentMap = {};
  for (const p of currentPositions) {
    currentMap[p.asset_id] = p;
  }

  // Build trades array — include all positions
  const trades = [];
  const allAssetIds = new Set([
    ...currentPositions.map(p => p.asset_id),
    ...Object.keys(proposedWeights),
  ]);

  let newRVWeight = 0;
  let derivativesViolation = false;

  for (const assetId of allAssetIds) {
    const pos = currentMap[assetId];
    const weightBefore = pos ? parseFloat(pos.peso_alvo) : 0;
    const weightAfter = proposedWeights[assetId] ?? 0;
    const brlBefore = weightBefore * patrimonio;
    const brlAfter = weightAfter * patrimonio;
    const brlDelta = brlAfter - brlBefore;

    const groupId = pos?.asset?.group_id ?? '';
    const isRV = RV_GROUP_IDS.has(groupId);
    if (isRV) newRVWeight += weightAfter;

    // Check derivatives violation
    if (weightAfter > 0 && !isRV && estatuto?.permite_derivativos === false) {
      // Non-equity positions are allowed (fixed income, etc) — only flag actual derivatives
      // For now, we don't have a 'derivatives' group, so skip
    }

    trades.push({
      asset_id: assetId,
      symbol: pos?.asset?.symbol ?? '???',
      name: pos?.asset?.name ?? '',
      group_id: groupId,
      weightBefore,
      weightAfter,
      brlBefore,
      brlAfter,
      brlDelta,
      direction: Math.abs(brlDelta) < 0.01 ? 'hold' : brlDelta > 0 ? 'buy' : 'sell',
    });
  }

  const totalBuys = trades.filter(t => t.direction === 'buy').reduce((s, t) => s + t.brlDelta, 0);
  const totalSells = Math.abs(trades.filter(t => t.direction === 'sell').reduce((s, t) => s + t.brlDelta, 0));
  const estimatedCost = (totalBuys + totalSells) * brokerage;
  const cashImpact = totalSells - totalBuys - estimatedCost;

  // CVM compliance: breach < 0.67, warning 0.67–0.70, ok >= 0.70
  let cvmStatus, cvmMessage;
  if (newRVWeight >= 0.70) {
    cvmStatus = 'ok';
    cvmMessage = `Carteira em conformidade — ${(newRVWeight * 100).toFixed(1)}% em renda variável.`;
  } else if (newRVWeight >= 0.67) {
    cvmStatus = 'warning';
    cvmMessage = `Atenção: carteira terá ${(newRVWeight * 100).toFixed(1)}% em renda variável, próximo ao mínimo de 67%.`;
  } else {
    cvmStatus = 'breach';
    cvmMessage = `Esta carteira terá ${(newRVWeight * 100).toFixed(1)}% em renda variável, abaixo do mínimo legal de 67% (CVM Resolução 11).`;
  }

  return {
    valid: true,
    weightError: null,
    trades,
    totalBuys,
    totalSells,
    estimatedCost,
    cashImpact,
    newRVPct: newRVWeight,
    cvmStatus,
    cvmMessage,
    derivativesViolation,
  };
}

/**
 * Thin wrapper around computeMovimentacaoPreview with tax placeholder.
 */
export function simulateMovimentacao(tipo, valorBrl, currentValorCota, cotistas, targetCotistaId, estatuto, dataSolicitacao) {
  const result = computeMovimentacaoPreview(
    tipo, valorBrl, currentValorCota, cotistas, targetCotistaId,
    estatuto, dataSolicitacao,
  );
  return {
    ...result,
    tributacaoEstimada: null, // placeholder — Phase 2 tax engine
  };
}

/**
 * Check if a proposed buy or sell would violate the 67% RV rule.
 */
export function simulatePreTrade(proposedTrade, currentPositions, currentPatrimonio, estatuto) {
  const { direction, valor_brl, group_id } = proposedTrade;
  const isRV = RV_GROUP_IDS.has(group_id);

  // Current RV BRL
  let currentRVBrl = 0;
  for (const p of currentPositions) {
    if (RV_GROUP_IDS.has(p.asset?.group_id)) {
      currentRVBrl += parseFloat(p.peso_alvo) * currentPatrimonio;
    }
  }

  const rvPctBefore = currentPatrimonio > 0 ? currentRVBrl / currentPatrimonio : 0;

  // Compute new RV BRL and new patrimônio
  let newRVBrl = currentRVBrl;
  let newPatrimonio = currentPatrimonio;

  if (direction === 'buy') {
    newPatrimonio = currentPatrimonio + valor_brl;
    if (isRV) newRVBrl = currentRVBrl + valor_brl;
  } else {
    newPatrimonio = currentPatrimonio - valor_brl;
    if (isRV) newRVBrl = currentRVBrl - valor_brl;
  }

  const rvPctAfter = newPatrimonio > 0 ? newRVBrl / newPatrimonio : 0;

  // Status
  let status, statusLabel, statusColor;
  if (rvPctAfter >= 0.70) {
    status = 'ok';
    statusLabel = 'CONFORME';
    statusColor = '#00E676';
  } else if (rvPctAfter >= 0.67) {
    status = 'warning';
    statusLabel = 'ATENÇÃO';
    statusColor = '#F9C300';
  } else {
    status = 'breach';
    statusLabel = 'BREACH';
    statusColor = 'var(--c-error)';
  }

  // Message
  let message;
  if (status === 'ok') {
    message = `Esta operação mantém conformidade — RV passará de ${(rvPctBefore * 100).toFixed(1)}% para ${(rvPctAfter * 100).toFixed(1)}%.`;
  } else if (status === 'warning') {
    message = `Atenção: RV cairá para ${(rvPctAfter * 100).toFixed(1)}%, próximo ao mínimo de 67%.`;
  } else {
    message = `Esta operação reduziria a RV para ${(rvPctAfter * 100).toFixed(1)}%, abaixo do mínimo legal de 67% (CVM Resolução 11).`;
  }

  // Remediation
  let minimumRVbrl = null;
  let maxSellBrl = null;

  if (status === 'breach') {
    minimumRVbrl = 0.67 * currentPatrimonio;
    if (direction === 'sell' && isRV) {
      // Max sell = how much RV we can sell and stay at exactly 67%
      // After selling X: (currentRVBrl - X) / (currentPatrimonio - X) = 0.67
      // currentRVBrl - X = 0.67 * currentPatrimonio - 0.67 * X
      // currentRVBrl - 0.67 * currentPatrimonio = X - 0.67 * X = 0.33 * X
      // X = (currentRVBrl - 0.67 * currentPatrimonio) / 0.33
      const maxSell = (currentRVBrl - 0.67 * currentPatrimonio) / 0.33;
      maxSellBrl = Math.max(0, Math.round(maxSell * 100) / 100);
      if (maxSellBrl > 0) {
        message += ` Venda no máximo R$ ${maxSellBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para manter conformidade.`;
      }
    }
  }

  return {
    rvPctBefore,
    rvPctAfter,
    status,
    statusLabel,
    statusColor,
    message,
    minimumRVbrl,
    maxSellBrl,
    estimatedCost: valor_brl * 0.003,
  };
}
