// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
	constructor() ERC20("TestToken", "TTK") {
		_mint(msg.sender, 1000000 * 10 ** decimals());
	}
}
