import { NextRequest, NextResponse } from "next/server";
import { AppStore } from "@/lib/store";
import { sha256Hex, toBytes32, canonicalizeJson } from "@licensehunter/shared";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { detectionId, rawMetadata } = body;

    const store = AppStore.getInstance();
    const detection = store.detections.find((d) => d.id === detectionId);

    if (!detection) {
      return NextResponse.json(
        { success: false, error: "Detection not found" },
        { status: 404 }
      );
    }

    const capturedAt = new Date().toISOString();
    const metadataPayload = {
      detectionId,
      sourceUrl: detection.matchedUrl,
      capturedAt,
      rawMetadata: rawMetadata || {},
    };

    const canonical = canonicalizeJson(metadataPayload);
    const metadataHash = await sha256Hex(canonical);

    const evidenceSnapshot = {
      id: `e-api-${Date.now()}`,
      detectionId,
      sourceUrl: detection.matchedUrl,
      capturedAt,
      contentHash: detection.matchedContentHash,
      metadataHash: toBytes32(metadataHash),
      similarityScore: detection.similarityScore,
      provider: "DemoSimilarityEngine",
      providerVersion: "1.2.0",
      rawMetadata: rawMetadata || {},
      isAnchored: false,
      visibility: "PUBLIC" as const,
      createdAt: capturedAt,
    };

    store.evidence.push(evidenceSnapshot);

    return NextResponse.json({
      success: true,
      data: evidenceSnapshot,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create evidence snapshot" },
      { status: 500 }
    );
  }
}
