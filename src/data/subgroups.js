// SOURCE OF TRUTH: backend database (seeded from this file)
// This file is used for: initial seed + offline fallback only
// Do not edit manually — use the admin UI at /admin/taxonomy

export const SUBGROUPS = [
  // ── Equities — US GICS Sectors ────────────────────────────────────────────
  { id: "aerospace",       display_name: "Aerospace & Defense",       description: "GICS: Industrials / A&D sub-industry",                        slug: "aerospace",       group_id: "equities",     icon: "🛡",  color: "#607D8B", section_id: null, data_source: null, sort_order: 0  },
  { id: "automobile",      display_name: "Automobile",                description: "GICS: Consumer Discretionary / Automobiles",                  slug: "automobile",      group_id: "equities",     icon: "🚗",  color: "#FF6D00", section_id: null, data_source: null, sort_order: 1  },
  { id: "biotech",         display_name: "Biotech",                   description: "GICS: Health Care — biotechnology sub-industry",               slug: "biotech",         group_id: "equities",     icon: "🧬",  color: "#EC407A", section_id: null, data_source: null, sort_order: 2  },
  { id: "cleanenergy",     display_name: "Clean Energy",              description: "Thematic: EVs + renewables + utilities",                      slug: "cleanenergy",     group_id: "equities",     icon: "🔋",  color: "#66BB6A", section_id: null, data_source: null, sort_order: 3  },
  { id: "consumer",        display_name: "Consumer",                  description: "GICS: Consumer Discretionary + Staples",                      slug: "consumer",        group_id: "equities",     icon: "🛒",  color: "#FF7043", section_id: null, data_source: null, sort_order: 4  },
  { id: "financials",      display_name: "Financials",                description: "GICS: Financials",                                            slug: "financials",      group_id: "equities",     icon: "🏦",  color: "#4CAF50", section_id: null, data_source: null, sort_order: 5  },
  { id: "healthcare",      display_name: "Health Care",               description: "GICS: Health Care — official two-word form",                  slug: "healthcare",      group_id: "equities",     icon: "💊",  color: "#E91E63", section_id: null, data_source: null, sort_order: 6  },
  { id: "industrials",     display_name: "Industrials",               description: "GICS: Industrials — transportation, machinery, conglomerates", slug: "industrials",     group_id: "equities",     icon: "🏭",  color: "#78909C", section_id: null, data_source: null, sort_order: 7  },
  { id: "oil-gas",         display_name: "Oil & Gas",                 description: "GICS: Energy",                                                slug: "oil-gas",         group_id: "equities",     icon: "🛢",  color: "#FF9100", section_id: null, data_source: null, sort_order: 8  },
  { id: "reits",           display_name: "Real Estate",               description: "GICS: Real Estate",                                           slug: "reits",           group_id: "equities",     icon: "🏢",  color: "#AB47BC", section_id: null, data_source: null, sort_order: 9  },
  { id: "semiconductors",  display_name: "Semiconductors",            description: "GICS: IT / Semiconductors sub-industry",                      slug: "semiconductors",  group_id: "equities",     icon: "🔬",  color: "#26C6DA", section_id: null, data_source: null, sort_order: 10 },
  { id: "technology",      display_name: "Technology",                description: "GICS: Information Technology + Comm. Svcs.",                  slug: "technology",      group_id: "equities",     icon: "⚡",  color: "#00BCD4", section_id: null, data_source: null, sort_order: 11 },

  // ── Equities — International ───────────────────────────────────────────────
  { id: "emerging",        display_name: "Emerging Markets",          description: "EM ETFs: EWZ, INDA, MCHI, EWY",                              slug: "emerging",        group_id: "equities",     icon: "🌍",  color: "#26A69A", section_id: null, data_source: null, sort_order: 12 },

  // ── Currencies ────────────────────────────────────────────────────────────
  { id: "fx",              display_name: "Foreign Exchange",          description: "Major currency pairs via Yahoo Finance",                      slug: "fx",              group_id: "currencies",   icon: "💱",  color: "#FFD740", section_id: null, data_source: "yahoo",      sort_order: 0  },

  // ── Indices ───────────────────────────────────────────────────────────────
  { id: "indices",         display_name: "Global Indices",            description: "Global benchmark indices via Yahoo Finance",                  slug: "indices",         group_id: "indices",      icon: "🌐",  color: "#7C4DFF", section_id: null, data_source: "yahoo",      sort_order: 0  },

  // ── Digital Assets ────────────────────────────────────────────────────────
  { id: "crypto",          display_name: "Crypto",                    description: "BTC, ETH, SOL via CoinGecko",                                slug: "crypto",          group_id: "digital-assets", icon: "🪙", color: "#F9A825", section_id: null, data_source: "coingecko",  sort_order: 0  },

  // ── Commodities ───────────────────────────────────────────────────────────
  { id: "precious-metals",    display_name: "Precious Metals",        description: "Gold, silver, platinum ETFs and futures",                    slug: "precious-metals",    group_id: "commodities",  icon: "🥇", color: "#FFD700", section_id: null, data_source: "yahoo", sort_order: 0 },
  { id: "energy-commodities", display_name: "Energy Commodities",     description: "Crude oil, natural gas ETFs and futures",                   slug: "energy-commodities", group_id: "commodities",  icon: "🛢", color: "#FF6F00", section_id: null, data_source: "yahoo", sort_order: 1 },
  { id: "agriculture",        display_name: "Agriculture",            description: "Corn, wheat, soybean commodity ETFs",                       slug: "agriculture",        group_id: "commodities",  icon: "🌾", color: "#8BC34A", section_id: null, data_source: "yahoo", sort_order: 2 },

  // ── Fixed Income ──────────────────────────────────────────────────────────
  { id: "dividend-income", display_name: "Dividend Income",           description: "High-yield dividend ETFs and income strategies",             slug: "dividend-income", group_id: "fixed-income", icon: "💰",  color: "#FFC107", section_id: null, data_source: "yahoo", sort_order: 0 },
  { id: "credit",          display_name: "Credit",                    description: "Investment-grade and high-yield corporate credit ETFs",      slug: "credit",          group_id: "fixed-income", icon: "📊",  color: "#7C4DFF", section_id: null, data_source: null,    sort_order: 1 },
  { id: "treasuries",      display_name: "Treasuries",                description: "US Treasury bond ETFs across maturity spectrum",             slug: "treasuries",      group_id: "fixed-income", icon: "🏛",  color: "#5C6BC0", section_id: null, data_source: "yahoo", sort_order: 2 },
  { id: "bonds",           display_name: "Bonds",                     description: "Investment-grade and high-yield corporate bond ETFs",        slug: "bonds",           group_id: "fixed-income", icon: "📄",  color: "#78909C", section_id: null, data_source: "yahoo", sort_order: 3 },

  // ── Brazil — Mercado / Ações B3 (single subgroup — sectors via assets.sector) ─
  { id: "br-acoes",       display_name: "Ações B3",                 description: "Ações listadas na B3 — Bovespa",                   slug: "br-acoes",   group_id: "br-mercado", icon: "📊", color: "#00E676", section_id: "acoes-b3", data_source: "brapi", sort_order: 0 },

  // ── Brazil — Mercado / FIIs, ETFs, Índices ────────────────────────────────
  { id: "br-fiis",        display_name: "FIIs",                     description: "Fundos de Investimento Imobiliário listados na B3", slug: "br-fiis",    group_id: "br-mercado", icon: "🏢", color: "#AB47BC", section_id: "fiis",                data_source: "brapi",         sort_order: 1 },
  { id: "br-etfs",        display_name: "ETFs",                     description: "ETFs listados na B3",                              slug: "br-etfs",    group_id: "br-mercado", icon: "📦", color: "#26C6DA", section_id: "etfs",                data_source: "brapi",         sort_order: 2 },
  { id: "br-indices",     display_name: "Índices & Benchmarks",     description: "Índices de referência do mercado brasileiro",      slug: "br-indices", group_id: "br-mercado", icon: "📊", color: "#7C4DFF", section_id: "indices-benchmarks",  data_source: "bcb_and_yahoo", sort_order: 3 },

  // ── Brazil — Renda Fixa sections ──────────────────────────────────────────
  { id: "br-juros",   display_name: "Juros",           description: "Taxas de juros e curva de juros brasileira",              slug: "br-juros",   group_id: "br-renda-fixa", icon: "💸", color: "#FF9100", section_id: "juros",           data_source: "bcb",    sort_order: 0 },
  { id: "br-credito", display_name: "Crédito",         description: "Crédito corporativo — High Grade e High Yield",          slug: "br-credito", group_id: "br-renda-fixa", icon: "🏦", color: "#4CAF50", section_id: "credito",         data_source: "bcb",    sort_order: 1 },
  { id: "br-titulos", display_name: "Títulos Públicos",description: "Tesouro Direto e títulos públicos federais",             slug: "br-titulos", group_id: "br-renda-fixa", icon: "🧾", color: "#78909C", section_id: "titulos",         data_source: "bcb",    sort_order: 2 },

  // ── Brazil — Macro sections ───────────────────────────────────────────────
  { id: "br-macro-indicadores", display_name: "Macro Brasil",       description: "Indicadores macroeconômicos do Brasil",           slug: "br-macro-indicadores", group_id: "br-macro", icon: "📊", color: "#FF5252", section_id: "macro-brasil",     data_source: "bcb",        sort_order: 0 },
  { id: "br-cambio",            display_name: "Câmbio & Liquidez",  description: "Taxas de câmbio e liquidez do mercado brasileiro", slug: "br-cambio",            group_id: "br-macro", icon: "💵", color: "#FFD740", section_id: "cambio",          data_source: "awesomeapi", sort_order: 1 },
];
