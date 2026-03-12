// __tests__/contract/golden.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { handleGetControl } from '../../src/tools/get-control.js';
import { handleGetFramework } from '../../src/tools/get-framework.js';
import { handleListFrameworks } from '../../src/tools/list-frameworks.js';
import { handleListControls } from '../../src/tools/list-controls.js';
import { handleSearchControls } from '../../src/tools/search-controls.js';
import { handleCompareControls } from '../../src/tools/compare-controls.js';
import { handleGetIsoMapping } from '../../src/tools/get-iso-mapping.js';
import { handleSearchBySector } from '../../src/tools/search-by-sector.js';
import { handleAbout } from '../../src/tools/about.js';
import { handleListSources } from '../../src/tools/list-sources.js';
import { handleCheckDataFreshness } from '../../src/tools/check-data-freshness.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOOL_MAP: Record<string, Function> = {
  get_control: handleGetControl,
  get_framework: handleGetFramework,
  list_frameworks: handleListFrameworks,
  list_controls: handleListControls,
  search_controls: handleSearchControls,
  compare_controls: handleCompareControls,
  get_iso_mapping: handleGetIsoMapping,
  search_by_sector: handleSearchBySector,
  about: handleAbout,
  list_sources: handleListSources,
  check_data_freshness: handleCheckDataFreshness,
};

interface Assertion {
  type: 'contains' | 'has_meta' | 'is_error' | 'error_type';
  value?: string;
}

interface GoldenTest {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  assertions: Assertion[];
}

const fixturesPath = join(__dirname, '..', '..', 'fixtures', 'golden-tests.json');
const goldenTests: GoldenTest[] = JSON.parse(readFileSync(fixturesPath, 'utf-8'));

describe('Golden contract tests', () => {
  for (const test of goldenTests) {
    it(test.id, () => {
      const handler = TOOL_MAP[test.tool];
      expect(handler, `No handler found for tool: ${test.tool}`).toBeDefined();

      const result = handler(test.args) as any;

      for (const assertion of test.assertions) {
        switch (assertion.type) {
          case 'contains':
            expect(
              result.content[0].text,
              `[${test.id}] expected text to contain "${assertion.value}"`
            ).toContain(assertion.value);
            break;

          case 'has_meta':
            expect(
              result._meta,
              `[${test.id}] expected _meta to be defined`
            ).toBeDefined();
            expect(
              result._meta.disclaimer,
              `[${test.id}] expected _meta.disclaimer to be defined`
            ).toBeDefined();
            break;

          case 'is_error':
            expect(
              result.isError,
              `[${test.id}] expected isError to be true`
            ).toBe(true);
            break;

          case 'error_type':
            expect(
              result._error_type,
              `[${test.id}] expected _error_type to equal "${assertion.value}"`
            ).toBe(assertion.value);
            break;

          default:
            throw new Error(`Unknown assertion type: ${(assertion as any).type}`);
        }
      }
    });
  }
});
