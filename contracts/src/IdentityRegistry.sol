// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

/**
 * @title IdentityRegistry
 * @notice ERC-721 based agent identity registry as per ERC-8004
 * @dev Provides unique on-chain identity for agents with URI to registration file
 */
contract IdentityRegistry {
    struct MetadataEntry {
        string key;
        bytes value;
    }

    uint256 private _nextAgentId = 1;
    mapping(uint256 => address) public agentOwners;
    mapping(uint256 => string) public tokenURIs;
    mapping(uint256 => mapping(string => bytes)) public metadata;
    mapping(address => uint256) public agentByAddress;

    event Registered(uint256 indexed agentId, string tokenURI, address indexed owner);
    event MetadataSet(uint256 indexed agentId, string indexed indexedKey, string key, bytes value);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /**
     * @notice Register a new agent
     * @param uri URI to agent registration file (ipfs://, https://, etc.)
     * @param metadataEntries Optional on-chain metadata
     * @return agentId The newly assigned agent ID
     */
    function register(string calldata uri, MetadataEntry[] calldata metadataEntries) external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        agentOwners[agentId] = msg.sender;
        tokenURIs[agentId] = uri;
        agentByAddress[msg.sender] = agentId;

        for (uint256 i = 0; i < metadataEntries.length; i++) {
            metadata[agentId][metadataEntries[i].key] = metadataEntries[i].value;
            emit MetadataSet(agentId, metadataEntries[i].key, metadataEntries[i].key, metadataEntries[i].value);
        }

        emit Registered(agentId, uri, msg.sender);
        emit Transfer(address(0), msg.sender, agentId);
    }

    /**
     * @notice Register without URI (set later)
     */
    function register() external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        agentOwners[agentId] = msg.sender;
        agentByAddress[msg.sender] = agentId;

        emit Registered(agentId, "", msg.sender);
        emit Transfer(address(0), msg.sender, agentId);
    }

    /**
     * @notice Set or update token URI
     */
    function setTokenURI(uint256 agentId, string calldata uri) external {
        if (agentOwners[agentId] != msg.sender) revert("Not owner");
        tokenURIs[agentId] = uri;
    }

    /**
     * @notice Set metadata for an agent
     */
    function setMetadata(uint256 agentId, string calldata key, bytes calldata value) external {
        if (agentOwners[agentId] != msg.sender) revert("Not owner");
        metadata[agentId][key] = value;
        emit MetadataSet(agentId, key, key, value);
    }

    /**
     * @notice Get metadata for an agent
     */
    function getMetadata(uint256 agentId, string calldata key) external view returns (bytes memory) {
        return metadata[agentId][key];
    }

    /**
     * @notice Get token URI
     */
    function tokenURI(uint256 agentId) external view returns (string memory) {
        return tokenURIs[agentId];
    }

    /**
     * @notice Check if address is registered
     */
    function isRegistered(address agent) external view returns (bool) {
        return agentByAddress[agent] != 0;
    }

    /**
     * @notice Get agent ID by address
     */
    function getAgentId(address agent) external view returns (uint256) {
        return agentByAddress[agent];
    }

    /**
     * @notice Get owner of agent ID
     */
    function ownerOf(uint256 agentId) external view returns (address) {
        address owner = agentOwners[agentId];
        if (owner == address(0)) revert("Agent does not exist");
        return owner;
    }

    /**
     * @notice Total agents registered
     */
    function totalSupply() external view returns (uint256) {
        return _nextAgentId - 1;
    }
}

