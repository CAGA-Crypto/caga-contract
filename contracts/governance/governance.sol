// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./gov_getters.sol";
import "./gov_setters.sol";
import "../interfaces/i_gov_token.sol";
import "../interfaces/i_sgov_token.sol";

contract Governance is Initializable, UUPSUpgradeable, ReentrancyGuard, Gov_Getters, Gov_Setters {
	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	event Stake(address from, uint256 amount);
	event Unstake(address from, uint256 amount);
	event YieldWithdraw(address to, uint256 amount);

	function initialize(address gov_token, address sgov_token) public initializer {
		__Ownable_init();
		__UUPSUpgradeable_init();

		_state.contracts.gov_token = gov_token;
		_state.contracts.sgov_token = sgov_token;
	}

	function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

	function stake(uint256 amount) external nonReentrant {
		require(amount > 0, "amount must be greater than 0");

		if (_state.emissions.is_staking[_msgSender()]) {
			uint256 to_transfer = calculateYieldTotal(_msgSender());
			_state.emissions.gov_balance[_msgSender()] += to_transfer;
		}

		i_gov_token(_state.contracts.gov_token).transferFrom(_msgSender(), address(this), amount);
		_state.emissions.staking_balance[_msgSender()] += amount;
		_state.emissions.start_time[_msgSender()] = block.timestamp;
		_state.emissions.is_staking[_msgSender()] = true;

		emit Stake(_msgSender(), amount);
	}

	function unstake(uint256 amount) external nonReentrant {
		require(_state.emissions.is_staking[_msgSender()] && _state.emissions.staking_balance[_msgSender()] >= amount, "invalid unstake amount");

		uint256 yieldTransfer = calculateYieldTotal(_msgSender());
		_state.emissions.start_time[_msgSender()] = block.timestamp;
		uint256 balTransfer = amount;
		amount = 0;
		_state.emissions.staking_balance[_msgSender()] -= balTransfer;
		i_gov_token(_state.contracts.gov_token).transfer(_msgSender(), balTransfer);
		_state.emissions.gov_balance[_msgSender()] += yieldTransfer;
		if (_state.emissions.staking_balance[_msgSender()] == 0) {
			_state.emissions.is_staking[_msgSender()] = false;
		}

		emit Unstake(_msgSender(), balTransfer);
	}

	function calculateYieldTime(address user) internal view returns (uint256) {
		uint256 end = block.timestamp;
		uint256 totalTime = end - _state.emissions.start_time[user];

		return totalTime;
	}

	function calculateYieldTotal(address user) internal view returns (uint256) {
		uint256 time = calculateYieldTime(user) * 10 ** 18;
		uint256 rate = 86400;
		uint256 timeRate = time / rate;
		uint256 rawYield = (_state.emissions.staking_balance[user] * timeRate) / 10 ** 18;

		return rawYield;
	}

	function withdrawYield() external nonReentrant {
		uint256 toTransfer = calculateYieldTotal(_msgSender());

		require(toTransfer > 0 || _state.emissions.gov_balance[_msgSender()] > 0, "no yield to withdraw");

		if (_state.emissions.gov_balance[_msgSender()] != 0) {
			uint256 oldBalance = _state.emissions.gov_balance[_msgSender()];
			_state.emissions.gov_balance[_msgSender()] = 0;
			toTransfer += oldBalance;
		}

		_state.emissions.start_time[_msgSender()] = block.timestamp;

		i_sgov_token(_state.contracts.sgov_token).mint(_msgSender(), toTransfer);

		emit YieldWithdraw(_msgSender(), toTransfer);
	}
}
