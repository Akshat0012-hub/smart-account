
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SmartAccountSimple {
    address public owner;
    constructor(address _owner) {
        require(_owner != address(0), "Owner cannot be zero address");
        owner = _owner;
    }
    function execute(address to, uint256 value, bytes calldata data, bytes calldata signature) external {
        bytes32 hash = keccak256(abi.encodePacked(to, value, data));
        bool res= validateUserOp(hash, signature);
        require(res, "Invalid signature");
        (bool success, ) = payable(to).call{value: value}(data);
        require(success, "Transaction failed");
    }
     function validateUserOp(
        bytes32 userOpHash,
        bytes calldata signature
    ) public view returns (bool) {

        bytes32 ethSigned = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                userOpHash
            )
        );

        address signer = recoverSigner(ethSigned, signature);

        return signer == owner;
    }

    function recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        return ecrecover(hash, v, r, s);
    }
    receive() external payable {}
}
