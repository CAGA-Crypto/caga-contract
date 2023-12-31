const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Payment", function () {
	let Payment, PaymentToken, USDTToken, payment, paymentToken, usdtToken, owner, addr1, addr2;

	beforeEach(async function () {
		[owner, addr1, addr2] = await ethers.getSigners();

		PaymentToken = await ethers.getContractFactory("MockToken");
		paymentToken = await PaymentToken.deploy();

		USDTToken = await ethers.getContractFactory("MockToken");
		usdtToken = await USDTToken.deploy();

		Payment = await ethers.getContractFactory("Payment");
		payment = await Payment.deploy(paymentToken.address, usdtToken.address);
	});

	it("Should set the correct treasury address", async function () {
		await payment.updateTreasuryWallet(addr2.address);
		expect(await payment.treasuryWallet()).to.equal(addr2.address);
	});

	it("Should make a payment correctly", async function () {
		await payment.setPrice(ethers.utils.parseEther("1"));
		await payment.updateTreasuryWallet(addr2.address);

		await paymentToken.approve(payment.address, ethers.utils.parseEther("5"));
		await payment.payProposal(5);

		expect(await paymentToken.balanceOf(addr2.address)).to.equal(ethers.utils.parseEther("5"));
		expect(await payment.getAvailableCredits(owner.address)).to.equal(5);
	});

	it("Should update the price correctly", async function () {
		await payment.setPrice(ethers.utils.parseEther("2"));
		expect(await payment.price()).to.equal(ethers.utils.parseEther("2"));
	});

	it("Should update the token address correctly", async function () {
		const AnotherMockToken = await ethers.getContractFactory("PaymentToken");
		const anotherMockToken = await AnotherMockToken.deploy();

		await payment.updateERC20Address(anotherMockToken.address);
		expect(await payment.paymentToken()).to.equal(anotherMockToken.address);
	});
});
