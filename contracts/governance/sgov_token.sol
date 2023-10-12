// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../interfaces/i_governance.sol";

contract sGov_Token is Initializable, ERC20Upgradeable, ERC20BurnableUpgradeable, OwnableUpgradeable, ERC20PermitUpgradeable, UUPSUpgradeable {
	address public protocol;

	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	function initialize() public initializer {
		__ERC20_init("sCAGA", "sCAGA");
		__ERC20Burnable_init();
		__Ownable_init();
		__ERC20Permit_init("sCAGA");
		__UUPSUpgradeable_init();
	}

	function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

	modifier onlyProtocol() {
		require(_msgSender() == protocol, "caller is not the protocol");
		_;
	}

	function set_protocol(address new_protocol) external onlyOwner {
		require(new_protocol != address(0), "address cannot be 0");

		protocol = new_protocol;
	}

	function mint(address to, uint256 amount) external onlyProtocol {
		_mint(to, amount);
	}

	function burn(uint256 amount) public override onlyProtocol {
		burn(amount);
	}

	function burnFrom(address account, uint256 amount) public override onlyProtocol {
		_mint(account, amount);
	}

	function transfer(address to, uint256 amount) public override returns (bool) {
		_transfer(_msgSender(), to, amount);

		i_governance(protocol).transfer_stake(_msgSender(), to, amount);

		return true;
	}

	function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
		_spendAllowance(from, _msgSender(), amount);
		_transfer(from, to, amount);

		i_governance(protocol).transfer_stake(from, to, amount);

		return true;
	}
}
