# Cycle 5 Pre-Work — Fix `requiredRole={null}` Security Bug in App.jsx

## Step 0 — Read-only audit (do this before any edits)

Read `src/App.jsx` and locate every `<ProtectedRoute>` wrapping a `/clube/:id/*` child route. List the exact `requiredRole` prop value for each of these routes:

- `/clube/:id/membros`
- `/clube/:id/governanca`
- `/clube/:id/governanca/:aid`
- `/clube/:id/reenquadramento`
- `/clube/:id/tributacao`

Also read `src/lib/roles.js` to confirm the `ROLE_RANK` map and verify that `club_member` rank is `1`.

Report findings before making any changes.

---

## Context

Per `GMT_PERSONAS_AND_ROLES.md` (the permission matrix), all Clube member content requires `club_member` or higher (`rank >= 1`). The routes listed above currently use `requiredRole={null}`, which allows any authenticated `user` (rank 0) to access club member pages. This is a confirmed bug, not an intentional design choice.

The fix is a one-line change per affected route.

---

## Step 1 — Apply the fix

In `src/App.jsx`, change `requiredRole={null}` to `requiredRole="club_member"` on every `<ProtectedRoute>` wrapping the following paths:

- `/clube/:id/membros`
- `/clube/:id/governanca`
- `/clube/:id/governanca/:aid`
- `/clube/:id/reenquadramento`
- `/clube/:id/tributacao`

Do NOT change the `requiredRole` on `/clube/:id` (the main ClubePage) — leave that one as-is if it already uses `requiredRole={null}` and that was intentional (any auth'd user can see a clube's public landing). Only change the sub-pages listed above.

---

## Step 2 — Verification

After the edit, grep `src/App.jsx` for `requiredRole={null}` and confirm none of the five routes above appear in the results. Print the final JSX block for each affected route to confirm the correct value is set.

---

## Standing Rules

- Inline styles only — no className additions, no CSS changes needed for this fix.
- Hooks before early returns (not applicable here — this is routing config, not a component).
- Do not commit to main. Open a PR named `fix/clube-route-permissions`.

---

## Verification Checklist

- [ ] All 5 listed routes use `requiredRole="club_member"`
- [ ] `/clube/:id` (main page) is unchanged
- [ ] `grep 'requiredRole={null}' src/App.jsx` returns no results for the affected paths
- [ ] No other files were modified
