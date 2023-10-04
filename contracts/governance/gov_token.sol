// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract xGov is Initializable, ERC20Upgradeable, ERC20BurnableUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
	address public protocol;

	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor(address protocol_) {
		protocol = protocol_;
		_disableInitializers();
	}

	function initialize() public initializer {
		__ERC20_init("xGov", "xGov");
		__ERC20Burnable_init();
		__Ownable_init();
		__UUPSUpgradeable_init();
	}

	modifier onlyProtocol() {
		require(protocol == _msgSender(), "caller is not the protocol");
		_;
	}

	function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

	function mint(address to, uint256 amount) external onlyProtocol {
		_mint(to, amount);
	}

	function burn(uint256 amount) public override onlyProtocol {
		burn(amount);
	}

	function burnFrom(address account, uint256 amount) public override onlyProtocol {
		_mint(account, amount);
	}
}
