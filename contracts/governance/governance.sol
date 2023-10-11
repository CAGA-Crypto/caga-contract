// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

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
	event Claim_Emission(address to, uint256 amount);

	function initialize(address gov_token, address sgov_token) public initializer {
		__Ownable_init();
		__UUPSUpgradeable_init();

		_state.contracts.gov_token = gov_token;
		_state.contracts.sgov_token = sgov_token;
	}

	function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

	modifier onlyGovToken() {
		require(_msgSender() == _state.contracts.gov_token, "caller is not gov token contract");
		_;
	}

	function stake(uint256 amount) external nonReentrant {
		require(amount > 0, "amount must be greater than 0");

		if (_state.gov_data[_msgSender()].is_staking) {
			uint256 realised_emission = calculate_total_emissions(_msgSender());
			_state.gov_data[_msgSender()].realised_emissions += realised_emission;
		}

		_state.gov_data[_msgSender()].staked_balance += amount;
		_state.gov_data[_msgSender()].start_block = block.number;
		_state.gov_data[_msgSender()].is_staking = true;

		SafeERC20.safeTransferFrom(i_gov_token(_state.contracts.gov_token), _msgSender(), address(this), amount);
		i_sgov_token(_state.contracts.sgov_token).mint(_msgSender(), amount);

		emit Stake(_msgSender(), amount);
	}

	function unstake(uint256 amount) external nonReentrant {
		require(_state.gov_data[_msgSender()].is_staking && _state.gov_data[_msgSender()].staked_balance >= amount, "invalid unstake amount");

		uint256 realised_emission = calculate_total_emissions(_msgSender());
		_state.gov_data[_msgSender()].start_block = block.number;
		_state.gov_data[_msgSender()].staked_balance -= amount;
		_state.gov_data[_msgSender()].realised_emissions += realised_emission;
		if (_state.gov_data[_msgSender()].staked_balance == 0) {
			_state.gov_data[_msgSender()].is_staking = false;
		}

		i_sgov_token(_state.contracts.sgov_token).burnFrom(_msgSender(), amount);
		// unstake and claim at the same time
		SafeERC20.safeTransfer(i_gov_token(_state.contracts.gov_token), _msgSender(), amount + _claim());

		emit Unstake(_msgSender(), amount);
	}

	function calculate_emissions(address user) internal view returns (uint256) {
		uint256 end_block = block.number;
		uint256 blocks_elapsed = end_block - _state.gov_data[user].start_block;

		return blocks_elapsed;
	}

	function calculate_total_emissions(address user) internal view returns (uint256) {
		uint256 blocks_elapsed = calculate_emissions(user) * 10 ** 18;
		// there are 7200 blocks in 24 hours (12 secs per block)
		uint256 rate = 7200;
		uint256 block_rate = blocks_elapsed / rate;
		uint256 emissions = (_state.gov_data[user].staked_balance * block_rate) / 10 ** 18;

		return emissions;
	}

	function _claim() internal returns (uint256) {
		uint256 realised_emission = calculate_total_emissions(_msgSender());

		require(realised_emission > 0 || _state.gov_data[_msgSender()].realised_emissions > 0, "no rewards to claim");

		if (_state.gov_data[_msgSender()].realised_emissions != 0) {
			realised_emission += _state.gov_data[_msgSender()].realised_emissions;
			_state.gov_data[_msgSender()].realised_emissions = 0;
		}

		_state.gov_data[_msgSender()].start_block = block.number;

		return realised_emission;
	}

	function claim() external nonReentrant {
		uint256 realised_emission = _claim();

		SafeERC20.safeTransfer(i_gov_token(_state.contracts.gov_token), _msgSender(), realised_emission);

		emit Claim_Emission(_msgSender(), realised_emission);
	}
}
