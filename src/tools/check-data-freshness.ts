// src/tools/check-data-freshness.ts
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { successResponse } from '../response-meta.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface CoverageEntry {
  source: string;
  last_fetched: string;       // ISO date string e.g. "2026-01-15"
  refresh_window_days: number; // how often to refresh
}

interface CoverageJson {
  generated: string;
  sources: CoverageEntry[];
}

function calculateStatus(lastFetched: string, refreshWindowDays: number, now: Date): string {
  const fetchedDate = new Date(lastFetched);
  if (isNaN(fetchedDate.getTime())) {
    return 'Unknown (invalid date)';
  }

  const ageMs = now.getTime() - fetchedDate.getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const deadlineDays = refreshWindowDays;
  const daysRemaining = deadlineDays - ageDays;

  if (daysRemaining < 0) {
    return `OVERDUE (${Math.abs(daysRemaining)} days)`;
  }

  // Within 20% of deadline — warn
  const warnThreshold = Math.ceil(deadlineDays * 0.2);
  if (daysRemaining <= warnThreshold) {
    return `Due in ${daysRemaining} days`;
  }

  return 'Current';
}

export function handleCheckDataFreshness() {
  const coveragePath = join(__dirname, '..', '..', 'data', 'coverage.json');

  if (!existsSync(coveragePath)) {
    return successResponse(
      'Data Freshness Report\n\nNo coverage data available. Run `npm run coverage:update` to generate.'
    );
  }

  let coverage: CoverageJson;
  try {
    const raw = readFileSync(coveragePath, 'utf-8');
    coverage = JSON.parse(raw) as CoverageJson;
  } catch {
    return successResponse(
      'Data Freshness Report\n\nFailed to read coverage.json. Run `npm run coverage:update` to regenerate.'
    );
  }

  const now = new Date();
  const lines: string[] = [];

  lines.push('## Data Freshness Report');
  lines.push('');
  lines.push(`**Generated:** ${coverage.generated ?? 'unknown'}`);
  lines.push(`**Checked at:** ${now.toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push('| Source | Last fetched | Refresh window | Status |');
  lines.push('|--------|--------------|----------------|--------|');

  let overdueCount = 0;
  let dueCount = 0;

  for (const entry of coverage.sources) {
    const status = calculateStatus(entry.last_fetched, entry.refresh_window_days, now);
    if (status.startsWith('OVERDUE')) overdueCount++;
    else if (status.startsWith('Due in')) dueCount++;
    lines.push(`| ${entry.source} | ${entry.last_fetched} | ${entry.refresh_window_days}d | ${status} |`);
  }

  lines.push('');

  if (overdueCount > 0) {
    lines.push(`**${overdueCount} source(s) are overdue for refresh.**`);
  } else if (dueCount > 0) {
    lines.push(`**${dueCount} source(s) are due for refresh soon.**`);
  } else {
    lines.push('All sources are current.');
  }

  lines.push('');
  lines.push('To force a full data update, run:');
  lines.push('```');
  lines.push('npm run data:update');
  lines.push('```');

  return successResponse(lines.join('\n'));
}
