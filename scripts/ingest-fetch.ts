// scripts/ingest-fetch.ts
// Orchestrates fetching from GitHub sources (BIO2, Logius).
// Skips PDF sources (dnb-gpib, nen-*, ncsc-*, digid) — these require manual extraction.
// Runs each sub-script via execFileSync and prints a summary.

import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface FetchResult {
  script: string;
  source: string;
  success: boolean;
  error?: string;
  durationMs: number;
}

const GITHUB_SOURCES: { script: string; source: string }[] = [
  { script: join(__dirname, 'ingest-bio2.ts'), source: 'BIO2 (MinBZK GitHub)' },
  { script: join(__dirname, 'ingest-logius.ts'), source: 'Logius API Design Rules (GitHub)' },
];

const SKIPPED_SOURCES: { id: string; reason: string }[] = [
  { id: 'dnb-gpib', reason: 'PDF source — manual extraction required' },
  { id: 'nen-7510', reason: 'PDF source (NEN Connect) — manual extraction required' },
  { id: 'nen-7512', reason: 'PDF source (NEN Connect) — manual extraction required' },
  { id: 'nen-7513', reason: 'PDF source (NEN Connect) — manual extraction required' },
  { id: 'ncsc-web', reason: 'PDF source — manual extraction required' },
  { id: 'ncsc-tls', reason: 'PDF source — manual extraction required' },
  { id: 'digid', reason: 'PDF source — manual extraction required' },
];

function runScript(scriptPath: string): { success: boolean; error?: string; durationMs: number } {
  const start = Date.now();
  try {
    execFileSync(
      process.execPath,
      ['--import', 'tsx', scriptPath],
      {
        stdio: 'inherit',
        timeout: 120_000,
      }
    );
    return { success: true, durationMs: Date.now() - start };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg, durationMs: Date.now() - start };
  }
}

async function main(): Promise<void> {
  console.log('Ingest Fetch — Dutch Standards MCP');
  console.log('====================================');
  console.log(`Running ${GITHUB_SOURCES.length} GitHub source fetches`);
  console.log(`Skipping ${SKIPPED_SOURCES.length} PDF/manual sources`);
  console.log('');

  const results: FetchResult[] = [];

  for (const { script, source } of GITHUB_SOURCES) {
    console.log(`--- Fetching: ${source} ---`);
    const result = runScript(script);
    results.push({ script, source, ...result });
    console.log('');
  }

  // Summary
  console.log('=============================');
  console.log('Fetch Summary');
  console.log('=============================');

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\nGitHub sources:`);
  for (const r of results) {
    const status = r.success ? 'OK' : 'FAILED';
    const duration = (r.durationMs / 1000).toFixed(1);
    console.log(`  [${status}] ${r.source} (${duration}s)`);
    if (!r.success && r.error) {
      console.log(`         ${r.error.split('\n')[0]}`);
    }
  }

  console.log(`\nSkipped (PDF/manual):`);
  for (const s of SKIPPED_SOURCES) {
    console.log(`  [SKIP] ${s.id} — ${s.reason}`);
  }

  console.log('');
  console.log(`Result: ${succeeded.length}/${GITHUB_SOURCES.length} GitHub sources fetched successfully`);

  if (failed.length > 0) {
    console.error(`\n${failed.length} source(s) failed. Check output above.`);
    process.exit(1);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
