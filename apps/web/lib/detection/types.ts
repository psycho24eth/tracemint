import { Asset, Detection, EvidenceSnapshot } from "@licensehunter/types";

export interface DetectionScanResult {
  assetId: string;
  assetName: string;
  matchedUrl: string;
  matchedContentHash: string;
  similarityScore: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  detectionMethod: "DEMO_SIMILARITY" | "HASH_EXACT" | "PERCEPTUAL_HASH";
  isDemo: boolean;
}

export interface SimilarityComparison {
  similarityScore: number;
  isMatch: boolean;
  algorithm: string;
  differencesDetected: string[];
}

export interface DetectionProvider {
  name: string;
  version: string;
  isDemo: boolean;
  scan(asset: Asset): Promise<DetectionScanResult[]>;
  compare(originalHash: string, candidateHash: string): Promise<SimilarityComparison>;
  createEvidence(
    detection: DetectionScanResult,
    rawMetadata?: Record<string, unknown>
  ): Promise<Partial<EvidenceSnapshot>>;
}
