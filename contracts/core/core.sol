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

	function initialize() public initializer {
		__Ownable_init();
		__UUPSUpgradeable_init();
	}

	function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

	function deposit() external payable {
		require(msg.value > 0, "deposit must be greater than 0");

		i_ls_token(_state.ls_token_contract).mint(address(msg.sender), msg.value);

		emit Deposit(msg.value);
	}

	function request_withdraw(uint256 amount) external {
		if (amount > address(this).balance) {
			require(_state.withdraw_contract.balance >= amount, "insufficient funds in withdraw contract");
			i_ls_token(_state.ls_token_contract).burnFrom(address(msg.sender), amount);
			i_withdraw(_state.withdraw_contract).withdraw(payable(address(msg.sender)), amount);
		}

		emit WithdrawRequest(amount);
	}
}
