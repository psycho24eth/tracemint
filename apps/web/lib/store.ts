import {
  Asset,
  Detection,
  EvidenceSnapshot,
  LicenseOffer,
  License,
  AuditEvent,
  RoyaltyAccounting,
} from "@licensehunter/types";
import { sha256Hex, toBytes32, canonicalizeJson } from "@licensehunter/shared";

const INITIAL_ASSETS: Asset[] = [
  {
    id: "b0000000-0000-0000-0000-000000000001",
    creatorId: "a0000000-0000-0000-0000-000000000001",
    name: "Cybernetic Horizon #001",
    description: "High-resolution conceptual 3D environmental artwork with verified cryptographic provenance.",
    type: "ARTWORK",
    sourceUrl: "https://arweave.net/tx-cybernetic-horizon-001",
    contentHash: "0x4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    metadataHash: "0x9c31405e608b115ffbe361e2f7b8893d9b04f7b6058dbbfeef3f637f90352ffb",
    status: "MONITORING",
    blockchainAssetId: "1",
    registrationTxHash: "0x738914ab771032df3801ea3bc05e7141b65e718b52f6b89bb73a3887c2b64d29",
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
    licensePolicy: {
      suggestedPriceWei: "50000000000000000", // 0.05 ETH
      standardDurationSeconds: 2592000, // 30 days
      commercialAllowed: true,
      derivativesAllowed: false,
    },
    versions: [
      {
        id: "v1-001",
        assetId: "b0000000-0000-0000-0000-000000000001",
        versionNumber: 1,
        contentHash: "0x4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
        metadataHash: "0x9c31405e608b115ffbe361e2f7b8893d9b04f7b6058dbbfeef3f637f90352ffb",
        createdAt: "2026-09-01T10:00:00Z",
        changelog: "Initial master render release",
      },
    ],
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    creatorId: "a0000000-0000-0000-0000-000000000001",
    name: "Quantum Synth Brand Logo #002",
    description: "Vector corporate brand mark and registered digital trademark asset.",
    type: "IMAGE",
    sourceUrl: "https://arweave.net/tx-quantum-synth-002",
    contentHash: "0x82f1b4097e3a6cbb8e4693a0df4728b9911e2f18ec7e834b6e5e8e3f940173bc",
    metadataHash: "0x2b3815c4a10df8e3f7cbb519e4873812fa4b84018f2bb872ac650081bb45e381",
    status: "MONITORING",
    blockchainAssetId: "2",
    registrationTxHash: "0x892a014bdf881023ba394e82bc591410ab4918e745bc01e89ffba3920194bc02",
    createdAt: "2026-09-02T14:30:00Z",
    updatedAt: "2026-09-02T14:30:00Z",
    licensePolicy: {
      suggestedPriceWei: "100000000000000000", // 0.1 ETH
      standardDurationSeconds: 7776000, // 90 days
      commercialAllowed: true,
      derivativesAllowed: true,
    },
    versions: [
      {
        id: "v1-002",
        assetId: "b0000000-0000-0000-0000-000000000002",
        versionNumber: 1,
        contentHash: "0x82f1b4097e3a6cbb8e4693a0df4728b9911e2f18ec7e834b6e5e8e3f940173bc",
        metadataHash: "0x2b3815c4a10df8e3f7cbb519e4873812fa4b84018f2bb872ac650081bb45e381",
        createdAt: "2026-09-02T14:30:00Z",
        changelog: "Original trademark SVG registration",
      },
    ],
  },
];

const INITIAL_DETECTIONS: Detection[] = [
  {
    id: "c0000000-0000-0000-0000-000000000001",
    assetId: "b0000000-0000-0000-0000-000000000001",
    assetName: "Cybernetic Horizon #001",
    creatorId: "a0000000-0000-0000-0000-000000000001",
    creatorWallet: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    matchedUrl: "https://demo-web-publisher.net/articles/future-ai-art-showcase.png",
    matchedContentHash: "0x4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    similarityScore: 96.4,
    confidence: "HIGH",
    detectionMethod: "DEMO_SIMILARITY",
    isDemo: true,
    status: "VERIFIED",
    detectedAt: "2026-09-05T08:15:00Z",
    evidenceSnapshotId: "e0000000-0000-0000-0000-000000000001",
  },
  {
    id: "c0000000-0000-0000-0000-000000000002",
    assetId: "b0000000-0000-0000-0000-000000000002",
    assetName: "Quantum Synth Brand Logo #002",
    creatorId: "a0000000-0000-0000-0000-000000000001",
    creatorWallet: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    matchedUrl: "https://unauthorized-merch-store.com/products/synth-hoodie-banner.jpg",
    matchedContentHash: "0x82f1b4097e3a6cbb8e4693a0df4728b9911e2f18ec7e834b6e5e8e3f940173bc",
    similarityScore: 92.1,
    confidence: "HIGH",
    detectionMethod: "DEMO_SIMILARITY",
    isDemo: true,
    status: "PENDING_REVIEW",
    detectedAt: "2026-09-06T11:42:00Z",
  },
];

const INITIAL_EVIDENCE: EvidenceSnapshot[] = [
  {
    id: "e0000000-0000-0000-0000-000000000001",
    detectionId: "c0000000-0000-0000-0000-000000000001",
    sourceUrl: "https://demo-web-publisher.net/articles/future-ai-art-showcase.png",
    capturedAt: "2026-09-05T08:16:30Z",
    contentHash: "0x4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    metadataHash: "0x3e18a992bc44e12ff98012bbcc4499e1201190bcda448833bbee2211440022ee",
    screenshotReference: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    similarityScore: 96.4,
    provider: "DemoSimilarityEngine",
    providerVersion: "1.2.0",
    rawMetadata: {
      httpStatus: 200,
      contentType: "image/png",
      contentLengthBytes: 418290,
      extractedDimensions: "1920x1080",
    },
    isAnchored: true,
    anchoredTxHash: "0x3b91fa028bc17849e7766100eecc8823190ab77102998811ee33aa221199aacc",
    anchoredBlockNumber: 6542190,
    visibility: "PUBLIC",
    createdAt: "2026-09-05T08:16:30Z",
  },
];

const INITIAL_OFFERS: LicenseOffer[] = [
  {
    id: "off-001",
    licenseId: "lic-001",
    assetId: "b0000000-0000-0000-0000-000000000001",
    assetName: "Cybernetic Horizon #001",
    creatorAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    licenseeAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    priceWei: "50000000000000000", // 0.05 ETH
    currency: "ETH",
    durationSeconds: 2592000,
    createdAt: "2026-09-06T15:00:00Z",
    expiresAt: "2026-10-06T15:00:00Z",
    termsHash: "0x98bb776622aa1100ff99887766554433221100ffeeccaabb9988776655443322",
    termsText: "Non-exclusive digital editorial and promotional license. Commercial redistribution strictly prohibited.",
    status: "ACTIVE",
    creationTxHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  },
];

const INITIAL_LICENSES: License[] = [];

const INITIAL_ROYALTIES: RoyaltyAccounting = {
  creatorAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  pendingBalanceWei: "0",
  withdrawnBalanceWei: "0",
  totalEarnedWei: "0",
};

const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "aud-001",
    actor: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    action: "ASSET_CREATED",
    entityType: "Asset",
    entityId: "b0000000-0000-0000-0000-000000000001",
    timestamp: "2026-09-01T10:00:00Z",
    metadata: { name: "Cybernetic Horizon #001", type: "ARTWORK" },
    txHash: "0x738914ab771032df3801ea3bc05e7141b65e718b52f6b89bb73a3887c2b64d29",
  },
  {
    id: "aud-002",
    actor: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    action: "DETECTION_CREATED",
    entityType: "Detection",
    entityId: "c0000000-0000-0000-0000-000000000001",
    timestamp: "2026-09-05T08:15:00Z",
    metadata: { similarity: 96.4, matchedUrl: "https://demo-web-publisher.net/articles/future-ai-art-showcase.png" },
  },
  {
    id: "aud-003",
    actor: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    action: "EVIDENCE_ANCHORED",
    entityType: "EvidenceSnapshot",
    entityId: "e0000000-0000-0000-0000-000000000001",
    timestamp: "2026-09-05T08:16:30Z",
    metadata: { anchoredBlock: 6542190 },
    txHash: "0x3b91fa028bc17849e7766100eecc8823190ab77102998811ee33aa221199aacc",
  },
];

export class AppStore {
  private static instance: AppStore;

  public assets: Asset[] = INITIAL_ASSETS;
  public detections: Detection[] = INITIAL_DETECTIONS;
  public evidence: EvidenceSnapshot[] = INITIAL_EVIDENCE;
  public offers: LicenseOffer[] = INITIAL_OFFERS;
  public licenses: License[] = INITIAL_LICENSES;
  public royalties: RoyaltyAccounting = INITIAL_ROYALTIES;
  public auditEvents: AuditEvent[] = INITIAL_AUDIT_EVENTS;

  private listeners: Set<() => void> = new Set();

  private constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
    }
  }

  public static getInstance(): AppStore {
    if (!AppStore.instance) {
      AppStore.instance = new AppStore();
    }
    return AppStore.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    if (typeof window !== "undefined") {
      this.saveToStorage();
    }
    this.listeners.forEach((listener) => listener());
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem("licensehunter_store_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.assets) this.assets = parsed.assets;
        if (parsed.detections) this.detections = parsed.detections;
        if (parsed.evidence) this.evidence = parsed.evidence;
        if (parsed.offers) this.offers = parsed.offers;
        if (parsed.licenses) this.licenses = parsed.licenses;
        if (parsed.royalties) this.royalties = parsed.royalties;
        if (parsed.auditEvents) this.auditEvents = parsed.auditEvents;
      }
    } catch (e) {
      console.error("Failed to load store from localStorage", e);
    }
  }

  private saveToStorage(): void {
    try {
      const payload = {
        assets: this.assets,
        detections: this.detections,
        evidence: this.evidence,
        offers: this.offers,
        licenses: this.licenses,
        royalties: this.royalties,
        auditEvents: this.auditEvents,
      };
      localStorage.setItem("licensehunter_store_v1", JSON.stringify(payload));
    } catch (e) {
      console.error("Failed to save store to localStorage", e);
    }
  }

  public registerAsset(asset: Asset, txHash?: string): void {
    this.assets.unshift(asset);
    this.auditEvents.unshift({
      id: `aud-${Date.now()}`,
      actor: asset.creatorId,
      action: "ASSET_CREATED",
      entityType: "Asset",
      entityId: asset.id,
      timestamp: new Date().toISOString(),
      metadata: { name: asset.name, hash: asset.contentHash },
      txHash,
    });
    this.notify();
  }

  public registerAssetVersion(assetId: string, contentHash: string, changelog: string, txHash?: string): void {
    const asset = this.assets.find((a) => a.id === assetId);
    if (!asset) return;

    const newVersionNumber = (asset.versions?.length || 1) + 1;
    const newVersion = {
      id: `v${newVersionNumber}-${assetId}`,
      assetId,
      versionNumber: newVersionNumber,
      contentHash,
      metadataHash: toBytes32(contentHash),
      changelog,
      createdAt: new Date().toISOString(),
    };

    asset.versions = [...(asset.versions || []), newVersion];
    asset.contentHash = contentHash;
    asset.updatedAt = new Date().toISOString();

    this.auditEvents.unshift({
      id: `aud-${Date.now()}`,
      actor: asset.creatorId,
      action: "ASSET_VERSION_CREATED",
      entityType: "AssetVersion",
      entityId: newVersion.id,
      timestamp: new Date().toISOString(),
      metadata: { version: newVersionNumber, changelog },
      txHash,
    });

    this.notify();
  }

  public addDetection(detection: Detection): void {
    this.detections.unshift(detection);
    this.auditEvents.unshift({
      id: `aud-${Date.now()}`,
      actor: detection.creatorWallet,
      action: "DETECTION_CREATED",
      entityType: "Detection",
      entityId: detection.id,
      timestamp: new Date().toISOString(),
      metadata: { similarity: detection.similarityScore, matchedUrl: detection.matchedUrl },
    });
    this.notify();
  }

  public anchorEvidence(evidenceId: string, txHash: string, blockNumber: number): void {
    const ev = this.evidence.find((e) => e.id === evidenceId);
    if (ev) {
      ev.isAnchored = true;
      ev.anchoredTxHash = txHash;
      ev.anchoredBlockNumber = blockNumber;

      this.auditEvents.unshift({
        id: `aud-${Date.now()}`,
        actor: "ConnectedWallet",
        action: "EVIDENCE_ANCHORED",
        entityType: "EvidenceSnapshot",
        entityId: ev.id,
        timestamp: new Date().toISOString(),
        metadata: { blockNumber, evidenceHash: ev.contentHash },
        txHash,
      });

      this.notify();
    }
  }

  public createLicenseOffer(offer: LicenseOffer, txHash?: string): void {
    this.offers.unshift(offer);
    const detection = this.detections.find((d) => d.assetId === offer.assetId);
    if (detection) {
      detection.status = "OFFER_CREATED";
      detection.licenseOfferId = offer.id;
    }

    this.auditEvents.unshift({
      id: `aud-${Date.now()}`,
      actor: offer.creatorAddress,
      action: "LICENSE_CREATED",
      entityType: "LicenseOffer",
      entityId: offer.id,
      timestamp: new Date().toISOString(),
      metadata: { priceWei: offer.priceWei, terms: offer.termsHash },
      txHash,
    });

    this.notify();
  }

  public purchaseLicense(offerId: string, licenseeAddress: string, txHash: string): License {
    const offer = this.offers.find((o) => o.id === offerId);
    if (!offer) throw new Error("Offer not found");

    offer.status = "ACCEPTED";

    const price = BigInt(offer.priceWei);
    const fee = (price * 300n) / 10000n; // 3%
    const creatorNet = price - fee;

    const license: License = {
      id: `lic-${Date.now()}`,
      onChainLicenseId: String(this.licenses.length + 1),
      assetId: offer.assetId,
      assetName: offer.assetName,
      creatorAddress: offer.creatorAddress,
      licenseeAddress,
      pricePaidWei: offer.priceWei,
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + offer.durationSeconds * 1000).toISOString(),
      termsHash: offer.termsHash,
      status: "ACTIVE",
      purchaseTxHash: txHash,
      network: "sepolia",
      chainId: 11155111,
      createdAt: new Date().toISOString(),
    };

    this.licenses.unshift(license);

    // Update royalty accounting
    const currentPending = BigInt(this.royalties.pendingBalanceWei || "0");
    const currentTotal = BigInt(this.royalties.totalEarnedWei || "0");
    this.royalties.pendingBalanceWei = (currentPending + creatorNet).toString();
    this.royalties.totalEarnedWei = (currentTotal + creatorNet).toString();

    // Update detection status
    const detection = this.detections.find((d) => d.assetId === offer.assetId);
    if (detection) {
      detection.status = "SETTLED";
    }

    this.auditEvents.unshift({
      id: `aud-${Date.now()}`,
      actor: licenseeAddress,
      action: "LICENSE_PURCHASED",
      entityType: "License",
      entityId: license.id,
      timestamp: new Date().toISOString(),
      metadata: { pricePaid: offer.priceWei, creatorShare: creatorNet.toString() },
      txHash,
    });

    this.notify();
    return license;
  }

  public withdrawCreatorRoyalties(txHash: string): string {
    const amount = this.royalties.pendingBalanceWei;
    if (amount === "0") return "0";

    const currentWithdrawn = BigInt(this.royalties.withdrawnBalanceWei || "0");
    this.royalties.withdrawnBalanceWei = (currentWithdrawn + BigInt(amount)).toString();
    this.royalties.pendingBalanceWei = "0";
    this.royalties.lastWithdrawalTxHash = txHash;
    this.royalties.lastWithdrawalAt = new Date().toISOString();

    this.auditEvents.unshift({
      id: `aud-${Date.now()}`,
      actor: this.royalties.creatorAddress,
      action: "ROYALTY_WITHDRAWN",
      entityType: "RoyaltyAccounting",
      entityId: this.royalties.creatorAddress,
      timestamp: new Date().toISOString(),
      metadata: { withdrawnAmountWei: amount },
      txHash,
    });

    this.notify();
    return amount;
  }
}
