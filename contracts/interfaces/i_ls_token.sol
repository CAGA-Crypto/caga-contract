// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface i_ls_token {
	function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

	function mint(address to, uint256 amount) external;
}
