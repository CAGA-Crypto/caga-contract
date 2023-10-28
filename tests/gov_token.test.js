const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("Gov_Token", function () {
	let Gov_Token;
	let Gov_Token_2;
	let govToken;
	let govToken_address;
	let owner;
	let protocol;

	beforeEach(async function () {
		Gov_Token = await ethers.getContractFactory("Gov_Token");
		Gov_Token_2 = await ethers.getContractFactory("Gov_Token");

		[owner, protocol, account3] = await ethers.getSigners();
		govToken = await upgrades.deployProxy(Gov_Token, [], { kind: "uups", redeployImplementation: "always" });
		await govToken.waitForDeployment();

		govToken_address = await govToken.getAddress();
	});

	describe("initialize", function () {
		it("should set the initial supply", async function () {
			expect(await govToken.totalSupply()).to.equal(ethers.parseUnits("100000000000", await govToken.decimals()));
		});
	});

	describe("setAntisnipeDisable", function () {
		it("should disable antisnipe", async function () {
			await govToken.connect(owner).setAntisnipeDisable();
			expect(await govToken.antisnipeDisable()).to.equal(true);
		});

		it("should revert if called by a non-owner", async function () {
			await expect(govToken.connect(account3).setAntisnipeDisable()).to.be.revertedWith("Ownable: caller is not the owner");
		});
	});

	describe("setAntisnipeAddress", function () {
		it("should set the antisnipe address", async function () {
			await govToken.connect(owner).setAntisnipeAddress(account3.address);
			expect(await govToken.antisnipe()).to.equal(account3.address);
		});

		it("should revert if called by a non-owner", async function () {
			await expect(govToken.connect(account3).setAntisnipeAddress(owner.address)).to.be.revertedWith("Ownable: caller is not the owner");
		});
	});

	describe("upgrade", function () {
		it("should upgrade the contract", async function () {
			const implementationAddress = await upgrades.erc1967.getImplementationAddress(govToken_address);

			const Proxy = await upgrades.upgradeProxy(govToken_address, Gov_Token_2);
			await Proxy.waitForDeployment();

			const implementationAddress2 = await upgrades.erc1967.getImplementationAddress(govToken_address);
			expect(implementationAddress).to.not.equal(implementationAddress2);
		});
	});

	describe("transfer", function () {
		it("should be able to transfer", async function () {
			await govToken.transfer(account3.address, ethers.parseUnits("100", await govToken.decimals()));
			expect(await govToken.balanceOf(account3.address)).to.equal(ethers.parseUnits("100", await govToken.decimals()));
		});

		it("should be able to transferFrom", async function () {
			await govToken.transfer(account3.address, ethers.parseUnits("100", await govToken.decimals()));
			await govToken.connect(account3).approve(owner.address, ethers.parseUnits("100", await govToken.decimals()));
			await govToken.connect(owner).transferFrom(account3.address, owner.address, ethers.parseUnits("100", await govToken.decimals()));
			expect(await govToken.balanceOf(account3.address)).to.equal(0);
		});

		it("should revert if the sender does not have enough tokens", async function () {
			await expect(govToken.transfer(account3.address, ethers.parseUnits("100000000001", await govToken.decimals()))).to.be.revertedWith(
				"ERC20: transfer amount exceeds balance"
			);
		});
	});
});
