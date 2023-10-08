// SPDX-License-Identifier: MIT

pragma solidity ^0.8.21;

import "./gov_state.sol";

contract Core_Getters is Gov_State {
	function get_gov_token() public view returns (address) {
		return _state.contracts.gov_token;
	}

	function get_sgov_token() public view returns (address) {
		return _state.contracts.sgov_token;
	}
}
