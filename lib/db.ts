import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { seedIfEmpty } from "./seed";

/** Na Vercel o disco do projeto é somente leitura: usamos /tmp (temporário, só para versão de teste). */
export const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "xbom-data") : path.join(process.cwd(), "data");

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS categories (
  slug   TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  sort   INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category    TEXT NOT NULL REFERENCES categories(slug) ON UPDATE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image       TEXT,
  kind        TEXT NOT NULL DEFAULT 'simple',
  tier        TEXT,
  premium     INTEGER NOT NULL DEFAULT 0,
  prices      TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1,
  sort        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, sort);

CREATE TABLE IF NOT EXISTS addons (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT NOT NULL,
  detail TEXT,
  price  REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  sort   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS zones (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  city   TEXT NOT NULL,
  name   TEXT NOT NULL,
  fee    REAL,
  active INTEGER NOT NULL DEFAULT 1,
  sort   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  code           TEXT NOT NULL UNIQUE,
  status         TEXT NOT NULL DEFAULT 'novo',
  fulfillment    TEXT NOT NULL,
  customer_name  TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  city           TEXT NOT NULL DEFAULT '',
  address        TEXT NOT NULL DEFAULT '',
  payment        TEXT NOT NULL,
  change_for     REAL,
  notes          TEXT NOT NULL DEFAULT '',
  items          TEXT NOT NULL,
  subtotal       REAL NOT NULL,
  delivery_fee   REAL NOT NULL DEFAULT 0,
  total          REAL NOT NULL,
  paid           INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
`;

const g = globalThis as unknown as { __xbomDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.__xbomDb) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const d = new DatabaseSync(path.join(DATA_DIR, "xbom.db"));
    d.exec(SCHEMA);
    seedIfEmpty(d);
    g.__xbomDb = d;
  }
  return g.__xbomDb;
}

/** Executa várias escritas de forma atômica. */
export function tx<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    d.exec("COMMIT");
    return r;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
