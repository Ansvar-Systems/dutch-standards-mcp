// __tests__/unit/get-framework.test.ts
import { describe, it, expect } from 'vitest';
import { handleGetFramework } from '../../src/tools/get-framework.js';

describe('handleGetFramework', () => {
  it('returns framework details for bio2 including control count, categories table, and sectors', () => {
    const result = handleGetFramework({ framework_id: 'bio2' });

    expect(result.isError).toBeFalsy();
    expect(result._meta).toBeDefined();

    const text = result.content[0].text;

    // Framework name
    expect(text).toContain('Baseline Informatiebeveiliging Overheid');
    expect(text).toContain('Baseline Information Security Government');

    // Issuing body (real data: BZK, not NCSC)
    expect(text).toContain('Binnenlandse Zaken');

    // Sectors
    expect(text).toContain('government');

    // Control count -- bio2 has 160 controls in real DB
    expect(text).toContain('160');

    // Categories table -- real bio2 categories
    expect(text).toContain('Organizational controls');
    expect(text).toContain('Technological controls');

    // Source URL
    expect(text).toContain('github.com');
  });

  it('returns NO_MATCH for unknown framework', () => {
    const result = handleGetFramework({ framework_id: 'nonexistent-fw' });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('NO_MATCH');
    expect(result._meta).toBeDefined();
  });

  it('returns INVALID_INPUT for missing framework_id', () => {
    // @ts-expect-error -- intentional missing arg for test
    const result = handleGetFramework({});

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
    expect(result._meta).toBeDefined();
  });
});
