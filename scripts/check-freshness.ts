// scripts/check-freshness.ts
// Reads data/coverage.json, checks per-source staleness.
// Staleness categories:
//   Current       — more than 20% of the window remains
//   Due in N days — within the last 20% of the window (approaching deadline)
//   OVERDUE (N days) — past the deadline
//
// Writes:
//   data/.freshness-stale   — "true" or "false"
//   data/.freshness-report  — human-readable report
//
// Exits with code 1 if any source is OVERDUE.

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const COVERAGE_JSON = join(DATA_DIR, 'coverage.json');
const STALE_FILE = join(DATA_DIR, '.freshness-stale');
const REPORT_FILE = join(DATA_DIR, '.freshness-report');

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

type FreshnessStatus =
  | { kind: 'current'; daysRemaining: number }
  | { kind: 'due_soon'; daysRemaining: number }
  | { kind: 'overdue'; daysOverdue: number };

/**
 * Parse update_frequency to total window in days.
 */
function frequencyToDays(frequency: string): number {
  const freq = frequency.toLowerCase();
  if (freq === 'monthly') return 30;
  if (freq === 'annual') return 365;
  if (freq.includes('5-year') || freq.includes('5 year')) return 5 * 365;
  const yearMatch = freq.match(/(\d+)[\s-]?year/);
  if (yearMatch) return parseInt(yearMatch[1], 10) * 365;
  return 365; // default: annual
}

function computeFreshness(source: CoverageSource): FreshnessStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextDue = new Date(source.next_check_due);
  nextDue.setHours(0, 0, 0, 0);

  const diffMs = nextDue.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { kind: 'overdue', daysOverdue: Math.abs(diffDays) };
  }

  const windowDays = frequencyToDays(source.update_frequency);
  const warningThreshold = Math.ceil(windowDays * 0.2);

  if (diffDays <= warningThreshold) {
    return { kind: 'due_soon', daysRemaining: diffDays };
  }

  return { kind: 'current', daysRemaining: diffDays };
}

function formatStatus(status: FreshnessStatus): string {
  switch (status.kind) {
    case 'current':
      return `Current (${status.daysRemaining} days remaining)`;
    case 'due_soon':
      return `Due in ${status.daysRemaining} day${status.daysRemaining === 1 ? '' : 's'}`;
    case 'overdue':
      return `OVERDUE (${status.daysOverdue} day${status.daysOverdue === 1 ? '' : 's'})`;
  }
}

async function main(): Promise<void> {
  console.log('Freshness Check — Dutch Standards MCP');
  console.log('=======================================');

  mkdirSync(DATA_DIR, { recursive: true });

  if (!existsSync(COVERAGE_JSON)) {
    console.error(`ERROR: coverage.json not found at ${COVERAGE_JSON}`);
    console.error('Run npm run coverage:update first.');
    process.exit(1);
  }

  const coverage = JSON.parse(readFileSync(COVERAGE_JSON, 'utf-8')) as Coverage;
  const today = new Date().toISOString().split('T')[0];

  const lines: string[] = [];
  lines.push(`Freshness report for ${coverage.mcp_name}`);
  lines.push(`Generated: ${today}`);
  lines.push(`Coverage generated at: ${coverage.generated_at}`);
  lines.push('');

  let anyOverdue = false;
  let anyDueSoon = false;

  const statusRows: Array<{
    id: string;
    name: string;
    lastChecked: string;
    nextDue: string;
    frequency: string;
    status: FreshnessStatus;
    statusText: string;
  }> = [];

  for (const source of coverage.sources) {
    const status = computeFreshness(source);
    if (status.kind === 'overdue') anyOverdue = true;
    if (status.kind === 'due_soon') anyDueSoon = true;

    statusRows.push({
      id: source.id,
      name: source.name,
      lastChecked: source.last_checked,
      nextDue: source.next_check_due,
      frequency: source.update_frequency,
      status,
      statusText: formatStatus(status),
    });
  }

  // Print table
  lines.push('Source Freshness:');
  lines.push('');
  for (const row of statusRows) {
    const indicator =
      row.status.kind === 'overdue'
        ? '[OVERDUE]'
        : row.status.kind === 'due_soon'
        ? '[DUE SOON]'
        : '[OK]';
    lines.push(`  ${indicator.padEnd(12)} ${row.id}`);
    lines.push(`             Name:         ${row.name}`);
    lines.push(`             Last checked: ${row.lastChecked}`);
    lines.push(`             Next due:     ${row.nextDue}`);
    lines.push(`             Frequency:    ${row.frequency}`);
    lines.push(`             Status:       ${row.statusText}`);
    lines.push('');
  }

  // Overall verdict
  const overallStale = anyOverdue || anyDueSoon;
  lines.push('---');

  if (anyOverdue) {
    const overdueList = statusRows
      .filter((r) => r.status.kind === 'overdue')
      .map((r) => r.id);
    lines.push(`OVERDUE sources (${overdueList.length}): ${overdueList.join(', ')}`);
    lines.push('Action required: re-ingest overdue sources and run build:db');
  } else if (anyDueSoon) {
    const dueSoonList = statusRows
      .filter((r) => r.status.kind === 'due_soon')
      .map((r) => r.id);
    lines.push(`Due soon (${dueSoonList.length}): ${dueSoonList.join(', ')}`);
    lines.push('Schedule refresh for the above sources.');
  } else {
    lines.push('All sources are current.');
  }

  const report = lines.join('\n');

  // Write outputs
  writeFileSync(STALE_FILE, overallStale ? 'true' : 'false', 'utf-8');
  writeFileSync(REPORT_FILE, report, 'utf-8');

  // Print to console
  console.log(report);
  console.log('');
  console.log(`Stale: ${overallStale}`);

  if (anyOverdue) {
    console.error('\nFreshness check FAILED — overdue sources detected.');
    process.exit(1);
  }

  console.log('Freshness check passed.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
