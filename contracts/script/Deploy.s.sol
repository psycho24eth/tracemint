// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {LicenseHunterRegistry} from "../src/LicenseHunterRegistry.sol";
import {LicenseHunterTreasury} from "../src/LicenseHunterTreasury.sol";
import {LicenseHunterLicensing} from "../src/LicenseHunterLicensing.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr(
            "DEPLOYER_PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        LicenseHunterTreasury treasury = new LicenseHunterTreasury(deployer);
        LicenseHunterRegistry registry = new LicenseHunterRegistry(deployer);
        LicenseHunterLicensing licensing = new LicenseHunterLicensing(
            deployer,
            payable(address(registry)),
            payable(address(treasury))
        );

        vm.stopBroadcast();
    }
}
