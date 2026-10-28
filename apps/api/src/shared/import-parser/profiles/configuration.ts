import { builtinImportProfiles } from './builtins';
import { createImportProfileRegistry } from './registry';
import type { ImportProfile } from './types';
import { ImportError, ImportErrorCode } from '../import-errors';

const maxConfigurationBytes = 256 * 1024;

export function loadConfiguredImportProfiles(
  rawConfiguration = process.env.IMPORT_PROFILES_JSON,
): readonly ImportProfile[] {
  if (!rawConfiguration?.trim()) return createImportProfileRegistry(builtinImportProfiles);
  if (Buffer.byteLength(rawConfiguration, 'utf8') > maxConfigurationBytes) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawConfiguration);
  } catch (error) {
    throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID, undefined, { cause: error });
  }
  if (!Array.isArray(parsed)) throw new ImportError(ImportErrorCode.IMPORT_PROFILE_INVALID);

  return createImportProfileRegistry([...builtinImportProfiles, ...parsed]);
}
