// __tests__/unit/get-control.test.ts
import { describe, it, expect } from 'vitest';
import { handleGetControl } from '../../src/tools/get-control.js';

describe('handleGetControl', () => {
  it('returns full control detail for bio2:5.1', () => {
    const result = handleGetControl({ control_id: 'bio2:5.1' });

    expect(result.isError).toBeFalsy();
    expect(result._meta).toBeDefined();

    const text = result.content[0].text;

    // Heading: control number + Dutch title
    expect(text).toContain('5.1');
    expect(text).toContain('Beleid voor informatiebeveiliging');

    // English title (different from Dutch)
    expect(text).toContain('Information security policies');

    // Framework name and issuing body
    expect(text).toContain('Baseline Informatiebeveiliging Overheid');
    expect(text).toContain('Nationaal Cyber Security Centrum');

    // Category
    expect(text).toContain('Organizational controls');

    // Level
    expect(text).toContain('BBN1');

    // ISO mapping
    expect(text).toContain('5.1');

    // Bilingual descriptions
    expect(text).toContain('Policies for information security');
    expect(text).toContain('Beleid voor informatiebeveiliging en onderwerpspecifiek beleid');

    // Implementation and verification guidance
    expect(text).toContain('Establish a clear');
    expect(text).toContain('Verify policy document');

    // Source URL
    expect(text).toContain('https://bio-overheid.nl/5.1');
  });

  it('returns NO_MATCH for bio2:999.999', () => {
    const result = handleGetControl({ control_id: 'bio2:999.999' });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('NO_MATCH');
    expect(result._meta).toBeDefined();
  });

  it('returns INVALID_INPUT for missing control_id', () => {
    // @ts-expect-error — intentional missing arg for test
    const result = handleGetControl({});

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
    expect(result._meta).toBeDefined();
  });
});
