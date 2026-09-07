// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {LicenseHunterRegistry} from "../src/LicenseHunterRegistry.sol";

contract LicenseHunterRegistryTest is Test {
    LicenseHunterRegistry public registry;

    address public admin = address(0xAD);
    address public creator = address(0xCAFE);
    address public stranger = address(0xDEAD);

    bytes32 public sampleHash1 = keccak256(abi.encodePacked("Artwork 001 Original"));
    bytes32 public sampleHash2 = keccak256(abi.encodePacked("Artwork 001 Version 2"));

    function setUp() public {
        vm.prank(admin);
        registry = new LicenseHunterRegistry(admin);
    }

    function test_RegisterAsset_Success() public {
        vm.prank(creator);
        uint256 assetId = registry.registerAsset(
            sampleHash1,
            "ipfs://QmSampleMetadata1",
            LicenseHunterRegistry.AssetType.ARTWORK
        );

        assertEq(assetId, 1);
        assertTrue(registry.isAssetOwner(1, creator));

        LicenseHunterRegistry.Asset memory asset = registry.getAsset(1);
        assertEq(asset.id, 1);
        assertEq(asset.creator, creator);
        assertEq(asset.contentHash, sampleHash1);
        assertEq(uint8(asset.assetType), uint8(LicenseHunterRegistry.AssetType.ARTWORK));
        assertEq(asset.versionCount, 1);
    }

    function test_RegisterAsset_RevertDuplicateContentHash() public {
        vm.prank(creator);
        registry.registerAsset(
            sampleHash1,
            "ipfs://QmSampleMetadata1",
            LicenseHunterRegistry.AssetType.ARTWORK
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                LicenseHunterRegistry.DuplicateContentHash.selector,
                sampleHash1,
                1
            )
        );
        vm.prank(stranger);
        registry.registerAsset(
            sampleHash1,
            "ipfs://QmSampleMetadataDuplicate",
            LicenseHunterRegistry.AssetType.ARTWORK
        );
    }

    function test_RegisterAssetVersion_Success() public {
        vm.prank(creator);
        uint256 assetId = registry.registerAsset(
            sampleHash1,
            "ipfs://QmMetadataV1",
            LicenseHunterRegistry.AssetType.IMAGE
        );

        vm.prank(creator);
        uint256 v2 = registry.registerAssetVersion(assetId, sampleHash2, "ipfs://QmMetadataV2");
        assertEq(v2, 2);

        LicenseHunterRegistry.Asset memory asset = registry.getAsset(assetId);
        assertEq(asset.versionCount, 2);
        assertEq(asset.contentHash, sampleHash2);

        LicenseHunterRegistry.AssetVersion memory ver1 = registry.getAssetVersion(assetId, 1);
        assertEq(ver1.contentHash, sampleHash1);

        LicenseHunterRegistry.AssetVersion memory ver2 = registry.getAssetVersion(assetId, 2);
        assertEq(ver2.contentHash, sampleHash2);
    }

    function test_RegisterAssetVersion_RevertUnauthorized() public {
        vm.prank(creator);
        uint256 assetId = registry.registerAsset(
            sampleHash1,
            "ipfs://QmMetadataV1",
            LicenseHunterRegistry.AssetType.IMAGE
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                LicenseHunterRegistry.Unauthorized.selector,
                stranger,
                creator
            )
        );
        vm.prank(stranger);
        registry.registerAssetVersion(assetId, sampleHash2, "ipfs://QmMetadataHacked");
    }

    function test_AnchorEvidence_Success() public {
        vm.prank(creator);
        uint256 assetId = registry.registerAsset(
            sampleHash1,
            "ipfs://QmMetadataV1",
            LicenseHunterRegistry.AssetType.ARTWORK
        );

        bytes32 evidenceHash = keccak256("Infringement Snapshot at URL xyz");

        vm.prank(creator);
        uint256 evIndex = registry.anchorEvidence(assetId, evidenceHash, "ipfs://QmEvidenceSnapshot");
        assertEq(evIndex, 1);

        LicenseHunterRegistry.EvidenceRecord memory ev = registry.getEvidenceRecord(assetId, 1);
        assertEq(ev.evidenceHash, evidenceHash);
        assertEq(ev.anchoredBy, creator);
    }

    function test_Pause_PreventsRegistration() public {
        vm.prank(admin);
        registry.pause();

        vm.expectRevert();
        vm.prank(creator);
        registry.registerAsset(
            sampleHash1,
            "ipfs://QmMetadataV1",
            LicenseHunterRegistry.AssetType.ARTWORK
        );

        vm.prank(admin);
        registry.unpause();

        vm.prank(creator);
        uint256 assetId = registry.registerAsset(
            sampleHash1,
            "ipfs://QmMetadataV1",
            LicenseHunterRegistry.AssetType.ARTWORK
        );
        assertEq(assetId, 1);
    }
}
