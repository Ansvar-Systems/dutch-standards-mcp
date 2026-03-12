// src/tools/list-frameworks.ts
import { getDb } from '../db.js';
import { successResponse } from '../response-meta.js';
import type { Framework } from '../types.js';

interface FrameworkWithCount extends Framework {
  control_count: number;
}

export function handleListFrameworks() {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT
        f.id,
        f.name,
        f.name_nl,
        f.issuing_body,
        f.version,
        f.scope_sectors,
        f.language,
        COUNT(c.id) AS control_count
      FROM frameworks f
      LEFT JOIN controls c ON c.framework_id = f.id
      GROUP BY f.id
      ORDER BY f.id`
    )
    .all() as FrameworkWithCount[];

  const lines: string[] = [];

  lines.push('## Dutch Standards Frameworks');
  lines.push('');
  lines.push(`${rows.length} framework${rows.length !== 1 ? 's' : ''} available.`);
  lines.push('');
  lines.push('| ID | Name | Issuing body | Version | Controls | Sectors | Language |');
  lines.push('|----|------|--------------|---------|----------|---------|----------|');

  for (const row of rows) {
    const displayName = row.name_nl ?? row.name;

    let sectors = '';
    if (row.scope_sectors) {
      try {
        const parsed: string[] = JSON.parse(row.scope_sectors);
        sectors = parsed.join(', ');
      } catch {
        sectors = row.scope_sectors;
      }
    }

    lines.push(
      `| ${row.id} | ${displayName} | ${row.issuing_body} | ${row.version} | ${row.control_count} | ${sectors} | ${row.language} |`
    );
  }

  return successResponse(lines.join('\n'));
}
