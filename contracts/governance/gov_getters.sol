// SPDX-License-Identifier: MIT

pragma solidity ^0.8.21;

import "./gov_state.sol";

contract Gov_Getters is Gov_State {
	function get_gov_token() public view returns (address) {
		return _state.contracts.gov_token;
	}

	function get_sgov_token() public view returns (address) {
		return _state.contracts.sgov_token;
	}

	function get_emission_rate() public view returns (uint256) {
		return _state.rate.em_rate;
	}

	function get_vp_rate() public view returns (uint256) {
		return _state.rate.vp_rate;
	}

	function get_user_data(address user) public view returns (Gov_Storage.Gov_Data memory) {
		return _state.gov_data[user];
	}

	function get_total_vp() public view returns (uint256) {
		return _state.total_vp;
	}

	function get_user_vp(address user) public view returns (uint256) {
		return _state.gov_data[user].voting_power;
	}
}
