# Market-Data Provider Research & Decision (2026-07-04)

Why: the live feed scraped Yahoo's unofficial API from Railway's datacenter IP, and
Yahoo now tarpits/429s that IP (it works fine from residential IPs). Server-side
scraping of Yahoo is fundamentally fragile → move to paid, API-key providers.

## ✅ DECISION — EODHD "All-World" ($19.99/mo) + BRAPI Pro (~$21/mo) ≈ **$41/mo**

Chosen after research + Felipe's call that **near-real-time (~5–15 min) is acceptable**
(it's a monitoring terminal, not trading).

- **EODHD All-World** → the ~193 global symbols (US equities, indices, FX, commodities,
  ETFs). REST quotes ~15–20 min delayed; API-key auth (`api_token=`), no IP blocking;
  batch via `s=` (≤100/req); **100k API calls/day cap** (bills 1 call/symbol) → keep the
  global refresh **≥3–5 min** (already at 120s).
- **BRAPI Pro** → the ~178 Brazil B3 names (equities + FIIs + ETFs) at ~5 min — the
  freshest affordable Brazil data. 20 tickers/req, 500k req/mo. GMT already integrates
  BRAPI, so this is flipping it from free fallback → paid primary.
- Crypto stays **CoinGecko**; BR macro stays **BCB**. **Yahoo → last-resort fallback.**

## The deciding factor: Brazil B3 coverage

| Provider | US+global | **Brazil B3** | Real-time | Batch | Cheapest fit |
|---|---|---|---|---|---|
| **BRAPI** | ❌ BR-only | ✅✅ native (equities+FIIs+ETFs), ~5min | delayed | 20/req (Pro) | ~$21 Pro |
| **EODHD** | ✅ (+commodities) | ✅ 2,108 SA tickers, ~15–20min | delayed (RT via WS) | 100/req | ~$20 All-World |
| Twelve Data | ✅✅ | ⚠️ **EOD-only** | US RT on Pro | 120/req | $79 Grow / $229 Pro |
| FMP | ✅ | ⚠️ **$149 Ultimate only** | RT paid | yes | $149 for B3 |
| Finnhub | ✅ US RT (free) | ⚠️ ~$50/mkt add-on, unverified | US RT | ❌ 1/req | ~$50+ |
| Polygon | ✅✅ US | ❌ **none — US-only** | RT (paid) | ✅✅ snapshot | $29–199 |
| Tiingo | ✅✅ US | ❌ none | US RT | ✅ (US) | ~$30 |

- **Hard truth: affordable real-time B3 doesn't exist** (B3 charges exchange fees) —
  BRAPI Pro ~5min is the ceiling; EODHD 15–20min; Twelve Data EOD.
- All providers use API keys (no IP blocking) → all solve the Yahoo problem; **Brazil
  coverage is what discriminates.**

## If real-time global is ever needed later (deferred)
- **Twelve Data Pro** ($229) — real-time US **+ global**, 120/req batch, no daily cap. The
  complete real-time answer. Pair with BRAPI (~$250/mo total).
- **Polygon Developer** ($79) — real-time US (IEX), great snapshot batch, but **US-only**
  (no non-US indices, thin commodities). Pair with BRAPI (~$100/mo).

## Before subscribing — verify
1. EODHD & BRAPI refund/trial windows (BRAPI bills in BRL; /pricing R$116,66 is
   authoritative vs an FAQ R$139,99 — re-confirm at signup).
2. That all ~178 B3 tickers (esp. small FIIs) resolve on BRAPI Pro and EODHD (`.SA`).
3. EODHD Live-v2 100/req cap + re-run the 100k-calls/day math for the final global count.
4. EODHD commodities/futures are thinner than equities — verify GMT's specific
   commodity symbols resolve, else keep Yahoo primary for that class.

Full cited research: workflow run `w1g8bfsfa` (2026-07-04). Sources: brapi.dev/pricing,
eodhd.com/pricing, eodhd.com/exchange/SA, twelvedata.com/pricing, twelvedata.com/exchanges/BVMF,
massive.com (Polygon US-only), finnhub.io/docs.

---

# Coverage audit + FMP evaluation (2026-07-06)

Read-only audit joining the live taxonomy (Supabase `groups/subgroups/assets`) to the actual
`source` tag from `/quotes/live` + `/quotes/brazil`. Reader's report (full inventory tables,
FMP tier matrix, alternatives, quick wins): **https://claude.ai/code/artifact/57e40222-c290-4ef5-95fa-36ab24db8376**

## Current state — healthier than "Yahoo is down" implies
- **381 active assets** (2 views · 9 groups · 44 subgroups). Live resolution:
  **EODHD 160 · BRAPI 185 · CoinGecko 8 · BCB 17 · AwesomeAPI 3 · DARK 8.**
- **Yahoo serves 0 live symbols.** EODHD+CoinGecko carry the entire global feed (168/168),
  BRAPI carries Brazil. The EODHD migration effectively already retired Yahoo for quotes.
- **Only 8 assets are dark**, all from the blocked-Yahoo tail:
  - Global: `CL=F GC=F NG=F SI=F` (commodity futures — Yahoo-only class, confirms the
    2026-07-04 flag #4 that EODHD has no futures) + `^FTSE` (EODHD live returns `"NA"` → fell to Yahoo).
  - Brazil: `METB3`, `PARD3` (BRAPI misses; `.SA` Yahoo fallback blocked) + `IFIX` (FII index not on BRAPI).
- Commodity **exposure** is NOT dark — ETF proxies (USO/GLD/SLV/UNG/CORN/WEAT/SOYB/DBA…) price via EODHD.
- Quality gaps (renders but thin): `marketCap` + 52-wk hi/lo are `null` on all 160 EODHD equity rows;
  no analyst estimates anywhere (only Finnhub free news, wired in NewsPage); charts still client-side Yahoo v8.

## Licensing reframe — use is PRIVATE/personal
The 2026-07-04 stack + all options below are judged on **personal-tier** pricing (legal for private use).
The "internal-use-only" / commercial-display traps (Twelve Data $499 Venture, Polygon $1,999 Business,
EODHD $2,499 Enterprise) do **not** bind a private terminal — the cheap tiers are on the table.

## FMP as the "on-top" add (all personal tiers, verified 2026)
A dormant client-side FMP key already exists in `src/dataServices.js` (+ Finnhub/AlphaVantage/FRED keys, all populated in `.env`).
- **Free (current):** EOD/reference only — live quote endpoints need Starter+.
- **Starter $22/mo:** closes the 4 commodity futures (`CLUSD/GCUSD/NGUSD/SIUSD` = the exact front-months, batch=1 call) + FX/crypto. US, 5-yr daily. No intraday/TI/analyst.
- **Premium $59/mo — recommended when spending:** + 30-yr history, intraday charts, technical-indicator API, full fundamentals (fills the null marketCap/52-wk fields), analyst estimates/ratings (TipRanks), UK+CA. Blended spend ≈ **$41 + $59 ≈ $100/mo.** Does not replace BRAPI (no B3 depth) or add bonds.
- **Ultimate $149/mo:** global equities (already covered by EODHD) — overkill here.

## Alternatives re-priced (personal tiers) — why FMP wins for GMT
- **EODHD All-World Extended (+$10 → $29.99):** cheapest resilience win, already your vendor → adds intraday + TI + Yahoo-independent equity/FX fallback, BUT **no commodities at all** (FRED spot only: oil/natgas ~1-week stale, gold/silver discontinued). Pairs *with* a commodities source; can't be one.
- **Polygon/Massive Futures $29:** real CME futures but **per-expiry tickers** (GCZ5…) needing front-month resolution; US-only equities.
- **Twelve Data Grow $79:** commodities as *spot* pairs (not `=F`), pricier than FMP.
- **Tiingo Power $30 / Marketstack Pro $50 / AlphaVantage $50 / Finnhub:** each fails commodities-futures (spot/macro only or none). AlphaVantage = decent free TI/backfill layer (key already present), not a futures fix.
- **Only FMP and Polygon** cover real futures at a personal price; FMP wins on breadth-per-dollar (also fills fundamentals+analyst+charts).

## Yahoo-on-Railway verdict
Demote Yahoo to genuine best-effort (no feature depends on it); when ready, put a licensed source under it.
Residential proxy (~$5/mo) is the *only* thing that beats the datacenter tarpit (VPS/Fly/CF all re-blocked) but is
ToS-breaking + fragile → a bad trade vs a $22 licensed API. Reject proxy as anything but an unadvertised tertiary.

## Quick wins (do now, $0, no provider change) — `server/routes/quotes.js` + `quoteFetchManager.js`
1. `STALE_THRESHOLD` 120s→300s (`quotes.js:23`) — 120s < EODHD's 180s / B3's 300s cadence → healthy feed false-flags "stale" (why `/brazil` flaps to `"stale"`).
2. Rename `meta.yahooAge`→`meta.feedAge` (`quotes.js:98`) — it's `max(eodhd,brapi,yahoo)` age, not Yahoo's.
3. Gate `cryptoAge` on the `source` label + treat empty `[]` as needing snapshot fallback (`quotes.js:37–42`).
4. Memoize `buildQuotesMap` on `mergedTs` (`quoteFetchManager.js:651`) — re-walks 185 assets every `/live` hit though caches move every 120–300s (first-paint win).
5. Exclude unwired `fmp`/`finnhub` from accepted precedence overrides (`providerRouting.js:22`) — they pass the capability filter but have no fetch branch.

Decision status: **stay at $41/mo for now (owner call, 2026-07-06); quick wins now; FMP evaluated, deferred.**
Full cited provider research: workflow run `wgg8cfp86` (2026-07-06).
