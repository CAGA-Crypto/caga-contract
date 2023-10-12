const { ethers, upgrades } = require("hardhat");
const { expect } = require("@nomicfoundation/hardhat-toolbox");

const LS_Token = ethers.getContractFactory("LS_Token");
const LS_Token_2 = ethers.getContractFactory("LS_Token_2");

describe("LS_Token", function () {
	let lsToken;
	let owner;
	let protocol;

	beforeEach(async function () {
		[owner, protocol] = await ethers.getSigners();
		lsToken = await upgrades.deployProxy(LS_Token, [protocol.address]);
		await lsToken.waitForDeployment();
	});

	describe("initialize", function () {
		it("should set the protocol address", async function () {
			expect(await lsToken.protocol()).to.equal(protocol.address);
		});
	});

	describe("set_protocol", function () {
		it("should set the protocol address", async function () {
			const newProtocol = await ethers.getSigner();
			await lsToken.connect(owner).set_protocol(newProtocol.address);
			expect(await lsToken.protocol()).to.equal(newProtocol.address);
		});

		it("should revert if the new protocol address is 0", async function () {
			await expect(lsToken.connect(owner).set_protocol(ethers.constants.AddressZero)).to.be.revertedWith("address cannot be 0");
		});

		it("should revert if called by a non-owner", async function () {
			const nonOwner = await ethers.getSigner();
			await expect(lsToken.connect(nonOwner).set_protocol(owner.address)).to.be.revertedWith("Ownable: caller is not the owner");
		});
	});

	describe("upgrade", function () {
		it("should upgrade the contract", async function () {
			const implementationAddress = await ethers.provider.getStorageAt(lsToken.address, 0);
			const implementation = await LS_Token_2.at(implementationAddress);

			await upgrades.upgradeProxy(lsToken.address, LS_Token_2);
			expect(await lsToken.protocol()).to.equal(protocol.address);

			const implementationAddress2 = await ethers.provider.getStorageAt(lsToken.address, 0);
			const implementation2 = await LS_Token_2.at(implementationAddress2);
			expect(await implementation2.retrieve()).to.equal(await implementation.retrieve());
		});
	});

	describe("transfer", function () {
		it("should transfer tokens", async function () {
			const recipient = await ethers.getSigner();
			await lsToken.transfer(recipient.address, 100);
			expect(await lsToken.balanceOf(recipient.address)).to.equal(100);
		});

		it("should revert if the sender does not have enough tokens", async function () {
			const recipient = await ethers.getSigner();
			await expect(lsToken.transfer(recipient.address, 1000)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
		});
	});

	describe("burn", function () {
		it("should burn tokens", async function () {
			await lsToken.transfer(owner.address, 100);
			await lsToken.connect(owner).burn(50);
			expect(await lsToken.balanceOf(owner.address)).to.equal(50);
		});

		it("should revert if the sender does not have enough tokens", async function () {
			await expect(lsToken.connect(owner).burn(1000)).to.be.revertedWith("ERC20: burn amount exceeds balance");
		});
	});

	describe("permit", function () {
		it("should permit tokens", async function () {
			const nonce = await lsToken.nonces(owner.address);
			const deadline = ethers.constants.MaxUint256;
			const digest = await getPermitDigest(lsToken, owner.address, protocol.address, 100, nonce, deadline);
			const { v, r, s } = await signMessage(digest, owner);

			await lsToken.permit(owner.address, protocol.address, 100, deadline, v, r, s);
			expect(await lsToken.allowance(owner.address, protocol.address)).to.equal(100);
		});

		it("should revert if the deadline has passed", async function () {
			const nonce = await lsToken.nonces(owner.address);
			const deadline = (await ethers.provider.getBlockNumber()) - 1;
			const digest = await getPermitDigest(lsToken, owner.address, protocol.address, 100, nonce, deadline);
			const { v, r, s } = await signMessage(digest, owner);

			await expect(lsToken.permit(owner.address, protocol.address, 100, deadline, v, r, s)).to.be.revertedWith("ERC20Permit: expired deadline");
		});

		it("should revert if the signature is invalid", async function () {
			const nonce = await lsToken.nonces(owner.address);
			const deadline = ethers.constants.MaxUint256;
			const digest = await getPermitDigest(lsToken, owner.address, protocol.address, 100, nonce, deadline);
			const { v, r, s } = await signMessage(digest, protocol);

			await expect(lsToken.permit(owner.address, protocol.address, 100, deadline, v, r, s)).to.be.revertedWith("ERC20Permit: invalid signature");
		});
	});

	async function getPermitDigest(token, owner, spender, value, nonce, deadline) {
		const chainId = (await ethers.provider.getNetwork()).chainId;
		return ethers.utils.solidityKeccak256(
			["bytes1", "bytes1", "bytes32", "bytes32"],
			[
				"0x19",
				"0x01",
				ethers.utils.solidityPack(
					["address", "uint256", "uint256", "address", "uint256", "uint256"],
					[token.address, nonce, deadline, spender, value, chainId]
				),
				ethers.utils.keccak256(ethers.utils.solidityPack(["string"], ["ERC20 Permit"])),
			]
		);
	}

	async function signMessage(message, signer) {
		const signature = await signer.signMessage(ethers.utils.arrayify(message));
		return ethers.utils.splitSignature(signature);
	}
});
