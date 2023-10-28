const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("Withdraw", function () {
	let Withdraw;
	let Withdraw2;
	let withdraw;
	let withdraw_address;
	let owner;
	let protocol;

	beforeEach(async function () {
		Withdraw = await ethers.getContractFactory("Withdraw");
		Withdraw2 = await ethers.getContractFactory("Withdraw");

		[owner, protocol, account3] = await ethers.getSigners();
		withdraw = await upgrades.deployProxy(Withdraw, [], { kind: "uups", redeployImplementation: "always" });
		await withdraw.waitForDeployment();

		withdraw_address = await withdraw.getAddress();

		await withdraw.set_protocol(protocol.address);
	});

	describe("initialize", function () {
		it("should set the protocol address", async function () {
			expect(await withdraw.protocol()).to.equal(protocol.address);
		});
	});

	describe("set_protocol", function () {
		it("should set the protocol address", async function () {
			await withdraw.connect(owner).set_protocol(account3.address);
			expect(await withdraw.protocol()).to.equal(account3.address);
		});

		it("should revert if the new protocol address is 0", async function () {
			await expect(withdraw.connect(owner).set_protocol(ethers.ZeroAddress)).to.be.revertedWith("address cannot be 0");
		});

		it("should revert if called by a non-owner", async function () {
			await expect(withdraw.connect(account3).set_protocol(owner.address)).to.be.revertedWith("Ownable: caller is not the owner");
		});
	});

	describe("upgrade", function () {
		it("should upgrade the contract", async function () {
			const implementationAddress = await upgrades.erc1967.getImplementationAddress(withdraw_address);

			const Proxy = await upgrades.upgradeProxy(withdraw_address, Withdraw2);
			await Proxy.waitForDeployment();

			const implementationAddress2 = await upgrades.erc1967.getImplementationAddress(withdraw_address);
			expect(implementationAddress).to.not.equal(implementationAddress2);
		});
	});

	describe("protocol_withdraw", function () {
		it("should revert if called by a non-protocol", async function () {
			await expect(withdraw.connect(account3).protocol_withdraw(1000)).to.be.revertedWith("caller is not the protocol");
		});
	});
});
