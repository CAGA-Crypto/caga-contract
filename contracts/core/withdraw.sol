// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract X_Withdraw is Initializable, OwnableUpgradeable, UUPSUpgradeable {
	address public protocol;

	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	modifier onlyProtocol() {
		require(protocol == _msgSender(), "caller is not the protocol");
		_;
	}

	function initialize(address protocol_) public initializer {
		__Ownable_init();
		__UUPSUpgradeable_init();

		protocol = protocol_;
	}

	function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

	function withdraw(address payable to, uint256 amount) external onlyProtocol {
		to.transfer(amount);
	}
}
