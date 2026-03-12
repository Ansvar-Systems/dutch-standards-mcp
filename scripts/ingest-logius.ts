// scripts/ingest-logius.ts
// Ingests Logius NLGov REST API Design Rules from GitHub repo.
// Source: https://github.com/Logius-standaarden/API-Design-Rules
//
// The design rules are defined in sections/designRules.md as ReSpec-style HTML
// within markdown. Each rule is a <div class="rule"> element with:
//   - id attribute: the rule path (e.g. "/core/naming-resources")
//   - data-type attribute: "functional" or "technical"
//   - <p class="rulelab">: the rule label/title
//   - <dt>Statement</dt><dd>: the normative statement
//   - <dt>Rationale</dt><dd>: the reasoning
//
// Legacy API-NN numbers are preserved from <span id="api-NN"> elements.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'extracted');
const OUTPUT_FILE = join(DATA_DIR, 'logius-api.json');
const REPO_URL = 'https://github.com/Logius-standaarden/API-Design-Rules.git';
const TEMP_DIR = join('/tmp', 'logius-adr-ingest');

interface LogiusRule {
  control_number: string;
  title: string;
  title_nl: string | null;
  description: string;
  description_nl: string | null;
  category: string;
  level: string | null;
  iso_mapping: string | null;
  implementation_guidance: string | null;
  source_url: string;
}

/**
 * Strip HTML tags but preserve text content.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '') // remove examples
    .replace(/<\/?[^>]+>/g, '') // strip remaining tags
    .replace(/\[=(\w+)=\]/g, '$1') // ReSpec term references
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // ReSpec bibliography references
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract text from a <dt>Label</dt><dd>...</dd> block.
 */
function extractDtDd(body: string, label: string): string {
  const re = new RegExp(
    `<dt>${label}</dt>\\s*<dd>([\\s\\S]*?)(?:</dd>|<dt>)`,
    'i'
  );
  const match = body.match(re);
  if (!match) return '';
  return stripHtml(match[1].replace(/<\/dd>\s*$/i, ''));
}

/**
 * Map section heading positions to category names.
 */
function buildCategoryMap(content: string): { offset: number; category: string }[] {
  const categories: { offset: number; category: string }[] = [];
  const re = /^## (.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const heading = match[1].trim();
    if (heading !== 'Summary') {
      categories.push({ offset: match.index, category: heading });
    }
  }
  return categories;
}

function getCategoryAtOffset(
  categories: { offset: number; category: string }[],
  offset: number
): string {
  let current = 'General';
  for (const cat of categories) {
    if (cat.offset > offset) break;
    current = cat.category;
  }
  return current;
}

/**
 * Parse the designRules.md file into structured rules.
 */
function parseDesignRules(content: string): LogiusRule[] {
  const rules: LogiusRule[] = [];
  const categories = buildCategoryMap(content);

  // Find all rule divs with their positions
  const ruleRe =
    /(?:<span id="(api-\d+)"><\/span>\s*)?<div class="rule" id="([^"]+)"(?: data-type="([^"]*)")?>([\s\S]*?)<\/div>/g;

  let ruleMatch: RegExpExecArray | null;
  while ((ruleMatch = ruleRe.exec(content)) !== null) {
    const legacyId = ruleMatch[1] || null; // e.g. "api-05"
    const ruleId = ruleMatch[2]; // e.g. "/core/naming-resources"
    const dataType = ruleMatch[3] || 'functional';
    const body = ruleMatch[4];

    // Extract rule label
    const labelMatch = body.match(/<p class="rulelab">\s*([\s\S]*?)\s*<\/p>/i);
    const ruleLabel = labelMatch ? stripHtml(labelMatch[1]) : ruleId;

    // Extract statement and rationale
    const statement = extractDtDd(body, 'Statement');
    const rationale = extractDtDd(body, 'Rationale');

    // Build control number from legacy ID or rule path
    let controlNumber: string;
    if (legacyId) {
      controlNumber = legacyId.toUpperCase();
    } else {
      // Use the rule path as identifier
      controlNumber = ruleId;
    }

    // Determine category from position in file
    const category = getCategoryAtOffset(categories, ruleMatch.index);

    // Build description from statement + rationale
    let description = statement;
    if (rationale) {
      description += description ? '\n\nRationale: ' + rationale : rationale;
    }

    // Source URL to the published spec
    const anchor = ruleId.replace(/^\//, '').replace(/\//g, '-');
    const sourceUrl = `https://gitdocumentatie.logius.nl/publicatie/api/adr/#${anchor}`;

    rules.push({
      control_number: controlNumber,
      title: ruleLabel,
      title_nl: null, // Rules are written in English
      description: description || ruleLabel,
      description_nl: null,
      category,
      level: dataType, // "functional" or "technical"
      iso_mapping: null,
      implementation_guidance: rationale || null,
      source_url: sourceUrl,
    });
  }

  return rules;
}

async function main(): Promise<void> {
  console.log('Logius API Design Rules Ingestion Script');
  console.log('=========================================');
  console.log(`Source: ${REPO_URL}`);
  console.log('');

  // Step 1: Clone the repo
  if (existsSync(TEMP_DIR)) {
    console.log('Removing previous temp directory...');
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }

  console.log('Cloning Logius-standaarden/API-Design-Rules...');
  execFileSync('git', ['clone', '--depth', '1', REPO_URL, TEMP_DIR], {
    stdio: 'pipe',
    timeout: 60_000,
  });
  console.log('Clone complete.');

  // Step 2: Read the designRules.md file
  const designRulesPath = join(TEMP_DIR, 'sections', 'designRules.md');
  if (!existsSync(designRulesPath)) {
    console.error(`ERROR: designRules.md not found at ${designRulesPath}`);
    process.exit(1);
  }

  const content = readFileSync(designRulesPath, 'utf-8');
  console.log(`Read designRules.md (${content.length} bytes)`);

  // Step 3: Parse rules
  const rules = parseDesignRules(content);
  console.log(`Parsed ${rules.length} design rules`);

  // Step 4: Validate
  let validationErrors = 0;
  for (const rule of rules) {
    if (!rule.control_number) {
      console.error('  VALIDATION ERROR: Missing control_number');
      validationErrors++;
    }
    if (!rule.title) {
      console.error(
        `  VALIDATION ERROR: Missing title for ${rule.control_number}`
      );
      validationErrors++;
    }
    if (!rule.description) {
      console.error(
        `  VALIDATION ERROR: Missing description for ${rule.control_number}`
      );
      validationErrors++;
    }
  }

  if (validationErrors > 0) {
    console.error(`\n${validationErrors} validation errors found.`);
    process.exit(1);
  }

  console.log('  All rules passed validation.');

  // Category distribution
  const categoryCount: Record<string, number> = {};
  for (const r of rules) {
    categoryCount[r.category] = (categoryCount[r.category] || 0) + 1;
  }
  console.log('\nCategory distribution:');
  for (const [cat, count] of Object.entries(categoryCount).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${cat}: ${count}`);
  }

  // Type distribution
  const typeCount: Record<string, number> = {};
  for (const r of rules) {
    const t = r.level || 'unknown';
    typeCount[t] = (typeCount[t] || 0) + 1;
  }
  console.log('\nType distribution:');
  for (const [t, count] of Object.entries(typeCount).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${t}: ${count}`);
  }

  // Step 5: Write output
  mkdirSync(DATA_DIR, { recursive: true });

  const output = {
    framework: {
      id: 'logius-api',
      name: 'NLGov REST API Design Rules',
      name_nl: 'NLGov REST API Design Rules',
      issuing_body: 'Logius',
      version: '2.0',
      effective_date: '2024-01-01',
      scope: 'REST API design rules for Dutch government services',
      scope_sectors: ['government'],
      structure_description:
        'Core design rules organized by topic (Resources, HTTP methods, Versioning, Transport Security, etc.). Each rule is classified as functional or technical and has a normative statement plus rationale.',
      source_url: 'https://github.com/Logius-standaarden/API-Design-Rules',
      license: 'CC BY 4.0',
      language: 'en',
    },
    controls: rules,
    metadata: {
      ingested_at: new Date().toISOString(),
      source_repo: REPO_URL,
      source_file: 'sections/designRules.md',
      total_controls: rules.length,
      notes: [
        'Rules are written in English. Dutch titles are not provided in the source.',
        'Legacy API-NN identifiers are preserved as control numbers where available.',
        'Rule types: functional (behavior requirements) and technical (implementation requirements).',
        'Source also includes normative module references (geospatial, signing, encryption).',
      ],
    },
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nOutput written to ${OUTPUT_FILE}`);
  console.log(
    `File size: ${(readFileSync(OUTPUT_FILE).length / 1024).toFixed(1)} KB`
  );

  // Cleanup
  rmSync(TEMP_DIR, { recursive: true, force: true });
  console.log('Temp directory cleaned up.');
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
