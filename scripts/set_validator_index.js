const { ethers } = require("hardhat");

require("dotenv").config();

async function get_contract(contract_name, contract_address) {
	const Contract = await ethers.getContractFactory(contract_name);
	const contract = await Contract.attach(contract_address);

	return contract;
}

async function main() {
	const Core_Proxy = await get_contract("Core", process.env.CORE);
	try {
		await Core_Proxy.set_validator_index(9);
	} catch (error) {
		console.error("An error occurred while setting the index:", error);
		if (error.data) {
			console.error("Revert reason:", error.data.message);
		}
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
