// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {LicenseHunterRegistry} from "../src/LicenseHunterRegistry.sol";
import {LicenseHunterTreasury} from "../src/LicenseHunterTreasury.sol";
import {LicenseHunterLicensing} from "../src/LicenseHunterLicensing.sol";

contract FuzzTests is Test {
    LicenseHunterRegistry public registry;
    LicenseHunterTreasury public treasury;
    LicenseHunterLicensing public licensing;

    address public admin = address(0xAA);
    address public creator = address(0xCC);
    address public licensee = address(0xBB);

    uint256 public assetId;
    bytes32 public termsHash = keccak256("Fuzz Terms v1");

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

        vm.prank(creator);
        assetId = registry.registerAsset(
            keccak256("Fuzz Asset Original"),
            "ipfs://QmFuzzAsset",
            LicenseHunterRegistry.AssetType.OTHER
        );
    }

    /**
     * @notice Invariant: For any valid price, creatorShare + protocolFee == price.
     */
    function testFuzz_FeeConservation(uint256 price) public {
        // Bound price between 10,000 wei and 1,000,000 ether to prevent overflow
        price = bound(price, 10_000, 1_000_000 ether);

        vm.prank(creator);
        uint256 offerId = licensing.createOffer(
            assetId,
            address(0),
            price,
            30 days,
            termsHash
        );

        vm.deal(licensee, price);
        uint256 treasuryBefore = address(treasury).balance;

        vm.prank(licensee);
        licensing.purchaseLicense{value: price}(offerId);

        uint256 creatorShare = licensing.creatorBalances(creator);
        uint256 protocolFee = address(treasury).balance - treasuryBefore;

        assertEq(creatorShare + protocolFee, price, "Sum of shares must equal total price");
    }

    /**
     * @notice Invariant: Custom fee BPS invariant with bounded values.
     */
    function testFuzz_ConfigurableFee(uint16 feeBps, uint256 price) public {
        feeBps = uint16(bound(feeBps, 0, 1000)); // 0% to 10%
        price = bound(price, 10_000, 100_000 ether);

        vm.prank(admin);
        licensing.setProtocolFeeBps(feeBps);

        vm.prank(creator);
        uint256 offerId = licensing.createOffer(
            assetId,
            address(0),
            price,
            7 days,
            termsHash
        );

        vm.deal(licensee, price);
        uint256 treasuryBefore = address(treasury).balance;

        vm.prank(licensee);
        licensing.purchaseLicense{value: price}(offerId);

        uint256 expectedFee = (price * feeBps) / 10000;
        uint256 actualFee = address(treasury).balance - treasuryBefore;
        assertEq(actualFee, expectedFee);
    }

    /**
     * @notice Invariant: Pull withdrawal zeroes creator balance completely.
     */
    function testFuzz_WithdrawalEmptiesBalance(uint256 price) public {
        price = bound(price, 10_000, 100 ether);

        vm.prank(creator);
        uint256 offerId = licensing.createOffer(
            assetId,
            address(0),
            price,
            14 days,
            termsHash
        );

        vm.deal(licensee, price);
        vm.prank(licensee);
        licensing.purchaseLicense{value: price}(offerId);

        assertGt(licensing.creatorBalances(creator), 0);

        vm.prank(creator);
        licensing.withdrawCreatorRevenue();

        assertEq(licensing.creatorBalances(creator), 0);
    }
}
