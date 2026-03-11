import { useState, useEffect, useCallback, useRef } from "react";
import { hasFinnhubKey, finnhubNews } from "./dataServices.js";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const mono = "'JetBrains Mono', monospace";
const sans = "'DM Sans', sans-serif";

// All assets from GlobalMarketsTerminal (kept in sync)
const ASSETS = {
  AAPL: { name: "Apple", cat: "technology", exchange: "NASDAQ" },
  MSFT: { name: "Microsoft", cat: "technology", exchange: "NASDAQ" },
  GOOGL: { name: "Alphabet", cat: "technology", exchange: "NASDAQ" },
  AMZN: { name: "Amazon", cat: "technology", exchange: "NASDAQ" },
  NVDA: { name: "NVIDIA", cat: "technology", exchange: "NASDAQ" },
  META: { name: "Meta Platforms", cat: "technology", exchange: "NASDAQ" },
  TSLA: { name: "Tesla", cat: "technology", exchange: "NASDAQ" },
  ORCL: { name: "Oracle", cat: "technology", exchange: "NYSE" },
  XOM: { name: "ExxonMobil", cat: "oil-gas", exchange: "NYSE" },
  CVX: { name: "Chevron", cat: "oil-gas", exchange: "NYSE" },
  SHEL: { name: "Shell", cat: "oil-gas", exchange: "NYSE" },
  TTE: { name: "TotalEnergies", cat: "oil-gas", exchange: "NYSE" },
  COP: { name: "ConocoPhillips", cat: "oil-gas", exchange: "NYSE" },
  BP: { name: "BP", cat: "oil-gas", exchange: "NYSE" },
  ENB: { name: "Enbridge", cat: "oil-gas", exchange: "NYSE" },
  SLB: { name: "Schlumberger", cat: "oil-gas", exchange: "NYSE" },
  JPM: { name: "JPMorgan Chase", cat: "financials", exchange: "NYSE" },
  GS: { name: "Goldman Sachs", cat: "financials", exchange: "NYSE" },
  BAC: { name: "Bank of America", cat: "financials", exchange: "NYSE" },
  WFC: { name: "Wells Fargo", cat: "financials", exchange: "NYSE" },
  MS: { name: "Morgan Stanley", cat: "financials", exchange: "NYSE" },
  V: { name: "Visa", cat: "financials", exchange: "NYSE" },
  MA: { name: "Mastercard", cat: "financials", exchange: "NYSE" },
  BLK: { name: "BlackRock", cat: "financials", exchange: "NYSE" },
  JNJ: { name: "Johnson & Johnson", cat: "healthcare", exchange: "NYSE" },
  PFE: { name: "Pfizer", cat: "healthcare", exchange: "NYSE" },
  UNH: { name: "UnitedHealth", cat: "healthcare", exchange: "NYSE" },
  LLY: { name: "Eli Lilly", cat: "healthcare", exchange: "NYSE" },
  ABT: { name: "Abbott Labs", cat: "healthcare", exchange: "NYSE" },
  MRNA: { name: "Moderna", cat: "healthcare", exchange: "NASDAQ" },
  AMD: { name: "AMD", cat: "semiconductors", exchange: "NASDAQ" },
  INTC: { name: "Intel", cat: "semiconductors", exchange: "NASDAQ" },
  TSM: { name: "TSMC", cat: "semiconductors", exchange: "NYSE" },
  QCOM: { name: "Qualcomm", cat: "semiconductors", exchange: "NASDAQ" },
  AVGO: { name: "Broadcom", cat: "semiconductors", exchange: "NASDAQ" },
  ASML: { name: "ASML", cat: "semiconductors", exchange: "NASDAQ" },
  WMT: { name: "Walmart", cat: "consumer", exchange: "NYSE" },
  TGT: { name: "Target", cat: "consumer", exchange: "NYSE" },
  COST: { name: "Costco", cat: "consumer", exchange: "NASDAQ" },
  NKE: { name: "Nike", cat: "consumer", exchange: "NYSE" },
  LVMUY: { name: "LVMH", cat: "consumer", exchange: "NYSE" },
  LMT: { name: "Lockheed Martin", cat: "aerospace", exchange: "NYSE" },
  RTX: { name: "Raytheon", cat: "aerospace", exchange: "NYSE" },
  NOC: { name: "Northrop Grumman", cat: "aerospace", exchange: "NYSE" },
  BA: { name: "Boeing", cat: "aerospace", exchange: "NYSE" },
  GD: { name: "General Dynamics", cat: "aerospace", exchange: "NYSE" },
  RIVN: { name: "Rivian", cat: "cleanenergy", exchange: "NASDAQ" },
  BYDDY: { name: "BYD", cat: "cleanenergy", exchange: "NYSE" },
  NEE: { name: "NextEra Energy", cat: "cleanenergy", exchange: "NYSE" },
  ENPH: { name: "Enphase Energy", cat: "cleanenergy", exchange: "NASDAQ" },
  FSLR: { name: "First Solar", cat: "cleanenergy", exchange: "NASDAQ" },
  PLD: { name: "Prologis", cat: "reits", exchange: "NYSE" },
  AMT: { name: "American Tower", cat: "reits", exchange: "NYSE" },
  EQIX: { name: "Equinix", cat: "reits", exchange: "NASDAQ" },
  SPG: { name: "Simon Property", cat: "reits", exchange: "NYSE" },
  EWZ: { name: "Brazil ETF", cat: "emerging", exchange: "NYSE" },
  INDA: { name: "India ETF", cat: "emerging", exchange: "NASDAQ" },
  MCHI: { name: "China ETF", cat: "emerging", exchange: "NASDAQ" },
  EWY: { name: "South Korea ETF", cat: "emerging", exchange: "NYSE" },
  BTC: { name: "Bitcoin", display: "BTC", cat: "crypto", exchange: "CRYPTO" },
  ETH: { name: "Ethereum", display: "ETH", cat: "crypto", exchange: "CRYPTO" },
  SOL: { name: "Solana", display: "SOL", cat: "crypto", exchange: "CRYPTO" },
  "^GSPC": { name: "S&P 500", display: "SPX", cat: "indices", exchange: "INDEX" },
  "^DJI": { name: "Dow Jones", display: "DJIA", cat: "indices", exchange: "INDEX" },
  "^IXIC": { name: "NASDAQ Comp.", display: "IXIC", cat: "indices", exchange: "INDEX" },
  "^FTSE": { name: "FTSE 100", display: "FTSE", cat: "indices", exchange: "LSE" },
  "^GDAXI": { name: "DAX", display: "DAX", cat: "indices", exchange: "XETRA" },
  "^N225": { name: "Nikkei 225", display: "N225", cat: "indices", exchange: "TSE" },
  "^HSI": { name: "Hang Seng", display: "HSI", cat: "indices", exchange: "HKEX" },
  "^BVSP": { name: "Ibovespa", display: "IBOV", cat: "indices", exchange: "B3" },
  PETR4: { name: "Petrobras PN", cat: "brazil", exchange: "B3" },
  VALE3: { name: "Vale", cat: "brazil", exchange: "B3" },
  ITUB4: { name: "Itaú Unibanco", cat: "brazil", exchange: "B3" },
  BBDC4: { name: "Bradesco", cat: "brazil", exchange: "B3" },
  BBAS3: { name: "Banco do Brasil", cat: "brazil", exchange: "B3" },
};

const CATEGORIES = {
  aerospace:      { label: "Aerospace & Defense", icon: "🛡",  color: "#607D8B" },
  brazil:         { label: "Brazil Equities",      icon: "🇧🇷", color: "#009C3B" },
  cleanenergy:    { label: "Clean Energy",         icon: "🔋",  color: "#66BB6A" },
  consumer:       { label: "Consumer",             icon: "🛒",  color: "#FF7043" },
  crypto:         { label: "Crypto",               icon: "🪙",  color: "#F9A825" },
  emerging:       { label: "Emerging Markets",     icon: "🌍",  color: "#26A69A" },
  "oil-gas":      { label: "Oil & Gas",            icon: "🛢",  color: "#FF9100" },
  financials:     { label: "Financials",           icon: "🏦",  color: "#4CAF50" },
  healthcare:     { label: "Health Care",          icon: "💊",  color: "#E91E63" },
  indices:        { label: "Global Indices",       icon: "🌐",  color: "#7C4DFF" },
  reits:          { label: "Real Estate",          icon: "🏢",  color: "#AB47BC" },
  semiconductors: { label: "Semiconductors",       icon: "🔬",  color: "#26C6DA" },
  technology:     { label: "Technology",           icon: "⚡",  color: "#00BCD4" },
};

// News sources with metadata
const NEWS_SOURCES = {
  reuters:     { label: "Reuters",          color: "#FF8C00", tier: 1, bias: "neutral",  coverage: "global" },
  bloomberg:   { label: "Bloomberg",        color: "#1AA3FF", tier: 1, bias: "neutral",  coverage: "global" },
  wsj:         { label: "WSJ",              color: "#000000", color2: "#fff", tier: 1, bias: "neutral",  coverage: "us" },
  ft:          { label: "FT",              color: "#FCD28D", tier: 1, bias: "neutral",  coverage: "global" },
  cnbc:        { label: "CNBC",             color: "#00A2D9", tier: 2, bias: "neutral",  coverage: "us" },
  marketwatch: { label: "MarketWatch",      color: "#0071CE", tier: 2, bias: "neutral",  coverage: "us" },
  seekingalpha:{ label: "Seeking Alpha",    color: "#1DB954", tier: 2, bias: "bullish",  coverage: "us" },
  zacks:       { label: "Zacks",            color: "#E63946", tier: 2, bias: "quant",    coverage: "us" },
  economist:   { label: "The Economist",    color: "#E03A3E", tier: 1, bias: "neutral",  coverage: "global" },
  finnhub:     { label: "Finnhub",          color: "#00BCD4", tier: 2, bias: "neutral",  coverage: "us" },
  nikkei:      { label: "Nikkei Asia",      color: "#D90429", tier: 2, bias: "neutral",  coverage: "asia" },
  caixin:      { label: "Caixin Global",    color: "#C62828", tier: 2, bias: "neutral",  coverage: "china" },
  valor:       { label: "Valor Econômico",  color: "#009C3B", tier: 2, bias: "neutral",  coverage: "brasil" },
  morningstar: { label: "Morningstar",      color: "#E87722", tier: 2, bias: "neutral",  coverage: "global" },
};

// Map asset categories to most-relevant news sources
const CAT_SOURCE_AFFINITY = {
  tech:       ["bloomberg", "reuters", "wsj", "cnbc", "seekingalpha", "zacks"],
  "oil-gas":  ["reuters", "bloomberg", "wsj", "ft", "morningstar"],
  financials: ["bloomberg", "wsj", "reuters", "ft", "seekingalpha", "finnhub"],
  healthcare: ["reuters", "bloomberg", "wsj", "morningstar", "seekingalpha"],
  semis:      ["bloomberg", "reuters", "cnbc", "seekingalpha", "zacks"],
  consumer:   ["wsj", "reuters", "cnbc", "marketwatch", "morningstar"],
  defense:    ["reuters", "wsj", "ft", "bloomberg"],
  ev:         ["bloomberg", "reuters", "cnbc", "seekingalpha", "marketwatch"],
  reits:      ["wsj", "bloomberg", "morningstar", "marketwatch", "seekingalpha"],
  emerging:   ["ft", "reuters", "bloomberg", "economist", "nikkei", "caixin"],
  crypto:     ["bloomberg", "reuters", "cnbc", "seekingalpha", "marketwatch"],
  indices:    ["bloomberg", "reuters", "wsj", "ft", "cnbc", "economist"],
  brasil:     ["valor", "reuters", "bloomberg", "ft"],
};

// Build keyword search map for each asset
function buildSearchQuery(symbol) {
  const asset = ASSETS[symbol];
  if (!asset) return symbol;
  const display = asset.display || symbol;
  const name = asset.name;
  // Use display name for cleaner search (e.g. "SPX" + "S&P 500")
  if (asset.cat === "indices") return `${name} index market`;
  if (asset.cat === "crypto") return `${name} ${display} crypto`;
  if (asset.cat === "fx") return `${name} forex`;
  return `${name} ${symbol} stock`;
}

// ─── FETCH REAL NEWS via Finnhub (free tier) ─────────────────────────────────

async function fetchFinnhubNews(symbol) {
  if (!hasFinnhubKey()) return null;
  const data = await finnhubNews(symbol);
  if (!data) return null;
  return data.map(n => ({
    id:            n.id || Math.random(),
    headline:      n.headline,
    summary:       n.summary,
    url:           n.url,
    source:        n.source,
    datetime:      n.datetime * 1000,
    image:         n.image,
    relatedSymbol: symbol,
  }));
}

// Fetch market-wide news (forex, crypto, general)
async function fetchFinnhubMarketNews() {
  // Market-wide news: reuse the general finnhubNews call on a broad index symbol
  // Finnhub free tier supports company-news per symbol; for general news use AAPL as proxy
  if (!hasFinnhubKey()) return null;
  const data = await finnhubNews("AAPL"); // general market proxy — returns broad market news
  if (!data) return null;
  return data.map(n => ({
    id:       n.id || Math.random(),
    headline: n.headline,
    summary:  n.summary,
    url:      n.url,
    source:   n.source,
    datetime: n.datetime * 1000,
  }));
}

// ─── MOCK NEWS GENERATOR (when no Finnhub key) ───────────────────────────────

const MOCK_TEMPLATES = {
  tech: [
    "{name} reports quarterly earnings beat, raises forward guidance",
    "{name} stock surges after AI partnership announcement",
    "Analysts raise {ticker} price target amid strong cloud growth",
    "{name} faces antitrust scrutiny from EU regulators",
    "{name} unveils new product line at developer conference",
  ],
  "oil-gas": [
    "{name} raises dividend after record quarterly profits",
    "OPEC+ output cuts boost {name} revenue outlook",
    "{name} expands LNG capacity with $4B infrastructure deal",
    "Crude prices push {ticker} shares to 52-week high",
    "{name} accelerates renewable energy transition strategy",
  ],
  financials: [
    "{name} beats Q3 earnings, credit losses remain contained",
    "Fed rate decision puts {name} net interest margin in focus",
    "{name} announces $5B share buyback program",
    "Analysts upgrade {ticker} on strong investment banking pipeline",
    "{name} expands wealth management division with new acquisitions",
  ],
  healthcare: [
    "{name} Phase 3 trial shows positive results for flagship drug",
    "FDA approves {name}'s new treatment, stock rallies",
    "{name} acquires biotech firm in $2.3B deal",
    "Patent expiry concerns weigh on {ticker} valuation",
    "{name} reports 18% revenue growth driven by GLP-1 demand",
  ],
  semis: [
    "{name} raises chip production guidance amid AI demand surge",
    "Data center orders push {ticker} to record backlog",
    "{name} announces next-gen architecture at industry conference",
    "Supply chain bottlenecks ease for {name}, margins improve",
    "{name} deepens partnership with major cloud hyperscalers",
  ],
  consumer: [
    "{name} same-store sales beat estimates on resilient consumer",
    "Margin expansion at {name} drives analyst upgrades",
    "{name} expands into emerging markets with new store openings",
    "E-commerce growth accelerates at {name}, EPS revised higher",
    "{name} faces headwinds from softening discretionary spending",
  ],
  defense: [
    "{name} secures $8.2B Pentagon contract for advanced systems",
    "NATO spending surge fuels {ticker} long-term revenue visibility",
    "{name} beats earnings on strong backlog execution",
    "Geopolitical tensions lift {name} order intake",
    "{name} awarded classified satellite contract by Space Force",
  ],
  ev: [
    "{name} delivery numbers exceed expectations for the quarter",
    "Charging infrastructure expansion accelerates {name} growth thesis",
    "{name} cuts production costs with new battery chemistry",
    "Policy tailwinds boost {ticker} with new EV incentive package",
    "{name} expands into European market with new gigafactory",
  ],
  reits: [
    "{name} raises quarterly dividend, maintains 95% occupancy",
    "Interest rate easing cycle lifts {ticker} valuations",
    "{name} acquires prime assets in data center REIT portfolio",
    "{name} reports FFO beat, tightens full-year guidance",
    "Industrial real estate demand drives {name} rent growth",
  ],
  emerging: [
    "Institutional inflows into {ticker} hit 12-month high",
    "{name} rallies as EM sentiment improves on dollar weakness",
    "Central bank rate decision lifts {ticker} underlying holdings",
    "{name} rebalances to capture growth in Southeast Asia",
    "Geopolitical risk premium fades, {ticker} gaps higher",
  ],
  crypto: [
    "{name} breaks key resistance as institutional buying resumes",
    "Spot ETF inflows push {ticker} to new cycle highs",
    "{name} network activity hits all-time high on-chain",
    "Regulatory clarity in EU boosts {ticker} adoption outlook",
    "{name} developer activity surges, DeFi TVL expands",
  ],
  indices: [
    "{name} closes at record high on strong earnings season",
    "Fed pivot expectations lift {display} by 1.4% on the week",
    "Breadth improves as {name} rallies across all sectors",
    "{name} consolidates gains ahead of key macro data releases",
    "Global risk-on mood pushes {display} through resistance level",
  ],
  brasil: [
    "{name} supera expectativas com resultado trimestral sólido",
    "Queda do dólar impulsiona ações do {name} na B3",
    "{name} anuncia distribuição de dividendos acima do consenso",
    "Analistas elevam preço-alvo do {ticker} após revisão de guidance",
    "SELIC em foco: {name} entre os mais sensíveis à taxa de juros",
  ],
};

const MOCK_SOURCES_BY_CAT = {
  tech: ["Bloomberg", "Reuters", "CNBC", "WSJ", "Seeking Alpha"],
  "oil-gas": ["Reuters", "Bloomberg", "FT", "WSJ", "Morningstar"],
  financials: ["Bloomberg", "WSJ", "FT", "Reuters", "Finnhub"],
  healthcare: ["Reuters", "Bloomberg", "WSJ", "Morningstar", "Seeking Alpha"],
  semis: ["Bloomberg", "Reuters", "CNBC", "Seeking Alpha", "Zacks"],
  consumer: ["WSJ", "Reuters", "CNBC", "MarketWatch", "Morningstar"],
  defense: ["Reuters", "WSJ", "FT", "Bloomberg"],
  ev: ["Bloomberg", "Reuters", "CNBC", "Seeking Alpha", "MarketWatch"],
  reits: ["WSJ", "Bloomberg", "Morningstar", "MarketWatch", "Seeking Alpha"],
  emerging: ["FT", "Reuters", "Bloomberg", "The Economist", "Nikkei Asia"],
  crypto: ["Bloomberg", "Reuters", "CNBC", "Seeking Alpha", "CoinDesk"],
  indices: ["Bloomberg", "Reuters", "WSJ", "FT", "CNBC"],
  brasil: ["Valor Econômico", "Reuters", "Bloomberg", "Exame"],
};

function generateMockNews(symbol, count = 5) {
  const asset = ASSETS[symbol];
  if (!asset) return [];
  const templates = MOCK_TEMPLATES[asset.cat] || MOCK_TEMPLATES.tech;
  const sources   = MOCK_SOURCES_BY_CAT[asset.cat] || MOCK_SOURCES_BY_CAT.tech;
  const display   = asset.display || symbol;

  return Array.from({ length: count }, (_, i) => {
    const template = templates[i % templates.length];
    const headline = template
      .replace("{name}", asset.name)
      .replace("{ticker}", symbol)
      .replace("{display}", display);
    const hoursAgo = Math.floor(Math.random() * 48) + 1;
    return {
      id: `${symbol}-mock-${i}`,
      headline,
      summary: `Market analysts are closely watching ${asset.name} (${display}) as the latest developments suggest significant implications for sector performance and investor positioning in the current macroeconomic environment.`,
      url: null,
      source: sources[i % sources.length],
      datetime: Date.now() - hoursAgo * 3600 * 1000,
      relatedSymbol: symbol,
      isMock: true,
    };
  });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function getSourceColor(sourceName) {
  const lower = sourceName.toLowerCase();
  for (const [key, cfg] of Object.entries(NEWS_SOURCES)) {
    if (lower.includes(key) || lower.includes(cfg.label.toLowerCase())) {
      return cfg.color;
    }
  }
  return "#78909C";
}

// ─── SOURCE BADGE ─────────────────────────────────────────────────────────────

function SourcePill({ name }) {
  const color = getSourceColor(name);
  return (
    <span style={{
      fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: "0.6px",
      color, background: color + "18", border: `1px solid ${color}30`,
      borderRadius: 3, padding: "1px 6px", whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {name}
    </span>
  );
}

// ─── ASSET CHIP ──────────────────────────────────────────────────────────────

function AssetChip({ symbol, active, onClick }) {
  const asset = ASSETS[symbol];
  if (!asset) return null;
  const cat = CATEGORIES[asset.cat];
  const display = asset.display || symbol;
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: mono, fontSize: 10, fontWeight: active ? 700 : 500,
        color: active ? cat?.color || "#00E676" : "var(--c-text-3)",
        background: active ? (cat?.color || "#00E676") + "14" : "transparent",
        border: `1px solid ${active ? (cat?.color || "#00E676") + "50" : "var(--c-border)"}`,
        borderRadius: 5, padding: "4px 10px", cursor: "pointer",
        whiteSpace: "nowrap", transition: "all 0.15s ease",
        letterSpacing: "0.3px",
      }}
    >
      {display}
    </button>
  );
}

// ─── NEWS CARD ────────────────────────────────────────────────────────────────

function NewsCard({ article, onSymbolClick }) {
  const [hovered, setHovered] = useState(false);
  const asset = article.relatedSymbol ? ASSETS[article.relatedSymbol] : null;
  const cat   = asset ? CATEGORIES[asset.cat] : null;
  const accentColor = cat?.color || "#00E676";
  const display = asset ? (asset.display || article.relatedSymbol) : null;

  const cardContent = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `linear-gradient(135deg, ${accentColor}08, rgba(13,15,24,0.96))`
          : "var(--c-surface)",
        border: `1px solid ${hovered ? accentColor + "35" : "var(--c-border)"}`,
        borderRadius: 8, padding: "14px 16px",
        transition: "all 0.2s ease", cursor: article.url ? "pointer" : "default",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: accentColor, opacity: 0.6, borderRadius: "8px 0 0 8px",
      }} />

      {/* Top meta row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        marginBottom: 8, paddingLeft: 6, flexWrap: "wrap",
      }}>
        <SourcePill name={article.source} />
        {article.isMock && (
          <span style={{
            fontFamily: mono, fontSize: 7, color: "#78909C",
            background: "rgba(120,144,156,0.1)", border: "1px solid rgba(120,144,156,0.2)",
            borderRadius: 3, padding: "1px 5px", letterSpacing: "0.5px",
          }}>
            SIMULATED
          </span>
        )}
        {display && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSymbolClick && onSymbolClick(article.relatedSymbol); }}
            style={{
              fontFamily: mono, fontSize: 8, fontWeight: 700,
              color: accentColor, background: accentColor + "14",
              border: `1px solid ${accentColor}30`,
              borderRadius: 10, padding: "1px 7px", cursor: "pointer",
              letterSpacing: "0.5px", transition: "all 0.15s ease",
            }}
          >
            {display}
          </button>
        )}
        <span style={{
          fontFamily: mono, fontSize: 9, color: "var(--c-text-3)",
          marginLeft: "auto", whiteSpace: "nowrap",
        }}>
          {timeAgo(article.datetime)}
        </span>
      </div>

      {/* Headline */}
      <div style={{
        fontFamily: sans, fontSize: 13, fontWeight: 600,
        color: hovered ? "var(--c-text)" : "rgba(255,255,255,0.88)",
        lineHeight: 1.45, paddingLeft: 6, marginBottom: 6,
        transition: "color 0.2s ease",
      }}>
        {article.headline}
      </div>

      {/* Summary */}
      {article.summary && (
        <div style={{
          fontFamily: sans, fontSize: 11, color: "var(--c-text-2)",
          lineHeight: 1.6, paddingLeft: 6,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {article.summary}
        </div>
      )}

      {/* Read more link */}
      {article.url && hovered && (
        <div style={{
          fontFamily: mono, fontSize: 9, color: accentColor,
          paddingLeft: 6, marginTop: 8, letterSpacing: "0.5px",
        }}>
          READ FULL ARTICLE →
        </div>
      )}
    </div>
  );

  if (article.url) {
    return (
      <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
        {cardContent}
      </a>
    );
  }
  return cardContent;
}

// ─── FEATURED CARD (large, for lead stories) ─────────────────────────────────

function FeaturedCard({ article, onSymbolClick }) {
  const [hovered, setHovered] = useState(false);
  const asset = article.relatedSymbol ? ASSETS[article.relatedSymbol] : null;
  const cat   = asset ? CATEGORIES[asset.cat] : null;
  const accentColor = cat?.color || "#7C4DFF";
  const display = asset ? (asset.display || article.relatedSymbol) : null;

  const inner = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `linear-gradient(135deg, ${accentColor}12, rgba(13,15,24,0.98))`
          : `linear-gradient(135deg, ${accentColor}08, rgba(13,15,24,0.96))`,
        border: `1px solid ${hovered ? accentColor + "50" : accentColor + "25"}`,
        borderRadius: 10, padding: "20px 22px",
        transition: "all 0.25s ease", cursor: article.url ? "pointer" : "default",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Glow */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 200, height: 200,
        background: `radial-gradient(ellipse, ${accentColor}08 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* FEATURED label */}
      <div style={{
        fontFamily: mono, fontSize: 8, fontWeight: 700, letterSpacing: "2px",
        color: accentColor, marginBottom: 10, opacity: 0.8,
      }}>
        ◆ FEATURED
      </div>

      {/* Meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <SourcePill name={article.source} />
        {article.isMock && (
          <span style={{
            fontFamily: mono, fontSize: 7, color: "#78909C",
            background: "rgba(120,144,156,0.1)", border: "1px solid rgba(120,144,156,0.2)",
            borderRadius: 3, padding: "1px 5px",
          }}>SIMULATED</span>
        )}
        {display && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSymbolClick?.(article.relatedSymbol); }}
            style={{
              fontFamily: mono, fontSize: 9, fontWeight: 700,
              color: accentColor, background: accentColor + "14",
              border: `1px solid ${accentColor}35`,
              borderRadius: 10, padding: "2px 8px", cursor: "pointer",
            }}
          >
            {display}
          </button>
        )}
        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", marginLeft: "auto" }}>
          {timeAgo(article.datetime)}
        </span>
      </div>

      {/* Headline */}
      <div style={{
        fontFamily: sans, fontSize: 16, fontWeight: 700,
        color: "var(--c-text)", lineHeight: 1.4, marginBottom: 10,
      }}>
        {article.headline}
      </div>

      {/* Summary */}
      {article.summary && (
        <div style={{
          fontFamily: sans, fontSize: 12, color: "var(--c-text-2)",
          lineHeight: 1.65,
          display: "-webkit-box", WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {article.summary}
        </div>
      )}

      {article.url && hovered && (
        <div style={{ fontFamily: mono, fontSize: 9, color: accentColor, marginTop: 12, letterSpacing: "0.5px" }}>
          READ FULL ARTICLE →
        </div>
      )}
    </div>
  );

  if (article.url) {
    return (
      <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
        {inner}
      </a>
    );
  }
  return inner;
}

// ─── TICKER SCROLL BAR ────────────────────────────────────────────────────────

function NewsTickerRow({ articles }) {
  if (!articles || articles.length === 0) return null;
  const items = [...articles, ...articles]; // duplicate for seamless loop

  return (
    <div style={{
      background: "rgba(0,0,0,0.3)", borderTop: "1px solid var(--c-border)",
      borderBottom: "1px solid var(--c-border)", padding: "8px 0",
      overflow: "hidden", position: "relative",
    }}>
      <div style={{
        display: "flex", gap: 0,
        animation: "tickerScroll 60s linear infinite",
        width: "max-content",
      }}>
        {items.map((a, i) => (
          <span key={i} style={{
            fontFamily: mono, fontSize: 10, color: "var(--c-text-2)",
            whiteSpace: "nowrap", padding: "0 24px",
            borderRight: "1px solid var(--c-border)",
          }}>
            <span style={{ color: getSourceColor(a.source), marginRight: 6 }}>▸</span>
            {a.headline}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── CATEGORY SECTION ────────────────────────────────────────────────────────

function CategorySection({ catKey, articles, onSymbolClick, collapsed, onToggle }) {
  const cat = CATEGORIES[catKey];
  if (!cat || articles.length === 0) return null;

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 10px", borderRadius: 6, cursor: "pointer",
          marginBottom: collapsed ? 0 : 14, userSelect: "none",
          transition: "background 0.15s ease",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 10, color: "var(--c-text-3)", transition: "transform 0.2s ease",
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            display: "inline-block",
          }}>▼</span>
          <span style={{ fontSize: 16 }}>{cat.icon}</span>
          <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: "var(--c-text)" }}>
            {cat.label}
          </span>
          <span style={{
            fontFamily: mono, fontSize: 9,
            color: cat.color, background: cat.color + "14",
            border: `1px solid ${cat.color}30`,
            borderRadius: 10, padding: "2px 8px",
          }}>
            {articles.length} stories
          </span>
        </div>
        <div style={{
          display: "flex", gap: 6, flexWrap: "wrap",
        }}>
          {(CAT_SOURCE_AFFINITY[catKey] || []).slice(0, 4).map(srcKey => {
            const src = NEWS_SOURCES[srcKey];
            if (!src) return null;
            return (
              <span key={srcKey} style={{
                fontFamily: mono, fontSize: 8, color: src.color,
                background: src.color + "10", border: `1px solid ${src.color}25`,
                borderRadius: 3, padding: "1px 6px",
              }}>
                {src.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{
        overflow: "hidden",
        maxHeight: collapsed ? 0 : 2000,
        opacity: collapsed ? 0 : 1,
        transition: "max-height 0.35s ease, opacity 0.25s ease",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}>
          <FeaturedCard article={featured} onSymbolClick={onSymbolClick} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rest.slice(0, 4).map((a, i) => (
              <NewsCard key={a.id || i} article={a} onSymbolClick={onSymbolClick} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SYMBOL NEWS FEED ─────────────────────────────────────────────────────────

function SymbolNewsFeed({ symbol, onBack }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const asset = ASSETS[symbol];
  const cat   = asset ? CATEGORIES[asset.cat] : null;
  const display = asset ? (asset.display || symbol) : symbol;

  useEffect(() => {
    setLoading(true);
    setArticles([]);
    let cancelled = false;
    (async () => {
      const live = await fetchFinnhubNews(symbol);
      if (cancelled) return;
      const data = live || generateMockNews(symbol, 8);
      setArticles(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [symbol]);

  return (
    <div style={{ animation: "slideUp 0.3s ease both" }}>
      {/* Back + header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            fontFamily: mono, fontSize: 11, color: "var(--c-text-2)",
            background: "transparent", border: "1px solid var(--c-border)",
            borderRadius: 6, padding: "6px 12px", cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => { e.target.style.borderColor = "#00E676"; e.target.style.color = "#00E676"; }}
          onMouseLeave={e => { e.target.style.borderColor = "var(--c-border)"; e.target.style.color = "var(--c-text-2)"; }}
        >
          ← BACK
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {cat && <span style={{ fontSize: 18 }}>{cat.icon}</span>}
          <span style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: "var(--c-text)" }}>
            {display}
          </span>
          {asset && (
            <span style={{ fontFamily: sans, fontSize: 13, color: "var(--c-text-2)" }}>
              {asset.name}
            </span>
          )}
          {cat && (
            <span style={{
              fontFamily: mono, fontSize: 9, color: cat.color,
              background: cat.color + "14", border: `1px solid ${cat.color}30`,
              borderRadius: 10, padding: "2px 8px",
            }}>
              {cat.label}
            </span>
          )}
        </div>
      </div>

      {/* Relevant sources */}
      {asset && CAT_SOURCE_AFFINITY[asset.cat] && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          background: "rgba(255,255,255,0.02)", border: "1px solid var(--c-border)",
          borderRadius: 6, padding: "10px 14px", marginBottom: 20,
        }}>
          <span style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px" }}>
            MONITORING:
          </span>
          {CAT_SOURCE_AFFINITY[asset.cat].map(srcKey => {
            const src = NEWS_SOURCES[srcKey];
            if (!src) return null;
            return (
              <span key={srcKey} style={{
                fontFamily: mono, fontSize: 9, fontWeight: 600,
                color: src.color, background: src.color + "12",
                border: `1px solid ${src.color}28`,
                borderRadius: 4, padding: "2px 8px",
              }}>
                {src.label}
              </span>
            );
          })}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "40px 0" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E676", animation: "pulse 1.2s ease-in-out infinite" }} />
          <span style={{ fontFamily: mono, fontSize: 11, color: "var(--c-text-3)" }}>Fetching news for {display}...</span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {articles.map((a, i) =>
            i === 0
              ? <div key={a.id || i} style={{ gridColumn: "1 / -1" }}><FeaturedCard article={a} /></div>
              : <NewsCard key={a.id || i} article={a} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── SMART FILTER ─────────────────────────────────────────────────────────────

function SmartFilter({
  searchQuery, onSearchChange,
  activeCat,   onCatChange,
  activeSource, onSourceChange,
  selectedSymbol, onSymbolSelect,
  openDropdown, onOpenDropdown,
}) {
  const barRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!openDropdown) return;
    function onDown(e) {
      if (barRef.current && !barRef.current.contains(e.target)) onOpenDropdown(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openDropdown, onOpenDropdown]);

  function toggle(name) {
    onOpenDropdown(openDropdown === name ? null : name);
  }

  const catEntry = activeCat    !== "all" ? CATEGORIES[activeCat]      : null;
  const srcEntry = activeSource !== "all" ? NEWS_SOURCES[activeSource] : null;

  const visibleTickers = Object.keys(ASSETS).filter(
    s => activeCat === "all" || ASSETS[s].cat === activeCat
  );

  function btnStyle(name, isValueSet) {
    const isOpen   = openDropdown === name;
    const isActive = isOpen || isValueSet;
    return {
      flexShrink: 0, position: "relative",
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.5px",
      color: isActive ? "#00E676" : "var(--c-text-2)",
      background: isActive ? "rgba(0,230,118,0.08)" : "transparent",
      border: `1px solid ${isActive ? "rgba(0,230,118,0.3)" : "var(--c-border)"}`,
      borderRadius: 6, padding: "4px 12px", cursor: "pointer",
      transition: "all 0.15s ease", whiteSpace: "nowrap",
    };
  }

  function panelStyle(name, minWidth) {
    const isOpen = openDropdown === name;
    return {
      position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 200,
      minWidth, background: "var(--c-panel, #0e1016)",
      border: "1px solid rgba(0,230,118,0.25)", borderRadius: 8,
      padding: isOpen ? 14 : 0,
      overflow: "hidden",
      maxHeight: isOpen ? 400 : 0,
      opacity: isOpen ? 1 : 0,
      transition: "max-height 0.2s ease, opacity 0.18s ease, padding 0.2s ease",
      pointerEvents: isOpen ? "auto" : "none",
    };
  }

  function SectionLabel({ children }) {
    return (
      <div style={{
        fontFamily: mono, fontSize: 8, color: "var(--c-text-3)",
        letterSpacing: "1.5px", marginBottom: 8,
      }}>
        {children}
      </div>
    );
  }

  return (
    <div ref={barRef} style={{ position: "relative", marginBottom: 20 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "var(--c-surface)",
        border: (catEntry || srcEntry || selectedSymbol)
          ? "1px solid rgba(0,230,118,0.2)"
          : "1px solid var(--c-border)",
        borderRadius: 8, padding: "10px 14px", boxSizing: "border-box",
        transition: "border-color 0.2s ease",
      }}>

        {/* Search */}
        <span style={{ color: "var(--c-text-3)", fontSize: 13, flexShrink: 0, userSelect: "none", lineHeight: 1 }}>🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search sectors, sources, tickers, headlines…"
          style={{
            flex: 1, minWidth: 0, background: "transparent",
            border: "none", outline: "none",
            fontFamily: sans, fontSize: 13, color: "var(--c-text)",
          }}
        />

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: "var(--c-border)", flexShrink: 0 }} />

        {/* ── SECTOR button + panel ── */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => toggle("sector")} style={btnStyle("sector", !!catEntry)}>
            {catEntry ? <>{catEntry.icon} {catEntry.label.split(" ")[0]}</> : "SECTOR"}
            {" "}{openDropdown === "sector" ? "▲" : "▼"}
          </button>
          <div style={panelStyle("sector", 360)}>
            <SectionLabel>SECTOR</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <button onClick={() => { onCatChange("all"); onOpenDropdown(null); }} style={{
                fontFamily: mono, fontSize: 10, fontWeight: activeCat === "all" ? 700 : 400,
                color: activeCat === "all" ? "#00E676" : "var(--c-text-3)",
                background: activeCat === "all" ? "rgba(0,230,118,0.1)" : "transparent",
                border: `1px solid ${activeCat === "all" ? "rgba(0,230,118,0.35)" : "var(--c-border)"}`,
                borderRadius: 10, padding: "4px 12px", cursor: "pointer", transition: "all 0.15s ease",
              }}>All</button>
              {Object.entries(CATEGORIES).map(([key, cat]) => {
                const a = activeCat === key;
                return (
                  <button key={key} onClick={() => { onCatChange(a ? "all" : key); onOpenDropdown(null); }} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    fontFamily: mono, fontSize: 10, fontWeight: a ? 700 : 400,
                    color: a ? cat.color : "var(--c-text-3)",
                    background: a ? cat.color + "14" : "transparent",
                    border: `1px solid ${a ? cat.color + "45" : "var(--c-border)"}`,
                    borderRadius: 10, padding: "4px 12px", cursor: "pointer", transition: "all 0.15s ease",
                  }}>
                    <span style={{ fontSize: 10 }}>{cat.icon}</span>
                    {cat.label.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SOURCE button + panel ── */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => toggle("source")} style={btnStyle("source", !!srcEntry)}>
            {srcEntry ? srcEntry.label : "SOURCE"}
            {" "}{openDropdown === "source" ? "▲" : "▼"}
          </button>
          <div style={panelStyle("source", 380)}>
            <SectionLabel>SOURCE</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <button onClick={() => { onSourceChange("all"); onOpenDropdown(null); }} style={{
                fontFamily: mono, fontSize: 9, fontWeight: activeSource === "all" ? 700 : 400,
                color: activeSource === "all" ? "#00E676" : "var(--c-text-3)",
                background: activeSource === "all" ? "rgba(0,230,118,0.1)" : "transparent",
                border: `1px solid ${activeSource === "all" ? "rgba(0,230,118,0.35)" : "var(--c-border)"}`,
                borderRadius: 4, padding: "3px 10px", cursor: "pointer", transition: "all 0.15s ease",
              }}>All</button>
              {Object.entries(NEWS_SOURCES).map(([key, src]) => {
                const a = activeSource === key;
                return (
                  <button key={key} onClick={() => { onSourceChange(a ? "all" : key); onOpenDropdown(null); }} style={{
                    fontFamily: mono, fontSize: 9, fontWeight: a ? 700 : 400,
                    color: a ? src.color : "var(--c-text-3)",
                    background: a ? src.color + "12" : "transparent",
                    border: `1px solid ${a ? src.color + "40" : "var(--c-border)"}`,
                    borderRadius: 4, padding: "3px 10px", cursor: "pointer", transition: "all 0.15s ease",
                  }}>{src.label}</button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── TICKERS button + panel ── */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => toggle("tickers")} style={btnStyle("tickers", !!selectedSymbol)}>
            {selectedSymbol || "TICKERS"}
            {" "}{openDropdown === "tickers" ? "▲" : "▼"}
          </button>
          <div style={panelStyle("tickers", 380)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <SectionLabel>
                TICKERS{catEntry && <span style={{ color: catEntry.color, marginLeft: 6 }}>— {catEntry.label}</span>}
              </SectionLabel>
              <span style={{ fontFamily: mono, fontSize: 8, color: "var(--c-text-3)", marginBottom: 8 }}>
                {visibleTickers.length} · click for feed
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 200, overflowY: "auto" }}>
              {visibleTickers.map(sym => (
                <AssetChip
                  key={sym}
                  symbol={sym}
                  active={selectedSymbol === sym}
                  onClick={() => { onSymbolSelect(sym); onOpenDropdown(null); }}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── MAIN NEWSPAGE ────────────────────────────────────────────────────────────

export default function NewsPage() {
  const [catArticles,   setCatArticles]   = useState({});  // catKey → articles[]
  const [tickerNews,    setTickerNews]    = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [activeSource,  setActiveSource]  = useState("all");
  const [activeCat,     setActiveCat]     = useState("all");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [loading,       setLoading]       = useState(true);
  const [lastUpdate,    setLastUpdate]    = useState(null);
  const [collapsedCats, setCollapsedCats] = useState({});
  const [viewMode,      setViewMode]      = useState("by-category"); // "by-category" | "feed"
  const [openDropdown,  setOpenDropdown]  = useState(null); // "sector" | "source" | "tickers" | null
  const hasFinnhub = hasFinnhubKey();

  // Load news for all categories on mount
  const loadAllNews = useCallback(async () => {
    setLoading(true);
    const result = {};

    // For each category, pick representative symbols and fetch (or mock)
    const catSymbols = {};
    for (const [sym, asset] of Object.entries(ASSETS)) {
      if (!catSymbols[asset.cat]) catSymbols[asset.cat] = [];
      catSymbols[asset.cat].push(sym);
    }

    const catKeys = Object.keys(CATEGORIES);

    if (hasFinnhub) {
      // Live: batch fetch top 2 symbols per category
      const jobs = catKeys.map(async (catKey) => {
        const syms = (catSymbols[catKey] || []).slice(0, 2);
        const allArticles = [];
        for (const sym of syms) {
          const news = await fetchFinnhubNews(sym);
          if (news) allArticles.push(...news.map(n => ({ ...n, relatedSymbol: sym })));
        }
        // Also fetch market general news for indices/fx
        if (catKey === "indices" || catKey === "fx") {
          const mkt = await fetchFinnhubMarketNews("general");
          if (mkt) allArticles.push(...mkt);
        }
        if (allArticles.length > 0) result[catKey] = allArticles.slice(0, 8);
        else result[catKey] = generateMockNews((catSymbols[catKey] || [])[0] || "AAPL", 5)
          .map(n => ({ ...n, relatedSymbol: (catSymbols[catKey] || [])[0] }));
      });
      await Promise.allSettled(jobs);
    } else {
      // Mock: generate for each category
      for (const catKey of catKeys) {
        const syms = catSymbols[catKey] || [];
        const articles = [];
        for (let i = 0; i < Math.min(syms.length, 3); i++) {
          const count = i === 0 ? 3 : 2;
          const mocks = generateMockNews(syms[i], count);
          articles.push(...mocks.map(n => ({ ...n, relatedSymbol: syms[i] })));
        }
        result[catKey] = articles.slice(0, 8);
      }
    }

    setCatArticles(result);
    setTickerNews(Object.values(result).flat().slice(0, 20));
    setLastUpdate(new Date());
    setLoading(false);
  }, [hasFinnhub]);

  useEffect(() => { loadAllNews(); }, [loadAllNews]);

  const toggleCat = (catKey) => {
    setCollapsedCats(prev => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  // All articles flat, filtered
  const allArticles = Object.values(catArticles).flat();

  const filteredArticles = allArticles.filter(a => {
    const asset = a.relatedSymbol ? ASSETS[a.relatedSymbol] : null;
    if (activeCat !== "all" && asset?.cat !== activeCat) return false;
    if (activeSource !== "all") {
      const srcLower = (a.source || "").toLowerCase();
      if (!srcLower.includes(activeSource) && !NEWS_SOURCES[activeSource]?.label.toLowerCase().includes(srcLower)) {
        const src = NEWS_SOURCES[activeSource];
        if (!src || !srcLower.includes(src.label.toLowerCase().split(" ")[0])) return false;
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const catLabel = CATEGORIES[asset?.cat]?.label?.toLowerCase() || "";
      const srcLabel = Object.values(NEWS_SOURCES).find(s =>
        a.source?.toLowerCase().includes(s.label.toLowerCase())
      )?.label?.toLowerCase() || a.source?.toLowerCase() || "";
      if (
        !a.headline?.toLowerCase().includes(q) &&
        !a.relatedSymbol?.toLowerCase().includes(q) &&
        !catLabel.includes(q) &&
        !srcLabel.includes(q)
      ) return false;
    }
    return true;
  });

  // Source coverage counts
  const sourceCounts = {};
  allArticles.forEach(a => {
    const s = a.source || "Unknown";
    sourceCounts[s] = (sourceCounts[s] || 0) + 1;
  });

  const topSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div style={{ padding: "24px 0 60px", animation: "fadeIn 0.4s ease both" }}>
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 20, flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>📰</span>
            <h1 style={{
              fontFamily: sans, fontSize: 26, fontWeight: 700,
              color: "var(--c-text)", margin: 0, letterSpacing: "-0.3px",
            }}>
              Market Intelligence
            </h1>
          </div>
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--c-text-3)", letterSpacing: "1.2px" }}>
            BLOOMBERG · REUTERS · WSJ · FT · CNBC · SEEKING ALPHA · ZACKS · MORNINGSTAR · VALOR
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!hasFinnhub && (
            <div style={{
              fontFamily: mono, fontSize: 9, color: "#FFD740",
              background: "rgba(255,215,64,0.08)", border: "1px solid rgba(255,215,64,0.2)",
              borderRadius: 5, padding: "5px 10px", letterSpacing: "0.5px",
            }}>
              ⚠ SIMULATED — Add Finnhub key for live news
            </div>
          )}
          {hasFinnhub && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E676", animation: "pulse 2s ease-in-out infinite", boxShadow: "0 0 8px #00E67666" }} />
              <span style={{ fontFamily: mono, fontSize: 10, color: "#00E676", letterSpacing: "1px" }}>LIVE</span>
            </div>
          )}
          {lastUpdate && (
            <span style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)" }}>
              {lastUpdate.toLocaleTimeString("en-US", { hour12: false })}
            </span>
          )}
          <button
            onClick={loadAllNews}
            style={{
              fontFamily: mono, fontSize: 10, fontWeight: 600,
              color: "var(--c-text-2)", background: "transparent",
              border: "1px solid var(--c-border)", borderRadius: 6,
              padding: "6px 14px", cursor: "pointer", letterSpacing: "0.5px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => { e.target.style.borderColor = "#00E676"; e.target.style.color = "#00E676"; }}
            onMouseLeave={e => { e.target.style.borderColor = "var(--c-border)"; e.target.style.color = "var(--c-text-2)"; }}
          >
            REFRESH
          </button>
        </div>
      </div>

      {/* ── TICKER SCROLL ── */}
      {tickerNews.length > 0 && (
        <div style={{ marginBottom: 20, borderRadius: 6, overflow: "hidden" }}>
          <NewsTickerRow articles={tickerNews} />
        </div>
      )}

      {/* ── SYMBOL DRILL-DOWN VIEW ── */}
      {selectedSymbol ? (
        <SymbolNewsFeed symbol={selectedSymbol} onBack={() => setSelectedSymbol(null)} />
      ) : (
        <>
          {/* ── STATS + SOURCE MONITOR ── */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto",
            gap: 10, marginBottom: 20,
          }}>
            {/* Total stories */}
            <div style={{
              background: "var(--c-surface)", border: "1px solid var(--c-border)",
              borderRadius: 8, padding: "14px 16px",
            }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1.2px", marginBottom: 6 }}>TOTAL STORIES</div>
              <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 700, color: "var(--c-text)" }}>
                {loading ? "—" : allArticles.length}
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", marginTop: 4 }}>
                {Object.keys(catArticles).length} sectors covered
              </div>
            </div>

            {/* Live sources */}
            <div style={{
              background: "var(--c-surface)", border: "1px solid var(--c-border)",
              borderRadius: 8, padding: "14px 16px",
            }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1.2px", marginBottom: 6 }}>DATA SOURCES</div>
              <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 700, color: "#00E676" }}>
                {hasFinnhub ? "LIVE" : "SIM"}
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", marginTop: 4 }}>
                {hasFinnhub ? "Finnhub + aggregated feeds" : "Simulated — connect API key"}
              </div>
            </div>

            {/* Top source */}
            <div style={{
              background: "var(--c-surface)", border: "1px solid var(--c-border)",
              borderRadius: 8, padding: "14px 16px",
            }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1.2px", marginBottom: 6 }}>TOP SOURCE</div>
              {topSources[0] ? (
                <>
                  <div style={{
                    fontFamily: mono, fontSize: 13, fontWeight: 700,
                    color: getSourceColor(topSources[0][0]),
                  }}>
                    {topSources[0][0]}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", marginTop: 4 }}>
                    {topSources[0][1]} articles indexed
                  </div>
                </>
              ) : <div style={{ fontFamily: mono, fontSize: 13, color: "var(--c-text-3)" }}>—</div>}
            </div>

            {/* View toggle */}
            <div style={{
              background: "var(--c-surface)", border: "1px solid var(--c-border)",
              borderRadius: 8, padding: "14px 16px",
              display: "flex", flexDirection: "column", gap: 6, justifyContent: "center",
            }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1px", marginBottom: 2 }}>VIEW</div>
              {[
                { key: "by-category", label: "By Sector" },
                { key: "feed",        label: "Feed" },
              ].map(v => {
                const active = viewMode === v.key;
                return (
                  <button key={v.key} onClick={() => setViewMode(v.key)}
                    style={{
                      fontFamily: mono, fontSize: 10, fontWeight: active ? 700 : 400,
                      color: active ? "#00E676" : "var(--c-text-3)",
                      background: active ? "rgba(0,230,118,0.1)" : "transparent",
                      border: `1px solid ${active ? "#00E67640" : "var(--c-border)"}`,
                      borderRadius: 5, padding: "4px 10px", cursor: "pointer",
                      transition: "all 0.15s ease", textAlign: "left",
                    }}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          <SmartFilter
            searchQuery={searchQuery}       onSearchChange={setSearchQuery}
            activeCat={activeCat}           onCatChange={setActiveCat}
            activeSource={activeSource}     onSourceChange={setActiveSource}
            selectedSymbol={selectedSymbol} onSymbolSelect={setSelectedSymbol}
            openDropdown={openDropdown}     onOpenDropdown={setOpenDropdown}
          />

          {/* ── LOADING ── */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "60px 0" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00E676", animation: "pulse 1.2s ease-in-out infinite" }} />
              <span style={{ fontFamily: mono, fontSize: 12, color: "var(--c-text-3)" }}>
                {hasFinnhub ? "Fetching live news feeds..." : "Generating market intelligence..."}
              </span>
            </div>
          )}

          {/* ── BY CATEGORY VIEW ── */}
          {!loading && viewMode === "by-category" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 12 }}>
                <button
                  onClick={() => {
                    const all = {};
                    Object.keys(CATEGORIES).forEach(k => all[k] = true);
                    setCollapsedCats(all);
                  }}
                  style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)", background: "transparent", border: "1px solid var(--c-border)", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}
                >
                  ▲ Collapse all
                </button>
                <button
                  onClick={() => setCollapsedCats({})}
                  style={{ fontFamily: mono, fontSize: 10, color: "var(--c-text-3)", background: "transparent", border: "1px solid var(--c-border)", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}
                >
                  ▼ Expand all
                </button>
              </div>
              {Object.keys(CATEGORIES).map(catKey => {
                const articles = (catArticles[catKey] || []).filter(a => {
                  if (activeSource !== "all") {
                    const srcLower = (a.source || "").toLowerCase();
                    const src = NEWS_SOURCES[activeSource];
                    if (!src) return true;
                    return srcLower.includes(src.label.toLowerCase().split(" ")[0]);
                  }
                  if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    return a.headline?.toLowerCase().includes(q) || a.relatedSymbol?.toLowerCase().includes(q);
                  }
                  return true;
                });
                if (activeCat !== "all" && activeCat !== catKey) return null;
                if (articles.length === 0) return null;
                return (
                  <CategorySection
                    key={catKey}
                    catKey={catKey}
                    articles={articles}
                    onSymbolClick={setSelectedSymbol}
                    collapsed={!!collapsedCats[catKey]}
                    onToggle={() => toggleCat(catKey)}
                  />
                );
              })}
            </div>
          )}

          {/* ── FEED VIEW ── */}
          {!loading && viewMode === "feed" && (
            <div>
              <div style={{
                fontFamily: mono, fontSize: 9, color: "var(--c-text-3)",
                letterSpacing: "1.2px", marginBottom: 12,
              }}>
                {filteredArticles.length} STORIES · SORTED BY RECENCY
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {filteredArticles
                  .sort((a, b) => b.datetime - a.datetime)
                  .map((a, i) => (
                  <NewsCard key={a.id || i} article={a} onSymbolClick={setSelectedSymbol} />
                ))}
              </div>
              {filteredArticles.length === 0 && (
                <div style={{ padding: "60px 0", textAlign: "center" }}>
                  <div style={{ fontFamily: mono, fontSize: 12, color: "var(--c-text-3)" }}>
                    No stories match your current filters.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SOURCE MONITOR FOOTER ── */}
          {!loading && (
            <div style={{
              borderTop: "1px solid var(--c-border)", marginTop: 32, paddingTop: 20,
            }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: "var(--c-text-3)", letterSpacing: "1.5px", marginBottom: 14 }}>
                SOURCE MONITOR
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                {Object.entries(NEWS_SOURCES).map(([key, src]) => {
                  const count = allArticles.filter(a => (a.source || "").toLowerCase().includes(src.label.toLowerCase().split(" ")[0].toLowerCase())).length;
                  return (
                    <div key={key} style={{
                      background: "var(--c-surface)", border: `1px solid ${src.color}20`,
                      borderRadius: 6, padding: "10px 12px",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: src.color }}>{src.label}</div>
                        <div style={{ fontFamily: mono, fontSize: 8, color: "var(--c-text-3)", marginTop: 2 }}>
                          {src.coverage.toUpperCase()} · Tier {src.tier}
                        </div>
                      </div>
                      <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: count > 0 ? "var(--c-text)" : "var(--c-text-3)" }}>
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
