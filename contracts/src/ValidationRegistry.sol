// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title ValidationRegistry
 * @notice ERC-8004 Validation Registry for independent verification
 * @dev Allows agents to request validation and validators to respond
 */
contract ValidationRegistry {
    struct ValidationRecord {
        bytes32 requestHash;
        address validatorAddress;
        uint256 agentId;
        uint8 response;
        bytes32 tag;
        uint256 lastUpdate;
    }

    address public immutable identityRegistry;
    
    mapping(bytes32 => ValidationRecord) public validations;
    mapping(uint256 => bytes32[]) public agentValidations;
    mapping(address => bytes32[]) public validatorRequests;

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

    constructor(address _identityRegistry) {
        identityRegistry = _identityRegistry;
    }

    function getIdentityRegistry() external view returns (address) {
        return identityRegistry;
    }

    /**
     * @notice Request validation from a validator
     * @param validatorAddress Address of validator contract
     * @param agentId Agent ID requesting validation
     * @param requestUri URI containing validation request data
     * @param requestHash Hash commitment of request data
     */
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestUri,
        bytes32 requestHash
    ) external {
        if (validations[requestHash].requestHash != bytes32(0)) revert("Request hash already exists");

        validations[requestHash] = ValidationRecord({
            requestHash: requestHash,
            validatorAddress: validatorAddress,
            agentId: agentId,
            response: 0,
            tag: bytes32(0),
            lastUpdate: block.timestamp
        });

        agentValidations[agentId].push(requestHash);
        validatorRequests[validatorAddress].push(requestHash);

        emit ValidationRequest(validatorAddress, agentId, requestUri, requestHash);
    }

    /**
     * @notice Validator responds to validation request
     * @param requestHash Hash of the request being responded to
     * @param response Validation response (0-100, typically 0=fail, 100=pass)
     * @param responseUri Optional URI to validation evidence
     * @param responseHash Hash of response URI content
     * @param tag Optional categorization tag
     */
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseUri,
        bytes32 responseHash,
        bytes32 tag
    ) external {
        ValidationRecord storage record = validations[requestHash];
        if (record.requestHash == bytes32(0)) revert("Request not found");
        if (record.validatorAddress != msg.sender) revert("Not the designated validator");
        if (response > 100) revert("Response must be 0-100");

        record.response = response;
        record.tag = tag;
        record.lastUpdate = block.timestamp;

        emit ValidationResponse(
            msg.sender,
            record.agentId,
            requestHash,
            response,
            responseUri,
            tag
        );
    }

    /**
     * @notice Get validation status
     */
    function getValidationStatus(bytes32 requestHash) external view returns (
        address validatorAddress,
        uint256 agentId,
        uint8 response,
        bytes32 tag,
        uint256 lastUpdate
    ) {
        ValidationRecord storage record = validations[requestHash];
        return (
            record.validatorAddress,
            record.agentId,
            record.response,
            record.tag,
            record.lastUpdate
        );
    }

    /**
     * @notice Get summary of validations for an agent
     * @param agentId Agent ID
     * @param validatorAddresses Filter by validators (empty for all)
     * @param tag Filter by tag (bytes32(0) for no filter)
     * @return count Total validation count
     * @return avgResponse Average response value
     */
    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        bytes32 tag
    ) external view returns (uint64 count, uint8 avgResponse) {
        uint256 totalResponse = 0;
        count = 0;

        bytes32[] memory requests = agentValidations[agentId];
        
        for (uint256 i = 0; i < requests.length; i++) {
            ValidationRecord storage record = validations[requests[i]];
            
            if (validatorAddresses.length > 0) {
                bool matchesValidator = false;
                for (uint256 j = 0; j < validatorAddresses.length; j++) {
                    if (record.validatorAddress == validatorAddresses[j]) {
                        matchesValidator = true;
                        break;
                    }
                }
                if (!matchesValidator) continue;
            }
            
            if (tag != bytes32(0) && record.tag != tag) continue;
            if (record.response == 0) continue;
            
            totalResponse += record.response;
            count++;
        }

        avgResponse = count > 0 ? uint8(totalResponse / count) : 0;
    }

    /**
     * @notice Get all validation requests for an agent
     */
    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory requestHashes) {
        return agentValidations[agentId];
    }

    /**
     * @notice Get all requests assigned to a validator
     */
    function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory requestHashes) {
        return validatorRequests[validatorAddress];
    }
}

