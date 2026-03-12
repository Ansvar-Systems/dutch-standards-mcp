// src/response-meta.ts
import { getMetadata } from './db.js';
import type { ErrorType } from './types.js';

const DISCLAIMER = 'Reference tool only. Not professional advice. Verify against authoritative sources.';

export function responseMeta() {
  const metadata = getMetadata();
  return {
    _meta: {
      disclaimer: DISCLAIMER,
      data_age: metadata.database_built,
    },
  };
}

export function successResponse(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
    ...responseMeta(),
  };
}

export function errorResponse(message: string, errorType: ErrorType) {
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
    _error_type: errorType,
    ...responseMeta(),
  };
}
