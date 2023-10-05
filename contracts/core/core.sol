// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./core_state.sol";
import "../interfaces/i_ls_token.sol";
import "../interfaces/i_withdraw.sol";

contract X_Core is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuard, Core_State {
	uint256 public immutable validator_capacity = 32000000000000000000;

	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	event Deposit(uint256 amount);
	event WithdrawRequest(uint256 amount);
	event WithdrawClaim(uint256 amount);
	event UnstakeValidator(uint256 full_amount, uint256 shortfall);
	event WithdrawRewards(uint256 amount);

	function initialize() public initializer {
		__Ownable_init();
		__UUPSUpgradeable_init();
	}

	function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

	function deposit() external payable nonReentrant {
		require(msg.value > 0, "deposit must be greater than 0");

		// calculate the amount of ls tokens to mint based on the current exchange rate
		uint256 protocol_eth = _state.total_deposits + get_rewards();
		uint256 ls_token_supply = i_ls_token(_state.contracts.ls_token).totalSupply();
		uint256 mint_amount;
		if (ls_token_supply == 0) {
			mint_amount = msg.value;
		} else {
			mint_amount = (ls_token_supply / protocol_eth) * msg.value;
		}

		_state.total_deposits += msg.value;

		i_ls_token(_state.contracts.ls_token).mint(_msgSender(), mint_amount);

		emit Deposit(msg.value);
	}

	function request_withdraw(uint256 amount) external nonReentrant {
		require(amount > 0, "withdraw amount must be greater than 0");
		require(i_ls_token(_state.contracts.ls_token).balanceOf(_msgSender()) >= amount, "insufficient balance");

		// calculate the amount of ETH to withdraw based on the current exchange rate
		uint256 protocol_eth = _state.total_deposits + get_rewards();
		uint256 ls_token_supply = i_ls_token(_state.contracts.ls_token).totalSupply();
		uint256 withdraw_amount = (protocol_eth / ls_token_supply) * amount;

		emit WithdrawRequest(withdraw_amount);

		// core contract does not have enough ETH to process withdrawal request
		if (withdraw_amount > _state.total_deposits) {
			// both core and withdraw contract does not have enough ETH to process this withdrawal request (need to unwind from validator)
			if (protocol_eth < withdraw_amount) {
				_state.withdrawals.withdraw_account[_msgSender()] += withdraw_amount;
				_state.withdrawals.withdraw_total += withdraw_amount;
				uint256 unstake_validators = (withdraw_amount - protocol_eth) / validator_capacity;
				_state.withdrawals.unstaked_validators += unstake_validators == 0 ? 1 : unstake_validators;

				i_ls_token(_state.contracts.ls_token).burnFrom(_msgSender(), amount);

				emit UnstakeValidator(withdraw_amount, withdraw_amount - protocol_eth);

				return;
			} else {
				// core + withdraw contract has enough ETH to process withdrawal request
				withdraw_unstaked();
			}
		}
		// only core contract funds should be used to process withdrawal requests
		_state.total_deposits -= withdraw_amount;
		i_ls_token(_state.contracts.ls_token).burnFrom(_msgSender(), amount);
		payable(_msgSender()).transfer(withdraw_amount);

		emit WithdrawClaim(withdraw_amount);
	}

	function withdraw_unstaked() internal {
		// move unstaked ETH from withdraw contract to core contract to ensure withdraw contract funds are not mixed with rewards
		uint256 unstaked_validators = _state.contracts.withdraw.balance / validator_capacity;
		if (unstaked_validators > 0) {
			_state.withdrawals.unstaked_validators -= unstaked_validators;
			i_withdraw(_state.contracts.withdraw).withdraw(payable(address(this)), unstaked_validators * validator_capacity);
		}
	}

	function claim_withdrawal() external {
		uint256 withdraw_amount = _state.withdrawals.withdraw_account[_msgSender()];
		require(withdraw_amount > 0, "no withdrawal to claim");

		_state.total_deposits -= withdraw_amount;
		_state.withdrawals.withdraw_account[_msgSender()] = 0;
		payable(_msgSender()).transfer(withdraw_amount);

		emit WithdrawClaim(withdraw_amount);
	}

	function get_rewards() public view returns (uint256) {
		if (_state.withdrawals.withdraw_total > 0) {
			uint256 unstaked_validators = _state.contracts.withdraw.balance / validator_capacity;
			if (unstaked_validators > 0) {
				return _state.contracts.withdraw.balance - (unstaked_validators * validator_capacity);
			}
		}
		return _state.contracts.withdraw.balance;
	}

	function withdraw_rewards() external nonReentrant onlyOwner {
		uint256 rewards = get_rewards();
		i_withdraw(_state.contracts.withdraw).withdraw(payable(address(this)), rewards);
		_state.total_deposits += rewards;

		emit WithdrawRewards(rewards);
	}
}
