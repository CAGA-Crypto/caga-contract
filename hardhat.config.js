require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: "0.8.21",
	networks: {
		hardhat: {},
		goerli: {
			url: "https://rpc.ankr.com/eth_goerli",
			accounts: [""],
		},
	},
};
