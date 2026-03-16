// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserOperation.sol";

contract Paymaster {

    address public owner;

    constructor() {
        owner = msg.sender;
    }

   function validatePaymasterUserOp(
    UserOperation calldata
)
    external
    pure
    returns(bool)
{
    return true;
}
}