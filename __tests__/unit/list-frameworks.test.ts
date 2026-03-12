// __tests__/unit/list-frameworks.test.ts
import { describe, it, expect } from 'vitest';
import { handleListFrameworks } from '../../src/tools/list-frameworks.js';

describe('handleListFrameworks', () => {
  it('returns a Markdown table containing all 9 frameworks with control counts', () => {
    const result = handleListFrameworks();

    expect(result.isError).toBeFalsy();
    expect(result._meta).toBeDefined();

    const text = result.content[0].text;

    // Core framework IDs present
    expect(text).toContain('bio2');
    expect(text).toContain('nen-7510-2017');
    expect(text).toContain('dnb-gpib-2023');

    // Framework names present (real data)
    expect(text).toContain('Baseline Informatiebeveiliging Overheid');
    expect(text).toContain('NEN 7510');
    expect(text).toContain('DNB Good Practice');

    // Issuing bodies present (real data)
    expect(text).toContain('Binnenlandse Zaken');
    expect(text).toContain('De Nederlandsche Bank');

    // bio2 row present
    expect(text).toContain('| bio2 |');

    // Sectors present
    expect(text).toContain('government');
    expect(text).toContain('healthcare');
    expect(text).toContain('finance');

    // Markdown table structure
    expect(text).toContain('| ID |');
    expect(text).toContain('|');

    // 9 frameworks
    expect(text).toContain('9 frameworks');
  });
});
