// src/tools/list-controls.ts
import { getDb } from '../db.js';
import { successResponse, errorResponse } from '../response-meta.js';
import type { Control } from '../types.js';

interface ListControlsRow extends Control {
  // Subset of columns returned by the query
}

export function handleListControls(args: {
  framework_id?: string;
  category?: string;
  level?: string;
  language?: string;
  limit?: number;
  offset?: number;
}) {
  const { framework_id, category, level, language, limit = 50, offset = 0 } = args;

  if (!framework_id || typeof framework_id !== 'string' || framework_id.trim() === '') {
    return errorResponse('framework_id is required.', 'INVALID_INPUT');
  }

  const db = getDb();
  const fwId = framework_id.trim();

  // Verify framework exists
  const framework = db
    .prepare('SELECT id FROM frameworks WHERE id = ?')
    .get(fwId) as { id: string } | undefined;

  if (!framework) {
    return errorResponse(`Framework '${fwId}' not found.`, 'NO_MATCH');
  }

  // Build dynamic WHERE clause
  const conditions: string[] = ['framework_id = ?'];
  const params: unknown[] = [fwId];

  if (category && typeof category === 'string' && category.trim() !== '') {
    conditions.push('category = ?');
    params.push(category.trim());
  }

  if (level && typeof level === 'string' && level.trim() !== '') {
    conditions.push('level = ?');
    params.push(level.trim());
  }

  const whereClause = conditions.join(' AND ');

  // Count total matching rows
  const countRow = db
    .prepare(`SELECT COUNT(*) AS total FROM controls WHERE ${whereClause}`)
    .get(...params) as { total: number };

  const total = countRow.total;

  // Fetch paginated rows
  const rows = db
    .prepare(
      `SELECT
        id,
        control_number,
        title,
        title_nl,
        category,
        level
      FROM controls
      WHERE ${whereClause}
      ORDER BY control_number
      LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as ListControlsRow[];

  const useEnglish = language === 'en';

  const lines: string[] = [];

  lines.push(`## Controls — ${fwId}`);
  lines.push('');
  lines.push(`total_results: ${total}`);
  lines.push('');
  lines.push('| ID | Control | Title | Category | Level |');
  lines.push('|----|---------|-------|----------|-------|');

  for (const row of rows) {
    const displayTitle = useEnglish
      ? (row.title ?? row.title_nl ?? '')
      : (row.title_nl ?? row.title ?? '');

    const category = row.category ?? '';
    const rowLevel = row.level ?? '';

    lines.push(
      `| ${row.id} | ${row.control_number} | ${displayTitle} | ${category} | ${rowLevel} |`
    );
  }

  return successResponse(lines.join('\n'));
}
