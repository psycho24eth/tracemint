/**
 * LicenseHunter Core Domain Types & Interfaces
 */

export type AssetType =
  | "IMAGE"
  | "VIDEO"
  | "AUDIO"
  | "MUSIC"
  | "ARTWORK"
  | "DOCUMENT"
  | "OTHER";

export type AssetStatus = "DRAFT" | "REGISTERED" | "MONITORING" | "ARCHIVED";

export type DetectionStatus =
  | "PENDING_REVIEW"
  | "VERIFIED"
  | "DISMISSED"
  | "OFFER_CREATED"
  | "SETTLED";

export type DetectionConfidence = "HIGH" | "MEDIUM" | "LOW";

export type OfferStatus = "OFFERED" | "ACTIVE" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

export type LicenseStatus =
  | "OFFERED"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "REVOKED";

export type PaymentStatus = "PENDING" | "CONFIRMED" | "FAILED";

export type TransactionState =
  | "IDLE"
  | "WALLET_REQUIRED"
  | "SIGNATURE_REQUIRED"
  | "SUBMITTED"
  | "PENDING"
  | "CONFIRMED"
  | "FAILED"
  | "REJECTED";

export interface User {
  id: string;
  walletAddress: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Creator {
  id: string;
  userId: string;
  walletAddress: string;
  displayName: string;
  bio?: string;
  verified: boolean;
  totalAssets: number;
  totalRoyaltiesEarnedWei: string;
  createdAt: string;
}

export interface AssetVersion {
  id: string;
  assetId: string;
  versionNumber: number;
  contentHash: string; // SHA-256 or keccak256
  metadataHash: string;
  metadataURI?: string;
  storagePath?: string;
  changelog?: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  type: AssetType;
  sourceUrl?: string;
  storagePath?: string;
  contentHash: string;
  metadataHash: string;
  createdAt: string;
  updatedAt: string;
  status: AssetStatus;
  licensePolicy?: {
    suggestedPriceWei: string;
    standardDurationSeconds: number;
    commercialAllowed: boolean;
    derivativesAllowed: boolean;
  };
  blockchainAssetId?: string;
  registrationTxHash?: string;
  versions?: AssetVersion[];
}

export interface EvidenceSnapshot {
  id: string;
  detectionId: string;
  sourceUrl: string;
  capturedAt: string;
  contentHash: string;
  metadataHash: string;
  screenshotReference?: string;
  similarityScore: number; // 0 - 100
  provider: string;
  providerVersion: string;
  rawMetadata: Record<string, unknown>;
  createdAt: string;
  anchoredTxHash?: string;
  anchoredBlockNumber?: number;
  isAnchored: boolean;
  visibility: "PUBLIC" | "PRIVATE" | "SHARED";
}

export interface Detection {
  id: string;
  assetId: string;
  assetName: string;
  creatorId: string;
  creatorWallet: string;
  matchedUrl: string;
  matchedContentHash: string;
  similarityScore: number;
  confidence: DetectionConfidence;
  detectionMethod: "DEMO_SIMILARITY" | "HASH_EXACT" | "PERCEPTUAL_HASH";
  isDemo: boolean;
  status: DetectionStatus;
  detectedAt: string;
  evidenceSnapshotId?: string;
  evidenceSnapshot?: EvidenceSnapshot;
  licenseOfferId?: string;
}

export interface LicenseOffer {
  id: string;
  licenseId?: string;
  assetId: string;
  assetName: string;
  creatorAddress: string;
  licenseeAddress?: string; // Optional target or open offer
  priceWei: string;
  currency: string;
  durationSeconds: number;
  createdAt: string;
  expiresAt: string;
  termsHash: string;
  termsText: string;
  status: OfferStatus;
  creationTxHash?: string;
}

export interface License {
  id: string;
  onChainLicenseId: string;
  assetId: string;
  assetName: string;
  creatorAddress: string;
  licenseeAddress: string;
  pricePaidWei: string;
  startsAt: string;
  expiresAt: string;
  termsHash: string;
  status: LicenseStatus;
  purchaseTxHash: string;
  network: string;
  chainId: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  licenseId: string;
  payerAddress: string;
  amountWei: string;
  creatorRevenueWei: string;
  protocolFeeWei: string;
  status: PaymentStatus;
  txHash: string;
  blockNumber: number;
  timestamp: string;
}

export interface RoyaltyAccounting {
  creatorAddress: string;
  pendingBalanceWei: string;
  withdrawnBalanceWei: string;
  totalEarnedWei: string;
  lastWithdrawalTxHash?: string;
  lastWithdrawalAt?: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action:
    | "ASSET_CREATED"
    | "ASSET_VERSION_CREATED"
    | "DETECTION_CREATED"
    | "EVIDENCE_CREATED"
    | "EVIDENCE_ANCHORED"
    | "DETECTION_VERIFIED"
    | "LICENSE_CREATED"
    | "LICENSE_PURCHASED"
    | "ROYALTY_ALLOCATED"
    | "ROYALTY_WITHDRAWN"
    | "NOTICE_GENERATED";
  entityType: string;
  entityId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  txHash?: string;
}

export interface SystemNotification {
  id: string;
  recipientAddress: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  read: boolean;
  createdAt: string;
  linkUrl?: string;
}
