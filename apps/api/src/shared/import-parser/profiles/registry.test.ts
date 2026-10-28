import { describe, expect, it } from 'vitest';

import {
  classifyImportProfile,
  createImportProfileRegistry,
  digestImportProfile,
  listImportProfiles,
} from './registry';

describe('import profile registry', () => {
  it('selects a versioned built-in profile deterministically', () => {
    const input = {
      format: 'csv' as const,
      previewFormat: 'generic-csv' as const,
      headers: ['Дата', 'Кредит', 'Счёт'],
    };
    const first = classifyImportProfile(input);
    const second = classifyImportProfile(input);
    expect(first.profile.id).toBe('generic-csv-table');
    expect(first.profile.version).toBe('1.0.0');
    expect(first).toEqual(second);
  });

  it('requires review for the conservative text-PDF profile', () => {
    const result = classifyImportProfile({
      format: 'pdf',
      previewFormat: 'generic-pdf',
      sampleText: '01.02.2026 -1250.50',
    });
    expect(result.profile.id).toBe('generic-pdf-text-table');
    expect(result.reviewRequired).toBe(true);
    expect(result.reviewReasons).toContain('PROFILE_REVIEW_REQUIRED');
  });

  it('produces stable profile digests and exposes only built-ins', () => {
    const profiles = listImportProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(4);
    expect(digestImportProfile(profiles[0])).toMatch(/^[a-f0-9]{64}$/);
    expect(digestImportProfile(profiles[0])).toBe(digestImportProfile(profiles[0]));
    expect(digestImportProfile({ ...profiles[0], match: { ...profiles[0].match } })).toBe(
      digestImportProfile(profiles[0]),
    );
  });

  it('rejects executable or duplicate profile configuration', () => {
    const profile = listImportProfiles()[0];
    expect(() =>
      createImportProfileRegistry([
        { ...profile, match: { ...profile.match, regex: '.*' } } as never,
      ]),
    ).toThrow('IMPORT_PROFILE_UNSAFE');
    expect(() => createImportProfileRegistry([profile, profile])).toThrow(
      'IMPORT_PROFILE_DUPLICATE',
    );
    expect(() =>
      createImportProfileRegistry([
        { ...profile, format: 'pdf', layout: { kind: 'table', amountMode: 'signed' } } as never,
      ]),
    ).toThrow('IMPORT_PROFILE_INVALID');
  });
});
