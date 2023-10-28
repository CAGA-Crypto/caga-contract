const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("sGov_Token", function () {
	let sGov_Token;
	let sGov_Token2;
	let sgov_token;
	let sgov_token_address;
	let owner;
	let protocol;

	beforeEach(async function () {
		sGov_Token = await ethers.getContractFactory("sGov_Token");
		sGov_Token2 = await ethers.getContractFactory("sGov_Token");

		[owner, protocol, account3] = await ethers.getSigners();
		sgov_token = await upgrades.deployProxy(sGov_Token, [], { kind: "uups", redeployImplementation: "always" });
		await sgov_token.waitForDeployment();

		sgov_token_address = await sgov_token.getAddress();

		await sgov_token.set_protocol(protocol.address);
	});

	describe("initialize", function () {
		it("should set the protocol address", async function () {
			expect(await sgov_token.protocol()).to.equal(protocol.address);
		});
	});

	describe("set_protocol", function () {
		it("should set the protocol address", async function () {
			await sgov_token.connect(owner).set_protocol(account3.address);
			expect(await sgov_token.protocol()).to.equal(account3.address);
		});

		it("should revert if the new protocol address is 0", async function () {
			await expect(sgov_token.connect(owner).set_protocol(ethers.ZeroAddress)).to.be.revertedWith("address cannot be 0");
		});

		it("should revert if called by a non-owner", async function () {
			await expect(sgov_token.connect(account3).set_protocol(owner.address)).to.be.revertedWith("Ownable: caller is not the owner");
		});
	});

	describe("upgrade", function () {
		it("should upgrade the contract", async function () {
			const implementationAddress = await upgrades.erc1967.getImplementationAddress(sgov_token_address);

			const Proxy = await upgrades.upgradeProxy(sgov_token_address, sGov_Token2);
			await Proxy.waitForDeployment();

			const implementationAddress2 = await upgrades.erc1967.getImplementationAddress(sgov_token_address);
			expect(implementationAddress).to.not.equal(implementationAddress2);
		});
	});

	describe("only protocol can burn and mint", function () {
		it("burn", async function () {
			await expect(sgov_token.burn(1000)).to.be.revertedWith("caller is not the protocol");
		});

		it("burn", async function () {
			await expect(sgov_token.burnFrom(account3.address, 1000)).to.be.revertedWith("caller is not the protocol");
		});

		it("mint", async function () {
			await expect(sgov_token.mint(account3.address, 1000)).to.be.revertedWith("caller is not the protocol");
		});
	});
});
