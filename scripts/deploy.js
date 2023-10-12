const { ethers, upgrades } = require("hardhat");

async function main() {
	// Deploy Core contracts

	// Deploy LS_Token contract
	const LS_Token = await ethers.getContractFactory("LS_Token");
	const ls_token_instance = await upgrades.deployProxy(LS_Token, []);
	await ls_token_instance.waitForDeployment();
	const ls_token_address = await ls_token_instance.getAddress();
	console.log("LS_Token deployed to:", ls_token_address);
	console.log("LS_Token implementation deployed to:", await upgrades.erc1967.getImplementationAddress(ls_token_address));

	// Deploy Withdraw contract
	const Withdraw = await ethers.getContractFactory("Withdraw");
	const withdraw_instance = await upgrades.deployProxy(Withdraw, []);
	await withdraw_instance.waitForDeployment();
	const withdraw_address = await withdraw_instance.getAddress();
	console.log("Withdraw deployed to:", withdraw_address);
	console.log("Withdraw implementation deployed to:", await upgrades.erc1967.getImplementationAddress(withdraw_address));

	// Deploy Core contract
	const Core = await ethers.getContractFactory("Core");
	const core_instance = await upgrades.deployProxy(Core, [ls_token_address, withdraw_address]);
	await core_instance.waitForDeployment();
	const core_address = await core_instance.getAddress();
	console.log("Core deployed to:", core_address);
	console.log("Core implementation deployed to:", await upgrades.erc1967.getImplementationAddress(core_address));

	// Configure protocol addresses for core contracts
	await ls_token_instance.set_protocol(core_address);
	console.log("LS_Token protocol set to:", await ls_token_instance.protocol());
	await withdraw_instance.set_protocol(core_address);
	console.log("Withdraw protocol set to:", await withdraw_instance.protocol());

	// Deploy Governance contracts

	// Deploy Gov_Token contract
	const Gov_Token = await ethers.getContractFactory("Gov_Token");
	const gov_token_instance = await upgrades.deployProxy(Gov_Token, []);
	await gov_token_instance.waitForDeployment();
	const gov_token_address = await gov_token_instance.getAddress();
	console.log("Gov_Token deployed to:", gov_token_address);
	console.log("Gov_Token implementation deployed to:", await upgrades.erc1967.getImplementationAddress(gov_token_address));

	// Deploy sGov_Token contract
	const sGov_Token = await ethers.getContractFactory("sGov_Token");
	const sgov_token_instance = await upgrades.deployProxy(sGov_Token, []);
	await sgov_token_instance.waitForDeployment();
	const sgov_token_address = await sgov_token_instance.getAddress();
	console.log("sGov_Token deployed to:", sgov_token_address);
	console.log("sGov_Token implementation deployed to:", await upgrades.erc1967.getImplementationAddress(sgov_token_address));

	// Deploy Governance contract
	const Governance = await ethers.getContractFactory("Governance");
	const governance_instance = await upgrades.deployProxy(Governance, [gov_token_address, sgov_token_address]);
	await governance_instance.waitForDeployment();
	const governance_address = await governance_instance.getAddress();
	console.log("Governance deployed to:", governance_address);
	console.log("Governance implementation deployed to:", await upgrades.erc1967.getImplementationAddress(governance_address));

	// Configure protocol address for sGov_Token contract
	await sgov_token_instance.set_protocol(governance_address);
	console.log("sGov_Token protocol set to:", await sgov_token_instance.protocol());
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
