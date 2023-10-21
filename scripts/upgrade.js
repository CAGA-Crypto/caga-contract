const { ethers, upgrades } = require("hardhat");

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
	await upgrade_contract("0xD0C3d30da906cB8e225CD6F79d1A4E40345B2397", "LS_Token");
	await upgrade_contract("0xB0C8edA3a3ab13Cd05D6d8332962F117602A4d4F", "Withdraw");
	await upgrade_contract("0x13d5D2e633a33B9eD9D6e68F16B9cB93f17a8aDe", "Core");

	// Upgrade Governance contracts
	await upgrade_contract("0x321272D3DF4234f487f8A4cA3Ea3AFF4c4FDBcA9", "Gov_Token");
	await upgrade_contract("0x20c32F1847eA6C00622D812Dd18A0869761babAF", "sGov_Token");
	await upgrade_contract("0xa3FBD2F39f816d483E1bCA1BCd707699789139FD", "Governance");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
