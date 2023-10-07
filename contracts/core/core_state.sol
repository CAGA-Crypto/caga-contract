// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

contract Storage {
	struct Constants {
		uint256 validator_capacity;
	}

	struct Contracts {
		address ls_token;
		address withdraw;
	}

	struct Withdrawals {
		mapping(address => uint256) withdraw_account;
		uint256 withdraw_total;
		uint256 unstaked_validators;
	}

	struct State {
		Constants constants;
		Contracts contracts;
		uint256 total_deposits;
		uint256 distributed_rewards;
		Withdrawals withdrawals;
	}
}

contract Core_State {
	Storage.State _state;
}
