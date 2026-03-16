// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserOperation.sol";
interface IEntryPoint{
    function balanceOf(address account)external view returns(uint256);

}

contract Paymaster {

    address public owner;
IEntryPoint public entrypoint;
    constructor(address _entryPoint) {
        owner = msg.sender;
        entrypoint = IEntryPoint(_entryPoint);
    }

   function validatePaymasterUserOp(
    UserOperation calldata userOp,bytes32 userOpHash, uint256 maxCost
)external view  returns (bytes memory context, uint256 validationData)
 { userOp; userOpHash; uint256 deposit = entrypoint.balanceOf(address(this)); require(deposit >= maxCost, "Paymaster deposit too low"); return ("", 0); } 
}