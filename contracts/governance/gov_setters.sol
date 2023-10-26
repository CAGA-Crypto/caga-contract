// SPDX-License-Identifier: MIT

pragma solidity ^0.8.21;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./gov_state.sol";

contract Gov_Setters is OwnableUpgradeable, Gov_State {
	function set_gov_token(address _gov_token) external onlyOwner {
		_state.contracts.gov_token = _gov_token;
	}

	function set_sgov_token(address _sgov_token) external onlyOwner {
		_state.contracts.sgov_token = _sgov_token;
	}

	function set_emission_rate(uint256 _emission_rate) external onlyOwner {
		_state.emission.em_rate = _emission_rate;
	}

	function set_vp_rate(uint256 _vp_rate) external onlyOwner {
		_state.vp_rate = _vp_rate;
	}
}
