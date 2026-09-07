// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LicenseHunterRegistry
 * @notice Immutable on-chain registry for creator IP assets, version provenance, and evidence anchoring.
 * @dev Anchors cryptographic hashes (bytes32) without storing raw media files on-chain.
 */
contract LicenseHunterRegistry is AccessControl, Pausable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    enum AssetType {
        IMAGE,
        VIDEO,
        AUDIO,
        MUSIC,
        ARTWORK,
        DOCUMENT,
        OTHER
    }

    struct AssetVersion {
        uint256 versionNumber;
        bytes32 contentHash;
        string metadataURI;
        uint256 registeredAt;
    }

    struct EvidenceRecord {
        uint256 evidenceIndex;
        bytes32 evidenceHash;
        string evidenceURI;
        address anchoredBy;
        uint256 anchoredAt;
        uint256 blockNumber;
    }

    struct Asset {
        uint256 id;
        address creator;
        bytes32 contentHash;
        string metadataURI;
        AssetType assetType;
        uint256 registeredAt;
        uint256 versionCount;
        uint256 evidenceCount;
    }

    uint256 private _nextAssetId = 1;

    // assetId => Asset
    mapping(uint256 => Asset) private _assets;
    // assetId => versionNumber => AssetVersion
    mapping(uint256 => mapping(uint256 => AssetVersion)) private _assetVersions;
    // assetId => evidenceIndex => EvidenceRecord
    mapping(uint256 => mapping(uint256 => EvidenceRecord)) private _assetEvidence;
    // contentHash => existing assetId (prevents exact duplicate asset registration)
    mapping(bytes32 => uint256) public contentHashToAssetId;

    event AssetRegistered(
        uint256 indexed assetId,
        address indexed creator,
        bytes32 contentHash,
        AssetType assetType,
        string metadataURI
    );

    event AssetVersionRegistered(
        uint256 indexed assetId,
        uint256 indexed versionNumber,
        bytes32 contentHash,
        string metadataURI
    );

    event EvidenceAnchored(
        uint256 indexed assetId,
        uint256 indexed evidenceIndex,
        bytes32 evidenceHash,
        address indexed anchoredBy,
        string evidenceURI
    );

    event AssetOwnershipTransferred(
        uint256 indexed assetId,
        address indexed previousOwner,
        address indexed newOwner
    );

    error ZeroAddress();
    error EmptyHash();
    error AssetDoesNotExist(uint256 assetId);
    error Unauthorized(address caller, address required);
    error DuplicateContentHash(bytes32 contentHash, uint256 existingAssetId);

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    /**
     * @notice Register a new digital IP asset on-chain.
     * @param contentHash SHA-256 or keccak256 cryptographic hash of the original media file.
     * @param metadataURI Off-chain metadata URI (e.g. IPFS or Supabase reference).
     * @param assetType Enum category of the IP asset.
     * @return assetId Unique ID assigned to the asset.
     */
    function registerAsset(
        bytes32 contentHash,
        string calldata metadataURI,
        AssetType assetType
    ) external whenNotPaused returns (uint256 assetId) {
        if (contentHash == bytes32(0)) revert EmptyHash();
        if (contentHashToAssetId[contentHash] != 0) {
            revert DuplicateContentHash(contentHash, contentHashToAssetId[contentHash]);
        }

        assetId = _nextAssetId++;
        contentHashToAssetId[contentHash] = assetId;

        Asset storage asset = _assets[assetId];
        asset.id = assetId;
        asset.creator = msg.sender;
        asset.contentHash = contentHash;
        asset.metadataURI = metadataURI;
        asset.assetType = assetType;
        asset.registeredAt = block.timestamp;
        asset.versionCount = 1;

        // Version 1 provenance
        _assetVersions[assetId][1] = AssetVersion({
            versionNumber: 1,
            contentHash: contentHash,
            metadataURI: metadataURI,
            registeredAt: block.timestamp
        });

        emit AssetRegistered(assetId, msg.sender, contentHash, assetType, metadataURI);
        emit AssetVersionRegistered(assetId, 1, contentHash, metadataURI);
    }

    /**
     * @notice Register a new version of an existing asset for provenance history.
     * @param assetId The ID of the asset being updated.
     * @param newContentHash The cryptographic hash of the new version.
     * @param newMetadataURI The metadata URI for the new version.
     * @return versionNumber The sequential version number assigned.
     */
    function registerAssetVersion(
        uint256 assetId,
        bytes32 newContentHash,
        string calldata newMetadataURI
    ) external whenNotPaused returns (uint256 versionNumber) {
        Asset storage asset = _assets[assetId];
        if (asset.id == 0) revert AssetDoesNotExist(assetId);
        if (asset.creator != msg.sender) revert Unauthorized(msg.sender, asset.creator);
        if (newContentHash == bytes32(0)) revert EmptyHash();

        asset.versionCount += 1;
        versionNumber = asset.versionCount;
        asset.contentHash = newContentHash;
        asset.metadataURI = newMetadataURI;

        _assetVersions[assetId][versionNumber] = AssetVersion({
            versionNumber: versionNumber,
            contentHash: newContentHash,
            metadataURI: newMetadataURI,
            registeredAt: block.timestamp
        });

        emit AssetVersionRegistered(assetId, versionNumber, newContentHash, newMetadataURI);
    }

    /**
     * @notice Anchor an evidence snapshot hash on-chain for tamper-proof dispute verification.
     * @param assetId The associated asset ID (or 0 for unattached evidence).
     * @param evidenceHash Cryptographic hash of the normalized evidence snapshot.
     * @param evidenceURI URL or IPFS pointer to full evidence bundle.
     * @return evidenceIndex The index of the evidence record.
     */
    function anchorEvidence(
        uint256 assetId,
        bytes32 evidenceHash,
        string calldata evidenceURI
    ) external whenNotPaused returns (uint256 evidenceIndex) {
        if (evidenceHash == bytes32(0)) revert EmptyHash();
        if (assetId != 0 && _assets[assetId].id == 0) revert AssetDoesNotExist(assetId);

        Asset storage asset = _assets[assetId];
        asset.evidenceCount += 1;
        evidenceIndex = asset.evidenceCount;

        _assetEvidence[assetId][evidenceIndex] = EvidenceRecord({
            evidenceIndex: evidenceIndex,
            evidenceHash: evidenceHash,
            evidenceURI: evidenceURI,
            anchoredBy: msg.sender,
            anchoredAt: block.timestamp,
            blockNumber: block.number
        });

        emit EvidenceAnchored(assetId, evidenceIndex, evidenceHash, msg.sender, evidenceURI);
    }

    function transferAssetOwnership(uint256 assetId, address newOwner) external {
        if (newOwner == address(0)) revert ZeroAddress();
        Asset storage asset = _assets[assetId];
        if (asset.id == 0) revert AssetDoesNotExist(assetId);
        if (asset.creator != msg.sender) revert Unauthorized(msg.sender, asset.creator);

        address oldOwner = asset.creator;
        asset.creator = newOwner;

        emit AssetOwnershipTransferred(assetId, oldOwner, newOwner);
    }

    function getAsset(uint256 assetId) external view returns (Asset memory) {
        Asset memory asset = _assets[assetId];
        if (asset.id == 0) revert AssetDoesNotExist(assetId);
        return asset;
    }

    function getAssetVersion(uint256 assetId, uint256 versionNumber)
        external
        view
        returns (AssetVersion memory)
    {
        if (_assets[assetId].id == 0) revert AssetDoesNotExist(assetId);
        return _assetVersions[assetId][versionNumber];
    }

    function getEvidenceRecord(uint256 assetId, uint256 evidenceIndex)
        external
        view
        returns (EvidenceRecord memory)
    {
        if (assetId != 0 && _assets[assetId].id == 0) revert AssetDoesNotExist(assetId);
        return _assetEvidence[assetId][evidenceIndex];
    }

    function isAssetOwner(uint256 assetId, address account) external view returns (bool) {
        return _assets[assetId].creator == account && _assets[assetId].id != 0;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
