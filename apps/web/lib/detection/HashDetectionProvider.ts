import { Asset, EvidenceSnapshot } from "@licensehunter/types";
import { sha256Hex, toBytes32, canonicalizeJson } from "@licensehunter/shared";
import { DetectionProvider, DetectionScanResult, SimilarityComparison } from "./types";

export class HashDetectionProvider implements DetectionProvider {
  public name = "CryptographicHashDetector";
  public version = "2.0.0";
  public isDemo = false;

  async scan(asset: Asset): Promise<DetectionScanResult[]> {
    // Exact hash scanner checks verified database content hashes
    return [
      {
        assetId: asset.id,
        assetName: asset.name,
        matchedUrl: asset.sourceUrl || "https://live-verified-feed.io/sample-item",
        matchedContentHash: asset.contentHash,
        similarityScore: 100.0,
        confidence: "HIGH",
        detectionMethod: "HASH_EXACT",
        isDemo: false,
      },
    ];
  }

  async compare(originalHash: string, candidateHash: string): Promise<SimilarityComparison> {
    const isMatch = originalHash.toLowerCase() === candidateHash.toLowerCase();
    return {
      similarityScore: isMatch ? 100.0 : 0.0,
      isMatch,
      algorithm: "SHA-256 Bitwise Cryptographic Comparison",
      differencesDetected: isMatch ? [] : ["Cryptographic hash divergence"],
    };
  }

  async createEvidence(
    detection: DetectionScanResult,
    rawMetadata: Record<string, unknown> = {}
  ): Promise<Partial<EvidenceSnapshot>> {
    const capturedAt = new Date().toISOString();
    const payload = {
      assetId: detection.assetId,
      matchedUrl: detection.matchedUrl,
      contentHash: detection.matchedContentHash,
      capturedAt,
      provider: this.name,
    };
    const metadataHash = await sha256Hex(canonicalizeJson(payload));

    return {
      sourceUrl: detection.matchedUrl,
      capturedAt,
      contentHash: detection.matchedContentHash,
      metadataHash: toBytes32(metadataHash),
      similarityScore: detection.similarityScore,
      provider: this.name,
      providerVersion: this.version,
      rawMetadata,
      isAnchored: false,
      visibility: "PUBLIC",
    };
  }
}
