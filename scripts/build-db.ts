// scripts/build-db.ts
// Builds the production database at data/standards.db from data/extracted/*.json files.
// Deletes any existing database and recreates from scratch.
// Uses @ansvar/mcp-sqlite (WASM-based, CommonJS loaded via createRequire).

import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, readFileSync, existsSync, unlinkSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const EXTRACTED_DIR = join(DATA_DIR, 'extracted');
const DB_PATH = join(DATA_DIR, 'standards.db');

// Ensure data directory exists
mkdirSync(DATA_DIR, { recursive: true });

// Delete existing database
if (existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
  console.log('Deleted existing database.');
}

const require = createRequire(import.meta.url);
const { Database } = require('@ansvar/mcp-sqlite');
const db = new Database(DB_PATH);

// Create full schema
db.exec(`
CREATE TABLE frameworks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_nl TEXT,
  issuing_body TEXT NOT NULL,
  version TEXT NOT NULL,
  effective_date TEXT,
  scope TEXT,
  scope_sectors TEXT,
  structure_description TEXT,
  source_url TEXT,
  license TEXT,
  language TEXT NOT NULL DEFAULT 'nl'
);

CREATE TABLE controls (
  id TEXT PRIMARY KEY,
  framework_id TEXT NOT NULL REFERENCES frameworks(id),
  control_number TEXT NOT NULL,
  title TEXT,
  title_nl TEXT NOT NULL,
  description TEXT,
  description_nl TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  level TEXT,
  iso_mapping TEXT,
  implementation_guidance TEXT,
  verification_guidance TEXT,
  source_url TEXT
);

CREATE VIRTUAL TABLE controls_fts USING fts5(
  id,
  title,
  title_nl,
  description,
  description_nl,
  category,
  content='controls',
  content_rowid='rowid'
);

CREATE TABLE db_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

const insertFramework = db.prepare(
  `INSERT INTO frameworks
    (id, name, name_nl, issuing_body, version, effective_date, scope, scope_sectors,
     structure_description, source_url, license, language)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const insertControl = db.prepare(
  `INSERT INTO controls
    (id, framework_id, control_number, title, title_nl, description, description_nl,
     category, subcategory, level, iso_mapping, implementation_guidance,
     verification_guidance, source_url)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

// Read all JSON files from data/extracted/
const jsonFiles = readdirSync(EXTRACTED_DIR)
  .filter((f: string) => f.endsWith('.json'))
  .sort();

let frameworkCount = 0;
let controlCount = 0;

for (const fname of jsonFiles) {
  const filePath = join(EXTRACTED_DIR, fname);
  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as {
    framework: {
      id: string;
      name: string;
      name_nl?: string;
      issuing_body: string;
      version: string;
      effective_date?: string;
      scope?: string;
      scope_sectors?: string[];
      structure_description?: string;
      source_url?: string;
      license?: string;
      language: string;
    };
    controls: Array<{
      control_number: string;
      title?: string | null;
      title_nl: string;
      description?: string | null;
      description_nl: string;
      category?: string | null;
      subcategory?: string | null;
      level?: string | null;
      iso_mapping?: string | null;
      implementation_guidance?: string | null;
      verification_guidance?: string | null;
      source_url?: string | null;
    }>;
  };

  const fw = data.framework;

  // scope_sectors is an array in JSON -- store as JSON string
  const scopeSectorsStr = fw.scope_sectors != null
    ? JSON.stringify(fw.scope_sectors)
    : null;

  insertFramework.run(
    fw.id,
    fw.name,
    fw.name_nl ?? null,
    fw.issuing_body,
    fw.version,
    fw.effective_date ?? null,
    fw.scope ?? null,
    scopeSectorsStr,
    fw.structure_description ?? null,
    fw.source_url ?? null,
    fw.license ?? null,
    fw.language
  );
  frameworkCount++;

  for (const ctrl of data.controls) {
    const controlId = `${fw.id}:${ctrl.control_number}`;
    insertControl.run(
      controlId,
      fw.id,
      ctrl.control_number,
      ctrl.title ?? null,
      ctrl.title_nl ?? ctrl.title ?? ctrl.control_number,
      ctrl.description ?? null,
      ctrl.description_nl ?? ctrl.description ?? "",
      ctrl.category ?? null,
      ctrl.subcategory ?? null,
      ctrl.level ?? null,
      ctrl.iso_mapping ?? null,
      ctrl.implementation_guidance ?? null,
      ctrl.verification_guidance ?? null,
      ctrl.source_url ?? null
    );
    controlCount++;
  }

  console.log(`  ${fname}: framework=${fw.id}, controls=${data.controls.length}`);
}

// Rebuild FTS5 index
db.exec("INSERT INTO controls_fts(controls_fts) VALUES('rebuild')");
console.log('FTS5 index rebuilt.');

// Insert metadata
const insertMeta = db.prepare('INSERT INTO db_metadata (key, value) VALUES (?, ?)');
insertMeta.run('schema_version', '1.0');
insertMeta.run('category', 'domain_intelligence');
insertMeta.run('mcp_name', 'Dutch Standards MCP');
insertMeta.run('database_built', new Date().toISOString().split('T')[0]);
insertMeta.run('database_version', '0.1.0');

// Set journal mode to DELETE and VACUUM
db.pragma('journal_mode=DELETE');
db.exec('VACUUM');
db.close();

// Print summary
const fileSizeBytes = statSync(DB_PATH).size;
const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);

console.log('');
console.log('Database built successfully:');
console.log(`  Path:       ${DB_PATH}`);
console.log(`  Frameworks: ${frameworkCount}`);
console.log(`  Controls:   ${controlCount}`);
console.log(`  Size:       ${fileSizeMB} MB`);
