const { ethers, upgrades } = require("hardhat");

async function deploy_contract(contract_name, args = []) {
	// Deploy contract
	const Contract = await ethers.getContractFactory(contract_name);

	// Deploy proxy
	// redeployImplementation: ("always" | "never" | "onchange")
	const Proxy = await upgrades.deployProxy(Contract, args, { kind: "uups", redeployImplementation: "always" });
	await Proxy.waitForDeployment();

	const proxy_address = await Proxy.getAddress();
	console.log(contract_name + " deployed to:", proxy_address);
	console.log(contract_name + " implementation deployed to:", await upgrades.erc1967.getImplementationAddress(proxy_address));

	return Proxy;
}

async function main() {
	let abyss_eth2_depositor;
	if (network.name == "mainnet") {
		abyss_eth2_depositor = "0xFA5f9EAa65FFb2A75de092eB7f3fc84FC86B5b18";
	} else if (network.name == "goerli") {
		abyss_eth2_depositor = "0x2cB1A746A8652dfbb0FC11BdA71Bd991EB2Fd52e";
	} else {
		abyss_eth2_depositor = "0x0000000000000000000000000000000000012345";
	}

	// Deploy Core contracts
	const LS_Token_Proxy = await deploy_contract("LS_Token");
	const ls_token_address = await LS_Token_Proxy.getAddress();
	const Withdraw_Proxy = await deploy_contract("Withdraw");
	const withdraw_address = await Withdraw_Proxy.getAddress();
	const Core_Proxy = await deploy_contract("Core", [ls_token_address, withdraw_address, abyss_eth2_depositor]);
	const core_address = await Core_Proxy.getAddress();

	// Configure protocol addresses for core contracts
	await LS_Token_Proxy.set_protocol(core_address);
	console.log("LS_Token protocol set to:", await LS_Token_Proxy.protocol());
	await Withdraw_Proxy.set_protocol(core_address);
	console.log("Withdraw protocol set to:", await Withdraw_Proxy.protocol());

	// Deploy Governance contracts
	const Gov_Token = await deploy_contract("Gov_Token");
	const gov_token_address = await Gov_Token.getAddress();
	const sGov_Token = await deploy_contract("sGov_Token");
	const sgov_token_address = await sGov_Token.getAddress();
	const Governance = await deploy_contract("Governance", [gov_token_address, sgov_token_address]);
	const governance_address = await Governance.getAddress();

	// Configure protocol address for sGov_Token contract
	await sGov_Token.set_protocol(governance_address);
	console.log("sGov_Token protocol set to:", await sGov_Token.protocol());
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
