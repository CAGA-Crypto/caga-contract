// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

contract Storage {
	struct Contracts {
		address ls_token;
		address withdraw;
	}

	struct Withdrawals {
		mapping(address => uint256) withdraw_account;
		uint256 withdraw_total;
	}

	struct State {
		Contracts contracts;
		uint256 total_deposits;
		Withdrawals withdrawals;
	}
}

contract Core_State {
	Storage.State _state;
}
