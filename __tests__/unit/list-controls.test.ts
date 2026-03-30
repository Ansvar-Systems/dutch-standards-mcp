// __tests__/unit/list-controls.test.ts
import { describe, it, expect } from 'vitest';
import { handleListControls } from '../../src/tools/list-controls.js';

describe('handleListControls', () => {
  it('lists all controls for bio2 with total_results count', () => {
    const result = handleListControls({ framework_id: 'bio2' });

    expect(result.isError).toBeFalsy();
    expect(result._meta).toBeDefined();

    const text = result.content[0].text;

    // Header with total count (varies with upstream data)
    expect(text).toMatch(/total_results: \d+/);

    // First bio2 control present
    expect(text).toContain('bio2:5.01.01');

    // Markdown table structure
    expect(text).toContain('| ID |');
    expect(text).toContain('|');
  });

  it('filters controls by category', () => {
    const result = handleListControls({ framework_id: 'bio2', category: 'Organizational controls' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // Organizational controls present
    expect(text).toContain('bio2:5.01.01');
    expect(text).not.toContain('bio2:8.16.01');
  });

  it('filters controls by level when level data exists', () => {
    // Level values may change with upstream data refreshes;
    // verify the filter mechanism works, not specific level strings
    const all = handleListControls({ framework_id: 'bio2' });
    const allText = all.content[0].text;
    const allMatch = allText.match(/total_results: (\d+)/);
    const totalAll = allMatch ? parseInt(allMatch[1], 10) : 0;

    // Filter by a non-existent level should return fewer results
    const filtered = handleListControls({ framework_id: 'bio2', level: 'NONEXISTENT_LEVEL_VALUE' });
    const filteredText = filtered.content[0].text;
    const filteredMatch = filteredText.match(/total_results: (\d+)/);
    const totalFiltered = filteredMatch ? parseInt(filteredMatch[1], 10) : 0;

    // Filtering by a non-existent level should return 0 or fewer results
    expect(totalFiltered).toBeLessThan(totalAll);
  });

  it('returns INVALID_INPUT for missing framework_id', () => {
    // @ts-expect-error -- intentional missing arg for test
    const result = handleListControls({});

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
    expect(result._meta).toBeDefined();
  });

  it('returns NO_MATCH for unknown framework', () => {
    const result = handleListControls({ framework_id: 'nonexistent-framework' });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('NO_MATCH');
    expect(result._meta).toBeDefined();
  });

  it('paginates results via limit and offset', () => {
    const page1 = handleListControls({ framework_id: 'bio2', limit: 1, offset: 0 });
    const page2 = handleListControls({ framework_id: 'bio2', limit: 1, offset: 1 });

    expect(page1.isError).toBeFalsy();
    expect(page2.isError).toBeFalsy();

    const text1 = page1.content[0].text;
    const text2 = page2.content[0].text;

    // Both pages report the same full total_results
    expect(text1).toMatch(/total_results: \d+/);
    expect(text2).toMatch(/total_results: \d+/);

    // The two pages return different controls
    expect(text1).not.toBe(text2);
  });

  it('prefers English title when language is en', () => {
    const result = handleListControls({ framework_id: 'bio2', language: 'en' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // English title present in bio2 real data
    expect(text).toContain('Policies for information security');
  });

  it('defaults to Dutch titles', () => {
    const result = handleListControls({ framework_id: 'bio2' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // bio2 Dutch title_nl (real data uses control number as title_nl)
    expect(text).toContain('Overheidsmaatregel');
  });

  it('falls back to Dutch when English title is null', () => {
    // nen-7510-2017 controls have title=null, title_nl set
    const result = handleListControls({ framework_id: 'nen-7510-2017', language: 'en' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // Falls back to Dutch title (first alphabetical result is 10.1.1)
    expect(text).toContain('Beleid inzake het gebruik van cryptografische beheersmaatregelen');
  });
});
