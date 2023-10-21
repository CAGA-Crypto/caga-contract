const { ethers, upgrades } = require("hardhat");

require("dotenv").config();

async function upgrade_contract(proxy_address, contract_name) {
	// Deploy contract
	const Contract = await ethers.getContractFactory(contract_name);

	// Deploy proxy
	console.log(contract_name + " implementation before upgrade:", await upgrades.erc1967.getImplementationAddress(proxy_address));

	const Proxy = await upgrades.upgradeProxy(proxy_address, Contract);
	await Proxy.waitForDeployment();

	console.log(contract_name + " implementation after upgrade:", await upgrades.erc1967.getImplementationAddress(proxy_address));

	return Proxy;
}

async function main() {
	// Upgrade Core contracts
	await upgrade_contract(process.env.LS_TOKEN, "LS_Token");
	await upgrade_contract(process.env.WITHDRAW, "Withdraw");
	await upgrade_contract(process.env.CORE, "Core");

	// Upgrade Governance contracts
	await upgrade_contract(process.env.GOV_TOKEN, "Gov_Token");
	await upgrade_contract(process.env.SGOV_TOKEN, "sGov_Token");
	await upgrade_contract(process.env.GOVERNANCE, "Governance");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
