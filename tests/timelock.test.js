const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

function encodeParameters(types, values) {
	const abi = new ethers.AbiCoder();
	return abi.encode(types, values);
}

describe("Timelock", function () {
	let alice, bob, carol, dev, admin;
	let caga, addrCaga;
	let timelock, addrTimelock;
	let startTime;

	beforeEach(async () => {
		[admin, alice, bob, carol, dev] = await ethers.getSigners();

		GovToken = await ethers.getContractFactory("Gov_Token");
		Timelock = await ethers.getContractFactory("Timelock");

		caga = await upgrades.deployProxy(GovToken, []);
		await caga.waitForDeployment();
		addrCaga = await caga.getAddress();

		timelock = await Timelock.deploy(admin.address, 86400); //8hours
		await timelock.waitForDeployment();
		addrTimelock = await timelock.getAddress();

		blockNumBefore = await ethers.provider.getBlockNumber();
		startTime = (await ethers.provider.getBlock(blockNumBefore)).timestamp;
	});

	it("should not allow non-owner to do operation", async () => {
		await caga.connect(admin).transferOwnership(addrTimelock);

		await expect(caga.connect(alice).transferOwnership(carol.address)).to.be.revertedWith("Ownable: caller is not the owner");
		await expect(caga.connect(bob).transferOwnership(carol.address)).to.be.revertedWith("Ownable: caller is not the owner");
		await expect(
			timelock.connect(alice).queueTransaction(addrCaga, "0", "transferOwnership(address)", encodeParameters(["address"], [carol.address]), 4454545454)
		).to.be.revertedWith("Timelock::queueTransaction: Call must come from admin.");
	});

	it("should do the timelock thing", async () => {
		const eta = startTime + 25 * 3600;
		await caga.connect(admin).transferOwnership(addrTimelock);

		await timelock.connect(admin).queueTransaction(addrCaga, "0", "transferOwnership(address)", encodeParameters(["address"], [carol.address]), eta);

		// increase 20 hours
		await ethers.provider.send("evm_increaseTime", [3600 * 20]);
		await ethers.provider.send("evm_mine");

		await expect(
			timelock.connect(admin).executeTransaction(addrCaga, "0", "transferOwnership(address)", encodeParameters(["address"], [carol.address]), eta)
		).to.be.revertedWith("Timelock::executeTransaction: Transaction hasn't surpassed time lock.");

		// increase 6 hours
		await ethers.provider.send("evm_increaseTime", [3600 * 6]);
		await ethers.provider.send("evm_mine");

		await timelock.connect(admin).executeTransaction(addrCaga, "0", "transferOwnership(address)", encodeParameters(["address"], [carol.address]), eta);

		expect(await caga.owner()).to.be.eq(carol.address);
	});
});
