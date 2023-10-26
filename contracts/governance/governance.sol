// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./gov_getters.sol";
import "./gov_setters.sol";
import "../interfaces/i_gov_token.sol";
import "../interfaces/i_sgov_token.sol";

contract Governance is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable, Gov_Getters, Gov_Setters {
	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	event Stake(address from, uint256 amount);
	event Unstake(address from, uint256 amount);
	event Claim_Rewards(address to, uint256 amount);
	event Transfer_Stake(address from, address to, uint256 amount);

	function initialize(address gov_token, address sgov_token) public initializer {
		__Ownable_init();
		__UUPSUpgradeable_init();
		__ReentrancyGuard_init();

		_state.contracts.gov_token = gov_token;
		_state.contracts.sgov_token = sgov_token;

		// number of tokens to emit per block distributed among stakers depending on their share of the total staked
		// defaults to ~1 token per day distributed among stakers
		_state.rate.em_rate =  uint256(1 * 10 ** 18) / 7200;
		// there are 7200 blocks in 24 hours (12 secs per block)
		// 720000 will give us 0.01 vp per day
		_state.rate.vp_rate = 720000;
	}

	function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

	modifier onlySGovToken() {
		require(_msgSender() == _state.contracts.sgov_token, "caller is not staked governance token contract");
		_;
	}

	function _stake(address user, uint256 amount) internal {
		require(amount > 0, "amount must be greater than 0");

		if (_state.gov_data[user].is_staking) {
			uint256 realised_emission = calculate_emissions(user);
			_state.gov_data[user].realised_emissions += realised_emission;

			uint256 realised_vp = calculate_vp(user);
			_state.gov_data[user].voting_power += realised_vp;
			_state.total_vp += realised_vp;
		}

		_state.gov_data[user].staked_balance += amount;
		_state.gov_data[user].start_block = block.number;
		_state.gov_data[user].is_staking = true;
		_state.total_staked += amount;
	}

	function stake(uint256 amount) external nonReentrant {
		_stake(_msgSender(), amount);

		SafeERC20.safeTransferFrom(i_gov_token(_state.contracts.gov_token), _msgSender(), address(this), amount);
		i_sgov_token(_state.contracts.sgov_token).mint(_msgSender(), amount);

		emit Stake(_msgSender(), amount);
	}

	function _unstake(address user, uint256 amount) internal {
		require(_state.gov_data[user].is_staking && _state.gov_data[user].staked_balance >= amount, "invalid unstake amount");

		uint256 realised_emission = calculate_emissions(user);
		_state.gov_data[user].realised_emissions += realised_emission;

		uint256 realised_vp = calculate_vp(user);
		_state.gov_data[user].voting_power += realised_vp;
		_state.total_vp += realised_vp;

		_state.gov_data[user].start_block = block.number;
		_state.gov_data[user].staked_balance -= amount;
		_state.total_staked -= amount;

		if (_state.gov_data[user].staked_balance == 0) {
			_state.gov_data[user].is_staking = false;
		}
	}

	function unstake(uint256 amount) external nonReentrant {
		_unstake(_msgSender(), amount);

		i_sgov_token(_state.contracts.sgov_token).burnFrom(_msgSender(), amount);
		SafeERC20.safeTransfer(i_gov_token(_state.contracts.gov_token), _msgSender(), amount);

		emit Unstake(_msgSender(), amount);
	}

	function calculate_blocks(address user) internal view returns (uint256) {
		uint256 end_block = block.number;
		uint256 blocks_elapsed = end_block - _state.gov_data[user].start_block;

		return blocks_elapsed;
	}

	// emission rate supports 18 decimals
	function calculate_emissions(address user) internal view returns (uint256) {
		uint256 blocks_elapsed = calculate_blocks(user) * 10 ** 18;
		uint256 current_emitted = _state.rate.em_rate * blocks_elapsed;
		uint256 emissions = ((_state.gov_data[user].staked_balance * current_emitted) / _state.total_staked) / 10 ** 18;

		return emissions;
	}

	// vp is calculated to 3 decimal places
	function calculate_vp(address user) internal view returns (uint256) {
		uint256 blocks_elapsed = calculate_blocks(user) * 10 ** 18;
		uint256 block_rate = blocks_elapsed / _state.rate.vp_rate;
		uint256 vp = ((_state.gov_data[user].staked_balance * block_rate) * 1000) / 10 ** 18;

		return vp;
	}

	function claim() external nonReentrant {
		uint256 realised_emission = calculate_emissions(_msgSender());

		require(realised_emission > 0 || _state.gov_data[_msgSender()].realised_emissions > 0, "no rewards to claim");

		if (_state.gov_data[_msgSender()].realised_emissions != 0) {
			realised_emission += _state.gov_data[_msgSender()].realised_emissions;
			_state.gov_data[_msgSender()].realised_emissions = 0;
		}

		uint256 realised_vp = calculate_vp(_msgSender());
		_state.gov_data[_msgSender()].voting_power += realised_vp;
		_state.total_vp += realised_vp;

		_state.gov_data[_msgSender()].start_block = block.number;

		SafeERC20.safeTransfer(i_gov_token(_state.contracts.gov_token), _msgSender(), realised_emission);

		emit Claim_Rewards(_msgSender(), realised_emission);
	}

	function transfer_stake(address from, address to, uint256 amount) external nonReentrant onlySGovToken {
		_unstake(from, amount);
		_stake(to, amount);

		emit Transfer_Stake(from, to, amount);
	}
}
