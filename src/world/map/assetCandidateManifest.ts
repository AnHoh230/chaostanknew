import type { RequiredAssetCatalog, WorldStyleKit } from './assetDemandTypes';

export interface CandidateFileMetadata {
  path: string;
  sha256: string;
  width: number;
  height: number;
  format: 'png';
}

export interface ObservedCandidateFile extends CandidateFileMetadata {}

export interface AssetCandidateManifest {
  kitId: string;
  kitVersion: number;
  catalogSignature: string;
  state: 'candidate' | 'approved';
  files: CandidateFileMetadata[];
}

export interface CandidateManifestValidation {
  valid: boolean;
  errors: string[];
}

export function assertApprovedCandidateManifest(
  manifest: AssetCandidateManifest,
  kit: WorldStyleKit,
  catalog: RequiredAssetCatalog,
): void {
  if (manifest.state !== 'approved') {
    throw new Error(`candidate-manifest-not-approved:${kit.id}`);
  }
  if (manifest.kitId !== kit.id || manifest.kitVersion !== kit.version) {
    throw new Error(`candidate-kit-version-mismatch:${kit.id}`);
  }
  if (manifest.catalogSignature !== catalog.signature || manifest.catalogSignature !== kit.catalogSignature) {
    throw new Error(`candidate-catalog-signature-mismatch:${kit.id}`);
  }
}

export function validateCandidateManifest(
  manifest: AssetCandidateManifest,
  kit: WorldStyleKit,
  catalog: RequiredAssetCatalog,
  observedFiles: readonly ObservedCandidateFile[],
): CandidateManifestValidation {
  const errors: string[] = [];
  if (manifest.kitId !== kit.id || manifest.kitVersion !== kit.version) {
    errors.push(`candidate-kit-version-mismatch:${kit.id}`);
  }
  if (manifest.catalogSignature !== catalog.signature || manifest.catalogSignature !== kit.catalogSignature) {
    errors.push(`candidate-catalog-signature-mismatch:${kit.id}`);
  }

  const requiredPaths = [...new Set(kit.families
    .flatMap((family) => family.variants)
    .flatMap((variant) => variant.files))].sort((a, b) => a.localeCompare(b));
  const manifestByPath = new Map<string, CandidateFileMetadata>();
  for (const file of manifest.files) {
    if (manifestByPath.has(file.path)) errors.push(`candidate-duplicate-file:${file.path}`);
    manifestByPath.set(file.path, file);
    if (!/^[0-9a-f]{64}$/.test(file.sha256)) errors.push(`candidate-invalid-sha256:${file.path}`);
    if (file.width <= 0 || file.height <= 0) errors.push(`candidate-invalid-dimensions:${file.path}`);
    if (file.format !== 'png') errors.push(`candidate-invalid-format:${file.path}`);
  }
  for (const path of requiredPaths) {
    if (!manifestByPath.has(path)) errors.push(`candidate-required-file-missing:${path}`);
  }

  const observedByPath = new Map(observedFiles.map((file) => [file.path, file]));
  for (const file of manifest.files) {
    const observed = observedByPath.get(file.path);
    if (!observed) {
      errors.push(`candidate-file-not-observed:${file.path}`);
      continue;
    }
    if (observed.sha256 !== file.sha256) errors.push(`candidate-hash-mismatch:${file.path}`);
    if (observed.width !== file.width || observed.height !== file.height) {
      errors.push(`candidate-dimensions-mismatch:${file.path}`);
    }
    if (observed.format !== file.format) errors.push(`candidate-format-mismatch:${file.path}`);
  }

  const ordered = [...new Set(errors)].sort((a, b) => a.localeCompare(b));
  return { valid: ordered.length === 0, errors: ordered };
}
