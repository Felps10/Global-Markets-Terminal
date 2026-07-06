// server/services/tesouroService.js
// Tesouro Direto bond prices/yields from the public Tesouro Transparente CSV.
//
// The CSV is the FULL daily history since 2011 (~14MB, uncompressed — the host
// does not gzip). Downloading it takes 15-60s, so it must NEVER block a request:
//   • warmed once in the background at server boot (import side-effect),
//   • refreshed on a 6h TTL,
//   • served stale-while-revalidating,
//   • single-flighted so concurrent callers share one download.
// We keep only the latest snapshot per bond (Tipo + Vencimento) = the bonds
// currently on offer.

import https from 'node:https';

const CSV_URL = 'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv';
const TTL_MS  = 6 * 60 * 60 * 1000; // 6h — Tesouro publishes new prices once per business day

let _cache    = { data: null, ts: 0 };
let _inflight = null;

// pt-BR number: "1.234,56" → 1234.56 ; "" → null
function parseNum(s) {
  const t = (s || '').trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// "dd/mm/yyyy" → "yyyy-mm-dd" (empty string if malformed)
function parseDate(s) {
  const [d, m, y] = (s || '').trim().split('/');
  return (d && m && y) ? `${y}-${m}-${d}` : '';
}

// node core https.get is markedly faster + more predictable than undici fetch
// for this large uncompressed body.
function downloadCsv() {
  return new Promise((resolve, reject) => {
    const req = https.get(CSV_URL, { headers: { 'User-Agent': 'GMT-Terminal/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Tesouro CSV HTTP ${res.statusCode}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(90000, () => req.destroy(new Error('Tesouro CSV download timed out')));
  });
}

function parse(text) {
  const lines  = text.split('\n');
  const latest = new Map(); // "tipo|vencRaw" → row with the newest Data Base
  for (let i = 1; i < lines.length; i++) {         // skip header row
    const c = lines[i].split(';');
    if (c.length < 7) continue;
    const tipo    = c[0].trim();
    const vencRaw = c[1].trim();
    const baseISO = parseDate(c[2]);
    if (!tipo || !baseISO) continue;
    const key  = `${tipo}|${vencRaw}`;
    const prev = latest.get(key);
    if (!prev || baseISO > prev.dataBase) {
      latest.set(key, {
        tipo,
        vencimento: parseDate(vencRaw),
        dataBase:   baseISO,
        taxaCompra: parseNum(c[3]),
        taxaVenda:  parseNum(c[4]),
        puCompra:   parseNum(c[5]),
        puVenda:    parseNum(c[6]),
      });
    }
  }

  const all = [...latest.values()];
  if (all.length === 0) throw new Error('Tesouro CSV parsed to zero bonds');

  // The single most recent Data Base across all bonds = the current snapshot.
  // Bonds no longer offered keep an older last date and drop out.
  const dataBase = all.reduce((mx, r) => (r.dataBase > mx ? r.dataBase : mx), '');
  const titulos  = all
    .filter(r => r.dataBase === dataBase)
    .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.vencimento.localeCompare(b.vencimento));

  return { titulos, dataBase, count: titulos.length };
}

// Single-flighted refresh — concurrent callers share one download.
function refresh() {
  if (!_inflight) {
    _inflight = downloadCsv()
      .then(parse)
      .then((data) => { _cache = { data, ts: Date.now() }; return data; })
      .finally(() => { _inflight = null; });
  }
  return _inflight;
}

/**
 * Returns { titulos, dataBase, count } immediately, or null if the cache has
 * never been populated (cold start still downloading). NEVER blocks on the
 * download — a stale-or-missing cache triggers a background refresh and returns
 * whatever is on hand, so the request path is always fast.
 */
export function getTesouroTitulos() {
  const fresh = _cache.data && (Date.now() - _cache.ts) < TTL_MS;
  if (!fresh) refresh().catch(() => {}); // kick (or piggyback) a background refresh
  return _cache.data; // stale data if any, else null → route responds 202 "warming"
}

// Warm the cache at server boot (non-blocking; errors are swallowed and retried
// on the next request).
refresh().catch(() => {});
