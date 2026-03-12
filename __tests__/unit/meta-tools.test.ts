// __tests__/unit/meta-tools.test.ts
import { describe, it, expect } from 'vitest';
import { handleAbout } from '../../src/tools/about.js';
import { handleListSources } from '../../src/tools/list-sources.js';
import { handleCheckDataFreshness } from '../../src/tools/check-data-freshness.js';

describe('meta-tools', () => {
  it('about returns server metadata with _meta', () => {
    const result = handleAbout();
    const text = result.content[0].text;
    expect(text).toContain('Dutch Standards MCP');
    expect(text).toContain('domain_intelligence');
    expect(text).toContain('Ansvar MCP Network');
    expect(result._meta).toBeDefined();
  });

  it('list_sources returns all 7 sources', () => {
    const result = handleListSources();
    const text = result.content[0].text;
    expect(text).toContain('BIO2');
    expect(text).toContain('DNB');
    expect(text).toContain('NEN');
    expect(text).toContain('NCSC-NL');
    expect(text).toContain('Logius');
    expect(result._meta).toBeDefined();
  });

  it('check_data_freshness returns a freshness report', () => {
    const result = handleCheckDataFreshness();
    const text = result.content[0].text;
    expect(text).toContain('Data Freshness Report');
    expect(result._meta).toBeDefined();
  });
});
