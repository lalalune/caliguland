// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/IdentityRegistry.sol";

contract IdentityRegistryTest is Test {
    IdentityRegistry public registry;
    address public agent1;
    address public agent2;

    event Registered(uint256 indexed agentId, string tokenURI, address indexed owner);
    event MetadataSet(uint256 indexed agentId, string indexed indexedKey, string key, bytes value);

    function setUp() public {
        registry = new IdentityRegistry();
        agent1 = address(0x1);
        agent2 = address(0x2);
    }

    function testRegisterWithURI() public {
        vm.prank(agent1);
        
        IdentityRegistry.MetadataEntry[] memory entries = new IdentityRegistry.MetadataEntry[](0);
        
        vm.expectEmit(true, true, false, true);
        emit Registered(1, "ipfs://QmTest", agent1);
        
        uint256 agentId = registry.register("ipfs://QmTest", entries);
        
        assertEq(agentId, 1);
        assertEq(registry.tokenURI(agentId), "ipfs://QmTest");
        assertEq(registry.ownerOf(agentId), agent1);
        assertTrue(registry.isRegistered(agent1));
        assertEq(registry.getAgentId(agent1), 1);
    }

    function testRegisterWithMetadata() public {
        vm.prank(agent1);
        
        IdentityRegistry.MetadataEntry[] memory entries = new IdentityRegistry.MetadataEntry[](2);
        entries[0] = IdentityRegistry.MetadataEntry("agentName", bytes("TestAgent"));
        entries[1] = IdentityRegistry.MetadataEntry("agentWallet", abi.encodePacked(agent1));
        
        uint256 agentId = registry.register("ipfs://QmTest", entries);
        
        assertEq(registry.getMetadata(agentId, "agentName"), bytes("TestAgent"));
        assertEq(registry.getMetadata(agentId, "agentWallet"), abi.encodePacked(agent1));
    }

    function testRegisterWithoutURI() public {
        vm.prank(agent1);
        
        uint256 agentId = registry.register();
        
        assertEq(agentId, 1);
        assertEq(registry.tokenURI(agentId), "");
        assertEq(registry.ownerOf(agentId), agent1);
    }

    function testSetTokenURI() public {
        vm.prank(agent1);
        uint256 agentId = registry.register();
        
        vm.prank(agent1);
        registry.setTokenURI(agentId, "ipfs://QmUpdated");
        
        assertEq(registry.tokenURI(agentId), "ipfs://QmUpdated");
    }

    function testCannotSetURIIfNotOwner() public {
        vm.prank(agent1);
        uint256 agentId = registry.register();
        
        vm.prank(agent2);
        vm.expectRevert("Not owner");
        registry.setTokenURI(agentId, "ipfs://QmHack");
    }

    function testSetMetadata() public {
        vm.prank(agent1);
        uint256 agentId = registry.register();
        
        vm.prank(agent1);
        vm.expectEmit(true, true, false, true);
        emit MetadataSet(agentId, "bio", "bio", bytes("Test bio"));
        
        registry.setMetadata(agentId, "bio", bytes("Test bio"));
        
        assertEq(registry.getMetadata(agentId, "bio"), bytes("Test bio"));
    }

    function testCannotSetMetadataIfNotOwner() public {
        vm.prank(agent1);
        uint256 agentId = registry.register();
        
        vm.prank(agent2);
        vm.expectRevert("Not owner");
        registry.setMetadata(agentId, "bio", bytes("Hacked bio"));
    }

    function testMultipleAgentRegistration() public {
        vm.prank(agent1);
        uint256 id1 = registry.register();
        
        vm.prank(agent2);
        uint256 id2 = registry.register();
        
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(registry.totalSupply(), 2);
        
        assertEq(registry.getAgentId(agent1), 1);
        assertEq(registry.getAgentId(agent2), 2);
    }

    function testOwnerOfNonexistentAgent() public {
        vm.expectRevert("Agent does not exist");
        registry.ownerOf(999);
    }

    function testIsRegistered() public {
        assertFalse(registry.isRegistered(agent1));
        
        vm.prank(agent1);
        registry.register();
        
        assertTrue(registry.isRegistered(agent1));
        assertFalse(registry.isRegistered(agent2));
    }
}

