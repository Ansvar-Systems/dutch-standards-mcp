// src/tools/get-iso-mapping.ts
import { getDb } from '../db.js';
import { successResponse, errorResponse } from '../response-meta.js';

interface IsoMappingRow {
  id: string;
  control_number: string;
  title_nl: string;
  title: string | null;
  framework_id: string;
  framework_name: string;
  framework_name_nl: string | null;
}

export function handleGetIsoMapping(args: { iso_control?: string }) {
  const { iso_control } = args;

  if (!iso_control || typeof iso_control !== 'string' || iso_control.trim() === '') {
    return errorResponse('iso_control is required.', 'INVALID_INPUT');
  }

  const isoControl = iso_control.trim();
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT
        c.id,
        c.control_number,
        c.title_nl,
        c.title,
        c.framework_id,
        f.name   AS framework_name,
        f.name_nl AS framework_name_nl
      FROM controls c
      JOIN frameworks f ON c.framework_id = f.id
      WHERE c.iso_mapping = ?
      ORDER BY c.framework_id, c.control_number`
    )
    .all(isoControl) as IsoMappingRow[];

  if (rows.length === 0) {
    return errorResponse(
      `No Dutch controls are mapped to ISO 27002 control '${isoControl}'.`,
      'NO_MATCH'
    );
  }

  // Group rows by framework
  const byFramework = new Map<string, { frameworkName: string; rows: IsoMappingRow[] }>();
  for (const row of rows) {
    const displayName = row.framework_name_nl ?? row.framework_name;
    if (!byFramework.has(row.framework_id)) {
      byFramework.set(row.framework_id, { frameworkName: displayName, rows: [] });
    }
    byFramework.get(row.framework_id)!.rows.push(row);
  }

  const lines: string[] = [];

  lines.push(`## ISO 27002 Control ${isoControl} — Dutch Framework Mapping`);
  lines.push('');
  lines.push(`total_results: ${rows.length}`);
  lines.push('');

  lines.push('| ID | Control | Title |');
  lines.push('|----|---------|-------|');

  for (const [frameworkId, group] of byFramework) {
    // Framework section header as a separator row
    lines.push(`| **${frameworkId}** | *${group.frameworkName}* | |`);

    for (const row of group.rows) {
      const displayTitle = row.title_nl ?? row.title ?? '';
      lines.push(`| ${row.id} | ${row.control_number} | ${displayTitle} |`);
    }
  }

  return successResponse(lines.join('\n'));
}
