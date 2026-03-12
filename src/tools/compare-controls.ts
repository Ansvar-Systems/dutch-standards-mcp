// src/tools/compare-controls.ts
import { getDb } from '../db.js';
import { successResponse, errorResponse } from '../response-meta.js';

const SNIPPET_LENGTH = 150;
const PER_FRAMEWORK_LIMIT = 5;

interface CompareControlsRow {
  id: string;
  control_number: string;
  title_nl: string;
  description_nl: string | null;
}

/**
 * Escape special FTS5 characters so the query can be safely wrapped in
 * double-quotes for a phrase/token search.
 */
function escapeFts5(input: string): string {
  return input.replace(/["\^*\-:]/g, ' ').trim();
}

export function handleCompareControls(args: {
  query?: string;
  framework_ids?: string[];
}) {
  const { query, framework_ids } = args;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return errorResponse('query is required.', 'INVALID_INPUT');
  }

  if (
    !framework_ids ||
    !Array.isArray(framework_ids) ||
    framework_ids.length < 2
  ) {
    return errorResponse(
      'framework_ids must be an array of at least 2 framework IDs.',
      'INVALID_INPUT'
    );
  }

  if (framework_ids.length > 4) {
    return errorResponse(
      'framework_ids must contain at most 4 framework IDs.',
      'INVALID_INPUT'
    );
  }

  const escaped = escapeFts5(query.trim());
  if (escaped === '') {
    return errorResponse(
      'query contains only special characters and cannot be searched.',
      'INVALID_INPUT'
    );
  }

  const db = getDb();
  const ftsQuery = `"${escaped}"`;

  const fetchSql = `
    SELECT
      c.id,
      c.control_number,
      c.title_nl,
      c.description_nl
    FROM controls_fts f
    JOIN controls c ON c.rowid = f.rowid
    WHERE controls_fts MATCH ?
      AND c.framework_id = ?
    ORDER BY rank
    LIMIT ${PER_FRAMEWORK_LIMIT}
  `;

  const lines: string[] = [];
  lines.push(`## Cross-Framework Comparison — "${query}"`);
  lines.push('');

  for (const frameworkId of framework_ids) {
    lines.push(`## ${frameworkId}`);
    lines.push('');

    let rows: CompareControlsRow[];
    try {
      rows = db.prepare(fetchSql).all(ftsQuery, frameworkId) as CompareControlsRow[];
    } catch {
      rows = [];
    }

    if (rows.length === 0) {
      lines.push('_No matching controls found._');
    } else {
      for (const row of rows) {
        const snippet = row.description_nl
          ? row.description_nl.length > SNIPPET_LENGTH
            ? row.description_nl.slice(0, SNIPPET_LENGTH) + '…'
            : row.description_nl
          : '';
        lines.push(`**${row.control_number}** — ${row.title_nl}`);
        if (snippet) {
          lines.push(snippet);
        }
        lines.push('');
      }
    }

    lines.push('');
  }

  return successResponse(lines.join('\n'));
}
