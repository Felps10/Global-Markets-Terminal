# Clube Architecture Build — Claude Code Prompt Sequence
**GLO-86 → GLO-87 → GLO-88 | Pre-work + Cycle 5 + Cycle 6**
**10 prompts total. Linear issues: GLO-89 through GLO-98.**

---

## HOW TO USE THIS DOCUMENT

**One prompt per session. Paste verbatim. Never combine.**

Each prompt is a complete, self-contained Claude Code instruction. Work through them in strict order. Do not start the next prompt until the current one is verified and closed in Linear.

### Meta-rules Claude Code must follow in every session

1. **STEP 0 is mandatory.** Every prompt begins with an audit. Do the audit fully, report findings, and wait before writing a single line of code. This has repeatedly caught discrepancies before they became bugs.
2. **Start small.** Read before writing. Map before changing. One file at a time where possible.
3. **Ask questions when unsure.** If an audit reveals something unexpected — a missing endpoint, a different file structure, a naming mismatch — stop and ask before proceeding. Do not guess.
4. **Report and wait.** After each STEP 0, explicitly report what you found and pause. Do not proceed to STEP 1 without acknowledgement.
5. **Inline styles only.** No className, no CSS modules, no Tailwind. All visual styling via inline `style={{}}` objects.
6. **CLUBE_COLORS.accent = `#F9C300`.** Never use `#F5C518`. Import from `src/clube/styles/index.js`.
7. **Hooks before early returns.** All `useState`, `useEffect`, `useCallback` calls must appear before any conditional `return` statement.
8. **No new npm packages** unless explicitly stated in the prompt.
9. **Plain JavaScript only.** No TypeScript.

---

## SEQUENCE MAP

```
PRE-WORK (no visible UI change)
  PW-1  GLO-89  Route permissions fix — App.jsx only
  PW-2  GLO-90  Hook extraction — useClube.js + /meu-cotista endpoint
  PW-3  GLO-91  ClubePage role gate + empty app shells

CYCLE 5 — Gestor Command Screen
  C5-1  GLO-92  Dashboard endpoint — GET /api/v1/clubes/:id/dashboard
  C5-2  GLO-93  ClubeGestorApp structure and data wiring
  C5-3  GLO-94  Gestor command screen UI (health strip + alert feed + nav grid)

CYCLE 6 — Cotista App
  C6-1  GLO-95  ClubeCotistaShell.jsx — no-sidebar layout component
  C6-2  GLO-96  Minha Posição tab
  C6-3  GLO-97  Performance tab
  C6-4  GLO-98  Relatórios + Assembleias tabs + final E2E verification
```

**After C5-3 passes build:** close GLO-54, GLO-55, GLO-56 in Linear.
**After C6-4 passes build:** close GLO-60, GLO-88, GLO-66, GLO-67 in Linear.

---

---

# PRE-WORK

## PROMPT PW-1 (GLO-89)
**Route permissions fix (App.jsx)**
*Labels: frontend, tech-debt | Parent: GLO-86*

---

Fix route permission bug in App.jsx — change requiredRole={null} to correct role on five Clube sub-routes.

**Execute in order. Do not skip steps.**

---

**STEP 0 — AUDIT FIRST, NO CHANGES YET:**
Read `src/App.jsx`. Find all Route definitions under the "Parameterized clube module routes" comment block. List each route path and its current `requiredRole` value. Confirm you can see: `/clube/:id/membros`, `/clube/:id/simulador`, `/clube/:id/governanca`, `/clube/:id/reenquadramento`, `/clube/:id/tributacao`.

REPORT findings and wait.

---

**STEP 1 — APPLY CHANGES:**
In `App.jsx`, update `requiredRole` on the following routes:

* `/clube/:id/membros` → `requiredRole="club_manager"` (member management is manager-only)
* `/clube/:id/simulador` → `requiredRole="club_manager"` (pre-trade and tax simulation is manager-only)
* `/clube/:id/reenquadramento` → `requiredRole="club_manager"` (compliance workflow is manager-only)
* `/clube/:id/tributacao` → `requiredRole="club_manager"` (IRRF execution is manager-only)
* `/clube/:id/governanca` → `requiredRole="club_member"` (assembly read is open to members)
* `/clube/:id/governanca/:aid` → `requiredRole="club_member"` (assembly detail read is open to members)

Do not change `/clube/:id` (already "club_member") or `/clube/:id/report` (already "club_member").

---

**STEP 2 — VERIFY:**
After changes, re-read the relevant section of `App.jsx` and confirm every route has the expected `requiredRole`. Report the final state.

---

**CONSTRAINTS:**

* Only touch `App.jsx`
* Do not change any component files
* This is a security fix — no shortcuts

---

---

## PROMPT PW-2 (GLO-90)
**Hook extraction (useClube.js + /meu-cotista endpoint)**
*Labels: frontend, backend, tech-debt | Parent: GLO-86*

---

Extract data fetching from ClubePage.jsx into three custom hooks. Zero UI change.

**Execute in order. Do not skip steps.**

---

**STEP 0 — AUDIT FIRST, NO CHANGES YET:**
Read `src/pages/ClubePage.jsx`. Map every fetch call and every piece of state. Produce a categorised list:

* **"Core"** — data needed by both gestor and cotista (clube record, navHistory, posicoes)
* **"Gestor-only"** — data only the gestor needs (all cotistas, compliance full, operacional, estatuto, setup checklist, annual close)
* **"Cotista-scoped"** — data scoped to the logged-in user's identity (their cotista row, their movimentações)

Also read `server/routes/clubes.js` and confirm: (1) `cotistas` table has `auth_user_id` column, (2) `GET /api/v1/clubes/:id/meu-role` endpoint exists.

REPORT findings and wait for confirmation before proceeding.

---

**STEP 1 — CREATE `src/hooks/useClube.js`:**
Create a new file with three exported hooks:

`useClubeCore(clubeId, getToken)`:

* Fetches: clube record, navHistory (`GET .../nav`), posicoes (`GET .../posicoes`)
* Returns: `{ clube, navHistory, posicoes, loading, error, refetch }`

`useGestorData(clubeId, getToken, enabled)`:

* Only fetches when `enabled=true` (i.e. when role is `club_manager` or `admin`)
* Fetches in parallel: cotistas (`GET .../cotistas`), compliance (`GET .../compliance`), operacional (`GET .../operacional`), estatuto active (`GET .../estatuto/active`), setup checklist (`GET .../setup-checklist`)
* Returns: `{ cotistas, compliance, operacional, estatuto, setupChecklist, loading, error }`

`useCotistaData(clubeId, getToken, enabled)`:

* Only fetches when `enabled=true` (i.e. when role is `club_member` or above but NOT manager)
* Fetches: minha cotista row (via `/meu-cotista` endpoint — see Step 2), minhas movimentacoes (`GET .../movimentacoes?cotista_id=mine`)
* Returns: `{ minhaCotista, minhasMovimentacoes, loading, error }`

---

**STEP 2 — ADD `/meu-cotista` endpoint to `server/routes/clubes.js`:**
Add before the existing `GET /:id/cotistas` route:

```
GET /api/v1/clubes/:id/meu-cotista
  requireRole('club_member')
  Query cotistas table WHERE clube_id = id AND auth_user_id = req.user.id
  Also query cotas_tranches for this cotista_id to get data_aquisicao of earliest tranche
  Returns: { cotista: {...}, entryDate: "YYYY-MM-DD" }
  If no cotista found: 404
```

---

**STEP 3 — VERIFY:**
Re-read `useClube.js` and confirm all three hooks are correct. Re-read the new server route. Report any issues.

---

**CONSTRAINTS:**

* Do NOT modify `ClubePage.jsx` in this prompt — hook integration is the next prompt
* Do NOT modify any other component files
* Hooks must be plain JavaScript (no TypeScript)
* No new npm packages

---

---

## PROMPT PW-3 (GLO-91)
**ClubePage role gate + empty app shells**
*Labels: frontend, tech-debt | Parent: GLO-86*

---

Reduce ClubePage.jsx to a thin role gate that mounts ClubeGestorApp or ClubeCotistaApp. Create empty shell files for both apps.

**Execute in order. Do not skip steps.**

---

**STEP 0 — AUDIT FIRST, NO CHANGES YET:**
Read `src/pages/ClubePage.jsx`. Note: (1) the total line count, (2) where the main component export starts, (3) all the state declarations at the top, (4) the TABS array and activeTab state, (5) how `isManager` and `isMember` are derived. Also check whether `src/pages/ClubeGestorApp.jsx` and `src/pages/ClubeCotistaApp.jsx` already exist.

REPORT findings and wait.

---

**STEP 1 — CREATE `src/pages/ClubeGestorApp.jsx` (empty shell):**

```jsx
import { useParams } from 'react-router-dom';
import ClubeShell from '../components/clube/ClubeShell.jsx';

// Placeholder — full implementation in Cycle 5 (PROMPT C5-2 and C5-3)
export default function ClubeGestorApp({ clube, navHistory, posicoes, gestorData, refetch }) {
  const { id: clubeIdParam } = useParams();
  return (
    <ClubeShell
      activePage="painel"
      clubeId={clubeIdParam}
      clubeNome={clube?.nome}
      clubeStatus={clube?.status}
    >
      <div style={{ padding: 40, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#475569' }}>
        GESTOR VIEW — building in Cycle 5
      </div>
    </ClubeShell>
  );
}
```

---

**STEP 2 — CREATE `src/pages/ClubeCotistaApp.jsx` (empty shell):**

```jsx
// Placeholder — full implementation in Cycle 6 (PROMPTS C6-2 through C6-4)
export default function ClubeCotistaApp({ clube, navHistory, posicoes, cotistaData }) {
  return (
    <div style={{ minHeight: '100vh', background: '#080f1a', padding: 40,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#475569' }}>
      COTISTA VIEW — building in Cycle 6
    </div>
  );
}
```

---

**STEP 3 — REPLACE ClubePage.jsx content:**
Replace the entire file with a thin role gate. Keep ONLY: imports for the two new app components and hooks, the role gate logic, and the loading/error states.

```jsx
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { hasRole } from '../lib/roles.js';
import { useClubeCore, useGestorData, useCotistaData } from '../hooks/useClube.js';
import ClubeGestorApp from './ClubeGestorApp.jsx';
import ClubeCotistaApp from './ClubeCotistaApp.jsx';

const MONO = "'JetBrains Mono', monospace";

export default function ClubePage() {
  const { id: clubeIdParam } = useParams();
  const { user, getToken } = useAuth();
  const isManager = hasRole(user?.role, 'club_manager');
  const isMember  = hasRole(user?.role, 'club_member');

  const core    = useClubeCore(clubeIdParam, getToken);
  const gestor  = useGestorData(clubeIdParam, getToken, isManager);
  const cotista = useCotistaData(clubeIdParam, getToken, isMember && !isManager);

  if (core.loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080f1a', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: MONO, fontSize: 11, color: '#475569', letterSpacing: '0.1em' }}>
        CARREGANDO...
      </div>
    );
  }

  if (core.error) {
    return (
      <div style={{ minHeight: '100vh', background: '#080f1a', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: MONO, fontSize: 11, color: '#FF5252' }}>
        {core.error}
      </div>
    );
  }

  if (isManager) {
    return <ClubeGestorApp
      clube={core.clube}
      navHistory={core.navHistory}
      posicoes={core.posicoes}
      gestorData={gestor}
      refetch={core.refetch}
    />;
  }

  return <ClubeCotistaApp
    clube={core.clube}
    navHistory={core.navHistory}
    posicoes={core.posicoes}
    cotistaData={cotista}
  />;
}
```

---

**STEP 4 — VERIFY:**
Run the dev server. Navigate to `/clube/:id` as a `club_manager` — confirm the gestor placeholder renders. Navigate as a `club_member` — confirm cotista placeholder renders. Confirm no console errors.

---

**CONSTRAINTS:**

* The old ClubePage.jsx content is now inside ClubeGestorApp and ClubeCotistaApp — do NOT delete it yet, it will be migrated in subsequent prompts
* Inline styles only
* Hooks before early returns

---

---

# CYCLE 5 — Gestor Command Screen

---

## PROMPT C5-1 (GLO-92)
**Dashboard endpoint (GET /api/v1/clubes/:id/dashboard)**
*Labels: backend, new feature | Parent: GLO-87*

---

Add `GET /api/v1/clubes/:id/dashboard` endpoint to `server/routes/clubes.js`.

**Execute in order. Do not skip steps.**

---

**STEP 0 — AUDIT FIRST, NO CHANGES YET:**
Read `server/routes/clubes.js`. Confirm the following already exist:

* `GET /:id/nav/latest`
* `GET /:id/compliance`
* `GET /:id/operacional` (or equivalent pending/alerts endpoint)
* `GET /:id/setup-checklist`

List the exact response shape of each. Also check whether `GET /:id/dashboard` already exists. Report and wait.

---

**STEP 1 — ADD ENDPOINT:**
Add after the existing `GET /:id/compliance` route:

```
GET /api/v1/clubes/:id/dashboard
  requireRole('club_manager')
```

Fetches in parallel from Supabase:

* Latest NAV row (`nav_historico` WHERE `clube_id = id` ORDER BY `data` DESC LIMIT 1)
* Compliance status (from existing compliance calculation — reuse or call same logic)
* Pending operacional count (`movimentacoes` WHERE `clube_id = id` AND `status IN ('aguardando_recursos', 'recursos_confirmados')` COUNT)
* Top 3 compliance alerts by severity (from existing `alertas_compliance` logic)
* Setup checklist completion (from existing setup-checklist logic, return `pct` as 0–100 integer)
* Clube record (for `patrimônio_total` and `cotas_emitidas_total`)

**Returns:**

```json
{
  "nav_latest": { "valor_cota": number, "data": "YYYY-MM-DD" } | null,
  "patrimonio_total": number | null,
  "cotas_emitidas": number | null,
  "compliance_status": "OK" | "WARNING" | "BREACH" | "NO_POSITIONS",
  "percentual_rv": number,
  "pending_count": number,
  "alertas_top3": [{ "severity": string, "titulo": string, "descricao": string, "tipo": string }],
  "setup_checklist_pct": number
}
```

---

**STEP 2 — VERIFY:**
Test the endpoint with curl or by logging the response from the frontend. Confirm all fields are present and no 500 errors.

---

**CONSTRAINTS:**

* This is a read-only endpoint — no writes
* `requireRole('club_manager')` is mandatory
* Do not duplicate calculation logic — reuse existing functions/queries where they exist

---

---

## PROMPT C5-2 (GLO-93)
**ClubeGestorApp structure and data wiring**
*Labels: frontend, backend, new feature | Parent: GLO-87*

---

Build ClubeGestorApp.jsx structure — shell wiring, data fetching, and layout skeleton. No final UI yet.

**Execute in order. Do not skip steps.**

---

**STEP 0 — AUDIT FIRST, NO CHANGES YET:**
Read `src/pages/ClubeGestorApp.jsx` (current placeholder). Read `src/components/clube/ClubeShell.jsx` — note all props it accepts (`activePage`, `clubeId`, `clubeNome`, `clubeStatus`, `patrimonio`, `valorCota`, `cotasEmitidas`, `pendingCount`, `headerLeft`, `headerRight`). Read `src/pages/ClubePage.jsx` to confirm the props passed from the role gate.

REPORT the ClubeShell props signature and wait.

---

**STEP 1 — BUILD `ClubeGestorApp.jsx`:**
Replace the placeholder with the full component. This prompt builds the structure and data layer — the command screen UI is Prompt C5-3.

Structure:

* Fetch dashboard data from `GET /api/v1/clubes/:id/dashboard` on mount
* Derive ClubeShell props from dashboard data + props passed from ClubePage
* Render `ClubeShell` with:
  * `activePage="painel"`
  * `headerLeft`: "PAINEL · COMANDO" label
  * `headerRight`: REGISTRAR NAV button (opens `NavRecordModal` — migrate from old ClubePage)
* Inside ClubeShell children, render a loading state while dashboard fetches, then render `GestorCommandScreen` component (created in this prompt as a local component, full implementation in C5-3)
* Migrate `NavRecordModal` and its state (`navModalOpen`, `navModalData`, `navSubmitting`, `navSubmitError`, `navSubmitOk`, `submitNav`, `buildNavModalDefaults`) from old `ClubePage.jsx` into `ClubeGestorApp.jsx`

---

**STEP 2 — CREATE local `GestorCommandScreen` placeholder:**
Inside `ClubeGestorApp.jsx` (not a separate file), add:

```jsx
function GestorCommandScreen({ dashboard, clube, navHistory, posicoes }) {
  return (
    <div style={{ padding: '20px 24px' }}>
      <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#475569' }}>
        {JSON.stringify(dashboard, null, 2)}
      </pre>
    </div>
  );
}
```

---

**STEP 3 — VERIFY:**
Navigate to `/clube/:id` as a manager. Confirm dashboard data is fetched and visible in the JSON dump. Confirm REGISTRAR NAV button opens the modal. No console errors.

---

**CONSTRAINTS:**

* Inline styles only, no className except `data-context="brazil"` if needed
* Import `CLUBE_COLORS` from `src/clube/styles/index.js` for gold (`#F9C300`) — do NOT use `#F5C518`
* Hooks before early returns
* Do not remove `NavRecordModal` from the codebase — it must remain accessible

---

---

## PROMPT C5-3 (GLO-94)
**Gestor command screen UI (health strip + alert feed + nav grid)**
*Labels: frontend, design, new feature | Parent: GLO-87*

---

Build the `GestorCommandScreen` UI inside `ClubeGestorApp.jsx` — health strip, alert feed, and nav card grid.

**Execute in order. Do not skip steps.**

---

**STEP 0 — AUDIT FIRST, NO CHANGES YET:**
Read `src/pages/ClubeGestorApp.jsx` (current state from C5-2). Read the `clube-manager-v2.html` file in the project root (or `clube-manager-dashboard.html` — check which exists with: `ls *.html` in project root). Note the layout pattern and KPI positioning from the mockup.

Also read the existing OPERACIONAL tab section in the old `ClubePage.jsx` backup (if it exists) — we need the alert item rendering logic.

REPORT what you find in the mockup file and wait.

---

**STEP 1 — REPLACE `GestorCommandScreen` with full implementation:**

Layout (top to bottom):

**1. HEALTH STRIP** — horizontal row of 4 metric cards:

* VALOR DA COTA: `dashboard.nav_latest?.valor_cota` formatted as BRL
* PATRIMÔNIO: `dashboard.patrimonio_total` formatted as BRL (abbreviated: M for milhões)
* ENQUADRAMENTO: `dashboard.percentual_rv` as %, colored GREEN/AMBER/RED per `compliance_status`
* COTISTAS: clube?.cotistas count (use `cotas_emitidas` as proxy if direct count unavailable)

**2. ALERT FEED** — section title "AÇÕES PENDENTES", then:

* If `pending_count = 0` and `alertas_top3` is empty: empty state "Clube em dia ✓"
* Otherwise: render each alert as a row with severity badge (CRÍTICO/ALERTA/INFO), title, and description
* After `alertas_top3`, if `pending_count > 0`: show "N operações aguardando conversão →" as a link to `/clube/:id/membros`

**3. SETUP CHECKLIST BANNER** — only if `setup_checklist_pct < 100`:

* Compact banner: "Configuração do clube: X% completo" with a progress bar
* Dismissed permanently per club via localStorage key `gmt_setup_dismissed_${clubeId}`

**4. NAV CARD GRID** — 2×3 grid of cards, each linking to a deep page:

* Membros → `/clube/:id/membros`
* Compliance → `/clube/:id/reenquadramento`
* Relatório → `/clube/:id/report`
* Governança → `/clube/:id/governanca`
* Tributação → `/clube/:id/tributacao`
* Simulador → `/clube/:id/simulador`

Each card: icon (small SVG), label, one-line description of what's inside.

---

**STEP 2 — REMOVE** old OPERACIONAL and VISÃO GERAL tab content from any remaining reference in `ClubePage.jsx` or `ClubeGestorApp.jsx`. These are now the command screen.

---

**STEP 3 — VERIFY:**
Full visual review. Navigate to `/clube/:id` as manager. Confirm: health strip shows real data, alert feed renders or shows empty state, nav grid is clickable and routes correctly. Run `npm run build` — confirm no errors.

After build passes, **close GLO-54, GLO-55, GLO-56 in Linear**.

---

**CONSTRAINTS:**

* Use `CLUBE_COLORS.accent` (`#F9C300`) for gold accents — import from `src/clube/styles/index.js`
* GREEN = `#00E676`, AMBER = `#fbbf24`, RED = `#FF5252` (terminal palette)
* BG_PAGE = `#080f1a`, BG_CARD = `#0d1824`, BORDER = `rgba(30,41,59,0.8)`
* Inline styles only

---

---

# CYCLE 6 — Cotista App

---

## PROMPT C6-1 (GLO-95)
**ClubeCotistaShell.jsx (no-sidebar layout component)**
*Labels: frontend, design, new feature | Parent: GLO-88*

---

Create `ClubeCotistaShell.jsx` — a new shell component for the cotista experience. No sidebar.

**Execute in order. Do not skip steps.**

---

**STEP 0 — AUDIT FIRST, NO CHANGES YET:**
Read `src/components/clube/ClubeShell.jsx` — note the full structure: sidebar, toggle, dot nav, header slots, children render area. Read `src/pages/ClubeCotistaApp.jsx` (current placeholder). Note the props it receives from `ClubePage.jsx`.

REPORT and wait.

---

**STEP 1 — CREATE `src/components/clube/ClubeCotistaShell.jsx`:**

Layout (no sidebar):

* **Top bar (48px):** left = "← Terminal" link (navigates to `/app`), center = clube name, right = user badge (name + role pill)
* **Tab bar (36px):** four horizontal tabs — "MINHA POSIÇÃO", "PERFORMANCE", "RELATÓRIOS", "ASSEMBLEIAS"
  * Active tab: gold underline (`CLUBE_COLORS.accent`)
  * Tab switching is prop-controlled: `activeTab` (string) + `onTabChange` (fn)
* **Content area:** fills remaining height, `overflow-y: auto`, padding `24px`

**Props:** `{ clube, clubeNome, activeTab, onTabChange, children }`

The component has no data fetching — it is purely a layout shell.

---

**STEP 2 — VERIFY:**
Import `ClubeCotistaShell` into `ClubeCotistaApp.jsx` (replace the current placeholder div). Render with `activeTab="posicao"` and four placeholder tab content strings. Navigate to `/clube/:id` as a `club_member` — confirm the shell renders with correct layout and tab switching works.

---

**CONSTRAINTS:**

* Use `CLUBE_COLORS` from `src/clube/styles/index.js` — accent is `#F9C300`
* `BG_PAGE = '#080f1a'`
* Inline styles only
* No sidebar, no hamburger
* Mobile-friendly tab bar: tabs should scroll horizontally if viewport is narrow

---

---

## PROMPT C6-2 (GLO-96)
**Minha Posição tab (KPI cards + entry-date chart + aportes list)**
*Labels: frontend, new feature | Parent: GLO-88*

---

Build the "Minha Posição" tab inside `ClubeCotistaApp.jsx`.

**Execute in order. Do not skip steps.**

---

**STEP 0 — AUDIT FIRST, NO CHANGES YET:**
Read `src/pages/ClubeCotistaApp.jsx`. Read `src/hooks/useClube.js` — confirm `useCotistaData` returns `{ minhaCotista, minhasMovimentacoes, loading, error }`. Confirm `minhaCotista` includes `entryDate` (from `cotas_tranches.data_aquisicao`). Read the `NavChart` component usage in the old `ClubePage.jsx` or `ClubeReportPage.jsx` — note its props signature.

REPORT the NavChart props and wait.

---

**STEP 1 — BUILD Minha Posição tab content:**

**Top section — "MINHA POSIÇÃO" KPI row (3 cards):**

* MINHAS COTAS: `minhaCotista?.cotas_detidas` formatted to 6 decimal places
* VALOR ATUAL: `(cotas_detidas × nav_latest.valor_cota)` formatted as BRL
* RENTABILIDADE: return since entry date = `((nav_latest.valor_cota / nav_at_entry_date) - 1) * 100`
  * `nav_at_entry_date`: first navHistory entry on or after `minhaCotista.entryDate`
  * Show as percentage with sign, colored GREEN if positive, RED if negative

**Chart section — "EVOLUÇÃO DESDE MEU INGRESSO":**

* Render `NavChart` with navSeries filtered to entries >= `entryDate`
* Show IBOV and CDI benchmark lines if available in navHistory
* If navHistory has < 2 entries after entry date: show "Histórico insuficiente — aguardando próxima cotização"

**Bottom section — "MEUS APORTES":**

* List last 5 `movimentações` from `minhasMovimentacoes` (`tipo = 'aporte'` or `'resgate'`)
* Each row: date, tipo badge (APORTE/RESGATE), `valor_brl` formatted as BRL, status badge
* "Ver extrato completo →" link (placeholder for now)

---

**STEP 2 — VERIFY:**
Navigate as `club_member`. Confirm all three KPI cards render. Confirm chart shows data from entry date. Confirm no other cotista's data is visible.

---

**CONSTRAINTS:**

* Inline styles only
* Handle loading state from `useCotistaData`
* Handle case where `minhaCotista` is null (cotista record not yet linked via `auth_user_id`)
* `CLUBE_COLORS` for gold accents, GREEN/RED for performance coloring

---

---

## PROMPT C6-3 (GLO-97)
**Performance tab (period selector + benchmark comparison chart)**
*Labels: frontend, new feature | Parent: GLO-88*

---

Build the "Performance" tab inside `ClubeCotistaApp.jsx`.

**Execute in order. Do not skip steps.**

---

**STEP 0 — AUDIT FIRST, NO CHANGES YET:**
Read the existing `calculateNAVFromHistory` utility (used in `ClubePage.jsx` and `ClubeReportPage.jsx`). Confirm its signature and what it returns (`navSeries`, `totalReturnPct`, `ibovReturnPct`, `cdiReturnPct`). Read how `periodOptions` are built in `ClubeReportPage.jsx`.

REPORT the `calculateNAVFromHistory` return shape and wait.

---

**STEP 1 — BUILD Performance tab content:**

**Period selector row:**

* Pills: "1M", "3M", "6M", "1A", "Início"
* Default: "Início" (from `minhaCotista.entryDate`)
* State: `activePeriod` (string)

**Performance summary cards (filtered to activePeriod):**

* RETORNO DO CLUBE: `totalReturnPct` for the period
* vs CDI: `(totalReturnPct - cdiReturnPct)` as alpha, with sign
* vs IBOV: `(totalReturnPct - ibovReturnPct)` as alpha, with sign
* VOLATILIDADE: `annualizedVolPct` from `calculateVolatility` if available

**Main chart:**

* `NavChart` showing clube NAV line + CDI line + IBOV line for the selected period
* Period filtering: filter `navHistory` entries to the selected period window before passing to `calculateNAVFromHistory`

> **Note:** Performance tab shows CLUBE-LEVEL performance (not individual cotista performance). The cotista's personal return vs entry date is in Minha Posição. This tab answers "how is the club doing" not "how am I doing".

---

**STEP 2 — VERIFY:**
Navigate as `club_member` → Performance tab. Test each period pill. Confirm chart updates. Confirm numbers match what the gestor sees in their VISÃO GERAL KPIs. Run `npm run build`.

---

**CONSTRAINTS:**

* Reuse `calculateNAVFromHistory` and `calculateVolatility` — do not rewrite them
* Inline styles only
* Period "Início" means from first `navHistory` entry (club inception), not from member entry date

---

---

## PROMPT C6-4 (GLO-98)
**Relatórios + Assembleias tabs + final E2E verification**
*Labels: frontend, new feature | Parent: GLO-88*

---

Build the "Relatórios" and "Assembleias" tabs inside `ClubeCotistaApp.jsx`, wire lazy fetching, and run full end-to-end verification.

**Execute in order. Do not skip steps.**

---

**STEP 0 — AUDIT FIRST, NO CHANGES YET:**
Read `src/pages/ClubeReportPage.jsx` — specifically the commentary rendering section and the document archive section. Note what data is needed (`navHistory`, commentary text, `documentos_gerados`). Read `server/routes/clubes.js` — confirm `GET /:id/assembleias` endpoint exists and its response shape (`assembleias` array with `status`, `data_realizacao`, `pauta`, `ata` fields).

REPORT the assembleia response shape and wait.

---

**STEP 1 — BUILD Relatórios tab:**
This is a read-only view of the most recent AI report. It does NOT duplicate `ClubeReportPage` — it shows a simplified summary for cotistas.

Structure:

* If no commentary has been generated: empty state "Nenhum relatório disponível. O gestor gerará o relatório antes da próxima reunião."
* If commentary exists: render the latest commentary text (plain text, formatted with paragraph breaks)
* Below the text: period label (e.g. "MARÇO 2026") and three key metrics: retorno do período, vs CDI, vs IBOV
* IMPRIMIR button (`window.print()`) in top right
* "Ver relatórios anteriores →" (placeholder — shows same content for now)

Data source: fetch `GET /api/v1/clubes/:id/documentos` filtered to `tipo='relatorio_mensal'`, most recent first. If none: show empty state.

---

**STEP 2 — BUILD Assembleias tab:**
Fetch `GET /api/v1/clubes/:id/assembleias` on tab mount (lazy fetch — only when tab is active).

Render list of assembleias ordered by `data_realizacao` DESC. Each row:

* Date formatted as `DD/MM/YYYY`
* Status badge: AGENDADA (amber) · CONVOCADA (blue) · VOTAÇÃO ABERTA (green) · REALIZADA (gray) · CANCELADA (red)
* Pauta summary (truncated to 80 chars with "...")
* If `status = REALIZADA` and `ata` is not null: "Ver ata →" link that expands inline to show ata text

Empty state if no assembleias: "Nenhuma assembleia registrada pelo gestor."

Vote functionality: render a "Votação em breve" badge on any assembleia with `status = VOTAÇÃO ABERTA`. Do not render a vote action.

---

**STEP 3 — WIRE lazy fetching:**
Both Relatórios and Assembleias tabs should only fetch data when their tab becomes active (not on initial mount). Use a fetched-once pattern: fetch on first tab activation, cache in component state, do not refetch on subsequent tab switches.

---

**STEP 4 — FINAL E2E VERIFICATION:**
Full end-to-end test as `club_member`:

1. Land on `/clube/:id` → Minha Posição renders
2. Switch to Performance → chart and period pills work
3. Switch to Relatórios → shows report or empty state
4. Switch to Assembleias → shows list or empty state
5. Switch back to Minha Posição → no refetch, instant render

Run `npm run build` — confirm no errors.

**After build passes, close in Linear: GLO-60, GLO-60c (GLO-88), GLO-66, GLO-67.**

---

**CONSTRAINTS:**

* Lazy fetch pattern — do not fetch all tabs on mount
* Inline styles only
* Import `CLUBE_COLORS` from `src/clube/styles/index.js`
* Handle all loading and error states
* No voting UI of any kind — just the "em breve" badge

---

---

# POST-BUILD CHECKLIST

After all 10 prompts are complete, verify in order:

1. **Build passes:** `npm run build` — zero errors
2. **Route permissions:** log in as `club_member`, attempt direct nav to `/clube/1/membros` → 403 or redirect
3. **Gestor flow:** log in as `club_manager` → `/clube/:id` → command screen loads with health data → REGISTRAR NAV opens modal → all 6 nav cards route correctly
4. **Cotista flow:** log in as `club_member` → `/clube/:id` → Minha Posição loads → all 4 tabs work → no gestor data visible
5. **Linear:** GLO-60, GLO-86 (PW done), GLO-87 (C5 done), GLO-88 (C6 done), GLO-54, GLO-55, GLO-56, GLO-66, GLO-67 all closed

---

*Generated 2026-04-07 from Linear issues GLO-89–GLO-98. Verbatim content confirmed against Linear source.*
