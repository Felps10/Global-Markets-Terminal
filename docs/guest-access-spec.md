# GMT Guest Access Spec

Last updated: 2026-03-28
Authored by: Felipe
Referenced by: P-05, P-06, P-07, P-08, P-09

---

## Governing principle

Open everything that drives discovery and engagement. Lock everything that requires persistence, analysis depth, or account state. Locked states communicate value — they are not walls, they are product education.

---

## Asset grid

| Element | Guest state |
|---|---|
| Asset cards with live prices | Fully visible |
| Group navigation | Fully visible |
| Global / Brasil toggle | Fully visible |
| Sort controls | Fully visible |
| Card / List view toggle | Fully visible |
| Refresh button | Fully visible |
| Watchlist star on each card | Visible — triggers AuthPanel |

---

## AssetDetailDrawer

| Element | Guest state |
|---|---|
| Price, change, session stats | Fully visible |
| Interactive chart | Fully visible |
| Overview tab | Fully visible |
| Fundamentals tab | Locked state — triggers AuthPanel on click |
| News tab | 3 headlines visible, links to external source allowed, full feed gated |
| Peers tab | Fully visible |
| Signals tab | Locked state — triggers AuthPanel on click |
| Save to watchlist button | Visible — triggers AuthPanel |
| Set alert button | Visible — triggers AuthPanel |

---

## Navigation tabs

| Tab | Visible to guest | On click |
|---|---|---|
| Terminal Global | Yes | Navigate freely |
| Terminal Brasil | Yes | Navigate freely |
| Heatmap | Yes | Navigate freely |
| Catalog | Yes | Navigate freely |
| News | Yes | Navigate freely — full feed gated, 3 items per asset shown |
| Markets dropdown | Yes | Shows all items with lock icons |
| Chart Center | Yes — lock icon | Locked page |
| Research Terminal | Yes — lock icon | Locked page |
| Fundamental Lab | Yes — lock icon | Locked page |
| Macro Hub | Yes — lock icon | Locked page |
| Signal Engine | Yes — lock icon | Locked page |
| Clube | Yes — lock icon | Locked page |
| Watchlist | Yes — lock icon | Triggers AuthPanel |

**Rule:** All /markets/* routes are locked on the non-logged experience without exception. This includes Macro Hub whether accessed from the Global or Brasil terminal. No /markets/* page is accessible to guests.

---

## Persistent UI elements

| Element | Guest state |
|---|---|
| Settings gear | Hidden — nothing to configure without an account |
| Global / Brasil mode toggle | Fully functional |
| Search bar | Fully functional |
| Live data refresh indicator | Fully visible |

---

## AuthPanel trigger map

| Trigger point | featureName | Message shown in PT |
|---|---|---|
| Watchlist star on asset card | `watchlist` | Salve ativos na sua watchlist — crie uma conta gratuita |
| Save to watchlist button in drawer | `watchlist` | Salve ativos na sua watchlist — crie uma conta gratuita |
| Set alert button in drawer | `alerts` | Receba alertas de preço em tempo real — crie uma conta gratuita |
| Fundamentals tab in drawer | `fundamentals` | Acesse dados fundamentalistas completos — crie uma conta gratuita |
| Signals tab in drawer | `signals` | Acesse sinais técnicos (RSI, MACD) — crie uma conta gratuita |
| News full feed | `news` | Acesse o feed completo de notícias — crie uma conta gratuita |
| Watchlist nav tab | `watchlist` | Sua watchlist personalizada — crie uma conta gratuita |
| Chart Center locked page CTA | `chart_center` | Charts interativos e comparações — crie uma conta gratuita |
| Research Terminal locked page CTA | `research` | Terminal de pesquisa aprofundada — crie uma conta gratuita |
| Fundamental Lab locked page CTA | `fundamental_lab` | Laboratório de valuation e métricas — crie uma conta gratuita |
| Macro Hub locked page CTA | `macro_hub` | Dashboards macro e calendário econômico — crie uma conta gratuita |
| Signal Engine locked page CTA | `signal_engine` | Scanner de sinais técnicos — crie uma conta gratuita |
| Clube nav tab / locked page CTA | `clube` | Gestão de clube de investimento — crie uma conta gratuita |

---

## Hidden from guests — completely absent, not locked

- Saved watchlists, alert configurations, any user-specific data
- Admin UI: taxonomy manager, user management panel, admin nav bar
- Club data: NAV history, member quotas, club reports, governance actions
- Settings page and gear icon
- User badge and dropdown (replaced by Entrar + Criar conta — implemented in P-02)
- Any user name, email, or role indicator

---

## Implementation notes for P-05 through P-09

- **Locked state in drawer tabs:** Do not render a blank panel or disabled button. Render a small in-panel lock card with the feature name, a one-line description, and a CTA that opens AuthPanel with the correct `featureName`.
- **News tab:** Show 3 headlines. Each headline links to its external URL (public information). A "Ver mais notícias" link at the bottom triggers AuthPanel with `featureName: "news"`.
- **Peers tab:** Fully visible. If any peer item has a save/compare action, that specific action triggers AuthPanel — the tab itself remains open.
- **All /markets/* routes:** ProtectedRoute stays on these routes for now. In P-06 these will be replaced with locked-state pages that render a feature description and AuthPanel CTA instead of redirecting to /login.
- **AuthPanel featureName contract:** The `featureName` string is passed as a prop to AuthPanel. AuthPanel uses it to render the correct message from the trigger map above. The string must match exactly — use the values in the table, no variations.
