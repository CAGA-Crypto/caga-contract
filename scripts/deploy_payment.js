const { ethers, upgrades } = require("hardhat");

async function main() {
    const Deployment = await ethers.deployContract("Payment", ["0xbddc20ed7978B7d59eF190962F441cD18C14e19f", "0x1339694225e7Ea2DE64bb8A808F09f33D1a7fE07"])
	console.log("Payment deployed to:", await Deployment.getAddress());
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
