import { describe, expect, it } from 'vitest';
import * as candidateManifestModule from './assetCandidateManifest';
import { REQUIRED_ASSET_CATALOG } from './assetDemandCompiler';
import {
  assertApprovedCandidateManifest,
  validateCandidateManifest,
  type AssetCandidateManifest,
  type ObservedCandidateFile,
} from './assetCandidateManifest';
import { IRONWASTE_V1_PREVIEW_KIT } from './ironwasteStyleKit';

const REQUIRED_FILES = [...new Set(IRONWASTE_V1_PREVIEW_KIT.families
  .flatMap((family) => family.variants)
  .flatMap((variant) => variant.files))].sort();

function fixture(): { manifest: AssetCandidateManifest; observed: ObservedCandidateFile[] } {
  const files = REQUIRED_FILES.map((path, index) => ({
    path,
    sha256: String(index + 1).padStart(64, 'a'),
    width: 256,
    height: 256,
    format: 'png' as const,
  }));
  return {
    manifest: {
      kitId: IRONWASTE_V1_PREVIEW_KIT.id,
      kitVersion: IRONWASTE_V1_PREVIEW_KIT.version,
      catalogSignature: REQUIRED_ASSET_CATALOG.signature,
      state: 'approved',
      files,
    },
    observed: files.map((file) => ({ ...file })),
  };
}

describe('assetCandidateManifest', () => {
  it('stellt ein hartes Runtime-Gate fuer genehmigte Manifeste bereit', () => {
    const exported = candidateManifestModule as unknown as Record<string, unknown>;

    expect(exported.assertApprovedCandidateManifest).toBeTypeOf('function');
  });

  it('blockiert Candidate-Dateien vor der Runtime-Planung', () => {
    const { manifest } = fixture();

    expect(() => assertApprovedCandidateManifest(
      { ...manifest, state: 'candidate' },
      IRONWASTE_V1_PREVIEW_KIT,
      REQUIRED_ASSET_CATALOG,
    )).toThrow(`candidate-manifest-not-approved:${IRONWASTE_V1_PREVIEW_KIT.id}`);
  });

  it('blockiert ein genehmigtes Manifest der falschen Kitversion', () => {
    const { manifest } = fixture();

    expect(() => assertApprovedCandidateManifest(
      { ...manifest, kitVersion: manifest.kitVersion + 1 },
      IRONWASTE_V1_PREVIEW_KIT,
      REQUIRED_ASSET_CATALOG,
    )).toThrow(`candidate-kit-version-mismatch:${IRONWASTE_V1_PREVIEW_KIT.id}`);
  });

  it('akzeptiert vollstaendige, unveraenderte Dateien der richtigen Kit- und Katalogversion', () => {
    const { manifest, observed } = fixture();

    expect(validateCandidateManifest(manifest, IRONWASTE_V1_PREVIEW_KIT, REQUIRED_ASSET_CATALOG, observed))
      .toEqual({ valid: true, errors: [] });
  });

  it('invalidiert eine Freigabe sobald sich ein beobachteter Dateihash aendert', () => {
    const { manifest, observed } = fixture();
    observed[0] = { ...observed[0]!, sha256: 'f'.repeat(64) };

    const result = validateCandidateManifest(manifest, IRONWASTE_V1_PREVIEW_KIT, REQUIRED_ASSET_CATALOG, observed);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(`candidate-hash-mismatch:${manifest.files[0]!.path}`);
  });

  it('verwirft fehlende Pflichtdateien und falsche Katalogsignaturen', () => {
    const { manifest, observed } = fixture();
    const missing = { ...manifest, catalogSignature: '00000000', files: manifest.files.slice(1) };

    const result = validateCandidateManifest(missing, IRONWASTE_V1_PREVIEW_KIT, REQUIRED_ASSET_CATALOG, observed.slice(1));

    expect(result.errors).toContain(`candidate-catalog-signature-mismatch:${IRONWASTE_V1_PREVIEW_KIT.id}`);
    expect(result.errors).toContain(`candidate-required-file-missing:${REQUIRED_FILES[0]}`);
  });
});
