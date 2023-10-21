// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./core_getters.sol";
import "./core_setters.sol";
import "../interfaces/i_ls_token.sol";
import "../interfaces/i_withdraw.sol";
import "../interfaces/i_AbyssEth2Depositor.sol";

contract Core is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable, Core_Getters, Core_Setters {
	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	event Deposit(address from, uint256 amount);
	event Withdraw_Request(address from, uint256 amount);
	event Withdraw_Claim(address to, uint256 amount);
	event Withdraw_Unstaked(uint256 amount);
	event Distribute_Rewards(uint256 rewards, uint256 protocol_rewards);
	event Stake_Validator(uint256 amount);
	event Unstake_Validator(uint256 full_amount, uint256 shortfall, uint256 validators_to_unstake);
	event Deposit_Validator(uint256 amount, uint256 validator_index);

	function initialize(address ls_token, address withdraw_contract, address abyss_eth2_depositor) public initializer {
		__Ownable_init();
		__UUPSUpgradeable_init();
		__ReentrancyGuard_init();

		_state.constants.validator_capacity = 32 ether;
		_state.protocol_fee_percentage = 1000000000; // 10% (8 decimals)

		_state.contracts.ls_token = ls_token;
		_state.contracts.withdraw = withdraw_contract;
		_state.contracts.abyss_eth2_depositor = abyss_eth2_depositor;
		_state.treasury = msg.sender;
	}

	function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

	// calculate the amount of ls tokens to mint based on the current exchange rate
	function calculate_deposit(uint256 amount) public view returns (uint256) {
		(uint256 rewards, ) = get_wc_rewards();
		uint256 protocol_eth = _state.total_deposits + rewards;
		uint256 ls_token_supply = i_ls_token(_state.contracts.ls_token).totalSupply();
		uint256 mint_amount;
		if (ls_token_supply == 0) {
			mint_amount = amount;
		} else {
			mint_amount = (ls_token_supply * amount) / protocol_eth;
		}

		return mint_amount;
	}

	function deposit() external payable nonReentrant {
		require(msg.value > 0, "deposit must be greater than 0");

		uint256 mint_amount = calculate_deposit(msg.value);

		_state.total_deposits += msg.value;

		i_ls_token(_state.contracts.ls_token).mint(_msgSender(), mint_amount);

		emit Deposit(_msgSender(), msg.value);

		bool stakable = check_stakable();
		if (stakable) {
			emit Stake_Validator(address(this).balance - _state.protocol_float);
		}
	}

	// calculate the amount of ETH to withdraw based on the current exchange rate
	function calculate_withdraw(uint256 amount) public view returns (uint256, uint256) {
		(uint256 rewards, ) = get_wc_rewards();
		uint256 protocol_eth = _state.total_deposits + rewards;
		uint256 ls_token_supply = i_ls_token(_state.contracts.ls_token).totalSupply();
		uint256 withdraw_amount = (protocol_eth * amount) / ls_token_supply;

		return (protocol_eth, withdraw_amount);
	}

	function request_withdraw(uint256 amount) external nonReentrant {
		require(amount > 0, "withdraw amount must be greater than 0");
		require(i_ls_token(_state.contracts.ls_token).balanceOf(_msgSender()) >= amount, "insufficient balance");

		(uint256 protocol_eth, uint256 withdraw_amount) = calculate_withdraw(amount);

		emit Withdraw_Request(_msgSender(), withdraw_amount);

		// core contract does not have enough ETH to process withdrawal request
		if (withdraw_amount > address(this).balance) {
			// both core and withdraw contract does not have enough ETH to process this withdrawal request (need to unwind from validator)
			if (withdraw_amount > protocol_eth) {
				_state.withdrawals.withdraw_account[_msgSender()] += withdraw_amount;
				_state.withdrawals.withdraw_total += withdraw_amount;
				uint256 unstake_validators = (withdraw_amount - protocol_eth) / _state.constants.validator_capacity;
				if ((withdraw_amount - protocol_eth) % _state.constants.validator_capacity > 0) unstake_validators++;
				_state.withdrawals.unstaked_validators += unstake_validators;

				_state.total_deposits -= withdraw_amount;
				i_ls_token(_state.contracts.ls_token).burnFrom(_msgSender(), amount);

				emit Unstake_Validator(withdraw_amount, withdraw_amount - protocol_eth, unstake_validators);

				return;
			} else {
				// core + withdraw contract has enough ETH to process withdrawal request
				// so we move unstaked ETH from withdraw contract to core contract
				// as withdrawals funds should never be processed from the withdraw contract
				_withdraw_unstaked();
			}
		}
		// only core contract funds should be used to process withdrawal requests
		_distribute_rewards();
		_state.total_deposits -= withdraw_amount;

		i_ls_token(_state.contracts.ls_token).burnFrom(_msgSender(), amount);
		payable(_msgSender()).transfer(withdraw_amount);

		emit Withdraw_Claim(_msgSender(), withdraw_amount);
	}

	function claim_withdrawal() external nonReentrant {
		uint256 withdraw_amount = _state.withdrawals.withdraw_account[_msgSender()];
		require(withdraw_amount > 0, "no withdrawal to claim");
		require(address(this).balance >= withdraw_amount, "insufficient funds to process request");

		_state.withdrawals.withdraw_account[_msgSender()] = 0;
		_state.withdrawals.withdraw_total -= withdraw_amount;

		payable(_msgSender()).transfer(withdraw_amount);

		emit Withdraw_Claim(_msgSender(), withdraw_amount);
	}

	function _withdraw_unstaked() internal {
		require(_state.withdrawals.unstaked_validators > 0, "no existing unstaked validators");
		// move unstaked ETH from withdraw contract to core contract to ensure withdraw contract funds are not mixed with rewards
		uint256 unstaked_validators = _state.contracts.withdraw.balance / _state.constants.validator_capacity;
		if (unstaked_validators > 0) {
			_state.withdrawals.unstaked_validators -= unstaked_validators;
			uint256 unstaked_amount = unstaked_validators * _state.constants.validator_capacity;
			i_withdraw(_state.contracts.withdraw).protocol_withdraw(unstaked_amount);

			emit Withdraw_Unstaked(unstaked_amount);
		}
	}

	function withdraw_unstaked() external nonReentrant {
		_withdraw_unstaked();
	}

	function _distribute_rewards() internal {
		(uint256 rewards, uint256 protocol_rewards) = get_wc_rewards();
		_state.total_deposits += rewards;
		_state.distributed_rewards += rewards;
		_state.protocol_rewards += protocol_rewards;

		i_withdraw(_state.contracts.withdraw).protocol_withdraw(rewards);
		i_withdraw(_state.contracts.withdraw).protocol_withdraw(protocol_rewards);
		payable(_state.treasury).transfer(protocol_rewards);

		emit Distribute_Rewards(rewards, protocol_rewards);
	}

	function distribute_rewards() public nonReentrant {
		_distribute_rewards();
	}

	function check_stakable() internal view returns (bool) {
		if (address(this).balance > (_state.withdrawals.withdraw_total + _state.protocol_float + _state.constants.validator_capacity)) {
			return true;
		}

		return false;
	}

	function stake_validator(
		bytes[] calldata pubkeys,
		bytes[] calldata withdrawal_credentials,
		bytes[] calldata signatures,
		bytes32[] calldata deposit_data_roots
	) external nonReentrant {
		// validate withdrawal_credentials is the same as withdrawal contract address
		// convert withdrawal_credentials to hex string first then to address
		for (uint256 i = 0; i < withdrawal_credentials.length; i++) {
			require(
				address(uint160(uint256(keccak256(abi.encodePacked(withdrawal_credentials[i]))))) == _state.contracts.withdraw,
				"invalid withdrawal credentials"
			);
		}

		require(check_stakable(), "insufficient funds to stake to validator");

		uint256 num_of_validators = (address(this).balance - _state.withdrawals.withdraw_total - _state.protocol_float) /
			_state.constants.validator_capacity;
		if (num_of_validators == 0) {
			// scenario should not happen
			revert("insufficient funds to deposit for validator(s)");
		}

		// deposit to validator(s)
		uint256 stake_amount = num_of_validators * _state.constants.validator_capacity;
		i_AbyssEth2Depositor(_state.contracts.abyss_eth2_depositor).deposit{value: stake_amount}(
			pubkeys,
			withdrawal_credentials,
			signatures,
			deposit_data_roots
		);

		emit Deposit_Validator(stake_amount, _state.validator_index);

		// validator index has to be updated after emitting event so that backend can get the starting index to spin validators from
		_state.validator_index += num_of_validators;
	}
}
