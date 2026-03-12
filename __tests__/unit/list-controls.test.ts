// __tests__/unit/list-controls.test.ts
import { describe, it, expect } from 'vitest';
import { handleListControls } from '../../src/tools/list-controls.js';

describe('handleListControls', () => {
  it('lists all controls for bio2 with total_results count', () => {
    const result = handleListControls({ framework_id: 'bio2' });

    expect(result.isError).toBeFalsy();
    expect(result._meta).toBeDefined();

    const text = result.content[0].text;

    // Header with total count
    expect(text).toContain('total_results: 2');

    // Both bio2 controls present
    expect(text).toContain('bio2:5.1');
    expect(text).toContain('bio2:8.16');

    // Titles present
    expect(text).toContain('Beleid voor informatiebeveiliging');
    expect(text).toContain('Monitoring van activiteiten');

    // Markdown table structure
    expect(text).toContain('| ID |');
    expect(text).toContain('|');
  });

  it('filters controls by category', () => {
    const result = handleListControls({ framework_id: 'bio2', category: 'Organizational controls' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // Only the Organizational controls control
    expect(text).toContain('total_results: 1');
    expect(text).toContain('bio2:5.1');
    expect(text).not.toContain('bio2:8.16');
  });

  it('filters controls by level BBN1', () => {
    const result = handleListControls({ framework_id: 'bio2', level: 'BBN1' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // Only BBN1 control
    expect(text).toContain('total_results: 1');
    expect(text).toContain('bio2:5.1');
    expect(text).not.toContain('bio2:8.16');
  });

  it('returns INVALID_INPUT for missing framework_id', () => {
    // @ts-expect-error — intentional missing arg for test
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

    // Both pages report total_results: 2 (total count, not page count)
    expect(text1).toContain('total_results: 2');
    expect(text2).toContain('total_results: 2');

    // Page 1 has first control, page 2 has second control — no overlap
    const p1HasFirst = text1.includes('bio2:5.1');
    const p1HasSecond = text1.includes('bio2:8.16');
    const p2HasFirst = text2.includes('bio2:5.1');
    const p2HasSecond = text2.includes('bio2:8.16');

    // Each page has exactly one of the two controls
    expect(p1HasFirst !== p1HasSecond).toBe(true);
    expect(p2HasFirst !== p2HasSecond).toBe(true);

    // The two pages return different controls
    expect(p1HasFirst).not.toBe(p2HasFirst);
  });

  it('prefers English title when language is en', () => {
    const result = handleListControls({ framework_id: 'bio2', language: 'en' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // English titles shown
    expect(text).toContain('Information security policies');
    expect(text).toContain('Monitoring activities');
  });

  it('defaults to Dutch titles', () => {
    const result = handleListControls({ framework_id: 'bio2' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // Dutch titles shown
    expect(text).toContain('Beleid voor informatiebeveiliging');
    expect(text).toContain('Monitoring van activiteiten');
  });

  it('falls back to Dutch when English title is null', () => {
    // nen-7510:A.12.4.1 has title=null, title_nl set
    const result = handleListControls({ framework_id: 'nen-7510', language: 'en' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // Falls back to Dutch title
    expect(text).toContain('Gebeurtenissen registreren');
  });
});
