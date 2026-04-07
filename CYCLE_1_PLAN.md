# GMT — Cycle 1 Implementation Plan
**Team:** Global Markets Terminal
**Cycle:** #1 · Apr 6–13, 2026
**Issues:** 7 (6 active + 1 duplicate to close)
**Focus:** Performance Sprint — Global Terminal

---

## Overview

Cycle 1 is a focused performance sprint on the Global Terminal. All 6 active issues target load time, render efficiency, and main-thread contention. There is one Brazil Terminal polish task included. No Clube work is in this cycle.

**Recommended execution order (highest impact first):**

```
1. GLO-74  Parallelize FRED/FMP fetches         → biggest latency win (9s → ~1s)
2. GLO-72  React.lazy() code splitting           → smaller initial bundle
3. GLO-76  Debounce localStorage writes          → unblock main thread during polling
4. GLO-75  Memoize assetsInCategory()            → stop O(n) scans on every render
5. GLO-73  Virtualize AssetListView              → smooth scroll with 100+ assets
6. GLO-22  SELIC/CDI macro banner polish         → design system alignment
7. GLO-71  Close as Duplicate                    → housekeeping
```

---

## Issues

---

### GLO-74 — Parallelize fredAllMacro() and FMP batch fetches
**Priority:** High | **Project:** Platform | **Status:** Backlog

**Problem:**
Two data-fetching functions in `dataServices.js` use sequential `for` loops, blocking on each request before starting the next. This causes the macro data panel and fundamentals to take 9–10 seconds to load — the single largest perceived latency in the app.

**Root cause:**
```js
// Sequential — ~9s minimum for ~9 FRED series
for (const key of Object.keys(FRED_SERIES)) {
  results[key] = await fredSeries(key);
}
```

**Implementation steps:**

1. **Audit first:** open `src/services/dataServices.js` (grep for `fredAllMacro` and `FRED_SERIES` to confirm the exact file and function names).
2. Locate both sequential loops — one for FRED macro series, one for FMP batch fetches.
3. Replace each with `Promise.all`:
   ```js
   // FRED — parallel
   const entries = await Promise.all(
     Object.keys(FRED_SERIES).map(key =>
       fredSeries(key).then(value => [key, value])
     )
   );
   const results = Object.fromEntries(entries);
   ```
4. Apply the same pattern to the FMP batch loop.
5. **Verify:** macro data panel should load in ~1–2s instead of 9–10s. Check the Network tab — all FRED requests should fire simultaneously.
6. **Error handling:** `Promise.all` fails fast on first rejection. If individual series failures should be tolerated, use `Promise.allSettled` and filter out rejected entries.

---

### GLO-72 — Add React.lazy() + Suspense for route-level code splitting
**Priority:** High | **Project:** Platform | **Status:** Backlog

**Problem:**
All page components are statically imported in `App.jsx`, so the entire app bundles into one large initial payload — even routes the user never visits contribute to first-load time.

**Root cause:**
```js
// App.jsx — static imports bundle everything upfront
import CatalogPage from './CatalogPage.jsx';
import GlobalMarketsTerminal from './GlobalMarketsTerminal.jsx';
import NewsPage from './NewsPage.jsx';
import BrazilTerminal from './BrazilTerminal.jsx';
```

**Implementation steps:**

1. **Audit first:** open `src/App.jsx` and list all static page-level imports.
2. Convert each route-level component to a lazy import:
   ```js
   const CatalogPage           = React.lazy(() => import('./pages/CatalogPage.jsx'));
   const GlobalMarketsTerminal = React.lazy(() => import('./pages/GlobalMarketsTerminal.jsx'));
   const NewsPage              = React.lazy(() => import('./pages/NewsPage.jsx'));
   const BrazilTerminal        = React.lazy(() => import('./pages/BrazilTerminal.jsx'));
   // ... all other route-level pages
   ```
3. Wrap the router/route tree in `<Suspense>`:
   ```jsx
   <Suspense fallback={<LoadingSpinner />}>
     <Routes>
       {/* all routes */}
     </Routes>
   </Suspense>
   ```
   Use an existing `LoadingSpinner` or `LoadingScreen` component — grep for it before creating a new one.
4. Run `npm run build` and inspect the `dist/` output. Confirm multiple smaller JS chunks appear (one per lazy-loaded route) instead of one monolithic bundle.
5. **Verify:** navigate to each route in the browser — check the Network tab to confirm each chunk loads on first visit to that route and is cached on subsequent visits.
6. **Watch for:** the `<Suspense>` wrapper must be high enough in the tree to cover all lazy components — keep it wrapping the entire `<Routes>` block.

---

### GLO-76 — Debounce synchronous localStorage writes in quotaTracker.js
**Priority:** High | **Project:** Platform | **Status:** Backlog

**Problem:**
`quotaTracker.js` calls `localStorage.setItem()` synchronously on every API response. During active market data polling (30s refresh cycles across 8 providers), this triggers dozens of main-thread blocking writes per minute.

**Root cause:**
```js
// quotaTracker.js — blocks the main thread on every API call
function recordUsage(apiKey, cost = 1) {
  const data = readFromStorage();
  data[apiKey] = (data[apiKey] || 0) + cost;
  localStorage.setItem(QUOTA_KEY, JSON.stringify(data)); // ← synchronous, every call
}
```

**Implementation steps:**

1. **Audit first:** open `src/lib/quotaTracker.js` (grep for `quotaTracker` to confirm the path).
2. Add an in-memory state object that mirrors localStorage:
   ```js
   let memoryState = JSON.parse(localStorage.getItem(QUOTA_KEY) || '{}');
   let flushTimer = null;
   ```
3. Update `recordUsage` to write to `memoryState` synchronously and debounce the actual `setItem` flush:
   ```js
   function recordUsage(apiKey, cost = 1) {
     memoryState[apiKey] = (memoryState[apiKey] || 0) + cost;
     clearTimeout(flushTimer);
     flushTimer = setTimeout(() => {
       localStorage.setItem(QUOTA_KEY, JSON.stringify(memoryState));
     }, 2000); // flush at most once every 2s
   }
   ```
4. Update any `readUsage` / getter functions to read from `memoryState` (not from `localStorage` directly) so they stay in sync without triggering a storage read.
5. **Verify:** open DevTools → Performance → record a 30s session with data polling active. Confirm `localStorage.setItem` calls are now sparse (~1 per 2s) rather than firing on every API response.

---

### GLO-75 — Memoize assetsInCategory() and getB3AssetEntries()
**Priority:** High | **Project:** Global Terminal | **Status:** Backlog

**Problem:**
Two filter functions run an O(n) scan over the full asset map on every render. Since both parent components re-render frequently (on price updates, hover state, etc.), this wastes CPU on every tick.

**Root cause:**
```js
// GlobalMarketsTerminal.jsx — re-runs on every render
function assetsInCategory(catKey) {
  return Object.keys(STATIC_ASSETS_MAP).filter(s => {
    const a = STATIC_ASSETS_MAP[s];
    return a.category === catKey;
  });
}
```

**Implementation steps:**

1. **Audit first:** grep for `assetsInCategory` in `src/GlobalMarketsTerminal.jsx` to confirm it's a plain function (not already memoized). Do the same for `getB3AssetEntries` in the Brazil Terminal file.
2. Convert `assetsInCategory` to `useMemo` inside the component:
   ```js
   const assetsInCategory = useMemo(() => {
     return Object.keys(STATIC_ASSETS_MAP).filter(s =>
       STATIC_ASSETS_MAP[s].category === activeCategory
     );
   }, [activeCategory]); // only recompute when the active category changes
   ```
3. Apply the same `useMemo` pattern to `getB3AssetEntries` with its appropriate dependencies.
4. **Critical:** confirm both `useMemo` calls are placed **before any early returns** in the component. Placing hooks after a conditional `return null` causes a React hooks ordering crash.
5. **Verify:** open React DevTools Profiler, interact with the category filter — confirm the filtered list is not recomputed on unrelated renders (e.g., a price update tick should not retrigger the memo if `activeCategory` hasn't changed).

---

### GLO-73 — Virtualize AssetListView with @tanstack/react-virtual
**Priority:** High | **Project:** Global Terminal | **Status:** Backlog

**Problem:**
`AssetListView.jsx` renders every asset row into the DOM at once. With 100+ assets this creates an oversized DOM, causing sluggish scroll, excess paint work, and high memory usage.

**Implementation steps:**

1. **Audit first:** open `src/components/AssetListView.jsx` (grep to confirm the path). Note the current render pattern and the existing row component name.
2. Install the virtualization library:
   ```bash
   npm install @tanstack/react-virtual
   ```
3. Measure the actual rendered row height by inspecting the DOM (or read the inline style currently applied to each row).
4. Refactor the list to use `useVirtualizer`:
   ```js
   import { useVirtualizer } from '@tanstack/react-virtual';

   const parentRef = useRef(null);
   const rowVirtualizer = useVirtualizer({
     count: assets.length,
     getScrollElement: () => parentRef.current,
     estimateSize: () => 48, // actual row height in px — measure first
   });

   return (
     <div ref={parentRef} style={{ overflowY: 'auto', height: '100%' }}>
       <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
         {rowVirtualizer.getVirtualItems().map(virtualRow => (
           <div
             key={virtualRow.key}
             style={{ position: 'absolute', top: virtualRow.start, width: '100%' }}
           >
             <AssetRow asset={assets[virtualRow.index]} />
           </div>
         ))}
       </div>
     </div>
   );
   ```
5. The scroll container (`parentRef`) must have a **fixed height** (not `auto`) for virtualization to work. Confirm the container height is constrained by its parent layout.
6. All styles inline — no CSS classes for layout per project constraints.
7. **Verify:** load the catalog with 100+ assets. Inspect the DOM — only the visible rows (~15–20) should exist as DOM nodes at any time. Scroll should be smooth.

---

### GLO-22 — SELIC/CDI macro banner — polish with design system tokens
**Priority:** Medium | **Project:** Brazil Terminal | **Status:** Todo

**Problem:**
The macro banner displaying SELIC, IPCA, and CDI rates is not using the correct design system token values for background, border, and text color.

**Target spec:**
- Background: `rgba(21, 101, 192, 0.08)`
- Border: `1px solid rgba(21, 101, 192, 0.2)`
- Rate value text: `Data/Price Large` style, color `#3b82f6`

**Implementation steps:**

1. **Audit first:** grep for `SELIC` or `CDI` in `src/` to find the macro banner component file.
2. Update the container's inline style:
   ```js
   style={{
     background: 'rgba(21, 101, 192, 0.08)',
     border: '1px solid rgba(21, 101, 192, 0.2)',
     borderRadius: 8,
     padding: '8px 16px',
   }}
   ```
3. Update rate value text inline style to match `Data/Price Large`:
   ```js
   style={{
     color: '#3b82f6',
     fontSize: 20,
     fontWeight: 600,
     fontVariantNumeric: 'tabular-nums',
   }}
   ```
4. **Color constraint:** use blue only — never gold. Confirm this component is not inadvertently inside a `data-context="brazil"` gold override wrapper.
5. **Verify:** visually inspect the banner — colors, border, and text size match the spec. No regressions on surrounding layout.

---

### GLO-71 — "This Todo I created manually"
**Status:** Duplicate | **Action:** Close in Linear — no implementation needed.

---

## Definition of Done — Per Issue

Before marking any issue complete:

- [ ] Relevant files were **read before editing** (audit-first rule).
- [ ] No TypeScript added.
- [ ] No CSS classes used for layout/color/spacing — inline styles only.
- [ ] All React hooks declared **before any early returns**.
- [ ] Gold colors not used in any Global Terminal component.
- [ ] No `require()` — ES modules (`import/export`) throughout.
- [ ] Manual verification step completed (Network tab, Profiler, or DOM inspection as appropriate per issue).

---

*Source: Linear Cycle 1 · 7 issues filtered from 50-issue team backlog by cycleId `a458da40`*
