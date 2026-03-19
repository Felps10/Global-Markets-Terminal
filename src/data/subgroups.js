// SOURCE OF TRUTH: backend database (seeded from this file)
// This file is used for: initial seed + offline fallback only
// Do not edit manually — use the admin UI at /admin/taxonomy

export const SUBGROUPS = [
  // ── Equities — US GICS Sectors ────────────────────────────────────────────
  { id: "aerospace",       display_name: "Aerospace & Defense",       description: "GICS: Industrials / A&D sub-industry",                        slug: "aerospace",       group_id: "equities",     icon: "🛡",  color: "#607D8B", section_id: null, data_source: null, sort_order: 0  },
  { id: "biotech",         display_name: "Biotech",                   description: "GICS: Health Care — biotechnology sub-industry",               slug: "biotech",         group_id: "equities",     icon: "🧬",  color: "#EC407A", section_id: null, data_source: null, sort_order: 1  },
  { id: "cleanenergy",     display_name: "Clean Energy",              description: "Thematic: EVs + renewables + utilities",                      slug: "cleanenergy",     group_id: "equities",     icon: "🔋",  color: "#66BB6A", section_id: null, data_source: null, sort_order: 2  },
  { id: "consumer",        display_name: "Consumer",                  description: "GICS: Consumer Discretionary + Staples",                      slug: "consumer",        group_id: "equities",     icon: "🛒",  color: "#FF7043", section_id: null, data_source: null, sort_order: 3  },
  { id: "financials",      display_name: "Financials",                description: "GICS: Financials",                                            slug: "financials",      group_id: "equities",     icon: "🏦",  color: "#4CAF50", section_id: null, data_source: null, sort_order: 4  },
  { id: "healthcare",      display_name: "Health Care",               description: "GICS: Health Care — official two-word form",                  slug: "healthcare",      group_id: "equities",     icon: "💊",  color: "#E91E63", section_id: null, data_source: null, sort_order: 5  },
  { id: "industrials",     display_name: "Industrials",               description: "GICS: Industrials — transportation, machinery, conglomerates", slug: "industrials",     group_id: "equities",     icon: "🏭",  color: "#78909C", section_id: null, data_source: null, sort_order: 6  },
  { id: "oil-gas",         display_name: "Oil & Gas",                 description: "GICS: Energy",                                                slug: "oil-gas",         group_id: "equities",     icon: "🛢",  color: "#FF9100", section_id: null, data_source: null, sort_order: 7  },
  { id: "reits",           display_name: "Real Estate",               description: "GICS: Real Estate",                                           slug: "reits",           group_id: "equities",     icon: "🏢",  color: "#AB47BC", section_id: null, data_source: null, sort_order: 8  },
  { id: "semiconductors",  display_name: "Semiconductors",            description: "GICS: IT / Semiconductors sub-industry",                      slug: "semiconductors",  group_id: "equities",     icon: "🔬",  color: "#26C6DA", section_id: null, data_source: null, sort_order: 9  },
  { id: "technology",      display_name: "Technology",                description: "GICS: Information Technology + Comm. Svcs.",                  slug: "technology",      group_id: "equities",     icon: "⚡",  color: "#00BCD4", section_id: null, data_source: null, sort_order: 10 },

  // ── Equities — International ───────────────────────────────────────────────
  { id: "emerging",        display_name: "Emerging Markets",          description: "EM ETFs: EWZ, INDA, MCHI, EWY",                              slug: "emerging",        group_id: "equities",     icon: "🌍",  color: "#26A69A", section_id: null, data_source: null, sort_order: 11 },

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
  { id: "treasuries",      display_name: "Treasuries",                description: "US Treasury bond ETFs across maturity spectrum",             slug: "treasuries",      group_id: "fixed-income", icon: "🏛",  color: "#5C6BC0", section_id: null, data_source: "yahoo", sort_order: 1 },
  { id: "bonds",           display_name: "Bonds",                     description: "Investment-grade and high-yield corporate bond ETFs",        slug: "bonds",           group_id: "fixed-income", icon: "📄",  color: "#78909C", section_id: null, data_source: "yahoo", sort_order: 2 },

  // ── Brazil — Mercado / Ações B3 sectors ──────────────────────────────────
  { id: "br-bancos",      display_name: "Bancos & Financeiro",      description: "Bancos e serviços financeiros brasileiros",         slug: "br-bancos",      group_id: "br-mercado", icon: "🏦", color: "#0077B6", section_id: "acoes-b3", data_source: "brapi", sort_order: 0 },
  { id: "br-petroleo",    display_name: "Petróleo & Gás",           description: "Petróleo, gás natural e derivados",                slug: "br-petroleo",    group_id: "br-mercado", icon: "🛢", color: "#FF9100", section_id: "acoes-b3", data_source: "brapi", sort_order: 1 },
  { id: "br-mineracao",   display_name: "Mineração",                description: "Mineração, siderurgia e metalurgia",               slug: "br-mineracao",   group_id: "br-mercado", icon: "⛏", color: "#E9C46A", section_id: "acoes-b3", data_source: "brapi", sort_order: 2 },
  { id: "br-agronegocio", display_name: "Agronegócio",              description: "Agro, papel/celulose, carnes e alimentos",         slug: "br-agronegocio", group_id: "br-mercado", icon: "🌾", color: "#8BC34A", section_id: "acoes-b3", data_source: "brapi", sort_order: 3 },
  { id: "br-varejo",      display_name: "Varejo & Consumo",         description: "Varejo, moda, alimentação, saúde e imobiliário",   slug: "br-varejo",      group_id: "br-mercado", icon: "🛍", color: "#F4A261", section_id: "acoes-b3", data_source: "brapi", sort_order: 4 },
  { id: "br-utilities",   display_name: "Utilities & Energia",      description: "Elétricas, saneamento e energia elétrica",         slug: "br-utilities",   group_id: "br-mercado", icon: "⚡", color: "#00B4D8", section_id: "acoes-b3", data_source: "brapi", sort_order: 5 },
  { id: "br-transporte",  display_name: "Logística & Transporte",   description: "Logística, concessões, infraestrutura e bens de capital", slug: "br-transporte", group_id: "br-mercado", icon: "🚚", color: "#457B9D", section_id: "acoes-b3", data_source: "brapi", sort_order: 6 },

  // ── Brazil — Mercado / Ações B3 — extra sectors ──────────────────────────
  { id: "br-industria",  display_name: "Indústria",         description: "Indústria, manufatura e materiais — B3",      slug: "br-industria",  group_id: "br-mercado", icon: "⚙️",  color: "#90A4AE", section_id: "acoes-b3", data_source: "brapi", sort_order: 6  },
  { id: "br-construcao", display_name: "Construção Civil",  description: "Incorporadoras e construção civil — B3",       slug: "br-construcao", group_id: "br-mercado", icon: "🏗️",  color: "#A1887F", section_id: "acoes-b3", data_source: "brapi", sort_order: 7  },
  { id: "br-saude",      display_name: "Saúde",             description: "Saúde, hospitais e farmacêuticas — B3",        slug: "br-saude",      group_id: "br-mercado", icon: "🏥",  color: "#EF9A9A", section_id: "acoes-b3", data_source: "brapi", sort_order: 8  },
  { id: "br-telecom",    display_name: "Telecom & Tech",    description: "Telecomunicações e tecnologia — B3",           slug: "br-telecom",    group_id: "br-mercado", icon: "📡",  color: "#80CBC4", section_id: "acoes-b3", data_source: "brapi", sort_order: 9  },
  { id: "br-outros",     display_name: "Outros Setores",    description: "Setores diversos — B3",                        slug: "br-outros",     group_id: "br-mercado", icon: "📎",  color: "#B0BEC5", section_id: "acoes-b3", data_source: "brapi", sort_order: 10 },

  // ── Brazil — Mercado / FIIs, ETFs, Índices ────────────────────────────────
  { id: "br-fiis",        display_name: "FIIs",                     description: "Fundos de Investimento Imobiliário listados na B3", slug: "br-fiis",    group_id: "br-mercado", icon: "🏢", color: "#AB47BC", section_id: "fiis",                data_source: "brapi",         sort_order: 11 },
  { id: "br-etfs",        display_name: "ETFs",                     description: "ETFs listados na B3",                              slug: "br-etfs",    group_id: "br-mercado", icon: "📦", color: "#26C6DA", section_id: "etfs",                data_source: "brapi",         sort_order: 12 },
  { id: "br-indices",     display_name: "Índices & Benchmarks",     description: "Índices de referência do mercado brasileiro",      slug: "br-indices", group_id: "br-mercado", icon: "📊", color: "#7C4DFF", section_id: "indices-benchmarks",  data_source: "bcb_and_yahoo", sort_order: 13 },

  // ── Brazil — Renda Fixa sections ──────────────────────────────────────────
  { id: "br-juros",   display_name: "Juros",           description: "Taxas de juros e curva de juros brasileira",              slug: "br-juros",   group_id: "br-renda-fixa", icon: "💸", color: "#FF9100", section_id: "juros",           data_source: "bcb",    sort_order: 0 },
  { id: "br-credito", display_name: "Crédito",         description: "Crédito corporativo — High Grade e High Yield",          slug: "br-credito", group_id: "br-renda-fixa", icon: "🏦", color: "#4CAF50", section_id: "credito",         data_source: "static", sort_order: 1 },
  { id: "br-titulos", display_name: "Títulos Públicos",description: "Tesouro Direto e títulos públicos federais",             slug: "br-titulos", group_id: "br-renda-fixa", icon: "🧾", color: "#78909C", section_id: "titulos-publicos",data_source: "bcb",    sort_order: 2 },

  // ── Brazil — Macro sections ───────────────────────────────────────────────
  { id: "br-macro-indicadores", display_name: "Macro Brasil",       description: "Indicadores macroeconômicos do Brasil",           slug: "br-macro-indicadores", group_id: "br-macro", icon: "📊", color: "#FF5252", section_id: "macro-brasil",     data_source: "bcb",        sort_order: 0 },
  { id: "br-cambio",            display_name: "Câmbio & Liquidez",  description: "Taxas de câmbio e liquidez do mercado brasileiro", slug: "br-cambio",            group_id: "br-macro", icon: "💵", color: "#FFD740", section_id: "cambio-liquidez",  data_source: "awesomeapi", sort_order: 1 },
];
