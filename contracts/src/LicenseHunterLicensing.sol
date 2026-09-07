// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {LicenseHunterRegistry} from "./LicenseHunterRegistry.sol";
import {LicenseHunterTreasury} from "./LicenseHunterTreasury.sol";

/**
 * @title LicenseHunterLicensing
 * @notice Programmable micro-licensing engine with pull-based creator royalty settlement and protocol fee sharing.
 */
contract LicenseHunterLicensing is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant PROTOCOL_ADMIN_ROLE = keccak256("PROTOCOL_ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint16 public constant MAX_BPS = 10000;
    uint16 public constant MAX_FEE_BPS = 1000; // 10% maximum cap to protect creators

    enum OfferStatus {
        ACTIVE,
        ACCEPTED,
        EXPIRED,
        CANCELLED
    }

    enum LicenseStatus {
        ACTIVE,
        EXPIRED,
        REVOKED
    }

    struct Offer {
        uint256 offerId;
        uint256 assetId;
        address creator;
        address targetLicensee;
        uint256 price;
        uint256 duration;
        bytes32 termsHash;
        uint256 createdAt;
        uint256 expiresAt;
        OfferStatus status;
    }

    struct License {
        uint256 licenseId;
        uint256 offerId;
        uint256 assetId;
        address creator;
        address licensee;
        uint256 pricePaid;
        uint256 startsAt;
        uint256 expiresAt;
        bytes32 termsHash;
        LicenseStatus status;
    }

    LicenseHunterRegistry public immutable REGISTRY;
    LicenseHunterTreasury public immutable TREASURY;

    uint16 public protocolFeeBps = 300; // 3.00%
    uint256 private _nextOfferId = 1;
    uint256 private _nextLicenseId = 1;

    mapping(uint256 => Offer) private _offers;
    mapping(uint256 => License) private _licenses;
    mapping(address => uint256) public creatorBalances;

    event OfferCreated(
        uint256 indexed offerId,
        uint256 indexed assetId,
        address indexed creator,
        address targetLicensee,
        uint256 price,
        uint256 duration,
        bytes32 termsHash,
        uint256 expiresAt
    );

    event OfferCancelled(uint256 indexed offerId, address indexed creator);

    event LicensePurchased(
        uint256 indexed licenseId,
        uint256 indexed offerId,
        uint256 indexed assetId,
        address creator,
        address licensee,
        uint256 pricePaid,
        uint256 creatorAmount,
        uint256 protocolFee,
        uint256 startsAt,
        uint256 expiresAt
    );

    event CreatorRevenueWithdrawn(address indexed creator, uint256 amount);
    event ProtocolFeeUpdated(uint16 previousBps, uint16 newBps);

    error ZeroAddress();
    error ZeroPrice();
    error ZeroDuration();
    error EmptyTerms();
    error InvalidOffer(uint256 offerId);
    error OfferNotActive(uint256 offerId);
    error OfferExpired(uint256 offerId);
    error UnauthorizedLicensee(address caller, address targetLicensee);
    error IncorrectPayment(uint256 sent, uint256 expected);
    error UnauthorizedCreator(address caller, address expected);
    error FeeExceedsMaximum(uint16 requested, uint16 maxAllowed);
    error NoBalanceToWithdraw();
    error WithdrawalFailed();

    constructor(
        address admin,
        address payable registryAddress,
        address payable treasuryAddress
    ) {
        if (admin == address(0) || registryAddress == address(0) || treasuryAddress == address(0)) {
            revert ZeroAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PROTOCOL_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        REGISTRY = LicenseHunterRegistry(registryAddress);
        TREASURY = LicenseHunterTreasury(treasuryAddress);
    }

    function createOffer(
        uint256 assetId,
        address targetLicensee,
        uint256 price,
        uint256 duration,
        bytes32 termsHash
    ) external whenNotPaused returns (uint256 offerId) {
        if (price == 0) revert ZeroPrice();
        if (duration == 0) revert ZeroDuration();
        if (termsHash == bytes32(0)) revert EmptyTerms();
        if (!REGISTRY.isAssetOwner(assetId, msg.sender)) {
            revert UnauthorizedCreator(msg.sender, address(0));
        }

        offerId = _nextOfferId++;
        uint256 offerExpiry = block.timestamp + 30 days;

        _offers[offerId] = Offer({
            offerId: offerId,
            assetId: assetId,
            creator: msg.sender,
            targetLicensee: targetLicensee,
            price: price,
            duration: duration,
            termsHash: termsHash,
            createdAt: block.timestamp,
            expiresAt: offerExpiry,
            status: OfferStatus.ACTIVE
        });

        emit OfferCreated(
            offerId,
            assetId,
            msg.sender,
            targetLicensee,
            price,
            duration,
            termsHash,
            offerExpiry
        );
    }

    function cancelOffer(uint256 offerId) external whenNotPaused {
        Offer storage offer = _offers[offerId];
        if (offer.offerId == 0) revert InvalidOffer(offerId);
        if (offer.creator != msg.sender) revert UnauthorizedCreator(msg.sender, offer.creator);
        if (offer.status != OfferStatus.ACTIVE) revert OfferNotActive(offerId);

        offer.status = OfferStatus.CANCELLED;
        emit OfferCancelled(offerId, msg.sender);
    }

    function purchaseLicense(uint256 offerId)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (uint256 licenseId)
    {
        Offer storage offer = _offers[offerId];
        if (offer.offerId == 0) revert InvalidOffer(offerId);
        if (offer.status != OfferStatus.ACTIVE) revert OfferNotActive(offerId);
        if (block.timestamp > offer.expiresAt) {
            offer.status = OfferStatus.EXPIRED;
            revert OfferExpired(offerId);
        }
        if (offer.targetLicensee != address(0) && offer.targetLicensee != msg.sender) {
            revert UnauthorizedLicensee(msg.sender, offer.targetLicensee);
        }
        if (msg.value != offer.price) {
            revert IncorrectPayment(msg.value, offer.price);
        }

        offer.status = OfferStatus.ACCEPTED;

        uint256 protocolFee = (offer.price * protocolFeeBps) / MAX_BPS;
        uint256 creatorShare = offer.price - protocolFee;

        creatorBalances[offer.creator] += creatorShare;

        if (protocolFee > 0) {
            (bool feeSuccess, ) = address(TREASURY).call{value: protocolFee}("");
            if (!feeSuccess) revert WithdrawalFailed();
        }

        licenseId = _nextLicenseId++;
        uint256 startsAt = block.timestamp;
        uint256 expiresAt = startsAt + offer.duration;

        _licenses[licenseId] = License({
            licenseId: licenseId,
            offerId: offerId,
            assetId: offer.assetId,
            creator: offer.creator,
            licensee: msg.sender,
            pricePaid: offer.price,
            startsAt: startsAt,
            expiresAt: expiresAt,
            termsHash: offer.termsHash,
            status: LicenseStatus.ACTIVE
        });

        emit LicensePurchased(
            licenseId,
            offerId,
            offer.assetId,
            offer.creator,
            msg.sender,
            offer.price,
            creatorShare,
            protocolFee,
            startsAt,
            expiresAt
        );
    }

    function withdrawCreatorRevenue() external nonReentrant {
        uint256 balance = creatorBalances[msg.sender];
        if (balance == 0) revert NoBalanceToWithdraw();

        creatorBalances[msg.sender] = 0;
        emit CreatorRevenueWithdrawn(msg.sender, balance);

        (bool success, ) = payable(msg.sender).call{value: balance}("");
        if (!success) revert WithdrawalFailed();
    }

    function setProtocolFeeBps(uint16 newFeeBps) external onlyRole(PROTOCOL_ADMIN_ROLE) {
        if (newFeeBps > MAX_FEE_BPS) revert FeeExceedsMaximum(newFeeBps, MAX_FEE_BPS);
        uint16 old = protocolFeeBps;
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(old, newFeeBps);
    }

    function getOffer(uint256 offerId) external view returns (Offer memory) {
        Offer memory offer = _offers[offerId];
        if (offer.offerId == 0) revert InvalidOffer(offerId);
        return offer;
    }

    function getLicense(uint256 licenseId) external view returns (License memory) {
        return _licenses[licenseId];
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
