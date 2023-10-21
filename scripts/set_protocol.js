const { ethers } = require("hardhat");

require("dotenv").config();

async function get_contract(contract_name, contract_address) {
	const Contract = await ethers.getContractFactory(contract_name);
	const contract = await Contract.attach(contract_address);

	return contract;
}

async function main() {
	// Deploy Core contracts
	const LS_Token_Proxy = await get_contract("LS_Token", process.env.LS_TOKEN);
	const Withdraw_Proxy = await get_contract("Withdraw", process.env.WITHDRAW);
	const Core_Proxy = await get_contract("Core", process.env.CORE);
	const core_address = await Core_Proxy.getAddress();

	// Configure protocol addresses for core contracts
	await LS_Token_Proxy.set_protocol(core_address);
	console.log("LS_Token protocol set to:", await LS_Token_Proxy.protocol());
	await Withdraw_Proxy.set_protocol(core_address);
	console.log("Withdraw protocol set to:", await Withdraw_Proxy.protocol());

	// Deploy Governance contracts
	const Gov_Token = await get_contract("Gov_Token", process.env.GOV_TOKEN);
	const sGov_Token = await get_contract("sGov_Token", process.env.SGOV_TOKEN);
	const Governance = await get_contract("Governance", process.env.GOVERNANCE);
	const governance_address = await Governance.getAddress();

	// Configure protocol address for sGov_Token contract
	await sGov_Token.set_protocol(governance_address);
	console.log("sGov_Token protocol set to:", await sGov_Token.protocol());
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
