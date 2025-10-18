// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ValidationRegistry.sol";
import "../src/IdentityRegistry.sol";

contract ValidationRegistryTest is Test {
    ValidationRegistry public valRegistry;
    IdentityRegistry public idRegistry;
    
    address public agent1;
    address public validator1;
    uint256 public agent1Id;

    event ValidationRequest(
        address indexed validatorAddress,
        uint256 indexed agentId,
        string requestUri,
        bytes32 indexed requestHash
    );

    event ValidationResponse(
        address indexed validatorAddress,
        uint256 indexed agentId,
        bytes32 indexed requestHash,
        uint8 response,
        string responseUri,
        bytes32 tag
    );

    function setUp() public {
        idRegistry = new IdentityRegistry();
        valRegistry = new ValidationRegistry(address(idRegistry));
        
        agent1 = address(0x1);
        validator1 = address(0x101);
        
        vm.prank(agent1);
        agent1Id = idRegistry.register();
    }

    function testValidationRequest() public {
        bytes32 requestHash = keccak256("request-1");
        
        vm.prank(agent1);
        vm.expectEmit(true, true, true, true);
        emit ValidationRequest(validator1, agent1Id, "ipfs://QmRequest", requestHash);
        
        valRegistry.validationRequest(
            validator1,
            agent1Id,
            "ipfs://QmRequest",
            requestHash
        );
        
        (address validator, uint256 agentId, uint8 response, bytes32 tag, uint256 lastUpdate) = 
            valRegistry.getValidationStatus(requestHash);
        
        assertEq(validator, validator1);
        assertEq(agentId, agent1Id);
        assertEq(response, 0);
        assertEq(lastUpdate, block.timestamp);
    }

    function testValidationResponse() public {
        bytes32 requestHash = keccak256("request-1");
        
        vm.prank(agent1);
        valRegistry.validationRequest(validator1, agent1Id, "ipfs://QmRequest", requestHash);
        
        vm.prank(validator1);
        vm.expectEmit(true, true, true, true);
        emit ValidationResponse(
            validator1,
            agent1Id,
            requestHash,
            100,
            "ipfs://QmResponse",
            bytes32("passed")
        );
        
        valRegistry.validationResponse(
            requestHash,
            100,
            "ipfs://QmResponse",
            bytes32(0),
            bytes32("passed")
        );
        
        (,, uint8 response, bytes32 tag,) = valRegistry.getValidationStatus(requestHash);
        
        assertEq(response, 100);
        assertEq(tag, bytes32("passed"));
    }

    function testOnlyDesignatedValidatorCanRespond() public {
        bytes32 requestHash = keccak256("request-1");
        
        vm.prank(agent1);
        valRegistry.validationRequest(validator1, agent1Id, "ipfs://QmRequest", requestHash);
        
        vm.prank(address(0x999));
        vm.expectRevert("Not the designated validator");
        valRegistry.validationResponse(requestHash, 100, "", bytes32(0), bytes32(0));
    }

    function testResponseMustBe0To100() public {
        bytes32 requestHash = keccak256("request-1");
        
        vm.prank(agent1);
        valRegistry.validationRequest(validator1, agent1Id, "ipfs://QmRequest", requestHash);
        
        vm.prank(validator1);
        vm.expectRevert("Response must be 0-100");
        valRegistry.validationResponse(requestHash, 101, "", bytes32(0), bytes32(0));
    }

    function testGetSummary() public {
        bytes32 req1 = keccak256("request-1");
        bytes32 req2 = keccak256("request-2");
        
        vm.startPrank(agent1);
        valRegistry.validationRequest(validator1, agent1Id, "ipfs://Qm1", req1);
        valRegistry.validationRequest(validator1, agent1Id, "ipfs://Qm2", req2);
        vm.stopPrank();
        
        vm.startPrank(validator1);
        valRegistry.validationResponse(req1, 80, "", bytes32(0), bytes32(0));
        valRegistry.validationResponse(req2, 100, "", bytes32(0), bytes32(0));
        vm.stopPrank();
        
        address[] memory noFilter = new address[](0);
        (uint64 count, uint8 avgResponse) = valRegistry.getSummary(agent1Id, noFilter, bytes32(0));
        
        assertEq(count, 2);
        assertEq(avgResponse, 90);
    }

    function testGetAgentValidations() public {
        bytes32 req1 = keccak256("request-1");
        bytes32 req2 = keccak256("request-2");
        
        vm.startPrank(agent1);
        valRegistry.validationRequest(validator1, agent1Id, "ipfs://Qm1", req1);
        valRegistry.validationRequest(validator1, agent1Id, "ipfs://Qm2", req2);
        vm.stopPrank();
        
        bytes32[] memory requests = valRegistry.getAgentValidations(agent1Id);
        assertEq(requests.length, 2);
        assertEq(requests[0], req1);
        assertEq(requests[1], req2);
    }

    function testGetValidatorRequests() public {
        bytes32 req1 = keccak256("request-1");
        
        vm.prank(agent1);
        valRegistry.validationRequest(validator1, agent1Id, "ipfs://Qm1", req1);
        
        bytes32[] memory requests = valRegistry.getValidatorRequests(validator1);
        assertEq(requests.length, 1);
        assertEq(requests[0], req1);
    }

    function testMultipleResponseUpdates() public {
        bytes32 requestHash = keccak256("request-1");
        
        vm.prank(agent1);
        valRegistry.validationRequest(validator1, agent1Id, "ipfs://QmRequest", requestHash);
        
        vm.startPrank(validator1);
        
        valRegistry.validationResponse(requestHash, 50, "", bytes32(0), bytes32("preliminary"));
        (,, uint8 response1, bytes32 tag1,) = valRegistry.getValidationStatus(requestHash);
        assertEq(response1, 50);
        assertEq(tag1, bytes32("preliminary"));
        
        valRegistry.validationResponse(requestHash, 100, "", bytes32(0), bytes32("final"));
        (,, uint8 response2, bytes32 tag2,) = valRegistry.getValidationStatus(requestHash);
        assertEq(response2, 100);
        assertEq(tag2, bytes32("final"));
        
        vm.stopPrank();
    }
}

