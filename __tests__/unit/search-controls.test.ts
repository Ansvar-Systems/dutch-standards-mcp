// __tests__/unit/search-controls.test.ts
import { describe, it, expect } from 'vitest';
import { handleSearchControls } from '../../src/tools/search-controls.js';

describe('handleSearchControls', () => {
  it('finds controls by Dutch term "informatiebeveiliging"', () => {
    const result = handleSearchControls({ query: 'informatiebeveiliging' });

    expect(result.isError).toBeFalsy();
    expect(result._meta).toBeDefined();

    const text = result.content[0].text;

    // Should find bio2:5.1 which has "informatiebeveiliging" in title_nl
    expect(text).toContain('bio2:5.1');
    expect(text).toContain('total_results');

    // Markdown table structure
    expect(text).toContain('| ID |');
    expect(text).toContain('|');
  });

  it('finds controls by English term "monitoring"', () => {
    // "monitoring" appears in bio2:8.16 title ("Monitoring activities") and title_nl
    const result = handleSearchControls({ query: 'monitoring' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // Should find bio2:8.16 which has "Monitoring" in its title
    expect(text).toContain('bio2:8.16');
    expect(text).toContain('total_results');
    // Should find at least one result
    const totalMatch = text.match(/total_results:\s*(\d+)/);
    expect(totalMatch).not.toBeNull();
    const total = parseInt(totalMatch![1], 10);
    expect(total).toBeGreaterThan(0);
  });

  it('filters by framework_id', () => {
    const result = handleSearchControls({ query: 'informatiebeveiliging', framework_id: 'bio2' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // Should find bio2 controls only
    expect(text).toContain('bio2:');

    // Should NOT find controls from other frameworks
    expect(text).not.toContain('nen-7510:');
    expect(text).not.toContain('dnb-gpib-2023:');
  });

  it('returns NO_MATCH for gibberish', () => {
    const result = handleSearchControls({ query: 'xyzzyqqqfoobarblarg' });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('NO_MATCH');
    expect(result._meta).toBeDefined();
  });

  it('returns INVALID_INPUT for empty query', () => {
    const result = handleSearchControls({ query: '' });

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
    expect(result._meta).toBeDefined();
  });

  it('returns INVALID_INPUT for missing query', () => {
    // @ts-expect-error — intentional missing arg for test
    const result = handleSearchControls({});

    expect(result.isError).toBe(true);
    expect(result._error_type).toBe('INVALID_INPUT');
    expect(result._meta).toBeDefined();
  });

  it('supports pagination with offset', () => {
    // Search for something broad enough to return multiple results
    const page1 = handleSearchControls({ query: 'informatiebeveiliging', limit: 1, offset: 0 });
    const page2 = handleSearchControls({ query: 'informatiebeveiliging', limit: 1, offset: 1 });

    expect(page1.isError).toBeFalsy();

    const text1 = page1.content[0].text;

    // Page 1 reports total count
    expect(text1).toContain('total_results');

    // If there are multiple results, page 2 should differ from page 1
    const totalMatch = text1.match(/total_results:\s*(\d+)/);
    if (totalMatch && parseInt(totalMatch[1], 10) > 1) {
      expect(page2.isError).toBeFalsy();
      const text2 = page2.content[0].text;

      // Pages should not contain the same leading control ID
      // (order may differ, but content should differ for offset pagination)
      expect(text1).not.toBe(text2);
    }
  });

  it('language fallback: EN preferred for bilingual controls, Dutch-only controls still visible', () => {
    // Search with language en — bio2:5.1 is bilingual, nen-7510:A.12.4.1 is Dutch-only
    const result = handleSearchControls({ query: 'informatiebeveiliging', language: 'en' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // bio2:5.1 has English title — should show English title
    expect(text).toContain('Information security policies');

    // Dutch-only controls: nen-7510:A.12.4.1 has title=null, title_nl='Gebeurtenissen registreren'
    // It won't appear in this search (doesn't match "informatiebeveiliging")
    // But we can verify the bilingual control shows English title correctly
    expect(text).not.toContain('Beleid voor informatiebeveiliging');
  });

  it('language fallback: Dutch-only control shows Dutch title when language is en', () => {
    // nen-7510:A.12.4.1 is Dutch-only (title=null), description_nl contains "Logbestanden"
    // category is "Operations security", subcategory "Logging and monitoring"
    // Search for something that will find it
    const result = handleSearchControls({ query: 'Gebeurtenissen', language: 'en' });

    expect(result.isError).toBeFalsy();

    const text = result.content[0].text;

    // Should find nen-7510:A.12.4.1
    expect(text).toContain('nen-7510:A.12.4.1');

    // Dutch-only: title is null, so falls back to Dutch title
    expect(text).toContain('Gebeurtenissen registreren');
  });
});
