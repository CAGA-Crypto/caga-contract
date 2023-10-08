// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

interface i_gov_token {
	function transfer(address recipient, uint256 amount) external returns (bool);

	function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}
