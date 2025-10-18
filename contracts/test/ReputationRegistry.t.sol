// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ReputationRegistry.sol";
import "../src/IdentityRegistry.sol";

contract ReputationRegistryTest is Test {
    ReputationRegistry public repRegistry;
    IdentityRegistry public idRegistry;
    
    address public agent1;
    address public agent2;
    address public client1;
    address public client2;
    
    uint256 public agent1Id;
    uint256 public agent2Id;

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint8 score,
        bytes32 indexed tag1,
        bytes32 tag2,
        string fileuri,
        bytes32 filehash
    );

    function setUp() public {
        idRegistry = new IdentityRegistry();
        repRegistry = new ReputationRegistry(address(idRegistry));
        
        agent1 = address(0x1);
        agent2 = address(0x2);
        client1 = address(0x101);
        client2 = address(0x102);
        
        vm.prank(agent1);
        agent1Id = idRegistry.register();
        
        vm.prank(agent2);
        agent2Id = idRegistry.register();
    }

    function testGiveFeedback() public {
        ReputationRegistry.FeedbackAuth memory auth = ReputationRegistry.FeedbackAuth({
            agentId: agent1Id,
            clientAddress: client1,
            indexLimit: 1,
            expiry: block.timestamp + 1 hours,
            chainId: block.chainid,
            identityRegistry: address(idRegistry),
            signerAddress: agent1
        });
        
        vm.prank(client1);
        
        vm.expectEmit(true, true, true, true);
        emit NewFeedback(
            agent1Id,
            client1,
            85,
            bytes32("quality"),
            bytes32("helpful"),
            "ipfs://QmFeedback",
            bytes32(0)
        );
        
        repRegistry.giveFeedback(
            agent1Id,
            85,
            bytes32("quality"),
            bytes32("helpful"),
            "ipfs://QmFeedback",
            bytes32(0),
            abi.encode(auth)
        );
        
        (uint8 score, bytes32 tag1, bytes32 tag2, bool isRevoked) = repRegistry.readFeedback(agent1Id, client1, 0);
        
        assertEq(score, 85);
        assertEq(tag1, bytes32("quality"));
        assertEq(tag2, bytes32("helpful"));
        assertFalse(isRevoked);
    }

    function testCannotGiveFeedbackWithExpiredAuth() public {
        ReputationRegistry.FeedbackAuth memory auth = ReputationRegistry.FeedbackAuth({
            agentId: agent1Id,
            clientAddress: client1,
            indexLimit: 1,
            expiry: block.timestamp - 1,
            chainId: block.chainid,
            identityRegistry: address(idRegistry),
            signerAddress: agent1
        });
        
        vm.prank(client1);
        vm.expectRevert("Authorization expired");
        
        repRegistry.giveFeedback(
            agent1Id,
            85,
            bytes32(0),
            bytes32(0),
            "",
            bytes32(0),
            abi.encode(auth)
        );
    }

    function testCannotExceedIndexLimit() public {
        ReputationRegistry.FeedbackAuth memory auth = ReputationRegistry.FeedbackAuth({
            agentId: agent1Id,
            clientAddress: client1,
            indexLimit: 1,
            expiry: block.timestamp + 1 hours,
            chainId: block.chainid,
            identityRegistry: address(idRegistry),
            signerAddress: agent1
        });
        
        vm.startPrank(client1);
        
        repRegistry.giveFeedback(agent1Id, 85, bytes32(0), bytes32(0), "", bytes32(0), abi.encode(auth));
        
        vm.expectRevert("Index limit exceeded");
        repRegistry.giveFeedback(agent1Id, 90, bytes32(0), bytes32(0), "", bytes32(0), abi.encode(auth));
        
        vm.stopPrank();
    }

    function testRevokeFeedback() public {
        ReputationRegistry.FeedbackAuth memory auth = ReputationRegistry.FeedbackAuth({
            agentId: agent1Id,
            clientAddress: client1,
            indexLimit: 10,
            expiry: block.timestamp + 1 hours,
            chainId: block.chainid,
            identityRegistry: address(idRegistry),
            signerAddress: agent1
        });
        
        vm.startPrank(client1);
        
        repRegistry.giveFeedback(agent1Id, 85, bytes32(0), bytes32(0), "", bytes32(0), abi.encode(auth));
        
        repRegistry.revokeFeedback(agent1Id, 0);
        
        vm.stopPrank();
        
        (,, , bool isRevoked) = repRegistry.readFeedback(agent1Id, client1, 0);
        assertTrue(isRevoked);
    }

    function testGetSummary() public {
        ReputationRegistry.FeedbackAuth memory auth = ReputationRegistry.FeedbackAuth({
            agentId: agent1Id,
            clientAddress: client1,
            indexLimit: 10,
            expiry: block.timestamp + 1 hours,
            chainId: block.chainid,
            identityRegistry: address(idRegistry),
            signerAddress: agent1
        });
        
        vm.prank(client1);
        repRegistry.giveFeedback(agent1Id, 80, bytes32(0), bytes32(0), "", bytes32(0), abi.encode(auth));
        
        auth.clientAddress = client2;
        vm.prank(client2);
        repRegistry.giveFeedback(agent1Id, 90, bytes32(0), bytes32(0), "", bytes32(0), abi.encode(auth));
        
        address[] memory noFilter = new address[](0);
        (uint64 count, uint8 avgScore) = repRegistry.getSummary(agent1Id, noFilter, bytes32(0), bytes32(0));
        
        assertEq(count, 2);
        assertEq(avgScore, 85);
    }

    function testGetSummaryWithFilters() public {
        ReputationRegistry.FeedbackAuth memory auth = ReputationRegistry.FeedbackAuth({
            agentId: agent1Id,
            clientAddress: client1,
            indexLimit: 10,
            expiry: block.timestamp + 1 hours,
            chainId: block.chainid,
            identityRegistry: address(idRegistry),
            signerAddress: agent1
        });
        
        vm.prank(client1);
        repRegistry.giveFeedback(agent1Id, 80, bytes32("tag1"), bytes32(0), "", bytes32(0), abi.encode(auth));
        
        vm.prank(client1);
        repRegistry.giveFeedback(agent1Id, 90, bytes32("tag2"), bytes32(0), "", bytes32(0), abi.encode(auth));
        
        address[] memory noFilter = new address[](0);
        (uint64 count, uint8 avgScore) = repRegistry.getSummary(agent1Id, noFilter, bytes32("tag1"), bytes32(0));
        
        assertEq(count, 1);
        assertEq(avgScore, 80);
    }

    function testGetClients() public {
        ReputationRegistry.FeedbackAuth memory auth = ReputationRegistry.FeedbackAuth({
            agentId: agent1Id,
            clientAddress: client1,
            indexLimit: 10,
            expiry: block.timestamp + 1 hours,
            chainId: block.chainid,
            identityRegistry: address(idRegistry),
            signerAddress: agent1
        });
        
        vm.prank(client1);
        repRegistry.giveFeedback(agent1Id, 85, bytes32(0), bytes32(0), "", bytes32(0), abi.encode(auth));
        
        auth.clientAddress = client2;
        vm.prank(client2);
        repRegistry.giveFeedback(agent1Id, 90, bytes32(0), bytes32(0), "", bytes32(0), abi.encode(auth));
        
        address[] memory clientList = repRegistry.getClients(agent1Id);
        assertEq(clientList.length, 2);
        assertEq(clientList[0], client1);
        assertEq(clientList[1], client2);
    }

    function testScoreMustBe0To100() public {
        ReputationRegistry.FeedbackAuth memory auth = ReputationRegistry.FeedbackAuth({
            agentId: agent1Id,
            clientAddress: client1,
            indexLimit: 10,
            expiry: block.timestamp + 1 hours,
            chainId: block.chainid,
            identityRegistry: address(idRegistry),
            signerAddress: agent1
        });
        
        vm.prank(client1);
        vm.expectRevert("Score must be 0-100");
        repRegistry.giveFeedback(agent1Id, 101, bytes32(0), bytes32(0), "", bytes32(0), abi.encode(auth));
    }
}

