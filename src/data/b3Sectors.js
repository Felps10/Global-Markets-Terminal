// B3 equity sector taxonomy — the `sector` field on `type:"equity-br"` rows.
// Single source of truth for the Brazil terminal's grid grouping and for the
// gmtConfig regression tests: an equity-br row whose sector is not a key of
// SECTOR_META is silently dropped from the grid, so data (assets.js), UI
// (BrazilTerminal.jsx), and tests must all read this list.

export const SECTOR_ORDER = [
  "Bancos", "Petróleo", "Mineração", "Agronegócio", "Varejo",
  "Utilities", "Transporte", "Indústria", "Construção", "Saúde",
  "Telecom", "Outros",
];

export const SECTOR_META = {
  "Bancos":       { label: "Bancos & Financeiro",    icon: "🏦" },
  "Petróleo":     { label: "Petróleo & Gás",         icon: "🛢"  },
  "Mineração":    { label: "Mineração",              icon: "⛏"  },
  "Agronegócio":  { label: "Agronegócio",            icon: "🌾"  },
  "Varejo":       { label: "Varejo & Consumo",       icon: "🛍"  },
  "Utilities":    { label: "Utilities & Energia",    icon: "⚡" },
  "Transporte":   { label: "Logística & Transporte", icon: "🚚"  },
  "Indústria":    { label: "Indústria",              icon: "⚙️" },
  "Construção":   { label: "Construção Civil",       icon: "🏗️" },
  "Saúde":        { label: "Saúde",                  icon: "🏥"  },
  "Telecom":      { label: "Telecom & Tech",         icon: "📡"  },
  "Outros":       { label: "Outros Setores",         icon: "📎"  },
};
