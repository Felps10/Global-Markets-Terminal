BEGIN;

-- ─── Price Alerts ────────────────────────────────────────────────────────────
-- User-owned price alerts. Each alert fires once when the condition is met,
-- then deactivates (active = false, triggered_at = now()).

CREATE TABLE IF NOT EXISTS price_alerts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol       text        NOT NULL,
  condition    text        NOT NULL CHECK (condition IN ('above', 'below')),
  threshold    numeric(18, 6) NOT NULL,
  active       boolean     NOT NULL DEFAULT true,
  triggered_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS price_alerts_user_id_idx ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS price_alerts_active_idx  ON price_alerts(active) WHERE active = true;

-- RLS — Pattern D (user-owned rows)
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_price_alerts" ON price_alerts;
CREATE POLICY "users_manage_own_price_alerts"
  ON price_alerts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
