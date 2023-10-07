// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./core_state.sol";

contract Core_Setters is OwnableUpgradeable, Core_State {
	function set_validator_capacity(uint256 _validator_capacity) external onlyOwner {
		_state.constants.validator_capacity = _validator_capacity;
	}

	function set_ls_token_contract(address _ls_token) external onlyOwner {
		_state.contracts.ls_token = _ls_token;
	}

	function set_withdraw_contract(address _withdraw) external onlyOwner {
		_state.contracts.withdraw = _withdraw;
	}
}
