require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: "0.8.21",
	networks: {
		hardhat: {},
		goerli: {
			url: "https://rpc.ankr.com/eth_goerli",
			accounts: ["27bbacabd881261950e0ae02c23f6c0b19985441601d175ef22b9ccac7c95c2a"],
		},
	},
};
