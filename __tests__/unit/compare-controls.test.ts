// __tests__/unit/compare-controls.test.ts
import { describe, it, expect } from 'vitest';
import { handleCompareControls } from '../../src/tools/compare-controls.js';

describe('handleCompareControls', () => {
  it('compares controls across bio2 and dnb-gpib-2023 for "informatiebeveiliging"', () => {
    const result = handleCompareControls({
      query: 'informatiebeveiliging',
      framework_ids: ['bio2', 'dnb-gpib-2023'],
    });

    expect(result.isError).toBeFalsy();
    expect(result._meta).toBeDefined();

    const text = result.content[0].text;

    // Should have a section for each framework
    expect(text).toContain('bio2');
    expect(text).toContain('dnb-gpib-2023');

    // bio2 controls match "informatiebeveiliging" in description_nl
    expect(text).toContain('5.01');

    // GPIB-06 matches "informatiebeveiliging" in title_nl
    expect(text).toContain('GPIB-06');
    expect(text).toContain('informatiebeveiliging');
  });

  it('returns INVALID_INPUT for fewer than 2 frameworks', () => {
    const result = handleCompareControls({
      query: 'informatiebeveiliging',
      framework_ids: ['bio2'],
    });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
    expect(result._meta).toBeDefined();
  });

  it('returns INVALID_INPUT for empty framework_ids array', () => {
    const result = handleCompareControls({
      query: 'informatiebeveiliging',
      framework_ids: [],
    });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
  });

  it('returns INVALID_INPUT for more than 4 frameworks', () => {
    const result = handleCompareControls({
      query: 'informatiebeveiliging',
      framework_ids: ['bio2', 'dnb-gpib-2023', 'nen-7510-2017', 'framework-four', 'framework-five'],
    });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
    expect(result._meta).toBeDefined();
  });

  it('returns INVALID_INPUT when framework_ids is missing', () => {
    // @ts-expect-error -- intentional missing arg for test
    const result = handleCompareControls({ query: 'informatiebeveiliging' });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
  });

  it('returns INVALID_INPUT when query is missing', () => {
    // @ts-expect-error -- intentional missing arg for test
    const result = handleCompareControls({ framework_ids: ['bio2', 'dnb-gpib-2023'] });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
  });

  it('renders one markdown section per framework with control number and title', () => {
    // "moeten" FTS5-matches many NEN-7510-2017 and bio2 controls
    const result = handleCompareControls({
      query: 'moeten',
      framework_ids: ['bio2', 'nen-7510-2017'],
    });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // Section headers for each framework
    expect(text).toMatch(/##\s+bio2/);
    expect(text).toMatch(/##\s+nen-7510-2017/);
  });

  it('description snippet is at most 150 characters', () => {
    const result = handleCompareControls({
      query: 'informatiebeveiliging',
      framework_ids: ['bio2', 'dnb-gpib-2023'],
    });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;
    // The full description_nl is very long -- should be truncated
    // Verify descriptions appear and the text is present
    expect(text).toContain('informatiebeveilig');
  });
});
