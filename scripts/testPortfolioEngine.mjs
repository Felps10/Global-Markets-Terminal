import {
  buildPortfolioSnapshot,
  calculatePortfolioDailyReturn,
  calculateNAVFromHistory,
  calculateDrawdown,
  calculateVolatility,
  calculateRVCompliance,
  formatCurrency,
  formatPct,
} from '../src/services/portfolioEngine.js';

let passed = 0;
let failed = 0;

function assert(label, actual, expected, tolerance = null) {
  let ok;
  if (tolerance !== null) {
    ok = typeof actual === 'number' && Math.abs(actual - expected) <= tolerance;
  } else {
    ok = actual === expected;
  }
  if (ok) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}`);
    console.log(`        expected: ${JSON.stringify(expected)}`);
    console.log(`        actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ── Test 1 — buildPortfolioSnapshot ─────────────────────────────────────────
console.log('\nTest 1 — buildPortfolioSnapshot');
const positions1 = [
  { asset_id: 'petr4', peso_alvo: 0.25,
    asset: { id: 'petr4', symbol: 'PETR4', name: 'Petrobras',
             group_id: 'equities', subgroup_id: 'brazil' } },
  { asset_id: 'vale3', peso_alvo: 0.20,
    asset: { id: 'vale3', symbol: 'VALE3', name: 'Vale',
             group_id: 'equities', subgroup_id: 'brazil' } },
  { asset_id: 'gld',   peso_alvo: 0.10,
    asset: { id: 'gld', symbol: 'GLD', name: 'SPDR Gold',
             group_id: 'commodities', subgroup_id: 'precious-metals' } },
];
const marketData1 = {
  PETR4: { price: 35.50, changePct: 2.0 },
  VALE3: { price: 65.00, changePct: -1.0 },
  // GLD intentionally missing
};
const snapshot = buildPortfolioSnapshot(positions1, marketData1);
assert('snapshot.length === 3', snapshot.length, 3);
assert('snapshot[0].symbol === PETR4 (highest peso_alvo first)', snapshot[0].symbol, 'PETR4');
assert('snapshot[0].contribution ≈ 0.005', snapshot[0].contribution, 0.005, 1e-9);
assert('snapshot[2].hasPrice === false (GLD missing)', snapshot[2].hasPrice, false);
assert('snapshot[2].contribution === null', snapshot[2].contribution, null);

// ── Test 2 — calculatePortfolioDailyReturn ───────────────────────────────────
console.log('\nTest 2 — calculatePortfolioDailyReturn');
const result2 = calculatePortfolioDailyReturn(snapshot);
assert('dailyReturnPct ≈ 0.3', result2.dailyReturnPct, 0.3, 1e-9);
assert('coveredWeight ≈ 0.45', result2.coveredWeight, 0.45, 1e-9);
assert('missingSymbols includes GLD', result2.missingSymbols.includes('GLD'), true);
assert('isPartial === true', result2.isPartial, true);

// ── Test 3 — calculateNAVFromHistory ─────────────────────────────────────────
console.log('\nTest 3 — calculateNAVFromHistory');
const clube3    = { valor_cota_inicial: 1000 };
const navHistory3 = [
  { data: '2025-01-01', valor_cota: 1000, retorno_diario: 0,
    retorno_ibov: 0, retorno_cdi: 0, patrimonio_total: 1000000 },
  { data: '2025-01-02', valor_cota: 1010, retorno_diario: 0.01,
    retorno_ibov: 0.008, retorno_cdi: 0.0004, patrimonio_total: 1010000 },
  { data: '2025-01-03', valor_cota: 1005, retorno_diario: -0.00495,
    retorno_ibov: -0.003, retorno_cdi: 0.0004, patrimonio_total: 1005000 },
];
const result3 = calculateNAVFromHistory(navHistory3, clube3);
assert('currentNAV === 1005', result3.currentNAV, 1005);
assert('totalReturnPct ≈ 0.5', result3.totalReturnPct, 0.5, 0.0001);
assert('navSeries.length === 3', result3.navSeries.length, 3);
assert('ibovSeries[2].nav ≈ 1004.976', result3.ibovSeries[2].nav, 1004.976, 0.0001);

// ── Test 4 — calculateDrawdown ───────────────────────────────────────────────
console.log('\nTest 4 — calculateDrawdown');
const navSeries4 = [
  { date: '2025-01-01', nav: 1000 },
  { date: '2025-01-02', nav: 1010 },
  { date: '2025-01-03', nav:  990 },
  { date: '2025-01-04', nav:  995 },
];
const result4 = calculateDrawdown(navSeries4);
assert('maxDrawdown ≈ -0.0198', result4.maxDrawdown, 990 / 1010 - 1, 0.0001);
assert('troughDate === 2025-01-03', result4.troughDate, '2025-01-03');
assert('currentDrawdown ≈ -0.01485', result4.currentDrawdown, 995 / 1010 - 1, 0.0001);

// ── Test 5 — calculateRVCompliance ───────────────────────────────────────────
console.log('\nTest 5 — calculateRVCompliance');
const positions5 = [
  { peso_alvo: 0.25, asset: { group_id: 'equities' } },
  { peso_alvo: 0.20, asset: { group_id: 'equities' } },
  { peso_alvo: 0.15, asset: { group_id: 'equities' } },
  { peso_alvo: 0.15, asset: { group_id: 'equities' } },
  { peso_alvo: 0.15, asset: { group_id: 'indices' } },
  { peso_alvo: 0.10, asset: { group_id: 'commodities' } },
];
const result5 = calculateRVCompliance(positions5);
assert('percentualRV === 0.75', result5.percentualRV, 0.75, 1e-9);
assert('compliant === true', result5.compliant, true);
assert('status === OK', result5.status, 'OK');

// ── Test 6 — formatCurrency ──────────────────────────────────────────────────
console.log('\nTest 6 — formatCurrency');
assert("formatCurrency(1234.56) === 'R$ 1.234,56'", formatCurrency(1234.56), 'R$ 1.234,56');
assert("formatCurrency(1500000, { compact: true }) === 'R$ 1.5M'", formatCurrency(1500000, { compact: true }), 'R$ 1.5M');
assert("formatCurrency(null) === '—'", formatCurrency(null), '—');

// ── Test 7 — formatPct ───────────────────────────────────────────────────────
console.log('\nTest 7 — formatPct');
assert("formatPct(1.23) === '+1.23%'",  formatPct(1.23),  '+1.23%');
assert("formatPct(-0.45) === '−0.45%'", formatPct(-0.45), '\u22120.45%');
assert("formatPct(null) === '—'",       formatPct(null),  '—');

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
