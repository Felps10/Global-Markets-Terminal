// SOURCE OF TRUTH: static config for Brazil terminal layout
// Defines block identity, section identity, filter definitions.
// No live data lives here — only structure, labels, and metadata.

export const GOLD = "#F9C300";

// ─── BLOCK DEFINITIONS ────────────────────────────────────────────────────────
// Three top-level blocks, each with sections.
// blockId is the stable key used in state and rendering.
// accentColor drives the block's tab underline and section highlights.

export const BRAZIL_BLOCKS = [

  // ── BLOCO MERCADO ──────────────────────────────────────────────────────────
  {
    blockId:     "mercado",
    label:       "Mercado",
    icon:        "🟢",
    accentColor: "#00E676",
    sections: [

      {
        sectionId:  "acoes-b3",
        label:      "Ações B3",
        icon:       "📊",
        dataSource: "brapi",
        assetType:  "equity-br",
        filters: [
          { id: "setor",     label: "Setor",      type: "pill",  options: ["Todos","Bancos","Petróleo","Mineração","Agronegócio","Varejo","Utilities","Transporte","Indústria","Construção","Saúde","Telecom","Outros"] },
          { id: "marketcap", label: "Market Cap", type: "range", unit: "BRL" },
          { id: "liquidez",  label: "Liquidez",   type: "range", unit: "vol" },
          { id: "pl",        label: "P/L",        type: "range", unit: "x"   },
          { id: "dy",        label: "Div. Yield", type: "range", unit: "%"   },
          { id: "variacao",  label: "Variação",   type: "pill",  options: ["1D","1S","1M","3M","1A"] },
          { id: "origem",    label: "Origem",     type: "pill",  options: ["Todas","Exportadoras","Domésticas"] },
        ],
      },

      {
        sectionId:  "fiis",
        label:      "FIIs",
        icon:       "🏢",
        dataSource: "brapi",
        assetType:  "fii",
        filters: [
          { id: "tipo",      label: "Tipo",      type: "pill",  options: ["Todos","Tijolo","Papel","Híbrido","FOF"] },
          { id: "segmento",  label: "Segmento",  type: "pill",  options: ["Todos","Logística","Escritório","Shoppings","Renda Urbana","CRI/CRA"] },
          { id: "dy",        label: "Div. Yield",type: "range", unit: "%"   },
          { id: "pvp",       label: "P/VP",      type: "range", unit: "x"   },
          { id: "liquidez",  label: "Liquidez",  type: "range", unit: "vol" },
          { id: "indexacao", label: "Indexação", type: "pill",  options: ["Todos","IPCA","CDI","Prefixado"] },
        ],
      },

      {
        sectionId:  "etfs",
        label:      "ETFs",
        icon:       "📦",
        dataSource: "brapi",
        assetType:  "etf-br",
        filters: [
          { id: "tipo",     label: "Tipo",      type: "pill",  options: ["Todos","Brasil","Exterior","Renda Fixa"] },
          { id: "indice",   label: "Índice",    type: "pill",  options: ["Todos","IBOV","S&P500","CDI","Outros"] },
          { id: "moeda",    label: "Moeda",     type: "pill",  options: ["Todos","BRL","USD"] },
          { id: "liquidez", label: "Liquidez",  type: "range", unit: "vol" },
          { id: "taxa_adm", label: "Taxa Adm.", type: "range", unit: "%"   },
        ],
      },

      {
        sectionId:  "indices-benchmarks",
        label:      "Índices & Benchmarks",
        icon:       "📈",
        dataSource: "bcb_and_yahoo",
        assetType:  "index-br",
        filters: [
          { id: "tipo",        label: "Tipo",        type: "pill", options: ["Todos","Ações","FIIs","Renda Fixa"] },
          { id: "regiao",      label: "Região",      type: "pill", options: ["Todos","Brasil","Global"] },
          { id: "performance", label: "Performance", type: "pill", options: ["1D","1S","1M","1A"] },
        ],
      },

    ],
  },

  // ── BLOCO RENDA FIXA ───────────────────────────────────────────────────────
  {
    blockId:     "renda-fixa",
    label:       "Renda Fixa",
    icon:        "🟡",
    accentColor: GOLD,
    sections: [

      {
        sectionId:  "juros",
        label:      "Juros",
        icon:       "💸",
        dataSource: "bcb",
        assetType:  "rate",
        filters: [
          { id: "tipo",      label: "Tipo",       type: "pill",  options: ["Todos","Nominal","Real"] },
          { id: "prazo",     label: "Prazo",      type: "pill",  options: ["Curto","Médio","Longo"] },
          { id: "taxa",      label: "Taxa",       type: "range", unit: "%" },
          { id: "variacao",  label: "Variação",   type: "range", unit: "bps" },
          { id: "inf_impl",  label: "Inf. Impl.", type: "range", unit: "%" },
        ],
      },

      {
        sectionId:  "credito",
        label:      "Crédito",
        icon:       "🏦",
        dataSource: "static",
        assetType:  "credit",
        filters: [
          { id: "tipo",      label: "Tipo",      type: "pill",  options: ["Todos","High Grade","High Yield"] },
          { id: "indexacao", label: "Indexação", type: "pill",  options: ["Todos","CDI","IPCA","Prefixado"] },
          { id: "spread",    label: "Spread",    type: "range", unit: "bps" },
          { id: "prazo",     label: "Prazo",     type: "pill",  options: ["Curto","Médio","Longo"] },
          { id: "rating",    label: "Rating",    type: "pill",  options: ["Todos","AAA","AA","A","BBB","BB","Abaixo"] },
        ],
      },

      {
        sectionId:  "titulos-publicos",
        label:      "Títulos Públicos",
        icon:       "🧾",
        dataSource: "bcb",
        assetType:  "public-debt",
        filters: [
          { id: "tipo",     label: "Tipo",     type: "pill",  options: ["Todos","Selic","Prefixado","IPCA+"] },
          { id: "prazo",    label: "Prazo",    type: "pill",  options: ["Curto","Médio","Longo"] },
          { id: "yield",    label: "Yield",    type: "range", unit: "%" },
          { id: "duration", label: "Duration", type: "range", unit: "anos" },
        ],
      },

    ],
  },

  // ── BLOCO MACRO ────────────────────────────────────────────────────────────
  {
    blockId:     "macro",
    label:       "Macro",
    icon:        "🔴",
    accentColor: "var(--c-error)",
    sections: [

      {
        sectionId:  "macro-brasil",
        label:      "Macro Brasil",
        icon:       "📊",
        dataSource: "bcb",
        assetType:  "macro-indicator",
        filters: [
          { id: "tipo",      label: "Tipo",      type: "pill", options: ["Todos","Inflação","Atividade","Fiscal"] },
          { id: "tendencia", label: "Tendência", type: "pill", options: ["Todos","Alta","Baixa","Estável"] },
          { id: "surpresa",  label: "Surpresa",  type: "pill", options: ["Todos","Positiva","Negativa","Neutra"] },
          { id: "impacto",   label: "Impacto",   type: "pill", options: ["Todos","Alto","Médio","Baixo"] },
        ],
      },

      {
        sectionId:  "cambio-liquidez",
        label:      "Câmbio & Liquidez",
        icon:       "💵",
        dataSource: "awesomeapi",
        assetType:  "fx-br",
        filters: [
          { id: "moeda",        label: "Moeda",        type: "pill", options: ["Todas","USD/BRL","EUR/BRL","GBP/BRL","JPY/BRL"] },
          { id: "direcao",      label: "Direção",      type: "pill", options: ["Todas","Apreciação","Depreciação"] },
          { id: "volatilidade", label: "Volatilidade", type: "pill", options: ["Todas","Alta","Média","Baixa"] },
          { id: "liquidez",     label: "Liquidez",     type: "pill", options: ["Todas","Alta","Média","Baixa"] },
        ],
      },

    ],
  },

];

// ─── DERIVED HELPERS ──────────────────────────────────────────────────────────

// Flat list of all sections across all blocks, with block context attached
export const ALL_BRAZIL_SECTIONS = BRAZIL_BLOCKS.flatMap(b =>
  b.sections.map(s => ({ ...s, blockId: b.blockId, blockLabel: b.label, blockAccent: b.accentColor }))
);

// Look up a section (with block context) by sectionId
export const getSectionById = (id) => ALL_BRAZIL_SECTIONS.find(s => s.sectionId === id);
