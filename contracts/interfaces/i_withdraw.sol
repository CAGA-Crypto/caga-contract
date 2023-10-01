// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface i_withdraw {
    function withdraw(address payable to, uint256 amount) external;
}
