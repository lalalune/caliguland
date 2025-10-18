// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title ReputationRegistry
 * @notice ERC-8004 Reputation Registry for agent feedback
 * @dev Stores feedback signals on-chain with off-chain URI for full data
 */
contract ReputationRegistry {
    struct FeedbackAuth {
        uint256 agentId;
        address clientAddress;
        uint64 indexLimit;
        uint256 expiry;
        uint256 chainId;
        address identityRegistry;
        address signerAddress;
    }

    struct Feedback {
        uint8 score;
        bytes32 tag1;
        bytes32 tag2;
        uint64 feedbackIndex;
        bool isRevoked;
    }

    address public immutable identityRegistry;
    
    mapping(uint256 => mapping(address => Feedback[])) public feedback;
    mapping(uint256 => address[]) public clients;
    mapping(bytes32 => mapping(uint256 => mapping(address => uint64))) public responseCount;

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint8 score,
        bytes32 indexed tag1,
        bytes32 tag2,
        string fileuri,
        bytes32 filehash
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 indexed feedbackIndex
    );

    event ResponseAppended(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        address indexed responder,
        string responseUri
    );

    constructor(address _identityRegistry) {
        identityRegistry = _identityRegistry;
    }

    function getIdentityRegistry() external view returns (address) {
        return identityRegistry;
    }

    /**
     * @notice Give feedback for an agent
     * @param agentId Agent ID from Identity Registry
     * @param score Score 0-100
     * @param tag1 Optional category tag
     * @param tag2 Optional sub-category tag
     * @param fileuri URI to off-chain feedback file (IPFS, HTTPS)
     * @param filehash KECCAK-256 hash of file content (optional for IPFS)
     * @param feedbackAuth Signed authorization from agent
     */
    function giveFeedback(
        uint256 agentId,
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        string calldata fileuri,
        bytes32 filehash,
        bytes memory feedbackAuth
    ) external {
        if (score > 100) revert("Score must be 0-100");

        FeedbackAuth memory auth = abi.decode(feedbackAuth, (FeedbackAuth));
        
        if (auth.agentId != agentId) revert("Agent ID mismatch");
        if (auth.clientAddress != msg.sender) revert("Client address mismatch");
        if (auth.chainId != block.chainid) revert("Chain ID mismatch");
        if (auth.identityRegistry != identityRegistry) revert("Registry mismatch");
        if (block.timestamp >= auth.expiry) revert("Authorization expired");

        uint64 lastIndex = uint64(feedback[agentId][msg.sender].length);
        if (auth.indexLimit <= lastIndex) revert("Index limit exceeded");

        if (feedback[agentId][msg.sender].length == 0) {
            clients[agentId].push(msg.sender);
        }

        feedback[agentId][msg.sender].push(Feedback({
            score: score,
            tag1: tag1,
            tag2: tag2,
            feedbackIndex: lastIndex,
            isRevoked: false
        }));

        emit NewFeedback(agentId, msg.sender, score, tag1, tag2, fileuri, filehash);
    }

    /**
     * @notice Revoke previously given feedback
     */
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        Feedback[] storage clientFeedback = feedback[agentId][msg.sender];
        if (feedbackIndex >= clientFeedback.length) revert("Invalid index");
        
        clientFeedback[feedbackIndex].isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    /**
     * @notice Append a response to feedback
     */
    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseUri,
        bytes32 responseHash
    ) external {
        Feedback[] storage clientFeedback = feedback[agentId][clientAddress];
        if (feedbackIndex >= clientFeedback.length) revert("Invalid index");
        
        responseCount[responseHash][agentId][clientAddress]++;
        emit ResponseAppended(agentId, clientAddress, feedbackIndex, msg.sender, responseUri);
    }

    /**
     * @notice Get summary stats for an agent
     * @param agentId Agent ID
     * @param clientAddresses Filter by specific clients (empty for all)
     * @param tag1 Filter by tag1 (bytes32(0) for no filter)
     * @param tag2 Filter by tag2 (bytes32(0) for no filter)
     * @return count Total feedback count
     * @return averageScore Average score
     */
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        bytes32 tag1,
        bytes32 tag2
    ) external view returns (uint64 count, uint8 averageScore) {
        uint256 totalScore = 0;
        count = 0;

        address[] memory clientsToQuery;
        if (clientAddresses.length > 0) {
            clientsToQuery = clientAddresses;
        } else {
            clientsToQuery = clients[agentId];
        }

        for (uint256 i = 0; i < clientsToQuery.length; i++) {
            Feedback[] storage clientFeedback = feedback[agentId][clientsToQuery[i]];
            
            for (uint256 j = 0; j < clientFeedback.length; j++) {
                Feedback storage fb = clientFeedback[j];
                
                if (fb.isRevoked) continue;
                if (tag1 != bytes32(0) && fb.tag1 != tag1) continue;
                if (tag2 != bytes32(0) && fb.tag2 != tag2) continue;
                
                totalScore += fb.score;
                count++;
            }
        }

        averageScore = count > 0 ? uint8(totalScore / count) : 0;
    }

    /**
     * @notice Read specific feedback
     */
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 index
    ) external view returns (uint8 score, bytes32 tag1, bytes32 tag2, bool isRevoked) {
        Feedback[] storage clientFeedback = feedback[agentId][clientAddress];
        if (index >= clientFeedback.length) revert("Invalid index");
        
        Feedback storage fb = clientFeedback[index];
        return (fb.score, fb.tag1, fb.tag2, fb.isRevoked);
    }

    /**
     * @notice Get all clients who provided feedback for an agent
     */
    function getClients(uint256 agentId) external view returns (address[] memory) {
        return clients[agentId];
    }

    /**
     * @notice Get last feedback index for a client
     */
    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64) {
        return uint64(feedback[agentId][clientAddress].length);
    }
}

