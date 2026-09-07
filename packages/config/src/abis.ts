/**
 * Smart Contract ABIs for wagmi / viem integration
 */

export const REGISTRY_ABI = [
  {
    type: "function",
    name: "registerAsset",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contentHash", type: "bytes32" },
      { name: "metadataURI", type: "string" },
      { name: "assetType", type: "uint8" },
    ],
    outputs: [{ name: "assetId", type: "uint256" }],
  },
  {
    type: "function",
    name: "registerAssetVersion",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assetId", type: "uint256" },
      { name: "contentHash", type: "bytes32" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [{ name: "versionNumber", type: "uint256" }],
  },
  {
    type: "function",
    name: "anchorEvidence",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assetId", type: "uint256" },
      { name: "evidenceHash", type: "bytes32" },
      { name: "evidenceURI", type: "string" },
    ],
    outputs: [{ name: "evidenceIndex", type: "uint256" }],
  },
  {
    type: "function",
    name: "getAsset",
    stateMutability: "view",
    inputs: [{ name: "assetId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "contentHash", type: "bytes32" },
          { name: "metadataURI", type: "string" },
          { name: "assetType", type: "uint8" },
          { name: "registeredAt", type: "uint256" },
          { name: "versionCount", type: "uint256" },
          { name: "evidenceCount", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "AssetRegistered",
    inputs: [
      { name: "assetId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "contentHash", type: "bytes32", indexed: false },
      { name: "assetType", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EvidenceAnchored",
    inputs: [
      { name: "assetId", type: "uint256", indexed: true },
      { name: "evidenceIndex", type: "uint256", indexed: false },
      { name: "evidenceHash", type: "bytes32", indexed: false },
      { name: "anchoredBy", type: "address", indexed: true },
    ],
  },
] as const;

export const LICENSING_ABI = [
  {
    type: "function",
    name: "createOffer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assetId", type: "uint256" },
      { name: "licensee", type: "address" },
      { name: "price", type: "uint256" },
      { name: "duration", type: "uint256" },
      { name: "termsHash", type: "bytes32" },
    ],
    outputs: [{ name: "offerId", type: "uint256" }],
  },
  {
    type: "function",
    name: "purchaseLicense",
    stateMutability: "payable",
    inputs: [{ name: "offerId", type: "uint256" }],
    outputs: [{ name: "licenseId", type: "uint256" }],
  },
  {
    type: "function",
    name: "withdrawCreatorRevenue",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "creatorBalances",
    stateMutability: "view",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    type: "function",
    name: "getOffer",
    stateMutability: "view",
    inputs: [{ name: "offerId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "offerId", type: "uint256" },
          { name: "assetId", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "licensee", type: "address" },
          { name: "price", type: "uint256" },
          { name: "duration", type: "uint256" },
          { name: "termsHash", type: "bytes32" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "protocolFeeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    type: "event",
    name: "OfferCreated",
    inputs: [
      { name: "offerId", type: "uint256", indexed: true },
      { name: "assetId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "price", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LicensePurchased",
    inputs: [
      { name: "licenseId", type: "uint256", indexed: true },
      { name: "offerId", type: "uint256", indexed: true },
      { name: "licensee", type: "address", indexed: true },
      { name: "pricePaid", type: "uint256", indexed: false },
      { name: "creatorAmount", type: "uint256", indexed: false },
      { name: "protocolFee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CreatorRevenueWithdrawn",
    inputs: [
      { name: "creator", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
