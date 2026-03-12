// __tests__/unit/db.test.ts
import { describe, it, expect } from 'vitest';
import { getMetadata, getFrameworkCount, getControlCount } from '../../src/db.js';

describe('Database layer', () => {
  it('opens the database and reads metadata', () => {
    const metadata = getMetadata();
    expect(metadata.mcp_name).toBe('Dutch Standards MCP');
    expect(metadata.category).toBe('domain_intelligence');
    expect(metadata.schema_version).toBeDefined();
  });

  it('counts frameworks', () => {
    const count = getFrameworkCount();
    expect(count).toBeGreaterThan(0);
  });

  it('counts controls', () => {
    const count = getControlCount();
    expect(count).toBeGreaterThan(0);
  });
});
