// scripts/ingest-diff.ts
// Computes SHA-256 hashes of data/extracted/*.json files.
// Compares with data/.source-hashes.json (previous run).
// Writes:
//   data/.source-hashes.json  — updated hash map
//   data/.ingest-changed      — "true" or "false"
//   data/.ingest-summary      — human-readable change summary

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const EXTRACTED_DIR = join(DATA_DIR, 'extracted');
const HASHES_FILE = join(DATA_DIR, '.source-hashes.json');
const CHANGED_FILE = join(DATA_DIR, '.ingest-changed');
const SUMMARY_FILE = join(DATA_DIR, '.ingest-summary');

type HashMap = Record<string, string>;

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

function loadPreviousHashes(): HashMap {
  if (!existsSync(HASHES_FILE)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(HASHES_FILE, 'utf-8')) as HashMap;
  } catch {
    return {};
  }
}

async function main(): Promise<void> {
  console.log('Ingest Diff — Dutch Standards MCP');
  console.log('===================================');

  mkdirSync(DATA_DIR, { recursive: true });

  if (!existsSync(EXTRACTED_DIR)) {
    console.warn(`WARNING: Extracted directory not found at ${EXTRACTED_DIR}`);
    writeFileSync(CHANGED_FILE, 'false', 'utf-8');
    writeFileSync(SUMMARY_FILE, 'No extracted files found.\n', 'utf-8');
    console.log('No extracted files — marking as unchanged.');
    return;
  }

  const jsonFiles = readdirSync(EXTRACTED_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (jsonFiles.length === 0) {
    console.warn('WARNING: No JSON files found in data/extracted/');
    writeFileSync(CHANGED_FILE, 'false', 'utf-8');
    writeFileSync(SUMMARY_FILE, 'No extracted files found.\n', 'utf-8');
    return;
  }

  const previousHashes = loadPreviousHashes();
  const currentHashes: HashMap = {};

  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];

  // Hash each current file
  for (const fname of jsonFiles) {
    const filePath = join(EXTRACTED_DIR, fname);
    const content = readFileSync(filePath, 'utf-8');
    const hash = sha256(content);
    currentHashes[fname] = hash;

    if (!(fname in previousHashes)) {
      added.push(fname);
    } else if (previousHashes[fname] !== hash) {
      changed.push(fname);
    } else {
      unchanged.push(fname);
    }
  }

  // Detect removed files (in previous but not current)
  for (const fname of Object.keys(previousHashes)) {
    if (!(fname in currentHashes)) {
      removed.push(fname);
    }
  }

  const hasChanges = added.length > 0 || changed.length > 0 || removed.length > 0;

  // Write updated hashes
  writeFileSync(HASHES_FILE, JSON.stringify(currentHashes, null, 2), 'utf-8');
  console.log(`Updated ${HASHES_FILE}`);

  // Write changed flag
  writeFileSync(CHANGED_FILE, hasChanges ? 'true' : 'false', 'utf-8');

  // Build summary
  const lines: string[] = [];
  lines.push(`Ingest diff computed at ${new Date().toISOString()}`);
  lines.push(`Files scanned: ${jsonFiles.length}`);
  lines.push('');

  if (!hasChanges) {
    lines.push('No changes detected — all sources match previous hashes.');
  } else {
    lines.push('Changes detected:');
    if (added.length > 0) {
      lines.push(`  Added (${added.length}): ${added.join(', ')}`);
    }
    if (changed.length > 0) {
      lines.push(`  Changed (${changed.length}): ${changed.join(', ')}`);
    }
    if (removed.length > 0) {
      lines.push(`  Removed (${removed.length}): ${removed.join(', ')}`);
    }
  }

  lines.push('');
  lines.push(`Unchanged (${unchanged.length}): ${unchanged.length > 0 ? unchanged.join(', ') : 'none'}`);

  const summary = lines.join('\n');
  writeFileSync(SUMMARY_FILE, summary, 'utf-8');

  // Print to console
  console.log('');
  console.log(summary);
  console.log('');
  console.log(`Changed: ${hasChanges}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
