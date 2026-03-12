// src/tools/about.ts
import { getMetadata, getFrameworkCount, getControlCount, getDbSizeMb } from '../db.js';
import { successResponse } from '../response-meta.js';

export function handleAbout() {
  const metadata = getMetadata();
  const frameworkCount = getFrameworkCount();
  const controlCount = getControlCount();
  const dbSizeMb = getDbSizeMb();

  const lines: string[] = [];

  lines.push(`## ${metadata.mcp_name}`);
  lines.push('');
  lines.push(`**Version:** ${metadata.database_version}`);
  lines.push(`**Category:** ${metadata.category}`);
  lines.push(`**Schema version:** ${metadata.schema_version}`);
  lines.push(`**Database built:** ${metadata.database_built}`);
  lines.push('');
  lines.push('### Coverage');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Frameworks | ${frameworkCount} |`);
  lines.push(`| Controls | ${controlCount} |`);
  lines.push(`| Database size | ${dbSizeMb} MB |`);
  lines.push('');
  lines.push('### About');
  lines.push('');
  lines.push(
    'This MCP server provides structured access to Dutch cybersecurity and information security standards, ' +
    'including BIO2, NEN 7510, NEN-ISO/IEC 27001, DNB Good Practice, NCSC-NL guidelines, and Logius frameworks.'
  );
  lines.push('');
  lines.push('Part of the **[Ansvar MCP Network](https://ansvar.eu)** — specialist MCP servers for compliance and security intelligence.');

  return successResponse(lines.join('\n'));
}
