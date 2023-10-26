// SPDX-License-Identifier: MIT

pragma solidity ^0.8.21;

import "./gov_state.sol";

contract Gov_Getters is Gov_State {
	function get_gov_token() external view returns (address) {
		return _state.contracts.gov_token;
	}

	function get_sgov_token() external view returns (address) {
		return _state.contracts.sgov_token;
	}

	function get_emission_rate() external view returns (uint256) {
		return _state.rate.em_rate;
	}

	function get_vp_rate() external view returns (uint256) {
		return _state.rate.vp_rate;
	}

	function get_user_data(address user) external view returns (Gov_Storage.Gov_Data memory) {
		return _state.gov_data[user];
	}

	function get_user_staked_balance(address user) external view returns (uint256) {
		return _state.gov_data[user].staked_balance;
	}

	function get_total_staked() external view returns (uint256) {
		return _state.total_staked;
	}

	function get_user_vp(address user) external view returns (uint256) {
		return _state.gov_data[user].voting_power;
	}

	function get_total_vp() external view returns (uint256) {
		return _state.total_vp;
	}
}
