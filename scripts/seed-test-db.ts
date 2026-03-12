// scripts/seed-test-db.ts
// Builds a minimal test database at data/standards.db for development and testing.
// Uses @ansvar/mcp-sqlite (WASM-based, CommonJS loaded via createRequire).

import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'standards.db');

// Ensure the data directory exists
mkdirSync(join(__dirname, '..', 'data'), { recursive: true });

const require = createRequire(import.meta.url);
const { Database } = require('@ansvar/mcp-sqlite');
const db = new Database(DB_PATH);

db.exec(`
CREATE TABLE IF NOT EXISTS frameworks (
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

CREATE TABLE IF NOT EXISTS controls (
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

CREATE VIRTUAL TABLE IF NOT EXISTS controls_fts USING fts5(
  id,
  title,
  title_nl,
  description,
  description_nl,
  category,
  content='controls',
  content_rowid='rowid'
);

CREATE TABLE IF NOT EXISTS db_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

const insertFramework = db.prepare(
  'INSERT OR REPLACE INTO frameworks (id, name, name_nl, issuing_body, version, effective_date, scope, scope_sectors, structure_description, source_url, license, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

insertFramework.run('bio2', 'Baseline Information Security Government', 'Baseline Informatiebeveiliging Overheid', 'Nationaal Cyber Security Centrum (NCSC)', '2.0', '2022-01-01', 'Dutch government information security baseline', '["government"]', 'Aligned with ISO 27002:2022, organized by BBN levels (BBN1/BBN2/BBN3)', 'https://bio-overheid.nl', 'CC BY 4.0', 'nl+en');

insertFramework.run('nen-7510', 'NEN 7510 Information security in health technology', 'NEN 7510 Informatiebeveiliging in de gezondheidszorg', 'NEN (Nederlands Normalisatie-instituut)', '2017', '2017-10-01', 'Information security for healthcare organizations in the Netherlands', '["healthcare"]', 'Based on ISO 27001/27002, healthcare-specific controls', 'https://www.nen.nl/nen-7510-2017-nl-236664', 'Commercial', 'nl');

insertFramework.run('dnb-gpib-2023', 'DNB Good Practice Information Security Banks', 'DNB Good Practice Informatiebeveiliging Banken', 'De Nederlandsche Bank (DNB)', '2023', '2023-03-01', 'Information security good practices for banks supervised by DNB', '["finance"]', 'Risk-based approach aligned with EBA guidelines and ISO 27001', 'https://www.dnb.nl/toezicht-betalingsverkeer/goed-bestuur/informatiebeveiliging/', null, 'nl+en');

const insertControl = db.prepare(
  'INSERT OR REPLACE INTO controls (id, framework_id, control_number, title, title_nl, description, description_nl, category, subcategory, level, iso_mapping, implementation_guidance, verification_guidance, source_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

insertControl.run('bio2:5.1', 'bio2', '5.1', 'Information security policies', 'Beleid voor informatiebeveiliging', 'Policies for information security and topic-specific policies shall be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties.', 'Beleid voor informatiebeveiliging en onderwerpspecifiek beleid moet worden gedefinieerd, goedgekeurd door de directie, gepubliceerd, gecommuniceerd aan en erkend door relevant personeel en relevante geïnteresseerde partijen.', 'Organizational controls', 'Policies for information security', 'BBN1', '5.1', 'Establish a clear, approved information security policy that is communicated to all staff.', 'Verify policy document exists, is signed by management, and staff have acknowledged it.', 'https://bio-overheid.nl/5.1');

insertControl.run('bio2:8.16', 'bio2', '8.16', 'Monitoring activities', 'Monitoring van activiteiten', 'Networks, systems and applications shall be monitored for anomalous behaviour and appropriate actions taken to evaluate potential information security incidents.', 'Netwerken, systemen en applicaties moeten worden bewaakt op afwijkend gedrag en passende maatregelen worden genomen om potentiële informatiebeveiligingsincidenten te evalueren.', 'Technological controls', 'Monitoring', 'BBN2', '8.16', 'Implement SIEM or log aggregation with alerting on anomalous patterns.', 'Review monitoring coverage, alert rules, and response procedures.', 'https://bio-overheid.nl/8.16');

insertControl.run('nen-7510:A.12.4.1', 'nen-7510', 'A.12.4.1', null, 'Gebeurtenissen registreren', null, 'Logbestanden van gebeurtenissen die gebruikersactiviteiten, uitzonderingen en informatiebeveiligingsgebeurtenissen registreren, moeten worden gemaakt, bewaard en regelmatig worden beoordeeld.', 'Operations security', 'Logging and monitoring', null, '8.16', null, null, null);

insertControl.run('dnb-gpib-2023:GPIB-01', 'dnb-gpib-2023', 'GPIB-01', 'IT governance', 'IT-governance', 'The bank shall establish a clear IT governance structure with defined roles and responsibilities for information security, aligned with the overall corporate governance framework.', 'De bank moet een duidelijke IT-governancestructuur opzetten met gedefinieerde rollen en verantwoordelijkheden voor informatiebeveiliging, afgestemd op het algemene corporate-governancekader.', 'Governance', 'IT governance structure', null, '5.1', 'Define and document IT governance roles. Ensure board-level accountability for information security.', 'Review governance documentation, board minutes referencing IT security, and role assignment records.', null);

db.exec("INSERT INTO controls_fts(controls_fts) VALUES('rebuild')");

const insertMeta = db.prepare('INSERT OR REPLACE INTO db_metadata (key, value) VALUES (?, ?)');
insertMeta.run('schema_version', '1.0');
insertMeta.run('category', 'domain_intelligence');
insertMeta.run('mcp_name', 'Dutch Standards MCP');
insertMeta.run('database_built', new Date().toISOString().split('T')[0]);
insertMeta.run('database_version', '0.1.0');

db.pragma('journal_mode=DELETE');
db.exec('VACUUM');
db.close();

console.log('Test database seeded at data/standards.db');
