// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {LicenseHunterRegistry} from "../src/LicenseHunterRegistry.sol";
import {LicenseHunterTreasury} from "../src/LicenseHunterTreasury.sol";
import {LicenseHunterLicensing} from "../src/LicenseHunterLicensing.sol";

contract LicenseHunterLicensingTest is Test {
    LicenseHunterRegistry public registry;
    LicenseHunterTreasury public treasury;
    LicenseHunterLicensing public licensing;

    address public admin = address(0xAA);
    address public creator = address(0xCC);
    address public licensee = address(0xBB);
    address public stranger = address(0xDD);

    bytes32 public sampleHash = keccak256("Creator Artwork #001");
    bytes32 public termsHash = keccak256("Standard Commercial Micro-License Terms v1.0");

    uint256 public assetId;

    function setUp() public {
        vm.startPrank(admin);
        registry = new LicenseHunterRegistry(admin);
        treasury = new LicenseHunterTreasury(admin);
        licensing = new LicenseHunterLicensing(
            admin,
            payable(address(registry)),
            payable(address(treasury))
        );
        vm.stopPrank();

        // Register asset
        vm.prank(creator);
        assetId = registry.registerAsset(
            sampleHash,
            "ipfs://QmArt001",
            LicenseHunterRegistry.AssetType.ARTWORK
        );

        // Fund licensee
        vm.deal(licensee, 100 ether);
        vm.deal(stranger, 100 ether);
    }

    function test_CreateOffer_Success() public {
        vm.prank(creator);
        uint256 offerId = licensing.createOffer(
            assetId,
            address(0), // open offer
            0.1 ether,
            30 days,
            termsHash
        );

        assertEq(offerId, 1);
        LicenseHunterLicensing.Offer memory offer = licensing.getOffer(1);
        assertEq(offer.creator, creator);
        assertEq(offer.price, 0.1 ether);
        assertEq(uint8(offer.status), uint8(LicenseHunterLicensing.OfferStatus.ACTIVE));
    }

    function test_PurchaseLicense_Success_WithSettlement() public {
        vm.prank(creator);
        uint256 offerId = licensing.createOffer(
            assetId,
            address(0),
            1 ether,
            365 days,
            termsHash
        );

        uint256 licenseeBalBefore = licensee.balance;
        uint256 treasuryBalBefore = address(treasury).balance;

        vm.prank(licensee);
        uint256 licenseId = licensing.purchaseLicense{value: 1 ether}(offerId);
        assertEq(licenseId, 1);

        // Verify balances
        assertEq(licensee.balance, licenseeBalBefore - 1 ether);

        // 3% protocol fee = 0.03 ether, 97% creator = 0.97 ether
        uint256 expectedProtocolFee = 0.03 ether;
        uint256 expectedCreatorShare = 0.97 ether;

        assertEq(address(treasury).balance, treasuryBalBefore + expectedProtocolFee);
        assertEq(licensing.creatorBalances(creator), expectedCreatorShare);

        // Verify license state
        LicenseHunterLicensing.License memory lic = licensing.getLicense(1);
        assertEq(lic.licensee, licensee);
        assertEq(lic.creator, creator);
        assertEq(lic.pricePaid, 1 ether);
        assertEq(uint8(lic.status), uint8(LicenseHunterLicensing.LicenseStatus.ACTIVE));

        // Creator pulls revenue
        uint256 creatorBalBefore = creator.balance;
        vm.prank(creator);
        licensing.withdrawCreatorRevenue();

        assertEq(creator.balance, creatorBalBefore + expectedCreatorShare);
        assertEq(licensing.creatorBalances(creator), 0);
    }

    function test_PurchaseLicense_RevertDoublePurchase() public {
        vm.prank(creator);
        uint256 offerId = licensing.createOffer(
            assetId,
            address(0),
            0.5 ether,
            30 days,
            termsHash
        );

        vm.prank(licensee);
        licensing.purchaseLicense{value: 0.5 ether}(offerId);

        // Second purchase of same offer must revert
        vm.expectRevert(
            abi.encodeWithSelector(
                LicenseHunterLicensing.OfferNotActive.selector,
                offerId
            )
        );
        vm.prank(stranger);
        licensing.purchaseLicense{value: 0.5 ether}(offerId);
    }

    function test_PurchaseLicense_RevertIncorrectPayment() public {
        vm.prank(creator);
        uint256 offerId = licensing.createOffer(
            assetId,
            address(0),
            1 ether,
            30 days,
            termsHash
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                LicenseHunterLicensing.IncorrectPayment.selector,
                0.5 ether,
                1 ether
            )
        );
        vm.prank(licensee);
        licensing.purchaseLicense{value: 0.5 ether}(offerId);
    }

    function test_PurchaseLicense_TargetedLicensee() public {
        vm.prank(creator);
        uint256 offerId = licensing.createOffer(
            assetId,
            licensee, // Targeted specifically to licensee
            0.2 ether,
            30 days,
            termsHash
        );

        // Stranger attempting to purchase targeted offer should revert
        vm.expectRevert(
            abi.encodeWithSelector(
                LicenseHunterLicensing.UnauthorizedLicensee.selector,
                stranger,
                licensee
            )
        );
        vm.prank(stranger);
        licensing.purchaseLicense{value: 0.2 ether}(offerId);

        // Valid licensee succeeds
        vm.prank(licensee);
        uint256 licenseId = licensing.purchaseLicense{value: 0.2 ether}(offerId);
        assertEq(licenseId, 1);
    }

    function test_CancelOffer_Success() public {
        vm.prank(creator);
        uint256 offerId = licensing.createOffer(
            assetId,
            address(0),
            0.1 ether,
            30 days,
            termsHash
        );

        vm.prank(creator);
        licensing.cancelOffer(offerId);

        LicenseHunterLicensing.Offer memory offer = licensing.getOffer(offerId);
        assertEq(uint8(offer.status), uint8(LicenseHunterLicensing.OfferStatus.CANCELLED));

        vm.expectRevert(
            abi.encodeWithSelector(
                LicenseHunterLicensing.OfferNotActive.selector,
                offerId
            )
        );
        vm.prank(licensee);
        licensing.purchaseLicense{value: 0.1 ether}(offerId);
    }

    function test_SetProtocolFee_SuccessAndMaxCap() public {
        vm.prank(admin);
        licensing.setProtocolFeeBps(500); // 5%
        assertEq(licensing.protocolFeeBps(), 500);

        // Trying to set > 1000 bps (10%) reverts
        vm.expectRevert(
            abi.encodeWithSelector(
                LicenseHunterLicensing.FeeExceedsMaximum.selector,
                1500,
                1000
            )
        );
        vm.prank(admin);
        licensing.setProtocolFeeBps(1500);
    }

    function test_Treasury_WithdrawProtocolFunds() public {
        vm.prank(creator);
        uint256 offerId = licensing.createOffer(
            assetId,
            address(0),
            1 ether,
            30 days,
            termsHash
        );

        vm.prank(licensee);
        licensing.purchaseLicense{value: 1 ether}(offerId);

        uint256 treasuryBal = address(treasury).balance;
        assertEq(treasuryBal, 0.03 ether);

        address payable destination = payable(address(0x999));
        vm.prank(admin);
        treasury.withdrawProtocolFunds(destination, 0.03 ether);

        assertEq(destination.balance, 0.03 ether);
        assertEq(address(treasury).balance, 0);
    }
}
