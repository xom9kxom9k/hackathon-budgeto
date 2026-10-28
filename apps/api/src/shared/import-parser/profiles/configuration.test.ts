import { describe, expect, it } from 'vitest';

import { ImportErrorCode } from '../import-errors';
import { classifyImportProfile } from './registry';
import { loadConfiguredImportProfiles } from './configuration';

describe('configured import profiles', () => {
  it('keeps built-ins when no external configuration is provided', () => {
    const profiles = loadConfiguredImportProfiles('');
    expect(profiles.map((profile) => profile.id)).toEqual([
      'budgeto-xlsx',
      'budgeto-finance-xlsx',
      'generic-csv-table',
      'generic-pdf-text-table',
    ]);
  });

  it('adds validated declarative profiles to the worker registry', () => {
    const profiles = loadConfiguredImportProfiles(
      JSON.stringify([
        {
          id: 'bank-pdf-v1',
          version: '1.0.0',
          format: 'pdf',
          match: { textAnchors: ['ANONYMIZED BANK'] },
          layout: {
            kind: 'pdf-lines',
            amountRule: 'signed-amount',
            descriptionRule: 'between-date-and-amount',
            recordRule: 'date-block',
          },
          review: { alwaysRequired: true, minConfidence: 0.9 },
        },
      ]),
    );

    expect(profiles).toHaveLength(5);
    expect(profiles.at(-1)).toMatchObject({ id: 'bank-pdf-v1', version: '1.0.0' });
    const selection = classifyImportProfile(
      { format: 'pdf', sampleText: 'ANONYMIZED BANK\n01.02.2026 Merchant -12.50' },
      profiles,
    );
    expect(selection.profile.id).toBe('bank-pdf-v1');
    expect(selection.reviewRequired).toBe(true);
  });

  it('rejects malformed or executable configuration before parsing documents', () => {
    expect(() => loadConfiguredImportProfiles('{not-json}')).toThrow(
      ImportErrorCode.IMPORT_PROFILE_INVALID,
    );
    expect(() =>
      loadConfiguredImportProfiles(
        JSON.stringify([
          {
            id: 'unsafe-pdf',
            version: '1.0.0',
            format: 'pdf',
            match: { regex: '.*' },
            layout: {
              kind: 'pdf-lines',
              amountRule: 'signed-amount',
              descriptionRule: 'between-date-and-amount',
            },
            review: { alwaysRequired: true, minConfidence: 0.9 },
          },
        ]),
      ),
    ).toThrow(ImportErrorCode.IMPORT_PROFILE_UNSAFE);
  });
});
