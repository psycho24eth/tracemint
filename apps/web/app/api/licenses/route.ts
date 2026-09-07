import { NextRequest, NextResponse } from "next/server";
import { AppStore } from "@/lib/store";

export async function GET() {
  const store = AppStore.getInstance();
  return NextResponse.json({
    success: true,
    data: store.licenses,
    total: store.licenses.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { offerId, licenseeAddress } = body;

    const store = AppStore.getInstance();
    const offer = store.offers.find((o) => o.id === offerId);

    if (!offer) {
      return NextResponse.json(
        { success: false, error: "License offer not found" },
        { status: 404 }
      );
    }

    // Return purchase validation intent
    return NextResponse.json({
      success: true,
      data: {
        offerId,
        assetName: offer.assetName,
        priceWei: offer.priceWei,
        currency: offer.currency,
        licenseeAddress: licenseeAddress || "0x0000000000000000000000000000000000000000",
        validDurationSeconds: offer.durationSeconds,
        termsHash: offer.termsHash,
        status: "INTENT_VERIFIED",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process license purchase intent" },
      { status: 500 }
    );
  }
}
