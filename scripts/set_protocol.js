const { ethers } = require("hardhat");

async function get_contract(contract_name, contract_address) {
	const Contract = await ethers.getContractFactory(contract_name);
	const contract = await Contract.attach(contract_address);

	return contract;
}

async function main() {
	// Deploy Core contracts
	const LS_Token_Proxy = await get_contract("LS_Token", "0xD0C3d30da906cB8e225CD6F79d1A4E40345B2397");
	const Withdraw_Proxy = await get_contract("Withdraw", "0xB0C8edA3a3ab13Cd05D6d8332962F117602A4d4F");
	const Core_Proxy = await get_contract("Core", "0x13d5D2e633a33B9eD9D6e68F16B9cB93f17a8aDe");
	const core_address = await Core_Proxy.getAddress();

	// Configure protocol addresses for core contracts
	await LS_Token_Proxy.set_protocol(core_address);
	console.log("LS_Token protocol set to:", await LS_Token_Proxy.protocol());
	await Withdraw_Proxy.set_protocol(core_address);
	console.log("Withdraw protocol set to:", await Withdraw_Proxy.protocol());

	// Deploy Governance contracts
	const Gov_Token = await get_contract("Gov_Token", "0x321272D3DF4234f487f8A4cA3Ea3AFF4c4FDBcA9");
	const sGov_Token = await get_contract("sGov_Token", "0x20c32F1847eA6C00622D812Dd18A0869761babAF");
	const Governance = await get_contract("Governance", "0xa3FBD2F39f816d483E1bCA1BCd707699789139FD");
	const governance_address = await Governance.getAddress();

	// Configure protocol address for sGov_Token contract
	await sGov_Token.set_protocol(governance_address);
	console.log("sGov_Token protocol set to:", await sGov_Token.protocol());
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
