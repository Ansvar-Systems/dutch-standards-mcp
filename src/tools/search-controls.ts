// src/tools/search-controls.ts
import { getDb } from '../db.js';
import { successResponse, errorResponse } from '../response-meta.js';

interface SearchControlsRow {
  id: string;
  framework_id: string;
  control_number: string;
  title: string | null;
  title_nl: string;
  category: string | null;
  level: string | null;
}

/**
 * Escape special FTS5 characters from user input so that the query can be
 * wrapped in double-quotes for a safe phrase/token search.
 * We strip: " ^ * - : (the special chars that break FTS5 MATCH syntax).
 */
function escapeFts5(input: string): string {
  return input.replace(/["\^*\-:]/g, ' ').trim();
}

export function handleSearchControls(args: {
  query?: string;
  framework_id?: string;
  category?: string;
  language?: string;
  limit?: number;
  offset?: number;
}) {
  const { query, framework_id, category, language, limit = 20, offset = 0 } = args;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return errorResponse('query is required.', 'INVALID_INPUT');
  }

  const escaped = escapeFts5(query.trim());
  if (escaped === '') {
    return errorResponse('query contains only special characters and cannot be searched.', 'INVALID_INPUT');
  }

  const db = getDb();

  // Build extra filter conditions for the JOIN result
  const filterConditions: string[] = [];
  const filterParams: unknown[] = [];

  if (framework_id && typeof framework_id === 'string' && framework_id.trim() !== '') {
    filterConditions.push('c.framework_id = ?');
    filterParams.push(framework_id.trim());
  }

  if (category && typeof category === 'string' && category.trim() !== '') {
    filterConditions.push('c.category = ?');
    filterParams.push(category.trim());
  }

  const filterClause =
    filterConditions.length > 0 ? `AND ${filterConditions.join(' AND ')}` : '';

  // FTS5 MATCH with double-quoted phrase to safely handle multi-word input
  // The content-external table requires joining back to `controls` for column data
  const ftsQuery = `"${escaped}"`;

  // Count total matches
  const countSql = `
    SELECT COUNT(*) AS total
    FROM controls_fts f
    JOIN controls c ON c.rowid = f.rowid
    WHERE controls_fts MATCH ?
    ${filterClause}
  `;

  let total: number;
  try {
    const countRow = db
      .prepare(countSql)
      .get(ftsQuery, ...filterParams) as { total: number } | undefined;
    total = countRow?.total ?? 0;
  } catch {
    // FTS5 MATCH syntax error (e.g. all-special-char after quoting) — treat as no match
    return errorResponse(`No controls found matching '${query}'.`, 'NO_MATCH');
  }

  if (total === 0) {
    return errorResponse(`No controls found matching '${query}'.`, 'NO_MATCH');
  }

  // Fetch paginated results ordered by FTS5 rank (best match first)
  const fetchSql = `
    SELECT
      c.id,
      c.framework_id,
      c.control_number,
      c.title,
      c.title_nl,
      c.category,
      c.level
    FROM controls_fts f
    JOIN controls c ON c.rowid = f.rowid
    WHERE controls_fts MATCH ?
    ${filterClause}
    ORDER BY rank
    LIMIT ? OFFSET ?
  `;

  const rows = db
    .prepare(fetchSql)
    .all(ftsQuery, ...filterParams, limit, offset) as SearchControlsRow[];

  const useEnglish = language === 'en';

  const lines: string[] = [];

  lines.push(`## Search Results — "${query}"`);
  lines.push('');
  lines.push(`total_results: ${total}`);
  lines.push('');
  lines.push('| ID | Control | Title | Framework | Category | Level |');
  lines.push('|----|---------|-------|-----------|----------|-------|');

  for (const row of rows) {
    // Decision 1: EN preferred if available, fall back to NL (Dutch-only controls never hidden)
    const displayTitle = useEnglish
      ? (row.title ?? row.title_nl ?? '')
      : (row.title_nl ?? row.title ?? '');

    const frameworkId = row.framework_id ?? '';
    const cat = row.category ?? '';
    const lvl = row.level ?? '';

    lines.push(
      `| ${row.id} | ${row.control_number} | ${displayTitle} | ${frameworkId} | ${cat} | ${lvl} |`
    );
  }

  return successResponse(lines.join('\n'));
}
