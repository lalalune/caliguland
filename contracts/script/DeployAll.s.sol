// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";
import {ValidationRegistry} from "../src/ValidationRegistry.sol";
import {PredictionOracle} from "../src/PredictionOracle.sol";

contract DeployAll is Script {
    function run() external {
        vm.startBroadcast();

        address gameServer = vm.envOr("GAME_SERVER_ADDRESS", msg.sender);

        console.log("Deploying ERC-8004 Registries...");
        
        IdentityRegistry idRegistry = new IdentityRegistry();
        console.log("IdentityRegistry deployed at:", address(idRegistry));

        ReputationRegistry repRegistry = new ReputationRegistry(address(idRegistry));
        console.log("ReputationRegistry deployed at:", address(repRegistry));

        ValidationRegistry valRegistry = new ValidationRegistry(address(idRegistry));
        console.log("ValidationRegistry deployed at:", address(valRegistry));

        PredictionOracle oracle = new PredictionOracle(gameServer);
        console.log("PredictionOracle deployed at:", address(oracle));
        console.log("Game server authorized:", gameServer);

        console.log("\nDeployment Summary:");
        console.log("====================");
        console.log("IdentityRegistry:", address(idRegistry));
        console.log("ReputationRegistry:", address(repRegistry));
        console.log("ValidationRegistry:", address(valRegistry));
        console.log("PredictionOracle:", address(oracle));
        console.log("GameServer:", gameServer);

        vm.stopBroadcast();
    }
}

