const { ethers } = require("hardhat");

require("dotenv").config();

async function get_contract(contract_name, contract_address) {
	const Contract = await ethers.getContractFactory(contract_name);
	const contract = await Contract.attach(contract_address);

	return contract;
}

async function main() {
	// Get contract instances
	const LS_Token_Proxy = await get_contract("LS_Token", process.env.LS_TOKEN);
	const Withdraw_Proxy = await get_contract("Withdraw", process.env.WITHDRAW);
	const Core_Proxy = await get_contract("Core", process.env.CORE);
	const core_address = await Core_Proxy.getAddress();

	// Configure protocol addresses for core contracts
	let response = await LS_Token_Proxy.set_protocol(core_address);
	await response.wait();
	console.log("LS_Token protocol set to:", await LS_Token_Proxy.protocol());
	response = await Withdraw_Proxy.set_protocol(core_address);
	await response.wait();
	console.log("Withdraw protocol set to:", await Withdraw_Proxy.protocol());

	// Deploy Governance contracts
	const sGov_Token = await get_contract("sGov_Token", process.env.SGOV_TOKEN);
	const Governance = await get_contract("Governance", process.env.GOVERNANCE);
	const governance_address = await Governance.getAddress();

	// Configure protocol address for sGov_Token contract
	response = await sGov_Token.set_protocol(governance_address);
	await response.wait();
	console.log("sGov_Token protocol set to:", await sGov_Token.protocol());
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
