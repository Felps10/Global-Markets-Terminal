import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const DB_PATH = join(__dirname, 'data', 'taxonomy.db');

let _db = null;

export function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  return _db;
}

export function initSchema() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      email       TEXT    UNIQUE NOT NULL,
      password    TEXT    NOT NULL,
      role        TEXT    NOT NULL CHECK(role IN ('admin','viewer')),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS groups (
      id           TEXT PRIMARY KEY,
      display_name TEXT    NOT NULL,
      description  TEXT,
      slug         TEXT    UNIQUE NOT NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subgroups (
      id           TEXT PRIMARY KEY,
      display_name TEXT    NOT NULL,
      description  TEXT,
      slug         TEXT    UNIQUE NOT NULL,
      group_id     TEXT    NOT NULL REFERENCES groups(id),
      icon         TEXT,
      color        TEXT,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assets (
      id           TEXT PRIMARY KEY,
      symbol       TEXT    NOT NULL,
      name         TEXT    NOT NULL,
      subgroup_id  TEXT    NOT NULL REFERENCES subgroups(id),
      group_id     TEXT    NOT NULL REFERENCES groups(id),
      type         TEXT    NOT NULL,
      currency     TEXT,
      exchange     TEXT,
      active       INTEGER DEFAULT 1,
      meta         TEXT,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_subgroups_group_id  ON subgroups(group_id);
    CREATE INDEX IF NOT EXISTS idx_assets_subgroup_id  ON assets(subgroup_id);
    CREATE INDEX IF NOT EXISTS idx_assets_group_id     ON assets(group_id);
  `);
}
