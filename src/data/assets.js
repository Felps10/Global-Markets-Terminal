// SOURCE OF TRUTH: backend database (seeded from this file)
// This file is used for: initial seed + offline fallback only
// Do not edit manually — use the admin UI at /admin/taxonomy
//
// meta field: JSON-serialisable object with extra display/source properties:
//   isCrypto  — fetched via CoinGecko instead of Yahoo Finance
//   isB3      — fetched via BRAPI (Brazilian B3 exchange)
//   cgId      — CoinGecko coin ID string (required when isCrypto: true)
//   display   — short display ticker (for indices, FX pairs, crypto)
//   alsoIn    — array of additional subgroup IDs for cross-listing

export const ASSETS = [
  // ── Technology ──────────────────────────────────────────────────────────
  { id: "aapl",  symbol: "AAPL",  name: "Apple",          subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "msft",  symbol: "MSFT",  name: "Microsoft",      subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "googl", symbol: "GOOGL", name: "Alphabet",       subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "amzn",  symbol: "AMZN",  name: "Amazon",         subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "nvda",  symbol: "NVDA",  name: "NVIDIA",         subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NASDAQ", meta: { alsoIn: ["semiconductors"] } },
  { id: "meta",  symbol: "META",  name: "Meta Platforms", subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "tsla",  symbol: "TSLA",  name: "Tesla",          subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NASDAQ", meta: { alsoIn: ["cleanenergy"] } },
  { id: "orcl",  symbol: "ORCL",  name: "Oracle",         subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "nflx",  symbol: "NFLX",  name: "Netflix",        subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "uber",  symbol: "UBER",  name: "Uber",           subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "crm",   symbol: "CRM",   name: "Salesforce",     subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "now",   symbol: "NOW",   name: "ServiceNow",     subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "adbe",  symbol: "ADBE",  name: "Adobe",          subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "shop",  symbol: "SHOP",  name: "Shopify",        subgroup_id: "technology",     group_id: "equities", type: "equity", exchange: "NYSE"   },

  // ── Oil & Gas ────────────────────────────────────────────────────────────
  { id: "xom",   symbol: "XOM",   name: "ExxonMobil",      subgroup_id: "oil-gas", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "cvx",   symbol: "CVX",   name: "Chevron",         subgroup_id: "oil-gas", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "shel",  symbol: "SHEL",  name: "Shell",           subgroup_id: "oil-gas", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "tte",   symbol: "TTE",   name: "TotalEnergies",   subgroup_id: "oil-gas", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "cop",   symbol: "COP",   name: "ConocoPhillips",  subgroup_id: "oil-gas", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "bp",    symbol: "BP",    name: "BP",              subgroup_id: "oil-gas", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "enb",   symbol: "ENB",   name: "Enbridge",        subgroup_id: "oil-gas", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "slb",   symbol: "SLB",   name: "Schlumberger",    subgroup_id: "oil-gas", group_id: "equities", type: "equity", exchange: "NYSE" },

  // ── Financials ───────────────────────────────────────────────────────────
  { id: "jpm",   symbol: "JPM",   name: "JPMorgan Chase",    subgroup_id: "financials", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "gs",    symbol: "GS",    name: "Goldman Sachs",     subgroup_id: "financials", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "bac",   symbol: "BAC",   name: "Bank of America",   subgroup_id: "financials", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "wfc",   symbol: "WFC",   name: "Wells Fargo",       subgroup_id: "financials", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "ms",    symbol: "MS",    name: "Morgan Stanley",    subgroup_id: "financials", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "v",     symbol: "V",     name: "Visa",              subgroup_id: "financials", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "ma",    symbol: "MA",    name: "Mastercard",        subgroup_id: "financials", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "blk",   symbol: "BLK",   name: "BlackRock",         subgroup_id: "financials", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "c",     symbol: "C",     name: "Citigroup",         subgroup_id: "financials", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "axp",   symbol: "AXP",   name: "American Express",  subgroup_id: "financials", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "schw",  symbol: "SCHW",  name: "Charles Schwab",    subgroup_id: "financials", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "bx",    symbol: "BX",    name: "Blackstone",        subgroup_id: "financials", group_id: "equities", type: "equity", exchange: "NYSE"   },

  // ── Health Care ──────────────────────────────────────────────────────────
  { id: "jnj",   symbol: "JNJ",   name: "Johnson & Johnson", subgroup_id: "healthcare", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "pfe",   symbol: "PFE",   name: "Pfizer",            subgroup_id: "healthcare", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "unh",   symbol: "UNH",   name: "UnitedHealth",      subgroup_id: "healthcare", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "lly",   symbol: "LLY",   name: "Eli Lilly",         subgroup_id: "healthcare", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "abt",   symbol: "ABT",   name: "Abbott Labs",       subgroup_id: "healthcare", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "mrna",  symbol: "MRNA",  name: "Moderna",           subgroup_id: "healthcare", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "mrk",   symbol: "MRK",   name: "Merck",             subgroup_id: "healthcare", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "abbv",  symbol: "ABBV",  name: "AbbVie",            subgroup_id: "healthcare", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "bmy",   symbol: "BMY",   name: "Bristol-Myers",     subgroup_id: "healthcare", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "isrg",  symbol: "ISRG",  name: "Intuitive Surgical", subgroup_id: "healthcare", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "elv",   symbol: "ELV",   name: "Elevance Health",   subgroup_id: "healthcare", group_id: "equities", type: "equity", exchange: "NYSE"   },

  // ── Semiconductors ───────────────────────────────────────────────────────
  { id: "amd",   symbol: "AMD",   name: "AMD",      subgroup_id: "semiconductors", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "intc",  symbol: "INTC",  name: "Intel",    subgroup_id: "semiconductors", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "tsm",   symbol: "TSM",   name: "TSMC",     subgroup_id: "semiconductors", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "qcom",  symbol: "QCOM",  name: "Qualcomm", subgroup_id: "semiconductors", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "avgo",  symbol: "AVGO",  name: "Broadcom", subgroup_id: "semiconductors", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "asml",  symbol: "ASML",  name: "ASML",     subgroup_id: "semiconductors", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "arm-h", symbol: "ARM",   name: "Arm Holdings",       subgroup_id: "semiconductors", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "mrvl",  symbol: "MRVL",  name: "Marvell Technology", subgroup_id: "semiconductors", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "on",    symbol: "ON",    name: "ON Semiconductor",   subgroup_id: "semiconductors", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "mpwr",  symbol: "MPWR",  name: "Monolithic Power",   subgroup_id: "semiconductors", group_id: "equities", type: "equity", exchange: "NASDAQ" },

  // ── Consumer ─────────────────────────────────────────────────────────────
  { id: "wmt",   symbol: "WMT",   name: "Walmart",  subgroup_id: "consumer", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "tgt",   symbol: "TGT",   name: "Target",   subgroup_id: "consumer", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "cost",  symbol: "COST",  name: "Costco",   subgroup_id: "consumer", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "nke",   symbol: "NKE",   name: "Nike",     subgroup_id: "consumer", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "lvmuy", symbol: "LVMUY", name: "LVMH",     subgroup_id: "consumer", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "mcd",   symbol: "MCD",   name: "McDonald's",        subgroup_id: "consumer", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "sbux",  symbol: "SBUX",  name: "Starbucks",         subgroup_id: "consumer", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "pg",    symbol: "PG",    name: "Procter & Gamble",  subgroup_id: "consumer", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "ko",    symbol: "KO",    name: "Coca-Cola",         subgroup_id: "consumer", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "pep",   symbol: "PEP",   name: "PepsiCo",           subgroup_id: "consumer", group_id: "equities", type: "equity", exchange: "NASDAQ" },

  // ── Aerospace & Defense ──────────────────────────────────────────────────
  { id: "lmt",   symbol: "LMT",   name: "Lockheed Martin",  subgroup_id: "aerospace", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "rtx",   symbol: "RTX",   name: "Raytheon",         subgroup_id: "aerospace", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "noc",   symbol: "NOC",   name: "Northrop Grumman", subgroup_id: "aerospace", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "ba",    symbol: "BA",    name: "Boeing",           subgroup_id: "aerospace", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "gd",    symbol: "GD",    name: "General Dynamics", subgroup_id: "aerospace", group_id: "equities", type: "equity", exchange: "NYSE" },
  { id: "hii",   symbol: "HII",   name: "Huntington Ingalls", subgroup_id: "aerospace", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "ktos",  symbol: "KTOS",  name: "Kratos Defense",    subgroup_id: "aerospace", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "ldos",  symbol: "LDOS",  name: "Leidos",            subgroup_id: "aerospace", group_id: "equities", type: "equity", exchange: "NYSE"   },

  // ── Clean Energy ─────────────────────────────────────────────────────────
  { id: "rivn",  symbol: "RIVN",  name: "Rivian",         subgroup_id: "cleanenergy", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "byddy", symbol: "BYDDY", name: "BYD",            subgroup_id: "cleanenergy", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "nee",   symbol: "NEE",   name: "NextEra Energy",  subgroup_id: "cleanenergy", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "enph",  symbol: "ENPH",  name: "Enphase Energy",  subgroup_id: "cleanenergy", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "fslr",  symbol: "FSLR",  name: "First Solar",    subgroup_id: "cleanenergy", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "run",   symbol: "RUN",   name: "Sunrun",         subgroup_id: "cleanenergy", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "be",    symbol: "BE",    name: "Bloom Energy",   subgroup_id: "cleanenergy", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "plug",  symbol: "PLUG",  name: "Plug Power",     subgroup_id: "cleanenergy", group_id: "equities", type: "equity", exchange: "NASDAQ" },

  // ── Real Estate ──────────────────────────────────────────────────────────
  { id: "pld",   symbol: "PLD",   name: "Prologis",       subgroup_id: "reits", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "amt",   symbol: "AMT",   name: "American Tower", subgroup_id: "reits", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "eqix",  symbol: "EQIX",  name: "Equinix",        subgroup_id: "reits", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "spg",   symbol: "SPG",   name: "Simon Property", subgroup_id: "reits", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "o",     symbol: "O",     name: "Realty Income",   subgroup_id: "reits", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "well",  symbol: "WELL",  name: "Welltower",       subgroup_id: "reits", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "dlr",   symbol: "DLR",   name: "Digital Realty",  subgroup_id: "reits", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "avb",   symbol: "AVB",   name: "AvalonBay",       subgroup_id: "reits", group_id: "equities", type: "equity", exchange: "NYSE"   },

  // ── Emerging Markets ─────────────────────────────────────────────────────
  { id: "ewz",   symbol: "EWZ",   name: "Brazil ETF",      subgroup_id: "emerging", group_id: "equities", type: "etf", exchange: "NYSE"   },
  { id: "inda",  symbol: "INDA",  name: "India ETF",       subgroup_id: "emerging", group_id: "equities", type: "etf", exchange: "NASDAQ" },
  { id: "mchi",  symbol: "MCHI",  name: "China ETF",       subgroup_id: "emerging", group_id: "equities", type: "etf", exchange: "NASDAQ" },
  { id: "ewy",   symbol: "EWY",   name: "South Korea ETF", subgroup_id: "emerging", group_id: "equities", type: "etf", exchange: "NYSE"   },

  // ── Currencies — Foreign Exchange ─────────────────────────────────────────
  { id: "eurusd", symbol: "EURUSD=X", name: "Euro / US Dollar",              subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "EUR/USD" } },
  { id: "gbpusd", symbol: "GBPUSD=X", name: "British Pound / US Dollar",     subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "GBP/USD" } },
  { id: "usdjpy", symbol: "USDJPY=X", name: "US Dollar / Japanese Yen",      subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "USD/JPY" } },
  { id: "usdcny", symbol: "USDCNY=X", name: "US Dollar / Chinese Yuan",      subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "USD/CNY" } },
  { id: "usdchf", symbol: "USDCHF=X", name: "US Dollar / Swiss Franc",       subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "USD/CHF" } },
  { id: "usdbrl", symbol: "USDBRL=X", name: "US Dollar / Brazilian Real",    subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "USD/BRL" } },
  { id: "audusd", symbol: "AUDUSD=X", name: "Australian Dollar / US Dollar", subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "AUD/USD" } },
  { id: "usdcad", symbol: "USDCAD=X", name: "US Dollar / Canadian Dollar",   subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "USD/CAD" } },
  { id: "usdmxn", symbol: "USDMXN=X", name: "US Dollar / Mexican Peso",       subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "USD/MXN" } },
  { id: "usdsek", symbol: "USDSEK=X", name: "US Dollar / Swedish Krona",      subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "USD/SEK" } },
  { id: "usdnok", symbol: "USDNOK=X", name: "US Dollar / Norwegian Krone",    subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "USD/NOK" } },
  { id: "usdzar", symbol: "USDZAR=X", name: "US Dollar / South African Rand", subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "USD/ZAR" } },
  { id: "usdinr", symbol: "USDINR=X", name: "US Dollar / Indian Rupee",       subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "USD/INR" } },
  { id: "nzdusd", symbol: "NZDUSD=X", name: "New Zealand Dollar / US Dollar", subgroup_id: "fx", group_id: "currencies", type: "forex", exchange: "FOREX", meta: { display: "NZD/USD" } },

  // ── Indices — Global Benchmarks ───────────────────────────────────────────
  { id: "gspc",  symbol: "^GSPC",  name: "S&P 500",      subgroup_id: "indices", group_id: "indices", type: "index", exchange: "INDEX",  meta: { display: "SPX"  } },
  { id: "dji",   symbol: "^DJI",   name: "Dow Jones",    subgroup_id: "indices", group_id: "indices", type: "index", exchange: "INDEX",  meta: { display: "DJIA" } },
  { id: "ixic",  symbol: "^IXIC",  name: "NASDAQ Comp.", subgroup_id: "indices", group_id: "indices", type: "index", exchange: "INDEX",  meta: { display: "IXIC" } },
  { id: "ftse",  symbol: "^FTSE",  name: "FTSE 100",     subgroup_id: "indices", group_id: "indices", type: "index", exchange: "LSE",    meta: { display: "FTSE" } },
  { id: "gdaxi", symbol: "^GDAXI", name: "DAX",          subgroup_id: "indices", group_id: "indices", type: "index", exchange: "XETRA",  meta: { display: "DAX"  } },
  { id: "n225",  symbol: "^N225",  name: "Nikkei 225",   subgroup_id: "indices", group_id: "indices", type: "index", exchange: "TSE",    meta: { display: "N225" } },
  { id: "hsi",   symbol: "^HSI",   name: "Hang Seng",    subgroup_id: "indices", group_id: "indices", type: "index", exchange: "HKEX",   meta: { display: "HSI"  } },
  { id: "fchi",  symbol: "^FCHI",  name: "CAC 40",       subgroup_id: "indices", group_id: "indices", type: "index", exchange: "EURONEXT", meta: { display: "CAC"   } },
  { id: "axjo",  symbol: "^AXJO",  name: "ASX 200",      subgroup_id: "indices", group_id: "indices", type: "index", exchange: "ASX",      meta: { display: "ASX"   } },
  { id: "ks11",  symbol: "^KS11",  name: "KOSPI",        subgroup_id: "indices", group_id: "indices", type: "index", exchange: "KRX",      meta: { display: "KOSPI" } },
  { id: "vix",   symbol: "^VIX",   name: "CBOE Volatility Index", subgroup_id: "indices", group_id: "indices", type: "index", exchange: "CBOE", meta: { display: "VIX" } },

  // ── Digital Assets: Crypto ───────────────────────────────────────────────
  { id: "btc",   symbol: "BTC",    name: "Bitcoin",  subgroup_id: "crypto", group_id: "digital-assets", type: "crypto", exchange: "CRYPTO", meta: { isCrypto: true, cgId: "bitcoin",  display: "BTC" } },
  { id: "eth",   symbol: "ETH",    name: "Ethereum", subgroup_id: "crypto", group_id: "digital-assets", type: "crypto", exchange: "CRYPTO", meta: { isCrypto: true, cgId: "ethereum", display: "ETH" } },
  { id: "sol",   symbol: "SOL",    name: "Solana",   subgroup_id: "crypto", group_id: "digital-assets", type: "crypto", exchange: "CRYPTO", meta: { isCrypto: true, cgId: "solana",      display: "SOL"  } },
  { id: "xrp",   symbol: "XRP",    name: "XRP",      subgroup_id: "crypto", group_id: "digital-assets", type: "crypto", exchange: "CRYPTO", meta: { isCrypto: true, cgId: "ripple",      display: "XRP"  } },
  { id: "ada",   symbol: "ADA",    name: "Cardano",  subgroup_id: "crypto", group_id: "digital-assets", type: "crypto", exchange: "CRYPTO", meta: { isCrypto: true, cgId: "cardano",     display: "ADA"  } },
  { id: "doge",  symbol: "DOGE",   name: "Dogecoin", subgroup_id: "crypto", group_id: "digital-assets", type: "crypto", exchange: "CRYPTO", meta: { isCrypto: true, cgId: "dogecoin",    display: "DOGE" } },
  { id: "avax",  symbol: "AVAX",   name: "Avalanche", subgroup_id: "crypto", group_id: "digital-assets", type: "crypto", exchange: "CRYPTO", meta: { isCrypto: true, cgId: "avalanche-2", display: "AVAX" } },
  { id: "dot",   symbol: "DOT",    name: "Polkadot", subgroup_id: "crypto", group_id: "digital-assets", type: "crypto", exchange: "CRYPTO", meta: { isCrypto: true, cgId: "polkadot",    display: "DOT"  } },

  // ── Commodities: Precious Metals ─────────────────────────────────────────
  { id: "gld",   symbol: "GLD",    name: "SPDR Gold Shares",           subgroup_id: "precious-metals", group_id: "commodities", type: "etf",     exchange: "NYSE"   },
  { id: "slv",   symbol: "SLV",    name: "iShares Silver Trust",       subgroup_id: "precious-metals", group_id: "commodities", type: "etf",     exchange: "NYSE"   },
  { id: "iau",   symbol: "IAU",    name: "iShares Gold Trust",         subgroup_id: "precious-metals", group_id: "commodities", type: "etf",     exchange: "NYSE"   },
  { id: "pplt",  symbol: "PPLT",   name: "Aberdeen Std Phys Platinum", subgroup_id: "precious-metals", group_id: "commodities", type: "etf",     exchange: "NYSE"   },
  { id: "gc-f",  symbol: "GC=F",   name: "Gold Futures",               subgroup_id: "precious-metals", group_id: "commodities", type: "futures", exchange: "COMEX", meta: { display: "XAU" } },
  { id: "si-f",  symbol: "SI=F",   name: "Silver Futures",             subgroup_id: "precious-metals", group_id: "commodities", type: "futures", exchange: "COMEX", meta: { display: "XAG" } },

  // ── Commodities: Energy Commodities ──────────────────────────────────────
  { id: "uso",   symbol: "USO",    name: "United States Oil Fund",       subgroup_id: "energy-commodities", group_id: "commodities", type: "etf",     exchange: "NYSE"  },
  { id: "bno",   symbol: "BNO",    name: "United States Brent Oil Fund", subgroup_id: "energy-commodities", group_id: "commodities", type: "etf",     exchange: "NYSE"  },
  { id: "ung",   symbol: "UNG",    name: "United States Natural Gas",    subgroup_id: "energy-commodities", group_id: "commodities", type: "etf",     exchange: "NYSE"  },
  { id: "cl-f",  symbol: "CL=F",   name: "WTI Crude Oil Futures",        subgroup_id: "energy-commodities", group_id: "commodities", type: "futures", exchange: "NYMEX", meta: { display: "WTI" } },
  { id: "ng-f",  symbol: "NG=F",   name: "Natural Gas Futures",          subgroup_id: "energy-commodities", group_id: "commodities", type: "futures", exchange: "NYMEX", meta: { display: "NG"  } },

  // ── Commodities: Agriculture ──────────────────────────────────────────────
  { id: "corn",  symbol: "CORN",   name: "Teucrium Corn Fund",    subgroup_id: "agriculture", group_id: "commodities", type: "etf", exchange: "NYSE"   },
  { id: "weat",  symbol: "WEAT",   name: "Teucrium Wheat Fund",   subgroup_id: "agriculture", group_id: "commodities", type: "etf", exchange: "NYSE"   },
  { id: "soyb",  symbol: "SOYB",   name: "Teucrium Soybean Fund", subgroup_id: "agriculture", group_id: "commodities", type: "etf", exchange: "NYSE"   },
  { id: "dba",   symbol: "DBA",    name: "Invesco DB Agriculture", subgroup_id: "agriculture", group_id: "commodities", type: "etf", exchange: "NYSE"   },
  { id: "cane",  symbol: "CANE",  name: "Teucrium Sugar Fund",   subgroup_id: "agriculture", group_id: "commodities", type: "etf", exchange: "NYSE"   },

  // ── Fixed Income: Dividend Income ─────────────────────────────────────────
  { id: "vym",   symbol: "VYM",    name: "Vanguard High Dividend Yield ETF",        subgroup_id: "dividend-income", group_id: "fixed-income", type: "etf", exchange: "NYSE"   },
  { id: "schd",  symbol: "SCHD",   name: "Schwab US Dividend Equity ETF",           subgroup_id: "dividend-income", group_id: "fixed-income", type: "etf", exchange: "NYSE"   },
  { id: "hdv",   symbol: "HDV",    name: "iShares Core High Dividend ETF",          subgroup_id: "dividend-income", group_id: "fixed-income", type: "etf", exchange: "NYSE"   },
  { id: "jepi",  symbol: "JEPI",   name: "JPMorgan Equity Premium Income ETF",      subgroup_id: "dividend-income", group_id: "fixed-income", type: "etf", exchange: "NYSE"   },
  { id: "dvy",   symbol: "DVY",    name: "iShares Select Dividend ETF",             subgroup_id: "dividend-income", group_id: "fixed-income", type: "etf",    exchange: "NASDAQ" },
  { id: "main",  symbol: "MAIN",  name: "Main Street Capital",                     subgroup_id: "dividend-income", group_id: "fixed-income", type: "equity", exchange: "NYSE"   },

  // ── Fixed Income: Treasuries ──────────────────────────────────────────────
  { id: "tlt",   symbol: "TLT",    name: "iShares 20+ Year Treasury Bond ETF",      subgroup_id: "treasuries", group_id: "fixed-income", type: "etf", exchange: "NASDAQ" },
  { id: "ief",   symbol: "IEF",    name: "iShares 7-10 Year Treasury Bond ETF",     subgroup_id: "treasuries", group_id: "fixed-income", type: "etf", exchange: "NASDAQ" },
  { id: "shy",   symbol: "SHY",    name: "iShares 1-3 Year Treasury Bond ETF",      subgroup_id: "treasuries", group_id: "fixed-income", type: "etf", exchange: "NASDAQ" },
  { id: "bil",   symbol: "BIL",    name: "SPDR Bloomberg 1-3 Month T-Bill ETF",     subgroup_id: "treasuries", group_id: "fixed-income", type: "etf", exchange: "NYSE"   },
  { id: "sgov",  symbol: "SGOV",   name: "iShares 0-3 Month Treasury Bond ETF",     subgroup_id: "treasuries", group_id: "fixed-income", type: "etf", exchange: "NYSE"   },
  { id: "tip",   symbol: "TIP",    name: "iShares TIPS Bond ETF",                   subgroup_id: "treasuries", group_id: "fixed-income", type: "etf", exchange: "NYSE"   },

  // ── Fixed Income: Bonds ───────────────────────────────────────────────────
  { id: "agg",   symbol: "AGG",    name: "iShares Core US Aggregate Bond ETF",      subgroup_id: "bonds", group_id: "fixed-income", type: "etf", exchange: "NYSE"   },
  { id: "bnd",   symbol: "BND",    name: "Vanguard Total Bond Market ETF",          subgroup_id: "bonds", group_id: "fixed-income", type: "etf", exchange: "NASDAQ" },
  { id: "lqd",   symbol: "LQD",    name: "iShares iBoxx $ IG Corporate Bond ETF",  subgroup_id: "bonds", group_id: "fixed-income", type: "etf", exchange: "NYSE"   },
  { id: "hyg",   symbol: "HYG",    name: "iShares iBoxx $ High Yield Corp Bond",   subgroup_id: "bonds", group_id: "fixed-income", type: "etf", exchange: "NYSE"   },
  { id: "jnk",   symbol: "JNK",    name: "SPDR Bloomberg High Yield Bond ETF",     subgroup_id: "bonds", group_id: "fixed-income", type: "etf", exchange: "NYSE"   },

  // ── Industrials ───────────────────────────────────────────────────────────
  { id: "cat",   symbol: "CAT",   name: "Caterpillar",     subgroup_id: "industrials", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "de",    symbol: "DE",    name: "Deere & Company", subgroup_id: "industrials", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "unp",   symbol: "UNP",   name: "Union Pacific",   subgroup_id: "industrials", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "fdx",   symbol: "FDX",   name: "FedEx",           subgroup_id: "industrials", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "ups",   symbol: "UPS",   name: "UPS",             subgroup_id: "industrials", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "hon",   symbol: "HON",   name: "Honeywell",       subgroup_id: "industrials", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "ge",    symbol: "GE",    name: "GE Aerospace",    subgroup_id: "industrials", group_id: "equities", type: "equity", exchange: "NYSE"   },
  { id: "mmm",   symbol: "MMM",   name: "3M",              subgroup_id: "industrials", group_id: "equities", type: "equity", exchange: "NYSE"   },

  // ── Biotech ───────────────────────────────────────────────────────────────
  { id: "bntx",  symbol: "BNTX",  name: "BioNTech",        subgroup_id: "biotech", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "regn",  symbol: "REGN",  name: "Regeneron",       subgroup_id: "biotech", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "biib",  symbol: "BIIB",  name: "Biogen",          subgroup_id: "biotech", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "vrtx",  symbol: "VRTX",  name: "Vertex Pharma",   subgroup_id: "biotech", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "gild",  symbol: "GILD",  name: "Gilead Sciences", subgroup_id: "biotech", group_id: "equities", type: "equity", exchange: "NASDAQ" },
  { id: "incy",  symbol: "INCY",  name: "Incyte",          subgroup_id: "biotech", group_id: "equities", type: "equity", exchange: "NASDAQ" },

  // ══════════════════════════════════════════════════════════════════════
  // ── BRAZIL — B3 ───────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  // ── Bancos & Financeiro ───────────────────────────────────────────────
  { id: "itub4",  symbol: "ITUB4",  name: "Itaú Unibanco",        subgroup_id: "br-bancos", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "bbdc4",  symbol: "BBDC4",  name: "Bradesco",             subgroup_id: "br-bancos", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "bbas3",  symbol: "BBAS3",  name: "Banco do Brasil",      subgroup_id: "br-bancos", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "bpac11", symbol: "BPAC11", name: "BTG Pactual",          subgroup_id: "br-bancos", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "b3sa3",  symbol: "B3SA3",  name: "B3",                   subgroup_id: "br-bancos", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "sanb11", symbol: "SANB11", name: "Santander Brasil",     subgroup_id: "br-bancos", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "abcb4",  symbol: "ABCB4",  name: "ABC Brasil",           subgroup_id: "br-bancos", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },

  // ── Utilities & Energia ───────────────────────────────────────────────
  { id: "elet3",  symbol: "ELET3",  name: "Eletrobras ON",        subgroup_id: "br-utilities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "elet6",  symbol: "ELET6",  name: "Eletrobras PNB",       subgroup_id: "br-utilities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "taee11", symbol: "TAEE11", name: "Taesa",                subgroup_id: "br-utilities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "egie3",  symbol: "EGIE3",  name: "Engie Brasil",         subgroup_id: "br-utilities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "cpfe3",  symbol: "CPFE3",  name: "CPFL Energia",         subgroup_id: "br-utilities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "enev3",  symbol: "ENEV3",  name: "Eneva",                subgroup_id: "br-utilities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "aesb3",  symbol: "AESB3",  name: "AES Brasil",           subgroup_id: "br-utilities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "sbsp3",  symbol: "SBSP3",  name: "Sabesp",               subgroup_id: "br-utilities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },

  // ── Commodities & Exportadoras ────────────────────────────────────────
  { id: "vale3",  symbol: "VALE3",  name: "Vale",                 subgroup_id: "br-commodities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "petr4",  symbol: "PETR4",  name: "Petrobras PN",         subgroup_id: "br-commodities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "petr3",  symbol: "PETR3",  name: "Petrobras ON",         subgroup_id: "br-commodities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "suzb3",  symbol: "SUZB3",  name: "Suzano",               subgroup_id: "br-commodities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "klbn11", symbol: "KLBN11", name: "Klabin",               subgroup_id: "br-commodities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "ggbr4",  symbol: "GGBR4",  name: "Gerdau",               subgroup_id: "br-commodities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "csna3",  symbol: "CSNA3",  name: "CSN",                  subgroup_id: "br-commodities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "usim5",  symbol: "USIM5",  name: "Usiminas",             subgroup_id: "br-commodities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "brap4",  symbol: "BRAP4",  name: "Bradespar",            subgroup_id: "br-commodities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "jbss3",  symbol: "JBSS3",  name: "JBS",                  subgroup_id: "br-commodities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "slce3",  symbol: "SLCE3",  name: "SLC Agrícola",         subgroup_id: "br-commodities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "agro3",  symbol: "AGRO3",  name: "BrasilAgro",           subgroup_id: "br-commodities", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },

  // ── Consumo & Varejo ──────────────────────────────────────────────────
  { id: "lren3",  symbol: "LREN3",  name: "Lojas Renner",         subgroup_id: "br-consumo", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "mglu3",  symbol: "MGLU3",  name: "Magazine Luiza",       subgroup_id: "br-consumo", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "viia3",  symbol: "VIIA3",  name: "Via Varejo",           subgroup_id: "br-consumo", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "amer3",  symbol: "AMER3",  name: "Americanas",           subgroup_id: "br-consumo", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "arzz3",  symbol: "ARZZ3",  name: "Arezzo",               subgroup_id: "br-consumo", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "soma3",  symbol: "SOMA3",  name: "Grupo Soma",           subgroup_id: "br-consumo", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "pcar3",  symbol: "PCAR3",  name: "Grupo Pão de Açúcar",  subgroup_id: "br-consumo", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "asai3",  symbol: "ASAI3",  name: "Assaí",                subgroup_id: "br-consumo", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "vivt3",  symbol: "VIVT3",  name: "Vivo / Telefônica",    subgroup_id: "br-consumo", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },

  // ── Construção & Imobiliário ──────────────────────────────────────────
  { id: "cyre3",  symbol: "CYRE3",  name: "Cyrela",               subgroup_id: "br-construcao", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "mrve3",  symbol: "MRVE3",  name: "MRV",                  subgroup_id: "br-construcao", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "eztc3",  symbol: "EZTC3",  name: "EZTEC",                subgroup_id: "br-construcao", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "tend3",  symbol: "TEND3",  name: "Tenda",                subgroup_id: "br-construcao", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "dirr3",  symbol: "DIRR3",  name: "Direcional",           subgroup_id: "br-construcao", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "even3",  symbol: "EVEN3",  name: "Even",                 subgroup_id: "br-construcao", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },

  // ── Infraestrutura & Logística ────────────────────────────────────────
  { id: "rail3",  symbol: "RAIL3",  name: "Rumo",                 subgroup_id: "br-infra", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "ccro3",  symbol: "CCRO3",  name: "CCR",                  subgroup_id: "br-infra", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "ecor3",  symbol: "ECOR3",  name: "Ecorodovias",          subgroup_id: "br-infra", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "logg3",  symbol: "LOGG3",  name: "LOG Commercial",       subgroup_id: "br-infra", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "jslg3",  symbol: "JSLG3",  name: "JSL",                  subgroup_id: "br-infra", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "rent3",  symbol: "RENT3",  name: "Localiza",             subgroup_id: "br-infra", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },

  // ── Industrial & Capital Goods ────────────────────────────────────────
  { id: "wege3",  symbol: "WEGE3",  name: "WEG",                  subgroup_id: "br-industrial", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "romi3",  symbol: "ROMI3",  name: "Romi",                 subgroup_id: "br-industrial", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "tupy3",  symbol: "TUPY3",  name: "Tupy",                 subgroup_id: "br-industrial", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "pomo4",  symbol: "POMO4",  name: "Marcopolo",            subgroup_id: "br-industrial", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },

  // ── Saúde ─────────────────────────────────────────────────────────────
  { id: "rdor3",  symbol: "RDOR3",  name: "Rede D'Or",            subgroup_id: "br-saude", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "hapv3",  symbol: "HAPV3",  name: "Hapvida",              subgroup_id: "br-saude", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "flry3",  symbol: "FLRY3",  name: "Fleury",               subgroup_id: "br-saude", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "pard3",  symbol: "PARD3",  name: "Oncoclínicas",         subgroup_id: "br-saude", group_id: "brazil", type: "equity-br", exchange: "B3", meta: { isB3: true } },

  // ── FIIs — Logística ──────────────────────────────────────────────────
  { id: "hglg11", symbol: "HGLG11", name: "CSHG Logística",       subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "xplg11", symbol: "XPLG11", name: "XP Log",               subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "btlg11", symbol: "BTLG11", name: "BTG Logística",        subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "lvbi11", symbol: "LVBI11", name: "VBI Logístico",        subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "brco11", symbol: "BRCO11", name: "Bresco Logística",     subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "vilg11", symbol: "VILG11", name: "Vinci Logística",      subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  // ── FIIs — Shoppings ──────────────────────────────────────────────────
  { id: "xpml11", symbol: "XPML11", name: "XP Malls",             subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "visc11", symbol: "VISC11", name: "Vinci Shopping",       subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "hsml11", symbol: "HSML11", name: "HSI Malls",            subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "mall11", symbol: "MALL11", name: "Malls Brasil Plural",  subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "alzr11", symbol: "ALZR11", name: "Alianza Trust Renda",  subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  // ── FIIs — Lajes Corporativas ─────────────────────────────────────────
  { id: "hgre11", symbol: "HGRE11", name: "CSHG Real Estate",     subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "brcr11", symbol: "BRCR11", name: "BC Fund",              subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "jsre11", symbol: "JSRE11", name: "JS Real Estate",       subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "rcrb11", symbol: "RCRB11", name: "Rio Bravo Corp.",       subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  // ── FIIs — CRI / Papel ────────────────────────────────────────────────
  { id: "kncr11", symbol: "KNCR11", name: "Kinea Recebíveis",     subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "hgcr11", symbol: "HGCR11", name: "CSHG Recebíveis",      subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "mxrf11", symbol: "MXRF11", name: "Maxi Renda",           subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "vrta11", symbol: "VRTA11", name: "Verta",                subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "recr11", symbol: "RECR11", name: "REC Recebíveis",       subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "cpts11", symbol: "CPTS11", name: "Capitânia Securities", subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  // ── FIIs — Híbridos & FOF ─────────────────────────────────────────────
  { id: "knip11", symbol: "KNIP11", name: "Kinea Índices Preços", subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "rbrf11", symbol: "RBRF11", name: "RBR Alpha",            subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "bcff11", symbol: "BCFF11", name: "BC Fundo de Fundos",   subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },
  { id: "hfof11", symbol: "HFOF11", name: "Hedge FOF",            subgroup_id: "br-fiis", group_id: "brazil", type: "fii", exchange: "B3", meta: { isB3: true } },

  // ── ETFs B3 — Brasil ──────────────────────────────────────────────────
  { id: "bova11", symbol: "BOVA11", name: "iShares Ibovespa",     subgroup_id: "br-etfs", group_id: "brazil", type: "etf-br", exchange: "B3", meta: { isB3: true } },
  { id: "smal11", symbol: "SMAL11", name: "iShares Small Cap",    subgroup_id: "br-etfs", group_id: "brazil", type: "etf-br", exchange: "B3", meta: { isB3: true } },
  { id: "divo11", symbol: "DIVO11", name: "iShares Dividendos",   subgroup_id: "br-etfs", group_id: "brazil", type: "etf-br", exchange: "B3", meta: { isB3: true } },
  { id: "pibb11", symbol: "PIBB11", name: "It Now PIBB",          subgroup_id: "br-etfs", group_id: "brazil", type: "etf-br", exchange: "B3", meta: { isB3: true } },
  // ── ETFs B3 — Exterior ────────────────────────────────────────────────
  { id: "ivvb11", symbol: "IVVB11", name: "iShares S&P 500 (B3)", subgroup_id: "br-etfs", group_id: "brazil", type: "etf-br", exchange: "B3", meta: { isB3: true } },
  { id: "nasd11", symbol: "NASD11", name: "Trend Nasdaq",         subgroup_id: "br-etfs", group_id: "brazil", type: "etf-br", exchange: "B3", meta: { isB3: true } },
  { id: "eurp11", symbol: "EURP11", name: "Trend Europa",         subgroup_id: "br-etfs", group_id: "brazil", type: "etf-br", exchange: "B3", meta: { isB3: true } },
  { id: "spxi11", symbol: "SPXI11", name: "It Now S&P 500",       subgroup_id: "br-etfs", group_id: "brazil", type: "etf-br", exchange: "B3", meta: { isB3: true } },
  // ── ETFs B3 — Renda Fixa ──────────────────────────────────────────────
  { id: "imab11", symbol: "IMAB11", name: "iShares IMA-B",        subgroup_id: "br-etfs", group_id: "brazil", type: "etf-br", exchange: "B3", meta: { isB3: true } },
  { id: "fixa11", symbol: "FIXA11", name: "Trend DI",             subgroup_id: "br-etfs", group_id: "brazil", type: "etf-br", exchange: "B3", meta: { isB3: true } },

  // ── Índices B3 ────────────────────────────────────────────────────────
  { id: "br-ibov", symbol: "^BVSP", name: "Ibovespa",             subgroup_id: "br-indices", group_id: "brazil", type: "index-br", exchange: "B3", meta: { isB3: true, display: "IBOV" } },
  { id: "br-ifix", symbol: "IFIX",  name: "Índice FIIs",          subgroup_id: "br-indices", group_id: "brazil", type: "index-br", exchange: "B3", meta: { isB3: true, display: "IFIX" } },
  { id: "br-smll", symbol: "SMLL",  name: "Small Cap Index",      subgroup_id: "br-indices", group_id: "brazil", type: "index-br", exchange: "B3", meta: { isB3: true, display: "SMLL" } },
  { id: "br-idiv", symbol: "IDIV",  name: "Dividendos Index",     subgroup_id: "br-indices", group_id: "brazil", type: "index-br", exchange: "B3", meta: { isB3: true, display: "IDIV" } },
  { id: "br-imab", symbol: "IMA-B", name: "IMA-B",                subgroup_id: "br-indices", group_id: "brazil", type: "index-br", exchange: "B3", meta: { isB3: true, display: "IMA-B" } },
];
