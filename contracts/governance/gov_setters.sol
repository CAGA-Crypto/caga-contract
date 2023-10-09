// SPDX-License-Identifier: MIT

pragma solidity ^0.8.21;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./gov_state.sol";

contract Gov_Setters is OwnableUpgradeable, Gov_State {
	function setGovToken(address _gov_token) external onlyOwner {
		_state.contracts.gov_token = _gov_token;
	}

	function setSGovToken(address _sgov_token) external onlyOwner {
		_state.contracts.sgov_token = _sgov_token;
	}
}
