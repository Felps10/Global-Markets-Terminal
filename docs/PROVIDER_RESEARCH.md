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
