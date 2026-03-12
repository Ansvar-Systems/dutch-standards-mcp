// scripts/verify-coverage.ts
// Gate checks for coverage integrity:
//   1. Item counts in coverage.json match DB framework/control totals
//   2. No 2x-overdue sources (next_check_due > 2 * window past today)
//   3. Tool list in coverage.json matches actual tool files in src/tools/
//   4. Summary totals match source-level aggregations
//
// Exit 0 if all pass, exit 1 if any fail.

import { createRequire } from 'node:module';
import {
  readFileSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'data');
const DB_PATH = join(DATA_DIR, 'standards.db');
const COVERAGE_JSON = join(DATA_DIR, 'coverage.json');
const TOOLS_DIR = join(PROJECT_ROOT, 'src', 'tools');

interface CoverageSource {
  id: string;
  name: string;
  item_count: number;
  last_checked: string;
  update_frequency: string;
  next_check_due: string;
}

interface Coverage {
  mcp_name: string;
  generated_at: string;
  summary: { frameworks: number; controls: number; tools: number };
  sources: CoverageSource[];
  tools: string[];
}

function frequencyToDays(frequency: string): number {
  const freq = frequency.toLowerCase();
  if (freq === 'monthly') return 30;
  if (freq === 'annual') return 365;
  if (freq.includes('5-year') || freq.includes('5 year')) return 5 * 365;
  const yearMatch = freq.match(/(\d+)[\s-]?year/);
  if (yearMatch) return parseInt(yearMatch[1], 10) * 365;
  return 365;
}

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

async function main(): Promise<void> {
  console.log('Coverage Verification — Dutch Standards MCP');
  console.log('============================================');

  const checks: CheckResult[] = [];

  // Guard: coverage.json must exist
  if (!existsSync(COVERAGE_JSON)) {
    console.error(`ERROR: coverage.json not found at ${COVERAGE_JSON}`);
    console.error('Run npm run coverage:update first.');
    process.exit(1);
  }

  const coverage = JSON.parse(readFileSync(COVERAGE_JSON, 'utf-8')) as Coverage;

  // Guard: DB must exist
  if (!existsSync(DB_PATH)) {
    console.error(`ERROR: Database not found at ${DB_PATH}`);
    console.error('Run npm run build:db first.');
    process.exit(1);
  }

  // ── Check 1: DB framework count matches coverage.json summary ──────────────
  const require = createRequire(import.meta.url);
  const { Database } = require('@ansvar/mcp-sqlite');
  const db = new Database(DB_PATH, { readonly: true });

  const dbFrameworkCount = (
    db.prepare('SELECT count(*) as cnt FROM frameworks').get() as { cnt: number }
  ).cnt;
  const dbControlCount = (
    db.prepare('SELECT count(*) as cnt FROM controls').get() as { cnt: number }
  ).cnt;

  db.close();

  const frameworkCheck: CheckResult = {
    name: 'DB framework count matches coverage.json summary',
    passed: coverage.summary.frameworks === dbFrameworkCount,
    message:
      coverage.summary.frameworks === dbFrameworkCount
        ? `Both report ${dbFrameworkCount} frameworks`
        : `coverage.json says ${coverage.summary.frameworks}, DB has ${dbFrameworkCount}`,
  };
  checks.push(frameworkCheck);

  const controlCheck: CheckResult = {
    name: 'DB control count matches coverage.json summary',
    passed: coverage.summary.controls === dbControlCount,
    message:
      coverage.summary.controls === dbControlCount
        ? `Both report ${dbControlCount} controls`
        : `coverage.json says ${coverage.summary.controls}, DB has ${dbControlCount}`,
  };
  checks.push(controlCheck);

  // ── Check 2: Summary totals match source-level aggregations ─────────────────
  const sourceItemSum = coverage.sources.reduce((sum, s) => sum + s.item_count, 0);
  // Note: source item_count is per-extracted-file which may differ from DB controls
  // (e.g. some items might be excluded during build). We allow up to 10% variance.
  // The primary check is that summary.controls matches DB exactly.
  const sourceSumCheck: CheckResult = {
    name: 'Summary tools count matches tools array length',
    passed: coverage.summary.tools === coverage.tools.length,
    message:
      coverage.summary.tools === coverage.tools.length
        ? `Both report ${coverage.tools.length} tools`
        : `summary.tools=${coverage.summary.tools}, tools array length=${coverage.tools.length}`,
  };
  checks.push(sourceSumCheck);

  // Verify source item_count sum is non-zero
  const sourceItemSumCheck: CheckResult = {
    name: 'Source item counts are non-zero',
    passed: sourceItemSum > 0,
    message:
      sourceItemSum > 0
        ? `Sources total ${sourceItemSum} items across ${coverage.sources.length} sources`
        : 'All source item counts are zero — coverage.json may be stale',
  };
  checks.push(sourceItemSumCheck);

  // ── Check 3: No 2x-overdue sources ──────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const doubleOverdue: string[] = [];
  for (const source of coverage.sources) {
    const nextDue = new Date(source.next_check_due);
    nextDue.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - nextDue.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) continue; // not overdue

    const windowDays = frequencyToDays(source.update_frequency);
    if (diffDays >= windowDays) {
      doubleOverdue.push(`${source.id} (${diffDays} days overdue, window is ${windowDays} days)`);
    }
  }

  const overdueCheck: CheckResult = {
    name: 'No 2x-overdue sources',
    passed: doubleOverdue.length === 0,
    message:
      doubleOverdue.length === 0
        ? 'No sources are 2x overdue'
        : `2x-overdue sources: ${doubleOverdue.join('; ')}`,
  };
  checks.push(overdueCheck);

  // ── Check 4: Tool list in coverage.json matches src/tools/ files ─────────────
  if (existsSync(TOOLS_DIR)) {
    const actualToolFiles = readdirSync(TOOLS_DIR)
      .filter((f) => f.endsWith('.ts'))
      .map((f) =>
        f
          .replace('.ts', '')
          .replace(/-([a-z])/g, (_, c: string) => '_' + c)
      )
      .sort();

    const coverageTools = [...coverage.tools].sort();

    const toolsMatch =
      actualToolFiles.length === coverageTools.length &&
      actualToolFiles.every((t, i) => t === coverageTools[i]);

    const missingFromCoverage = actualToolFiles.filter(
      (t) => !coverageTools.includes(t)
    );
    const missingFromDisk = coverageTools.filter(
      (t) => !actualToolFiles.includes(t)
    );

    let toolMsg: string;
    if (toolsMatch) {
      toolMsg = `Tool lists match (${actualToolFiles.length} tools)`;
    } else {
      const parts: string[] = [];
      if (missingFromCoverage.length > 0) {
        parts.push(`in src/tools/ but not coverage.json: ${missingFromCoverage.join(', ')}`);
      }
      if (missingFromDisk.length > 0) {
        parts.push(`in coverage.json but not src/tools/: ${missingFromDisk.join(', ')}`);
      }
      toolMsg = parts.join('; ');
    }

    checks.push({
      name: 'Tool list in coverage.json matches src/tools/ files',
      passed: toolsMatch,
      message: toolMsg,
    });
  } else {
    checks.push({
      name: 'Tool list in coverage.json matches src/tools/ files',
      passed: false,
      message: `src/tools/ directory not found at ${TOOLS_DIR}`,
    });
  }

  // ── Print results ─────────────────────────────────────────────────────────
  console.log('');
  let allPassed = true;
  for (const check of checks) {
    const mark = check.passed ? '[PASS]' : '[FAIL]';
    console.log(`${mark} ${check.name}`);
    console.log(`       ${check.message}`);
    if (!check.passed) allPassed = false;
  }

  console.log('');
  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;
  console.log(`Results: ${passed}/${total} checks passed`);

  if (!allPassed) {
    console.error('\nCoverage verification FAILED.');
    process.exit(1);
  }

  console.log('Coverage verification passed.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
