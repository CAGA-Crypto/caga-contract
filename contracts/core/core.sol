// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./core_state.sol";
import "../interfaces/i_ls_token.sol";
import "../interfaces/i_withdraw.sol";

contract X_Core is Initializable, OwnableUpgradeable, UUPSUpgradeable, Core_State {
	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	event Deposit(uint256 amount);
	event WithdrawRequest(uint256 amount);
	event WithdrawClaim(uint256 amount);
	event UnstakeValidator(uint256 full_amount, uint256 shortfall);

	function initialize() public initializer {
		__Ownable_init();
		__UUPSUpgradeable_init();
	}

	function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

	function deposit() external payable {
		require(msg.value > 0, "deposit must be greater than 0");

		// calculate the amount of ls tokens to mint based on the current exchange rate
		uint256 protocol_eth = _state.total_deposits + _state.contracts.withdraw.balance;
		uint256 ls_token_supply = i_ls_token(_state.contracts.ls_token).totalSupply();
		uint256 mint_amount;
		if (ls_token_supply == 0) {
			mint_amount = msg.value;
		} else {
			mint_amount = (ls_token_supply / protocol_eth) * msg.value;
		}

		_state.total_deposits += msg.value;

		i_ls_token(_state.contracts.ls_token).mint(address(msg.sender), mint_amount);

		emit Deposit(msg.value);
	}

	function request_withdraw(uint256 amount) external {
		require(amount > 0, "withdraw amount must be greater than 0");
		require(i_ls_token(_state.contracts.ls_token).balanceOf(address(msg.sender)) >= amount, "insufficient balance");

		// calculate the amount of ETH to withdraw based on the current exchange rate
		uint256 protocol_eth = _state.total_deposits + _state.contracts.withdraw.balance;
		uint256 ls_token_supply = i_ls_token(_state.contracts.ls_token).totalSupply();
		uint256 withdraw_amount = (protocol_eth / ls_token_supply) * amount;

		emit WithdrawRequest(withdraw_amount);

		// core contract does not have enough ETH to process withdrawal request
		if (withdraw_amount > _state.total_deposits) {
			// both core and withdraw contract does not have enough ETH to process this withdrawal request (need to unwind from validator)
			if (protocol_eth < withdraw_amount) {
				_state.withdrawals.withdraw_account[msg.sender] += withdraw_amount;
				_state.withdrawals.withdraw_total += withdraw_amount;

				emit UnstakeValidator(withdraw_amount, withdraw_amount - protocol_eth);
			} else {
				// core + withdraw contract has enough ETH to process withdrawal request
				if (_state.contracts.withdraw.balance >= withdraw_amount) {
					i_withdraw(_state.contracts.withdraw).withdraw(payable(address(msg.sender)), withdraw_amount);
				} else {
					payable(address(msg.sender)).transfer(withdraw_amount - _state.contracts.withdraw.balance);
					i_withdraw(_state.contracts.withdraw).withdraw(payable(address(msg.sender)), _state.contracts.withdraw.balance);
				}

				emit WithdrawClaim(withdraw_amount);
			}
		} else {
			// core contract has enough ETH to process withdrawal request
			payable(address(msg.sender)).transfer(withdraw_amount);

			emit WithdrawClaim(withdraw_amount);
		}

		_state.total_deposits -= withdraw_amount;
		i_ls_token(_state.contracts.ls_token).burnFrom(address(msg.sender), amount);
	}
}
