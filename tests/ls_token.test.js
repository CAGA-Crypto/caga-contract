const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("LS_Token", function () {
	let LS_Token;
	let LS_Token_2;
	let lsToken;
	let lsToken_address;
	let owner;
	let protocol;

	beforeEach(async function () {
		LS_Token = await ethers.getContractFactory("LS_Token");
		LS_Token_2 = await ethers.getContractFactory("LS_Token");

		[owner, protocol, account3] = await ethers.getSigners();
		lsToken = await upgrades.deployProxy(LS_Token, [], { kind: "uups", redeployImplementation: "always" });
		await lsToken.waitForDeployment();

		lsToken_address = await lsToken.getAddress();

		await lsToken.set_protocol(protocol.address);
	});

	describe("initialize", function () {
		it("should set the protocol address", async function () {
			expect(await lsToken.protocol()).to.equal(protocol.address);
		});
	});

	describe("set_protocol", function () {
		it("should set the protocol address", async function () {
			await lsToken.connect(owner).set_protocol(account3.address);
			expect(await lsToken.protocol()).to.equal(account3.address);
		});

		it("should revert if the new protocol address is 0", async function () {
			await expect(lsToken.connect(owner).set_protocol(ethers.ZeroAddress)).to.be.revertedWith("address cannot be 0");
		});

		it("should revert if called by a non-owner", async function () {
			await expect(lsToken.connect(account3).set_protocol(owner.address)).to.be.revertedWith("Ownable: caller is not the owner");
		});
	});

	describe("upgrade", function () {
		it("should upgrade the contract", async function () {
			const implementationAddress = await upgrades.erc1967.getImplementationAddress(lsToken_address);

			const Proxy = await upgrades.upgradeProxy(lsToken_address, LS_Token_2);
			await Proxy.waitForDeployment();

			const implementationAddress2 = await upgrades.erc1967.getImplementationAddress(lsToken_address);
			expect(implementationAddress).to.not.equal(implementationAddress2);
		});
	});

	describe("transfer", function () {
		it("should revert if the sender does not have enough tokens", async function () {
			await expect(lsToken.transfer(account3.address, 1000)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
		});
	});

	describe("permit", function () {
		// it("should permit tokens", async function () {
		// 	const nonce = await lsToken.nonces(owner.address);
		// 	const deadline = ethers.MaxUint256;
		// 	const digest = await getPermitDigest(lsToken_address, protocol.address, 100, nonce, deadline);

		// 	console.log("Digest: ", digest); // Log the digest

		// 	const { v, r, s } = await signMessage(digest, owner);
		// 	console.log("Signature: ", { v, r, s }); // Log the signature

		// 	const recoveredAddress = ethers.recoverAddress(digest, { v, r, s });
		// 	console.log("Recovered address: ", recoveredAddress); // Log the recovered address
		// 	console.log("Owner address: ", owner.address); // Log the owner address

		// 	await lsToken.permit(owner.address, protocol.address, 100, deadline, v, r, s);
		// 	expect(await lsToken.allowance(owner.address, protocol.address)).to.equal(100);
		// });

		it("should revert if the deadline has passed", async function () {
			const nonce = await lsToken.nonces(owner.address);
			const deadline = (await ethers.provider.getBlockNumber()) - 1;
			const digest = await getPermitDigest(lsToken_address, protocol.address, 100, nonce, deadline);
			const { v, r, s } = await signMessage(digest, owner);

			await expect(lsToken.permit(owner.address, protocol.address, 100, deadline, v, r, s)).to.be.revertedWith("ERC20Permit: expired deadline");
		});

		it("should revert if the signature is invalid", async function () {
			const nonce = await lsToken.nonces(owner.address);
			const deadline = ethers.MaxUint256;
			const digest = await getPermitDigest(lsToken_address, protocol.address, 100, nonce, deadline);
			const { v, r, s } = await signMessage(digest, protocol);

			await expect(lsToken.permit(owner.address, protocol.address, 100, deadline, v, r, s)).to.be.revertedWith("ERC20Permit: invalid signature");
		});
	});

	async function getPermitDigest(token_address, spender, value, nonce, deadline) {
		const chainId = (await ethers.provider.getNetwork()).chainId;
		return ethers.solidityPackedKeccak256(
			["bytes1", "bytes1", "bytes32", "bytes32"],
			[
				"0x19",
				"0x01",
				ethers.solidityPackedKeccak256(
					["address", "uint256", "uint256", "address", "uint256", "uint256"],
					[token_address, nonce, deadline, spender, value, chainId]
				),
				ethers.solidityPackedKeccak256(["string"], ["ERC20 Permit"]),
			]
		);
	}

	async function signMessage(message, signer) {
		const signature = await signer.signMessage(message);
		return ethers.Signature.from(signature);
	}
});
