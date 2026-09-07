import { NextRequest, NextResponse } from "next/server";
import { AppStore } from "@/lib/store";
import { sha256Hex, toBytes32 } from "@licensehunter/shared";

export async function GET() {
  const store = AppStore.getInstance();
  return NextResponse.json({
    success: true,
    data: store.assets,
    total: store.assets.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, type, contentHash, creatorWallet } = body;

    if (!name || !contentHash) {
      return NextResponse.json(
        { success: false, error: "Asset name and contentHash are required" },
        { status: 400 }
      );
    }

    const store = AppStore.getInstance();
    const metaHash = await sha256Hex(JSON.stringify({ name, description, type }));

    const newAsset = {
      id: `b0000000-${Date.now().toString(16).padStart(12, "0")}`,
      creatorId: creatorWallet || "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      name,
      description: description || "",
      type: type || "IMAGE",
      contentHash: toBytes32(contentHash),
      metadataHash: toBytes32(metaHash),
      status: "MONITORING" as const,
      blockchainAssetId: String(store.assets.length + 1),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [
        {
          id: `v1-${Date.now()}`,
          assetId: `b0000000-${Date.now().toString(16).padStart(12, "0")}`,
          versionNumber: 1,
          contentHash: toBytes32(contentHash),
          metadataHash: toBytes32(metaHash),
          createdAt: new Date().toISOString(),
          changelog: "Initial registration",
        },
      ],
    };

    store.registerAsset(newAsset);

    return NextResponse.json({
      success: true,
      data: newAsset,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process asset registration" },
      { status: 500 }
    );
  }
}
