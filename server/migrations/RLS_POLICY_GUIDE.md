# RLS Policy Guide — GMT Global Markets Terminal

## Standing Rule

> **Every table in the `public` schema MUST have Row Level Security enabled.**
> The service_role key (used by Express) bypasses RLS by design — enabling RLS
> never breaks server-side code. Leaving RLS disabled exposes the table to
> direct PostgREST access via the public anon key.
>
> When creating a new table — whether in a migration file or the Supabase
> dashboard — add `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;` and an
> appropriate policy in the same transaction. Use the decision checklist below
> to pick the right pattern.

---

## The Four Patterns

### Pattern A — Service-role only (deny all via PostgREST)

**When to use:** The table is accessed exclusively by Express routes (which use
the service_role key). No browser client needs direct PostgREST access.

```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
-- No policy created. Anon and authenticated PostgREST calls return empty sets.
```

**Tables using this pattern:**
`groups`, `subgroups`, `assets`, `l1_nodes`,
`clubes`, `cotistas`, `posicoes`, `nav_historico`,
`movimentacoes`, `ledger_entries`, `cotas_tranches`, `cotistas_historico`,
`estatuto_versoes`,
`clube_roles`, `documentos_gerados`, `audit_log`, `eventos_corporativos`


### Pattern B — Authenticated read (via PostgREST)

**When to use:** Authenticated browser clients need to read this table directly
via PostgREST (not through Express). No direct writes.

```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_<table_name>" ON <table_name>;
CREATE POLICY "authenticated_read_<table_name>"
  ON <table_name>
  FOR SELECT
  TO authenticated
  USING (true);
```

**Tables using this pattern:** *(none currently)*


### Pattern C — Public read-only

**When to use:** Unauthenticated visitors need to read this table. The data is
non-sensitive (e.g., delayed market prices). No direct writes via PostgREST.

```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_<table_name>" ON <table_name>;
CREATE POLICY "public_read_<table_name>"
  ON <table_name>
  FOR SELECT
  USING (true);
```

**Tables using this pattern:** `market_snapshot`


### Pattern D — User-scoped (auth.uid() rows)

**When to use:** Each user owns their own rows, identified by a `user_id`
column referencing `auth.users(id)`. Users may read and write their own rows
via PostgREST.

```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_<table_name>" ON <table_name>;
CREATE POLICY "users_manage_own_<table_name>"
  ON <table_name>
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Tables using this pattern:** `user_watchlists`, `user_preferences`
*(defined in 002_user_data.sql — not modified by 006_rls_hardening.sql)*

---

## Decision Checklist

When adding a new table, answer these questions in order:

1. **Does a browser client need direct PostgREST access to this table?**
   - No → **Pattern A** (most common for this project)
   - Yes → continue

2. **Does unauthenticated (anon) access need to read it?**
   - Yes → **Pattern C** (public read-only)
   - No → continue

3. **Does each user own their own rows (`user_id` column)?**
   - Yes → **Pattern D** (user-scoped)
   - No → **Pattern B** (authenticated read)

4. **Does anyone other than service_role need write access?**
   - If yes to Pattern B/C, add a separate write policy.
   - If yes to Pattern D, the `WITH CHECK` clause already covers writes.

---

## Dashboard Table Warning

Any table created in the Supabase dashboard (not via a migration file) MUST
have a corresponding retroactive migration file created in the same working
session, before the next commit. See `006b_retroactive_schema_dashboard_tables.sql`
for the template.

This prevents schema drift where production has tables the repo cannot
reconstruct. Use `CREATE TABLE IF NOT EXISTS` so the file is safe to run on
both fresh and existing databases.

---

## Reference

- **006_rls_hardening.sql** — The migration that enables RLS on all 19 tables
- **006b_retroactive_schema_dashboard_tables.sql** — Schema record for 10 dashboard-created tables
- **002_user_data.sql** — RLS for user_watchlists and user_preferences (Pattern D)
- **001_clube_schema.sql** — Contains superseded DISABLE ROW LEVEL SECURITY statements
