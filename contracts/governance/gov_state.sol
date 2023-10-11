// SPDX-License-Identifier: MIT

pragma solidity ^0.8.21;

contract Gov_Storage {
	struct Contracts {
		address gov_token;
		address sgov_token;
	}

	struct Gov_Data {
		bool is_staking;
		uint256 start_block;
		uint256 staked_balance;
		// realised emissions waiting to be minted (need this to track emissions when user updates staked balance)
		uint256 realised_emissions;
		uint256 voting_power;
	}

	struct State {
		Contracts contracts;
		mapping(address => Gov_Data) gov_data;
	}
}

contract Gov_State {
	Gov_Storage.State _state;
}
