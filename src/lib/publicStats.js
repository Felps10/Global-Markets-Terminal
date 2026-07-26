// Single source of truth for every number the PUBLIC (logged-out) pages claim.
// Computed at bundle time from the static taxonomy bootstrap (src/data/*) so the
// marketing copy can never drift from the data again — never hardcode an asset,
// group, subgroup, or source count in a public page; import it from here.
// (assets.js is the seed for the DB taxonomy; see the header comment there.)

import { ASSETS } from '../data/assets.js';
import { GROUPS } from '../data/groups.js';
import { SUBGROUPS } from '../data/subgroups.js';

const ACTIVE = ASSETS.filter((a) => a.active !== false);

// Unique instruments across both terminals (B3 headliners are dual-listed in
// the Global and Brazil views — counted once here).
export const TOTAL_ASSETS = new Set(ACTIVE.map((a) => a.symbol)).size;

export const GROUP_COUNT = GROUPS.length;
export const SUBGROUP_COUNT = SUBGROUPS.length;

// Per-group listing counts (a dual-listed asset counts in each terminal it
// appears in, so these sum to slightly more than TOTAL_ASSETS).
const byGroup = {};
for (const a of ACTIVE) byGroup[a.group_id] = (byGroup[a.group_id] || 0) + 1;
export const countByGroup = (groupId) => byGroup[groupId] || 0;

// Display names of the subgroups (with at least one active asset) in a group,
// in taxonomy sort order — for the Coverage page tag lists.
const activeSubgroupIds = new Set(ACTIVE.map((a) => a.subgroup_id));
export const subgroupNamesByGroup = (groupId) =>
  SUBGROUPS
    .filter((s) => s.group_id === groupId && activeSubgroupIds.has(s.id))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => s.display_name);

// Named data providers actually wired into the product: quote/data primaries
// from the Data Source Engine (server/lib/providerRouting.js) plus Finnhub
// (news/analyst feed via server/routes/finnhub.js). Yahoo and AwesomeAPI exist
// only as last-resort fallbacks and are deliberately not counted.
export const DATA_SOURCES = ['FMP', 'EODHD', 'BRAPI', 'BCB', 'CoinGecko', 'FRED', 'Finnhub'];
export const SOURCE_COUNT = DATA_SOURCES.length;
