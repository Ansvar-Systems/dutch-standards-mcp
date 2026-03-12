// __tests__/unit/get-control.test.ts
import { describe, it, expect } from 'vitest';
import { handleGetControl } from '../../src/tools/get-control.js';

describe('handleGetControl', () => {
  it('returns full control detail for bio2:5.01.01', () => {
    const result = handleGetControl({ control_id: 'bio2:5.01.01' });

    expect(result.isError).toBeFalsy();
    expect(result._meta).toBeDefined();

    const text = result.content[0].text;

    // Heading: control number
    expect(text).toContain('5.01.01');

    // English title present
    expect(text).toContain('Policies for information security');

    // Framework name
    expect(text).toContain('Baseline Informatiebeveiliging Overheid');

    // Category
    expect(text).toContain('Organizational controls');

    // Level
    expect(text).toContain('Basishygiëne');

    // ISO mapping
    expect(text).toContain('5.1');

    // Dutch description present
    expect(text).toContain('informatiebeveiliging');

    // Source URL
    expect(text).toContain('minbzk.github.io');
  });

  it('returns NO_MATCH for bio2:999.999', () => {
    const result = handleGetControl({ control_id: 'bio2:999.999' });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('NO_MATCH');
    expect(result._meta).toBeDefined();
  });

  it('returns INVALID_INPUT for missing control_id', () => {
    // @ts-expect-error -- intentional missing arg for test
    const result = handleGetControl({});

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
    expect(result._meta).toBeDefined();
  });
});
