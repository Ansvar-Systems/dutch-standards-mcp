// src/tools/get-control.ts
import { getDb } from '../db.js';
import { successResponse, errorResponse } from '../response-meta.js';
import type { Control, Framework } from '../types.js';

interface ControlWithFramework extends Control {
  framework_name: string;
  framework_name_nl: string | null;
  issuing_body: string;
}

export function handleGetControl(args: { control_id?: string }) {
  const { control_id } = args;

  if (!control_id || typeof control_id !== 'string' || control_id.trim() === '') {
    return errorResponse('control_id is required.', 'INVALID_INPUT');
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        c.id,
        c.framework_id,
        c.control_number,
        c.title,
        c.title_nl,
        c.description,
        c.description_nl,
        c.category,
        c.subcategory,
        c.level,
        c.iso_mapping,
        c.implementation_guidance,
        c.verification_guidance,
        c.source_url,
        f.name   AS framework_name,
        f.name_nl AS framework_name_nl,
        f.issuing_body
      FROM controls c
      JOIN frameworks f ON c.framework_id = f.id
      WHERE c.id = ?`
    )
    .get(control_id.trim()) as ControlWithFramework | undefined;

  if (!row) {
    return errorResponse(`Control '${control_id}' not found.`, 'NO_MATCH');
  }

  const lines: string[] = [];

  // Heading: control number + Dutch title
  lines.push(`## ${row.control_number} — ${row.title_nl}`);

  // English title if different from Dutch
  if (row.title && row.title !== row.title_nl) {
    lines.push(`*${row.title}*`);
  }

  lines.push('');

  // Framework / issuing body
  const frameworkDisplay = row.framework_name_nl ?? row.framework_name;
  lines.push(`**Framework:** ${frameworkDisplay} (${row.framework_name})`);
  lines.push(`**Issuing body:** ${row.issuing_body}`);

  // Category
  if (row.category) {
    const categoryLine = row.subcategory
      ? `${row.category} — ${row.subcategory}`
      : row.category;
    lines.push(`**Category:** ${categoryLine}`);
  }

  // Level
  if (row.level) {
    lines.push(`**Level:** ${row.level}`);
  }

  // ISO mapping
  if (row.iso_mapping) {
    lines.push(`**ISO 27001:2022 mapping:** ${row.iso_mapping}`);
  }

  lines.push('');

  // Bilingual descriptions
  if (row.description_nl) {
    lines.push('### Beschrijving (NL)');
    lines.push(row.description_nl);
    lines.push('');
  }

  if (row.description && row.description !== row.description_nl) {
    lines.push('### Description (EN)');
    lines.push(row.description);
    lines.push('');
  }

  // Implementation guidance
  if (row.implementation_guidance) {
    lines.push('### Implementation guidance');
    lines.push(row.implementation_guidance);
    lines.push('');
  }

  // Verification guidance
  if (row.verification_guidance) {
    lines.push('### Verification guidance');
    lines.push(row.verification_guidance);
    lines.push('');
  }

  // Source URL
  if (row.source_url) {
    lines.push(`**Source:** ${row.source_url}`);
  }

  return successResponse(lines.join('\n'));
}
