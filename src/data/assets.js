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

  // ── Brazil Equities (B3) ─────────────────────────────────────────────────
  { id: "petr4",  symbol: "PETR4",  name: "Petrobras PN",              subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "petr3",  symbol: "PETR3",  name: "Petrobras ON",              subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "vale3",  symbol: "VALE3",  name: "Vale",                      subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "itub4",  symbol: "ITUB4",  name: "Itaú Unibanco",             subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "bbdc4",  symbol: "BBDC4",  name: "Bradesco",                  subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "bbas3",  symbol: "BBAS3",  name: "Banco do Brasil",           subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "sanb11", symbol: "SANB11", name: "Santander Brasil",          subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "mglu3",  symbol: "MGLU3",  name: "Magazine Luiza",            subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "rent3",  symbol: "RENT3",  name: "Localiza",                  subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "lren3",  symbol: "LREN3",  name: "Lojas Renner",              subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "vivt3",  symbol: "VIVT3",  name: "Vivo / Telefônica Brasil",  subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "elet3",  symbol: "ELET3",  name: "Eletrobras",                subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "sbsp3",  symbol: "SBSP3",  name: "Sabesp",                    subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "csna3",  symbol: "CSNA3",  name: "CSN",                       subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "ggbr4",  symbol: "GGBR4",  name: "Gerdau",                    subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "slce3",  symbol: "SLCE3",  name: "SLC Agrícola",              subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "agro3",  symbol: "AGRO3",  name: "BrasilAgro",                subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "hapv3",  symbol: "HAPV3",  name: "Hapvida",            subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "rdor3",  symbol: "RDOR3",  name: "Rede D'Or",          subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "wege3",  symbol: "WEGE3",  name: "WEG",                subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "jbss3",  symbol: "JBSS3",  name: "JBS",                subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },
  { id: "suzb3",  symbol: "SUZB3",  name: "Suzano",             subgroup_id: "brazil", group_id: "equities", type: "equity-br", exchange: "B3", meta: { isB3: true } },

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
  { id: "bvsp",  symbol: "^BVSP",  name: "Ibovespa",     subgroup_id: "indices", group_id: "indices", type: "index", exchange: "B3",       meta: { display: "IBOV"  } },
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
];
