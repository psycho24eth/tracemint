import { Asset, EvidenceSnapshot } from "@licensehunter/types";
import { sha256Hex, toBytes32, canonicalizeJson } from "@licensehunter/shared";
import { DetectionProvider, DetectionScanResult, SimilarityComparison } from "./types";

export class DemoDetectionProvider implements DetectionProvider {
  public name = "DemoSimilarityEngine";
  public version = "1.2.0";
  public isDemo = true;

  private demoMatches: Record<string, { url: string; similarity: number; confidence: "HIGH" | "MEDIUM" }> = {
    "Cybernetic Horizon #001": {
      url: "https://demo-web-publisher.net/articles/future-ai-art-showcase.png",
      similarity: 96.4,
      confidence: "HIGH",
    },
    "Quantum Synth Brand Logo #002": {
      url: "https://unauthorized-merch-store.com/products/synth-hoodie-banner.jpg",
      similarity: 92.1,
      confidence: "HIGH",
    },
    "default": {
      url: "https://content-sharing-network.io/uploads/unauthorized-preview.jpg",
      similarity: 88.5,
      confidence: "MEDIUM",
    },
  };

  async scan(asset: Asset): Promise<DetectionScanResult[]> {
    const config = this.demoMatches[asset.name] || this.demoMatches["default"];
    // Deterministic candidate hash based on matched URL
    const candidateHash = await sha256Hex(`${asset.contentHash}:${config.url}`);

    return [
      {
        assetId: asset.id,
        assetName: asset.name,
        matchedUrl: config.url,
        matchedContentHash: toBytes32(candidateHash),
        similarityScore: config.similarity,
        confidence: config.confidence,
        detectionMethod: "DEMO_SIMILARITY",
        isDemo: true,
      },
    ];
  }

  async compare(originalHash: string, candidateHash: string): Promise<SimilarityComparison> {
    const isExact = originalHash.toLowerCase() === candidateHash.toLowerCase();
    return {
      similarityScore: isExact ? 100 : 96.4,
      isMatch: true,
      algorithm: "Normalized Structural Perceptual Distance (Demo)",
      differencesDetected: isExact ? [] : ["Minor color compression artifacts", "Resolution downscaled by 8%"],
    };
  }

  async createEvidence(
    detection: DetectionScanResult,
    rawMetadata: Record<string, unknown> = {}
  ): Promise<Partial<EvidenceSnapshot>> {
    const capturedAt = new Date().toISOString();
    const payloadToHash = {
      assetId: detection.assetId,
      matchedUrl: detection.matchedUrl,
      similarityScore: detection.similarityScore,
      capturedAt,
      provider: this.name,
      providerVersion: this.version,
      rawMetadata,
    };

    const canonicalString = canonicalizeJson(payloadToHash);
    const metadataHash = await sha256Hex(canonicalString);

    return {
      sourceUrl: detection.matchedUrl,
      capturedAt,
      contentHash: detection.matchedContentHash,
      metadataHash: toBytes32(metadataHash),
      screenshotReference: "/demo/evidence-screenshot.png",
      similarityScore: detection.similarityScore,
      provider: this.name,
      providerVersion: this.version,
      rawMetadata,
      isAnchored: false,
      visibility: "PUBLIC",
    };
  }
}
