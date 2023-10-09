// SPDX-License-Identifier: MIT

pragma solidity ^0.8.21;

contract Gov_Storage {
	struct Contracts {
		address gov_token;
		address sgov_token;
	}

	struct sGov_Emission {
		mapping(address => uint256) staking_balance;
		mapping(address => bool) is_staking;
		mapping(address => uint256) start_time;
		mapping(address => uint256) gov_balance;
	}

	struct State {
		Contracts contracts;
		sGov_Emission emissions;
	}
}

contract Gov_State {
	Gov_Storage.State _state;
}
