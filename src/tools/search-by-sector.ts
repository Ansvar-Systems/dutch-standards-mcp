// src/tools/search-by-sector.ts
import { getDb } from '../db.js';
import { successResponse, errorResponse } from '../response-meta.js';

// Recognised sector identifiers. Add more as new frameworks are ingested.
const ALLOWED_SECTORS = new Set([
  'government',
  'healthcare',
  'finance',
  'energy',
  'telecom',
  'transport',
  'water',
  'digital_infrastructure',
  'education',
]);

interface FrameworkRow {
  id: string;
  name_nl: string | null;
  name: string;
  issuing_body: string;
  version: string;
  control_count: number;
  language: string;
}

interface ControlRow {
  id: string;
  framework_id: string;
  control_number: string;
  title: string | null;
  title_nl: string;
  category: string | null;
  level: string | null;
}

/**
 * Escape special FTS5 characters so the query can be wrapped in double-quotes.
 * Strips: " ^ * - : (chars that break FTS5 MATCH syntax).
 */
function escapeFts5(input: string): string {
  return input.replace(/["\^*\-:]/g, ' ').trim();
}

export function handleSearchBySector(args: { sector?: string; query?: string }) {
  const { sector, query } = args;

  if (!sector || typeof sector !== 'string' || sector.trim() === '') {
    return errorResponse('sector is required.', 'INVALID_INPUT');
  }

  const sectorKey = sector.trim().toLowerCase();

  if (!ALLOWED_SECTORS.has(sectorKey)) {
    return errorResponse(
      `Unknown sector "${sector}". Allowed sectors: ${[...ALLOWED_SECTORS].join(', ')}.`,
      'INVALID_INPUT',
    );
  }

  const db = getDb();

  // Match frameworks whose scope_sectors JSON array contains the requested sector.
  // The stored format is '["government"]' etc., so a LIKE search on the quoted value
  // (e.g. %"government"%) safely targets whole tokens.
  const frameworkRows = db
    .prepare(
      `SELECT
         f.id,
         f.name,
         f.name_nl,
         f.issuing_body,
         f.version,
         f.language,
         COUNT(c.id) AS control_count
       FROM frameworks f
       LEFT JOIN controls c ON c.framework_id = f.id
       WHERE f.scope_sectors LIKE ?
       GROUP BY f.id
       ORDER BY f.id`,
    )
    .all(`%"${sectorKey}"%`) as FrameworkRow[];

  if (frameworkRows.length === 0) {
    return errorResponse(
      `No frameworks found for sector "${sector}".`,
      'NO_MATCH',
    );
  }

  const lines: string[] = [];

  lines.push(`## Frameworks — sector: ${sectorKey}`);
  lines.push('');
  lines.push(`${frameworkRows.length} framework${frameworkRows.length !== 1 ? 's' : ''} cover this sector.`);
  lines.push('');
  lines.push('| ID | Name | Issuing body | Version | Controls | Language |');
  lines.push('|----|------|--------------|---------|----------|----------|');

  for (const row of frameworkRows) {
    const displayName = row.name_nl ?? row.name;
    lines.push(
      `| ${row.id} | ${displayName} | ${row.issuing_body} | ${row.version} | ${row.control_count} | ${row.language} |`,
    );
  }

  // Optional: FTS5 search within the matched frameworks.
  if (query && typeof query === 'string' && query.trim() !== '') {
    const escaped = escapeFts5(query.trim());

    if (escaped !== '') {
      const ftsQuery = `"${escaped}"`;
      const frameworkIds = frameworkRows.map((r) => r.id);

      // Build per-framework results: top 10 matches each, ordered by FTS5 rank.
      const allControls: ControlRow[] = [];

      for (const frameworkId of frameworkIds) {
        const controlRows = db
          .prepare(
            `SELECT
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
               AND c.framework_id = ?
             ORDER BY rank
             LIMIT 10`,
          )
          .all(ftsQuery, frameworkId) as ControlRow[];

        allControls.push(...controlRows);
      }

      lines.push('');
      lines.push(`## Controls matching "${query}" in sector: ${sectorKey}`);
      lines.push('');

      if (allControls.length === 0) {
        lines.push(`No controls matched "${query}" within these frameworks.`);
      } else {
        lines.push('| ID | Control | Title | Framework | Category | Level |');
        lines.push('|----|---------|-------|-----------|----------|-------|');

        for (const row of allControls) {
          const displayTitle = row.title_nl ?? row.title ?? '';
          const cat = row.category ?? '';
          const lvl = row.level ?? '';
          lines.push(
            `| ${row.id} | ${row.control_number} | ${displayTitle} | ${row.framework_id} | ${cat} | ${lvl} |`,
          );
        }
      }
    }
  }

  return successResponse(lines.join('\n'));
}
