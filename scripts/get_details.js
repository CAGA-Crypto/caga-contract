const { ethers } = require("hardhat");

async function main() {
	const contractAddress = "0x20c32F1847eA6C00622D812Dd18A0869761babAF";
	const Contract = await ethers.getContractFactory("sGov_Token");
	const contractInstance = new ethers.Contract(contractAddress, Contract.interface, ethers.provider);

	const protocol_address = await contractInstance.protocol();
	console.log("Protocol address:", protocol_address.toString());
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
