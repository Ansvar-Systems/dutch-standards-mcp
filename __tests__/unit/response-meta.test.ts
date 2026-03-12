// __tests__/unit/response-meta.test.ts
import { describe, it, expect } from 'vitest';
import { responseMeta, errorResponse, successResponse } from '../../src/response-meta.js';

describe('response-meta', () => {
  it('returns _meta with disclaimer and data_age', () => {
    const meta = responseMeta();
    expect(meta._meta.disclaimer).toBe(
      'Reference tool only. Not professional advice. Verify against authoritative sources.'
    );
    expect(meta._meta.data_age).toBeDefined();
  });

  it('builds a success response with _meta', () => {
    const resp = successResponse('## Result\nSome content');
    expect(resp.content[0].type).toBe('text');
    expect(resp.content[0].text).toBe('## Result\nSome content');
    expect(resp._meta).toBeDefined();
  });

  it('builds an error response with _error_type', () => {
    const resp = errorResponse('Not found', 'NO_MATCH');
    expect(resp.isError).toBe(true);
    expect(resp._error_type).toBe('NO_MATCH');
    expect(resp._meta).toBeDefined();
  });
});
