// __tests__/unit/search-by-sector.test.ts
import { describe, it, expect } from 'vitest';
import { handleSearchBySector } from '../../src/tools/search-by-sector.js';

describe('handleSearchBySector', () => {
  it('healthcare sector returns nen-7510 but not dnb-gpib-2023', () => {
    const result = handleSearchBySector({ sector: 'healthcare' });

    expect(result.isError).toBeFalsy();
    expect(result._meta).toBeDefined();

    const text = result.content[0].text;

    expect(text).toContain('nen-7510');
    expect(text).not.toContain('dnb-gpib-2023');
    expect(text).not.toContain('bio2');
  });

  it('finance sector returns dnb-gpib-2023', () => {
    const result = handleSearchBySector({ sector: 'finance' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    expect(text).toContain('dnb-gpib-2023');
    expect(text).not.toContain('nen-7510');
    expect(text).not.toContain('bio2');
  });

  it('government sector returns bio2', () => {
    const result = handleSearchBySector({ sector: 'government' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    expect(text).toContain('bio2');
    expect(text).not.toContain('nen-7510');
    expect(text).not.toContain('dnb-gpib-2023');
  });

  it('with query param returns matching controls within sector frameworks', () => {
    // BIO2 is government sector; "informatiebeveiliging" matches bio2 controls
    const result = handleSearchBySector({ sector: 'government', query: 'informatiebeveiliging' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // Framework section must be present
    expect(text).toContain('bio2');

    // Controls section must be present with a match
    expect(text).toContain('bio2:');

    // Must not leak controls from other sectors
    expect(text).not.toContain('nen-7510:');
    expect(text).not.toContain('dnb-gpib-2023:');
  });

  it('unknown sector returns INVALID_INPUT', () => {
    const result = handleSearchBySector({ sector: 'unknown-sector-xyz' });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
    expect(result._meta).toBeDefined();
  });

  it('missing/empty sector returns INVALID_INPUT', () => {
    // @ts-expect-error — intentional missing arg for test
    const result = handleSearchBySector({});

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
  });

  it('empty string sector returns INVALID_INPUT', () => {
    const result = handleSearchBySector({ sector: '' });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
  });

  it('returns NO_MATCH when sector has no frameworks', () => {
    // 'energy' is a valid sector name but no frameworks are seeded for it
    const result = handleSearchBySector({ sector: 'energy' });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('NO_MATCH');
  });
});
