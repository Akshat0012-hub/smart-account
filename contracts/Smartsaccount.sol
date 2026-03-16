// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./UserOperation.sol";

contract SmartAccount {

    address public owner;
    uint256 public nonce;
    address public entryPoint;

    constructor(address _owner, address _entryPoint) {
        owner = _owner;
        entryPoint = _entryPoint;
        nonce=0;

    }

    modifier onlyEntryPoint() {
        require(msg.sender == entryPoint, "ONLY_ENTRYPOINT");
        _;
    }

    function getUserOpHash( UserOperation calldata userOp ) public pure returns(bytes32) {
 return keccak256(
            abi.encode(
                userOp.sender,
                userOp.nonce,
                userOp.callData
            )
        );
    }
function validateUserOp(UserOperation calldata userOp) external view onlyEntryPoint returns(bool) {
    if (userOp.nonce != nonce) return false;
    bytes32 hash = getUserOpHash(userOp);
    bytes32 message = MessageHashUtils.toEthSignedMessageHash(hash);
    address signer = ECDSA.recover(message, userOp.signature);
    return signer == owner;
}


    function execute(bytes calldata callData)external onlyEntryPoint
    {
        (address target, bytes memory data) =
            abi.decode(callData,(address,bytes));

        (bool success,) = target.call(data);

        require(success,"CALL_FAILED");
        nonce++;
    }
}