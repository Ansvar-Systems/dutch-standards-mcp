// scripts/ingest-bio2.ts
// Ingests BIO2 (Baseline Informatiebeveiliging Overheid 2) controls from MinBZK GitHub repo.
// Source: https://github.com/MinBZK/Baseline-Informatiebeveiliging-Overheid
//
// BIO2 overheidsmaatregelen (government measures) are structured as X.YY.ZZ where:
//   X  = ISO 27002:2022 theme (5=Organizational, 6=People, 7=Physical, 8=Technological)
//   YY = ISO 27002:2022 control number within theme (zero-padded)
//   ZZ = BIO2 sub-measure number
//
// Each measure maps to an ISO 27002:2022 control and has a category:
//   Basishygiëne  -> basic hygiene (NIS2 compliance baseline)
//   Ketenhygiëne  -> supply chain hygiene
//   Overheidsrisico -> government-specific risk

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'extracted');
const OUTPUT_FILE = join(DATA_DIR, 'bio2.json');
const REPO_URL = 'https://github.com/MinBZK/Baseline-Informatiebeveiliging-Overheid.git';
const TEMP_DIR = join('/tmp', 'bio2-ingest');

// ISO 27002:2022 control reference data.
// BIO2 follows the ISO 27002:2022 structure -- each BIO2 measure number X.YY.ZZ maps
// to ISO 27002 control X.YY. This table provides the English titles and categories.
const ISO_27002_CONTROLS: Record<string, { title: string; category: string }> = {
  // Theme 5: Organizational controls
  '5.01': { title: 'Policies for information security', category: 'Organizational controls' },
  '5.02': { title: 'Information security roles and responsibilities', category: 'Organizational controls' },
  '5.03': { title: 'Segregation of duties', category: 'Organizational controls' },
  '5.04': { title: 'Management responsibilities', category: 'Organizational controls' },
  '5.05': { title: 'Contact with authorities', category: 'Organizational controls' },
  '5.06': { title: 'Contact with special interest groups', category: 'Organizational controls' },
  '5.07': { title: 'Threat intelligence', category: 'Organizational controls' },
  '5.08': { title: 'Information security in project management', category: 'Organizational controls' },
  '5.09': { title: 'Inventory of information and other associated assets', category: 'Organizational controls' },
  '5.10': { title: 'Acceptable use of information and other associated assets', category: 'Organizational controls' },
  '5.11': { title: 'Return of assets', category: 'Organizational controls' },
  '5.12': { title: 'Classification of information', category: 'Organizational controls' },
  '5.13': { title: 'Labelling of information', category: 'Organizational controls' },
  '5.14': { title: 'Information transfer', category: 'Organizational controls' },
  '5.15': { title: 'Access control', category: 'Organizational controls' },
  '5.16': { title: 'Identity management', category: 'Organizational controls' },
  '5.17': { title: 'Authentication information', category: 'Organizational controls' },
  '5.18': { title: 'Access rights', category: 'Organizational controls' },
  '5.19': { title: 'Information security in supplier relationships', category: 'Organizational controls' },
  '5.20': { title: 'Addressing information security within supplier agreements', category: 'Organizational controls' },
  '5.21': { title: 'Managing information security in the ICT supply chain', category: 'Organizational controls' },
  '5.22': { title: 'Monitoring, review and change management of supplier services', category: 'Organizational controls' },
  '5.23': { title: 'Information security for use of cloud services', category: 'Organizational controls' },
  '5.24': { title: 'Information security incident management planning and preparation', category: 'Organizational controls' },
  '5.25': { title: 'Assessment and decision on information security events', category: 'Organizational controls' },
  '5.26': { title: 'Response to information security incidents', category: 'Organizational controls' },
  '5.27': { title: 'Learning from information security incidents', category: 'Organizational controls' },
  '5.28': { title: 'Collection of evidence', category: 'Organizational controls' },
  '5.29': { title: 'Information security during disruption', category: 'Organizational controls' },
  '5.30': { title: 'ICT readiness for business continuity', category: 'Organizational controls' },
  '5.31': { title: 'Legal, statutory, regulatory and contractual requirements', category: 'Organizational controls' },
  '5.32': { title: 'Intellectual property rights', category: 'Organizational controls' },
  '5.33': { title: 'Protection of records', category: 'Organizational controls' },
  '5.34': { title: 'Privacy and protection of PII', category: 'Organizational controls' },
  '5.35': { title: 'Independent review of information security', category: 'Organizational controls' },
  '5.36': { title: 'Compliance with policies, rules and standards for information security', category: 'Organizational controls' },
  '5.37': { title: 'Documented operating procedures', category: 'Organizational controls' },
  // Theme 6: People controls
  '6.01': { title: 'Screening', category: 'People controls' },
  '6.02': { title: 'Terms and conditions of employment', category: 'People controls' },
  '6.03': { title: 'Information security awareness, education and training', category: 'People controls' },
  '6.04': { title: 'Disciplinary process', category: 'People controls' },
  '6.05': { title: 'Responsibilities after termination or change of employment', category: 'People controls' },
  '6.06': { title: 'Confidentiality or non-disclosure agreements', category: 'People controls' },
  '6.07': { title: 'Remote working', category: 'People controls' },
  '6.08': { title: 'Information security event reporting', category: 'People controls' },
  // Theme 7: Physical controls
  '7.01': { title: 'Physical security perimeters', category: 'Physical controls' },
  '7.02': { title: 'Physical entry', category: 'Physical controls' },
  '7.03': { title: 'Securing offices, rooms and facilities', category: 'Physical controls' },
  '7.04': { title: 'Physical security monitoring', category: 'Physical controls' },
  '7.05': { title: 'Protecting against physical and environmental threats', category: 'Physical controls' },
  '7.06': { title: 'Working in secure areas', category: 'Physical controls' },
  '7.07': { title: 'Clear desk and clear screen', category: 'Physical controls' },
  '7.08': { title: 'Equipment siting and protection', category: 'Physical controls' },
  '7.09': { title: 'Security of assets off-premises', category: 'Physical controls' },
  '7.10': { title: 'Storage media', category: 'Physical controls' },
  '7.11': { title: 'Supporting utilities', category: 'Physical controls' },
  '7.12': { title: 'Cabling security', category: 'Physical controls' },
  '7.13': { title: 'Equipment maintenance', category: 'Physical controls' },
  '7.14': { title: 'Secure disposal or re-use of equipment', category: 'Physical controls' },
  // Theme 8: Technological controls
  '8.01': { title: 'User endpoint devices', category: 'Technological controls' },
  '8.02': { title: 'Privileged access rights', category: 'Technological controls' },
  '8.03': { title: 'Information access restriction', category: 'Technological controls' },
  '8.04': { title: 'Access to source code', category: 'Technological controls' },
  '8.05': { title: 'Secure authentication', category: 'Technological controls' },
  '8.06': { title: 'Capacity management', category: 'Technological controls' },
  '8.07': { title: 'Protection against malware', category: 'Technological controls' },
  '8.08': { title: 'Management of technical vulnerabilities', category: 'Technological controls' },
  '8.09': { title: 'Configuration management', category: 'Technological controls' },
  '8.10': { title: 'Information deletion', category: 'Technological controls' },
  '8.11': { title: 'Data masking', category: 'Technological controls' },
  '8.12': { title: 'Data leakage prevention', category: 'Technological controls' },
  '8.13': { title: 'Information backup', category: 'Technological controls' },
  '8.14': { title: 'Redundancy of information processing facilities', category: 'Technological controls' },
  '8.15': { title: 'Logging', category: 'Technological controls' },
  '8.16': { title: 'Monitoring activities', category: 'Technological controls' },
  '8.17': { title: 'Clock synchronization', category: 'Technological controls' },
  '8.18': { title: 'Use of privileged utility programs', category: 'Technological controls' },
  '8.19': { title: 'Installation of software on operational systems', category: 'Technological controls' },
  '8.20': { title: 'Networks security', category: 'Technological controls' },
  '8.21': { title: 'Security of network services', category: 'Technological controls' },
  '8.22': { title: 'Segregation of networks', category: 'Technological controls' },
  '8.23': { title: 'Web filtering', category: 'Technological controls' },
  '8.24': { title: 'Use of cryptography', category: 'Technological controls' },
  '8.25': { title: 'Secure development life cycle', category: 'Technological controls' },
  '8.26': { title: 'Application security requirements', category: 'Technological controls' },
  '8.27': { title: 'Secure system architecture and engineering principles', category: 'Technological controls' },
  '8.28': { title: 'Secure coding', category: 'Technological controls' },
  '8.29': { title: 'Security testing in development and acceptance', category: 'Technological controls' },
  '8.30': { title: 'Outsourced development', category: 'Technological controls' },
  '8.31': { title: 'Separation of development, test and production environments', category: 'Technological controls' },
  '8.32': { title: 'Change management', category: 'Technological controls' },
  '8.33': { title: 'Test information', category: 'Technological controls' },
  '8.34': { title: 'Protection of information systems during audit testing', category: 'Technological controls' },
};

interface BIO2Control {
  control_number: string;
  title: string;
  title_nl: string;
  description: string;
  description_nl: string;
  category: string;
  level: string;
  iso_mapping: string;
  implementation_guidance: string;
  source_url: string;
}

/**
 * Derive the ISO 27002 parent control number from a BIO2 measure number.
 * BIO2 uses X.YY.ZZ where X.YY maps to ISO 27002 control X.Y (strip leading zero).
 * Example: "5.01.01" -> "5.1", "8.16.03" -> "8.16"
 */
function deriveIsoControl(measureNumber: string): string {
  const parts = measureNumber.split('.');
  if (parts.length < 2) return measureNumber;
  const theme = parts[0];
  const controlNum = parseInt(parts[1], 10).toString();
  return `${theme}.${controlNum}`;
}

/**
 * Derive padded ISO control key for lookup in our reference table.
 * Example: "5.01.01" -> "5.01"
 */
function deriveIsoKey(measureNumber: string): string {
  const parts = measureNumber.split('.');
  if (parts.length < 2) return measureNumber;
  return `${parts[0]}.${parts[1]}`;
}

/**
 * Parse the "Draagt bij aan:" (contributes to) categories into a level string.
 * BIO2 v1.3 uses categories instead of BBN levels:
 *   Basishygiëne  -> basic hygiene (NIS2 compliance baseline)
 *   Ketenhygiëne  -> supply chain category
 *   Overheidsrisico -> government risk category
 *
 * We store the original Dutch categories as-is for accuracy.
 */
function parseCategories(text: string): string {
  const match = text.match(/Draagt bij aan:\s*(.+?)(?:\s*$)/i);
  if (!match) return '';
  return match[1]
    .replace(/<br\s*\/?>/gi, '')
    .trim()
    .split(/,\s*/)
    .map((s) => s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase())
    .join(', ');
}

/**
 * Parse the maatregelen markdown file into structured controls.
 */
function parseMaatregelen(content: string): BIO2Control[] {
  const controls: BIO2Control[] = [];

  // Split on ## headings that look like measure numbers (X.YY.ZZ)
  const sections = content.split(/^## (\d+\.\d+\.\d+)\s*$/m);

  // sections[0] is preamble, then alternating: [number, body, number, body, ...]
  for (let i = 1; i < sections.length; i += 2) {
    const measureNumber = sections[i].trim();
    const body = (sections[i + 1] || '').trim();

    if (!body) continue;

    const isoKey = deriveIsoKey(measureNumber);
    const isoControl = deriveIsoControl(measureNumber);
    const isoRef = ISO_27002_CONTROLS[isoKey];

    // Parse the description -- everything before "Draagt bij aan:"
    const draagtBijMatch = body.match(/Draagt bij aan:/i);
    let descriptionNl: string;
    let levelCategories: string;

    if (draagtBijMatch && draagtBijMatch.index !== undefined) {
      descriptionNl = body.substring(0, draagtBijMatch.index).trim();
      levelCategories = parseCategories(body.substring(draagtBijMatch.index));
    } else {
      descriptionNl = body.trim();
      levelCategories = '';
    }

    // Clean up HTML breaks and excessive whitespace
    descriptionNl = descriptionNl
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Check if this is a "no government measure" entry
    const isNoMeasure = descriptionNl.toLowerCase().includes('geen overheidsmaatregel');

    // Build the title in Dutch from the ISO reference number + description context
    // For "geen overheidsmaatregel" entries, note that explicitly
    const titleNl = isNoMeasure
      ? `Overheidsmaatregel ${measureNumber} (geen aanvullende maatregel)`
      : `Overheidsmaatregel ${measureNumber}`;

    // English title from ISO mapping
    const titleEn = isoRef
      ? `${isoRef.title} (Gov. measure ${measureNumber})`
      : `Government measure ${measureNumber}`;

    // Category from ISO 27002 theme
    const category = isoRef?.category || 'Unknown';

    // Build implementation guidance for measures that have actual content
    let implementationGuidance = '';
    if (!isNoMeasure) {
      implementationGuidance = descriptionNl;
    }

    // Source URL pointing to the published GitHub Pages site
    const sourceUrl = `https://minbzk.github.io/Baseline-Informatiebeveiliging-Overheid/maatregelen/#${measureNumber.replace(/\./g, '')}`;

    controls.push({
      control_number: measureNumber,
      title: titleEn,
      title_nl: titleNl,
      description: isNoMeasure
        ? `No additional government measure. See BIO2 Part 1 (Kader) for the obligations under ISO 27002 control ${isoControl}.`
        : '',
      description_nl: descriptionNl,
      category,
      level: levelCategories,
      iso_mapping: isoControl,
      implementation_guidance: implementationGuidance,
      source_url: sourceUrl,
    });
  }

  return controls;
}

async function main(): Promise<void> {
  console.log('BIO2 Ingestion Script');
  console.log('=====================');
  console.log(`Source: ${REPO_URL}`);
  console.log('');

  // Step 1: Clone or update the repo
  if (existsSync(TEMP_DIR)) {
    console.log('Removing previous temp directory...');
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }

  console.log('Cloning MinBZK/Baseline-Informatiebeveiliging-Overheid...');
  execFileSync('git', ['clone', '--depth', '1', REPO_URL, TEMP_DIR], {
    stdio: 'pipe',
    timeout: 60_000,
  });
  console.log('Clone complete.');

  // Step 2: Read the maatregelen (measures) file
  const maatregelenPath = join(TEMP_DIR, 'docs', 'maatregelen', 'index.md');
  if (!existsSync(maatregelenPath)) {
    console.error(`ERROR: Maatregelen file not found at ${maatregelenPath}`);
    process.exit(1);
  }

  const content = readFileSync(maatregelenPath, 'utf-8');
  console.log(`Read maatregelen file (${content.length} bytes)`);

  // Step 3: Parse controls
  const controls = parseMaatregelen(content);
  console.log(`Parsed ${controls.length} BIO2 overheidsmaatregelen`);

  // Step 4: Validate
  const withContent = controls.filter(
    (c) => !c.description_nl.toLowerCase().includes('geen overheidsmaatregel')
  );
  const noMeasure = controls.filter((c) =>
    c.description_nl.toLowerCase().includes('geen overheidsmaatregel')
  );

  console.log(`  - ${withContent.length} measures with government-specific content`);
  console.log(`  - ${noMeasure.length} references to ISO 27002 only (no additional measure)`);

  // Validate required fields
  let validationErrors = 0;
  for (const control of controls) {
    if (!control.control_number) {
      console.error(`  VALIDATION ERROR: Missing control_number`);
      validationErrors++;
    }
    if (!control.title_nl) {
      console.error(`  VALIDATION ERROR: Missing title_nl for ${control.control_number}`);
      validationErrors++;
    }
    if (!control.description_nl) {
      console.error(`  VALIDATION ERROR: Missing description_nl for ${control.control_number}`);
      validationErrors++;
    }
    if (!control.iso_mapping) {
      console.error(`  VALIDATION ERROR: Missing iso_mapping for ${control.control_number}`);
      validationErrors++;
    }
  }

  if (validationErrors > 0) {
    console.error(`\n${validationErrors} validation errors found.`);
    process.exit(1);
  }

  console.log('  All controls passed validation.');

  // Category distribution
  const categoryCount: Record<string, number> = {};
  for (const c of controls) {
    const cat = c.category || 'Unknown';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  }
  console.log('\nCategory distribution:');
  for (const [cat, count] of Object.entries(categoryCount).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${cat}: ${count}`);
  }

  // Level (category type) distribution
  const levelCount: Record<string, number> = {};
  for (const c of controls) {
    const levels = c.level
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);
    for (const l of levels) {
      levelCount[l] = (levelCount[l] || 0) + 1;
    }
  }
  console.log('\nBIO2 category distribution (Draagt bij aan):');
  for (const [level, count] of Object.entries(levelCount).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${level}: ${count}`);
  }

  // Step 5: Write output
  mkdirSync(DATA_DIR, { recursive: true });

  const output = {
    framework: {
      id: 'bio2',
      name: 'Baseline Information Security Government 2',
      name_nl: 'Baseline Informatiebeveiliging Overheid 2',
      issuing_body: 'Ministerie van Binnenlandse Zaken en Koninkrijksrelaties (BZK)',
      version: '1.3',
      effective_date: '2026-01-09',
      scope: 'Information security baseline for all Dutch government entities',
      scope_sectors: ['government'],
      structure_description:
        'Aligned with ISO 27002:2022. Part 1 (BIO2-Kader) defines the ISMS framework. Part 2 (BIO-overheidsmaatregelen) defines mandatory government-specific measures organized by ISO 27002 control number.',
      source_url: 'https://github.com/MinBZK/Baseline-Informatiebeveiliging-Overheid',
      license: 'CC0-1.0',
      language: 'nl',
    },
    controls,
    metadata: {
      ingested_at: new Date().toISOString(),
      source_repo: REPO_URL,
      source_file: 'docs/maatregelen/index.md',
      total_controls: controls.length,
      controls_with_content: withContent.length,
      controls_iso_only: noMeasure.length,
      notes: [
        'BIO2 v1.3 no longer uses BBN levels (BBN1/BBN2/BBN3). Instead, measures are categorized as Basishygiëne, Ketenhygiëne, or Overheidsrisico.',
        'Measures marked "Geen overheidsmaatregel" indicate the ISO 27002 control applies as-is with no additional government-specific requirement.',
        'The level field contains the BIO2 "Draagt bij aan" (contributes to) categories.',
      ],
    },
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nOutput written to ${OUTPUT_FILE}`);
  console.log(`File size: ${(readFileSync(OUTPUT_FILE).length / 1024).toFixed(1)} KB`);

  // Cleanup
  rmSync(TEMP_DIR, { recursive: true, force: true });
  console.log('Temp directory cleaned up.');
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
