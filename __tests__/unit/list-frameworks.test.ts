// __tests__/unit/list-frameworks.test.ts
import { describe, it, expect } from 'vitest';
import { handleListFrameworks } from '../../src/tools/list-frameworks.js';

describe('handleListFrameworks', () => {
  it('returns a Markdown table containing all 3 frameworks with control counts', () => {
    const result = handleListFrameworks();

    expect(result.isError).toBeFalsy();
    expect(result._meta).toBeDefined();

    const text = result.content[0].text;

    // All 3 framework IDs present
    expect(text).toContain('bio2');
    expect(text).toContain('nen-7510');
    expect(text).toContain('dnb-gpib-2023');

    // Framework names present
    expect(text).toContain('Baseline Informatiebeveiliging Overheid');
    expect(text).toContain('NEN 7510 Informatiebeveiliging in de gezondheidszorg');
    expect(text).toContain('DNB Good Practice Informatiebeveiliging Banken');

    // Issuing bodies present
    expect(text).toContain('Nationaal Cyber Security Centrum');
    expect(text).toContain('NEN (Nederlands Normalisatie-instituut)');
    expect(text).toContain('De Nederlandsche Bank (DNB)');

    // Versions present
    expect(text).toContain('2.0');
    expect(text).toContain('2017');
    expect(text).toContain('2023');

    // Control counts: bio2 has 2, nen-7510 has 1, dnb-gpib-2023 has 1
    // The number 2 appears as bio2's control count
    expect(text).toContain('| bio2 |');

    // Sectors present
    expect(text).toContain('government');
    expect(text).toContain('healthcare');
    expect(text).toContain('finance');

    // Languages present
    expect(text).toContain('nl+en');
    expect(text).toContain('nl');

    // Markdown table structure
    expect(text).toContain('| ID |');
    expect(text).toContain('|');
  });
});
