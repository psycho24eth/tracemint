// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LicenseHunterTreasury
 * @notice Segregated protocol treasury for protocol revenue.
 * @dev Explicitly isolated from creator revenue and creator balances.
 */
contract LicenseHunterTreasury is AccessControl, ReentrancyGuard {
    bytes32 public constant TREASURY_ADMIN_ROLE = keccak256("TREASURY_ADMIN_ROLE");

    event ProtocolRevenueReceived(address indexed from, uint256 amount);
    event ProtocolFundsWithdrawn(address indexed recipient, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance(uint256 requested, uint256 available);
    error TransferFailed();

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURY_ADMIN_ROLE, admin);
    }

    receive() external payable {
        emit ProtocolRevenueReceived(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw accumulated protocol funds to an authorized destination.
     * @param recipient The address receiving protocol revenue.
     * @param amount The amount in wei to transfer.
     */
    function withdrawProtocolFunds(address payable recipient, uint256 amount)
        external
        onlyRole(TREASURY_ADMIN_ROLE)
        nonReentrant
    {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > address(this).balance) {
            revert InsufficientBalance(amount, address(this).balance);
        }

        emit ProtocolFundsWithdrawn(recipient, amount);

        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    function getTreasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
