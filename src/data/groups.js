// SOURCE OF TRUTH: backend database (seeded from this file)
// This file is used for: initial seed + offline fallback only
// Do not edit manually — use the admin UI at /admin/taxonomy

export const GROUPS = [
  {
    id:           "equities",
    display_name: "Equities",
    description:  "Global equity markets — US sectors, international, and EM",
    slug:         "equities",
  },
  {
    id:           "currencies",
    display_name: "Currencies",
    description:  "Major foreign exchange pairs",
    slug:         "currencies",
  },
  {
    id:           "indices",
    display_name: "Indices",
    description:  "Global benchmark market indices",
    slug:         "indices",
  },
  {
    id:           "digital-assets",
    display_name: "Digital Assets",
    description:  "Cryptocurrency spot prices via CoinGecko",
    slug:         "digital-assets",
  },
  {
    id:           "commodities",
    display_name: "Commodities",
    description:  "Raw materials, energy, precious metals",
    slug:         "commodities",
  },
  {
    id:           "fixed-income",
    display_name: "Fixed Income",
    description:  "Bonds, treasuries, dividend instruments",
    slug:         "fixed-income",
  },
];
