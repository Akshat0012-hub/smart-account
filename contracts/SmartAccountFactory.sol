//SPDX-License-Identifier:MIT
pragma solidity ^0.8.20;
import "./Smartsaccount.sol";
contract SmartAccountFactory {
    event Accountcreated(address account,address owner);
    function cretaeaccount(address owner,address entrypoint) public returns(address ){
           SmartAccount account = new SmartAccount(owner,entrypoint);
        emit Accountcreated(address(account), owner);

        return address(account);
    }
}