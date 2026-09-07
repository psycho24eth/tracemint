import { NextRequest, NextResponse } from "next/server";
import { AppStore } from "@/lib/store";
import { getDetectionProvider } from "@/lib/detection";
import { validateSafeUrl } from "@licensehunter/shared";

export async function GET() {
  const store = AppStore.getInstance();
  return NextResponse.json({
    success: true,
    data: store.detections,
    total: store.detections.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assetId, customUrl } = body;

    const store = AppStore.getInstance();
    const asset = store.assets.find((a) => a.id === assetId);

    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found" },
        { status: 404 }
      );
    }

    if (customUrl) {
      const urlValidation = validateSafeUrl(customUrl);
      if (!urlValidation.isValid) {
        return NextResponse.json(
          { success: false, error: `Invalid URL: ${urlValidation.reason}` },
          { status: 400 }
        );
      }
    }

    const provider = getDetectionProvider("DEMO");
    const results = await provider.scan(asset);

    const newDetections = results.map((r) => ({
      id: `c-api-${Date.now()}`,
      assetId: asset.id,
      assetName: asset.name,
      creatorId: asset.creatorId,
      creatorWallet: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      matchedUrl: customUrl || r.matchedUrl,
      matchedContentHash: r.matchedContentHash,
      similarityScore: r.similarityScore,
      confidence: r.confidence,
      detectionMethod: r.detectionMethod,
      isDemo: r.isDemo,
      status: "PENDING_REVIEW" as const,
      detectedAt: new Date().toISOString(),
    }));

    newDetections.forEach((d) => store.addDetection(d));

    return NextResponse.json({
      success: true,
      data: newDetections,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute detection scan" },
      { status: 500 }
    );
  }
}
