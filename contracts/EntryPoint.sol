// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserOperation.sol";

interface ISmartAccount {
    function validateUserOp(
        UserOperation calldata userOp
    ) external view returns(bool);

    function execute(bytes calldata callData) external;
}

interface IPaymaster {
    function validatePaymasterUserOp(
        UserOperation calldata userOp
    ) external view returns(bool);
}

contract EntryPoint {
    function handleOps(UserOperation[] calldata ops  ) external {
        for(uint256 i = 0; i < ops.length; i++){
            UserOperation calldata op = ops[i];
            ISmartAccount account =ISmartAccount(op.sender);
            bool valid =account.validateUserOp(op);
            require(valid,"INVALID_SIGNATURE");
            if(op.paymaster != address(0)){
                bool approved =IPaymaster(op.paymaster).validatePaymasterUserOp(op);
                require( approved,"PAYMASTER_REJECTED");
            }

            account.execute(op.callData);
        }
    }

}