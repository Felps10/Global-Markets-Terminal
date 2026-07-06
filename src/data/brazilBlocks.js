// SOURCE OF TRUTH: static config for Brazil terminal layout
// Defines block identity, section identity, filter definitions.
// No live data lives here — only structure, labels, and metadata.
//
// FILTERS: only the `setor` pill on `acoes-b3` is wired to real filtering.
// The previous ~40 pill/range controls were inert (set state + lit a badge but
// filtered nothing) and were removed. Do not re-add a filter here unless the
// terminal actually applies it.

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
          { id: "setor", label: "Setor", type: "pill", options: ["Todos","Bancos","Petróleo","Mineração","Agronegócio","Varejo","Utilities","Transporte","Indústria","Construção","Saúde","Telecom","Outros"] },
        ],
      },

      {
        sectionId:  "fiis",
        label:      "FIIs",
        icon:       "🏢",
        dataSource: "brapi",
        assetType:  "fii",
      },

      {
        sectionId:  "etfs",
        label:      "ETFs",
        icon:       "📦",
        dataSource: "brapi",
        assetType:  "etf-br",
      },

      {
        sectionId:  "indices-benchmarks",
        label:      "Índices & Benchmarks",
        icon:       "📈",
        dataSource: "bcb_and_yahoo",
        assetType:  "index-br",
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
      },

      {
        sectionId:  "credito",
        label:      "Crédito",
        icon:       "🏦",
        dataSource: "static",
        assetType:  "credit",
      },

      {
        sectionId:  "titulos-publicos",
        label:      "Títulos Públicos",
        icon:       "🧾",
        dataSource: "bcb",
        assetType:  "public-debt",
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
      },

      {
        sectionId:  "cambio-liquidez",
        label:      "Câmbio & Liquidez",
        icon:       "💵",
        dataSource: "awesomeapi",
        assetType:  "fx-br",
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
