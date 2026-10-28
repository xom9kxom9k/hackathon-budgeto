import { createHash } from 'node:crypto';

import { builtinImportProfiles } from './builtins';
import { validateImportProfile } from './validate-profile';
import type {
  ImportProfile,
  ImportProfileCandidate,
  ImportProfileClassificationInput,
  ImportProfileSelection,
} from './types';
import { ImportError, ImportErrorCode } from '../import-errors';

const normalize = (value: string): string =>
  value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ru-RU');

function headerMatches(headers: string[], expected: string[]): boolean {
  const normalized = new Set(headers.map(normalize));
  return expected.some((value) => normalized.has(normalize(value)));
}

function scoreProfile(
  profile: ImportProfile,
  input: ImportProfileClassificationInput,
): ImportProfileCandidate {
  let score = 0.2;
  let matchedHeaders = 0;
  let matchedAnchors = 0;
  if (profile.match.previewFormat && profile.match.previewFormat === input.previewFormat) {
    score += 0.7;
  }
  if (profile.match.requiredHeaders?.length) {
    matchedHeaders = profile.match.requiredHeaders.filter((expected) =>
      headerMatches(input.headers ?? [], expected),
    ).length;
    score += 0.6 * (matchedHeaders / profile.match.requiredHeaders.length);
  }
  if (profile.match.textAnchors?.length) {
    const text = normalize(input.sampleText ?? '');
    matchedAnchors = profile.match.textAnchors.filter((anchor) =>
      text.includes(normalize(anchor)),
    ).length;
    score += 0.6 * (matchedAnchors / profile.match.textAnchors.length);
  }
  return {
    profile,
    score: Math.min(1, score),
    matchedHeaders,
    matchedAnchors,
  };
}

export function listImportProfiles(): readonly ImportProfile[] {
  return builtinImportProfiles;
}

export function createImportProfileRegistry(
  profiles: readonly ImportProfile[] = builtinImportProfiles,
): readonly ImportProfile[] {
  const validated = profiles.map(validateImportProfile);
  if (new Set(validated.map((profile) => profile.id)).size !== validated.length) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_DUPLICATE);
  }
  return validated;
}

export function digestImportProfile(profile: ImportProfile): string {
  const stableJson = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
        .join(',')}}`;
    }
    return JSON.stringify(value);
  };
  return createHash('sha256').update(stableJson(profile)).digest('hex');
}

export function classifyImportProfile(
  input: ImportProfileClassificationInput,
  profiles: readonly ImportProfile[] = builtinImportProfiles,
): ImportProfileSelection {
  const candidates = createImportProfileRegistry(profiles)
    .filter((profile) => profile.format === input.format)
    .map((profile) => scoreProfile(profile, input))
    .sort(
      (left, right) => right.score - left.score || left.profile.id.localeCompare(right.profile.id),
    );
  const top = candidates[0];
  if (!top) throw new ImportError(ImportErrorCode.IMPORT_PROFILE_NOT_FOUND);
  const second = candidates[1];
  const margin = second ? top.score - second.score : 1;
  const reviewReasons: string[] = [];
  if (top.score < top.profile.review.minConfidence) reviewReasons.push('PROFILE_LOW_CONFIDENCE');
  if (second && margin < 0.1) reviewReasons.push('PROFILE_AMBIGUOUS');
  if (top.profile.review.alwaysRequired) reviewReasons.push('PROFILE_REVIEW_REQUIRED');
  return {
    profile: top.profile,
    confidence: top.score,
    reviewRequired: reviewReasons.length > 0,
    reviewReasons,
    candidates,
  };
}
