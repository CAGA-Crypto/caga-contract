// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

contract Storage {
	struct Withdrawals {
		mapping(address => uint256) withdraw_account;
		uint256 withdraw_total;
	}

	struct State {
		address ls_token_contract;
		address withdraw_contract;
		Withdrawals withdrawals;
		bool paused;
	}
}

contract Core_State {
	Storage.State _state;
}
