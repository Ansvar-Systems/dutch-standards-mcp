// src/db.ts
import { createRequire } from 'node:module';
import { existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DbMetadata } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'standards.db');

let db: any = null;

export function getDb() {
  if (db) return db;
  const require = createRequire(import.meta.url);
  const { Database } = require('@ansvar/mcp-sqlite');
  db = new Database(DB_PATH, { readonly: true });
  return db;
}

export function getMetadata(): DbMetadata {
  const rows = getDb().prepare('SELECT key, value FROM db_metadata').all() as Array<{ key: string; value: string }>;
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    schema_version: map.schema_version ?? '1.0',
    category: map.category ?? 'domain_intelligence',
    mcp_name: map.mcp_name ?? 'Dutch Standards MCP',
    database_built: map.database_built ?? 'unknown',
    database_version: map.database_version ?? '0.1.0',
  };
}

export function getFrameworkCount(): number {
  const row = getDb().prepare('SELECT COUNT(*) as count FROM frameworks').get() as { count: number };
  return row.count;
}

export function getControlCount(): number {
  const row = getDb().prepare('SELECT COUNT(*) as count FROM controls').get() as { count: number };
  return row.count;
}

export function getDbSizeMb(): number {
  if (!existsSync(DB_PATH)) return 0;
  const stats = statSync(DB_PATH);
  return Math.round((stats.size / 1024 / 1024) * 10) / 10;
}
