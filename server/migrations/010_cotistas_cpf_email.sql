-- Migration 010: Add cpf_cnpj and email to cotistas
-- Both fields are optional (nullable).
-- Existing records will have NULL for both fields.
-- Applied manually via Supabase SQL Editor.

ALTER TABLE cotistas
  ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS email    TEXT;

-- Partial indexes for search performance
-- Only index non-null values
CREATE INDEX IF NOT EXISTS idx_cotistas_cpf_cnpj
  ON cotistas (cpf_cnpj)
  WHERE cpf_cnpj IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cotistas_email
  ON cotistas (email)
  WHERE email IS NOT NULL;
