// src/tools/get-framework.ts
import { getDb } from '../db.js';
import { successResponse, errorResponse } from '../response-meta.js';
import type { Framework } from '../types.js';

interface FrameworkWithCount extends Framework {
  control_count: number;
}

interface CategoryRow {
  category: string;
  count: number;
}

export function handleGetFramework(args: { framework_id?: string }) {
  const { framework_id } = args;

  if (!framework_id || typeof framework_id !== 'string' || framework_id.trim() === '') {
    return errorResponse('framework_id is required.', 'INVALID_INPUT');
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        f.*,
        COUNT(c.id) AS control_count
      FROM frameworks f
      LEFT JOIN controls c ON c.framework_id = f.id
      WHERE f.id = ?
      GROUP BY f.id`
    )
    .get(framework_id.trim()) as FrameworkWithCount | undefined;

  if (!row) {
    return errorResponse(`Framework '${framework_id}' not found.`, 'NO_MATCH');
  }

  const categories = db
    .prepare(
      `SELECT category, COUNT(*) AS count
       FROM controls
       WHERE framework_id = ? AND category IS NOT NULL
       GROUP BY category
       ORDER BY category`
    )
    .all(framework_id.trim()) as CategoryRow[];

  const lines: string[] = [];

  // Heading
  const displayName = row.name_nl ?? row.name;
  lines.push(`## ${displayName}`);
  if (row.name_nl && row.name !== row.name_nl) {
    lines.push(`*${row.name}*`);
  }
  lines.push('');

  // Core metadata
  lines.push(`**Issuing body:** ${row.issuing_body}`);
  lines.push(`**Version:** ${row.version}`);
  lines.push(`**Language:** ${row.language}`);
  lines.push(`**Controls:** ${row.control_count}`);

  if (row.effective_date) {
    lines.push(`**Effective date:** ${row.effective_date}`);
  }

  // Sectors
  if (row.scope_sectors) {
    let sectors: string[];
    try {
      sectors = JSON.parse(row.scope_sectors);
    } catch {
      sectors = [row.scope_sectors];
    }
    if (sectors.length > 0) {
      lines.push(`**Sectors:** ${sectors.join(', ')}`);
    }
  }

  // Scope description
  if (row.scope) {
    lines.push(`**Scope:** ${row.scope}`);
  }

  // Structure description
  if (row.structure_description) {
    lines.push(`**Structure:** ${row.structure_description}`);
  }

  // License
  if (row.license) {
    lines.push(`**License:** ${row.license}`);
  }

  // Categories table
  if (categories.length > 0) {
    lines.push('');
    lines.push('### Control categories');
    lines.push('');
    lines.push('| Category | Controls |');
    lines.push('|----------|----------|');
    for (const cat of categories) {
      lines.push(`| ${cat.category} | ${cat.count} |`);
    }
  }

  // Source URL
  if (row.source_url) {
    lines.push('');
    lines.push(`**Source:** ${row.source_url}`);
  }

  return successResponse(lines.join('\n'));
}
