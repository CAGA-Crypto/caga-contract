// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./core_state.sol";

contract Core_Getters is Core_State {
	// get withdraw contract rewards
	// calculates rewards not moved to the core contract yet
	function get_wc_rewards() public view returns (uint256) {
		if (_state.withdrawals.withdraw_total > 0) {
			uint256 unstaked_validators = _state.contracts.withdraw.balance / _state.constants.validator_capacity;
			if (unstaked_validators > 0) {
				return _state.contracts.withdraw.balance - (unstaked_validators * _state.constants.validator_capacity);
			}
		}
		return _state.contracts.withdraw.balance;
	}

	// returns all time protocol collected rewards
	function get_total_rewards() external view returns (uint256) {
		return _state.distributed_rewards + get_wc_rewards();
	}
}
