# GMT — Personas, Roles & User Journeys

> Living document. Update when product decisions change role boundaries, permissions, or onboarding flows.
> Last updated: 2026-03 — updated after PRs 1–4 shipped (commits 5e76934, 545d8dc, fc8f465)

---

## 1. Role Ladder

GMT uses a single `role` field in Supabase `user_metadata`. Roles are strictly additive — each level inherits all permissions from the level below it.

```
curious_browser  (unauthenticated)
       ↓  self-register
     user
       ↓  club_manager promotes via GESTÃO DE MEMBROS panel
  club_member
       ↓  system_admin only (Admin Panel → Users tab)
  club_manager
       ↓  system_admin only
  admin
```

### Key decisions (locked)

- **One club at a time.** GMT operates a single clube de investimento. No multi-tenancy, no scoped roles per club. Role is global on the user record.
- **One manager per club.** A single `club_manager` coordinates the clube. No co-manager concept.
- **Promotion to `club_manager` is a system admin action only.** Done via Admin Panel → Users tab → role dropdown. Prevents privilege escalation from the application layer.
- **`club_manager` promotes `user` → `club_member`** via the GESTÃO DE MEMBROS panel in ClubePage (cotistas tab). No admin panel needed for day-to-day membership.
- **Members must have a GMT account first.** No out-of-band invite. Manager shares `/register` link (displayed in the panel with one-click copy) with non-members before promoting them.

### Role constants — single source of truth

```
src/lib/roles.js        — frontend (ProtectedRoute, GMTHeader, ClubePage)
server/lib/roles.js     — backend  (auth middleware, users route)
```

Both files export `ROLE_RANK`, `hasRole()`, `ROLE_LABEL`, `MANAGER_ASSIGNABLE_ROLES`, `ADMIN_ASSIGNABLE_ROLES`. Never redeclare inline.

---

## 2. Permission Matrix

| Capability | Browser | User | Club member | Club manager | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| **Public** |||||
| Landing page + live ticker | ✓ | ✓ | ✓ | ✓ | ✓ |
| Register for an account | ✓ | — | — | — | — |
| **Terminal** |||||
| Global terminal (prices, heatmap) | — | ✓ | ✓ | ✓ | ✓ |
| Brazil terminal (B3, macro, FX) | — | ✓ | ✓ | ✓ | ✓ |
| Asset detail drawer | — | ✓ | ✓ | ✓ | ✓ |
| Watchlist + settings | — | ✓ | ✓ | ✓ | ✓ |
| **Clube — read** |||||
| View NAV + performance dashboard | — | — | ✓ | ✓ | ✓ |
| View member list + quotas | — | — | ✓ | ✓ | ✓ |
| View NAV history + AI reports | — | — | ✓ | ✓ | ✓ |
| **Clube — write** |||||
| Promote user → club_member | — | — | — | ✓ | ✓ |
| Remove member (demote → user) | — | — | — | ✓ | ✓ |
| Record NAV (cotização) | — | — | — | ✓ | ✓ |
| Generate AI report | — | — | — | ✓ | ✓ |
| Edit clube profile + settings | — | — | — | ✓ | ✓ |
| **Platform admin** |||||
| Promote user → club_manager | — | — | — | — | ✓ |
| Taxonomy CRUD (groups, assets) | — | — | — | — | ✓ |
| View + manage all users | — | — | — | — | ✓ |

---

## 3. Personas

### 3.1 Curious Browser
- **Auth state:** Unauthenticated
- **Entry point:** Social media, SEO, word of mouth
- **Core behaviour:** Lands on the landing page, watches the live ticker, sees recognisable symbols (BTC, AAPL, PETR4). Decides in seconds whether to register.
- **Conversion trigger:** Recognising tickers they already follow in the live ticker
- **Drop-off risk:** High — no watchlist, no personalisation, nothing to return for
- **Key product implication:** Landing page ticker must have broad symbol coverage and feel fast. A watchlist nudge at registration would materially improve conversion.

### 3.2 User (Platform Member)
- **Auth state:** Registered + logged in (`role = user`)
- **Profiles:** Pro investor (daily, market hours), independent analyst (intensive during coverage), finance-literate casual
- **Core behaviour:** Full terminal access — Global and Brazil modes, asset detail drawer, heatmap, watchlist
- **Aha moment:** Switching between US equities and B3 + BRL FX without changing tabs
- **Retention risk:** Missing a specific ticker, no portfolio layer, no alerts
- **Key product implication:** Watchlist and price alerts are the highest-ROI retention features for this tier.

### 3.3 Club Member
- **Auth state:** `role = club_member` — promoted by club_manager via GESTÃO DE MEMBROS panel
- **Entry point:** Manager finds them by email search → promotes. Clube tab appears in GMTHeader on next session.
- **First session:** `WelcomeBanner` shown once ("Bem-vindo ao clube..."), localStorage-dismissed, never repeats.
- **Core behaviour:** Read-only clube dashboard — NAV, performance, member list, AI reports. Uses the terminal to track club holdings independently.
- **Engagement pattern:** Checks clube tab before meetings. Reads the AI report to come prepared.
- **Retention risk:** Passive — coupled to manager activity. If manager stops recording NAV and generating reports, nothing new appears in the clube tab.
- **Key product implication:** Member retention = manager retention. These are the same problem.

### 3.4 Club Manager
- **Auth state:** `role = club_manager` — promoted by admin via Admin Panel → Users tab
- **Entry point:** Typically the existing coordinator of a clube de investimento
- **Core behaviour:**
  1. Shares `/register` link from GESTÃO DE MEMBROS panel with unregistered members
  2. Promotes registered GMT users to `club_member` via email search in the same panel
  3. Weekly ritual: REGISTRAR NAV → fills cotização modal → confirms
  4. Pre-meeting ritual: RELATÓRIO → generates AI report in Portuguese → shares
- **Aha moment:** Generating the AI report for the first time — replaces the manual Excel + WhatsApp workflow
- **Retention risk:** Growth ceiling when clube matures and needs contribution tracking, tax records, CVM compliance
- **Key product implication:** The NAV record → AI report loop is the core retention mechanism for both manager and members.

### 3.5 Admin (System Admin)
- **Auth state:** `role = admin`
- **Responsibilities:** Taxonomy CRUD, promoting users to `club_manager`, full user management
- **Tools:** Admin Panel → Taxonomy tab + Users tab (role dropdown with confirm modal)
- **Not a regular user persona** — operational role for GMT's team

---

## 4. User Journeys

### 4.1 Club Member Journey

| Phase | What happens |
|---|---|
| **Entry** | Manager finds them via email search in GESTÃO DE MEMBROS → promotes to `club_member`. |
| **First session** | Clube tab appears in GMTHeader nav. WelcomeBanner shown once on first `/clube` visit. |
| **Core habit** | Checks clube tab before meetings. Reads the AI report the manager generated. |
| **Engagement** | Uses Brazil terminal to track club's positions independently. GMT becomes a personal tool, not just a club viewer. |
| **Retention risk** | If manager goes quiet (no NAV, no reports), nothing new in clube tab. Silent disengagement. |

### 4.2 Club Manager Journey

| Phase | What happens |
|---|---|
| **Entry** | Admin promotes them to `club_manager` via Users tab. Clube tab + REGISTRAR NAV appear immediately. |
| **Setup** | Copies `/register` link from GESTÃO DE MEMBROS panel → shares via WhatsApp. Promotes registered users via email search. |
| **Weekly ritual** | REGISTRAR NAV → cotização modal → confirm. GMT auto-calculates performance vs benchmark. |
| **Monthly ritual** | RELATÓRIO → AI report generated in Portuguese → PDF exported or link shared. |
| **Growth ceiling** | Needs individual contribution history, tax records, CVM compliance. Roadmap gate for long-term retention. |

---

## 5. Onboarding Gaps & Open Questions

| Issue | Status | Notes |
|---|---|---|
| No email invite flow | Open | Manager shares `/register` link manually via copy button in GESTÃO DE MEMBROS. Acceptable at current scale. |
| No bulk member import | Open | Manager adds members one by one via email search. Acceptable at current scale. |
| Role change is silent | Open | No push notification when promoted. Member discovers on next login when Clube tab appears. |
| Watchlist persistence | Planned | WatchlistContext exists. Server-side persistence unclear. Highest-retention feature for `user` tier. |
| Own-row highlighting in cotistas | Planned | Deferred — cotistas table has no `user_id` FK. TODO at ClubePage.jsx line ~2448. Ships when FK is added. |
| CVM compliance | Roadmap | Required for mature clubes. Ships after NAV + report loop is stable. |

---

## 6. Implementation Status

| PR | Commit | What shipped |
|---|---|---|
| PR 1 + 2 | `5e76934` | `src/lib/roles.js` + `server/lib/roles.js` (role constants), `requireRole()` middleware factory, `ProtectedRoute` hierarchy check + `AccessDenied` screen, `/clube` routes gated to `club_member` with `showDenied`, Clube nav hidden for `user` role, `UserManager` role dropdown with multi-color badges + confirm modal, `patchUserRole` service |
| PR 3 | `545d8dc` | `ClubePage` `isManager`/`isMember` flags, REGISTRAR NAV gated to managers, `WelcomeBanner` for first-time members, all 19 clube write/privileged routes migrated from `requireAdmin` to `requireRole('club_manager')` |
| PR 4 | `fc8f465` | `GET /api/v1/users/search` endpoint (`requireRole('club_manager')`, max 5 results, min 3 char prefix), `GET /api/v1/users` guard lowered to `requireRole('club_manager')`, GESTÃO DE MEMBROS panel in cotistas tab (member list, email search, two-click remove, register link copy) |

---

## 7. DB Notes

Roles live in Supabase `user_metadata.role` (string field on the auth user). No DB schema migration was needed — Supabase Auth handles storage. The role hierarchy is enforced entirely in application code via `ROLE_RANK` in the role constants files.

The cotistas table (`server/migrations/001_clube_schema.sql`) has no `user_id` FK — cotistas are financial records (`nome`, `cotas_detidas`, `data_entrada`), not linked to GMT user accounts. Club membership (platform access) and cotista records (financial participation) are intentionally separate concerns. A future migration may add `user_id` to cotistas to enable own-row highlighting and contribution tracking per member.

---

## 8. Future — Club-Scoped Permissions (PR 5, not yet built)

The current model governs **platform access level** — which modules a user can enter.

When a second club is added or individual contribution tracking is required, a second layer will be needed:

```
platform_role   → where you can go       (global, in user_metadata)
club_membership → which club you're in   (join table: clube_members)
club_role       → what you can do there  (field on clube_members: 'member' | 'manager')
```

Keep this distinction in mind when designing any new clube tables so the migration is additive, not a rewrite. The `platform_role = club_manager` may eventually merge back into `club_member` once scoped authority is modelled in the membership table.

---

*Update this document when:*
- *A new role is introduced or an existing one is renamed*
- *A permission is added, removed, or moved between tiers*
- *An onboarding gap is resolved or a new one is identified*
- *A journey step changes materially based on product decisions*
- *A PR ships that affects any of the above*
