const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("Core", function () {
	let Core;
	let Core2;
	let core;
	let core_address;
	let owner;
	let treasury_address;
	let addr1;
	let addr2;
	let addr3;
	let LS_Token;
	let lsToken;
	let lsToken_address;
	let Withdraw;
	let withdraw;
	let withdraw_address;
	let Eth2;
	let eth2;
	let eth2_address;

	beforeEach(async function () {
		[owner, treasury_address, addr1, addr2, addr3] = await ethers.getSigners();

		LS_Token = await ethers.getContractFactory("LS_Token");
		lsToken = await upgrades.deployProxy(LS_Token, [], { kind: "uups", redeployImplementation: "always" });
		await lsToken.waitForDeployment();
		lsToken_address = await lsToken.getAddress();

		Withdraw = await ethers.getContractFactory("Withdraw");
		withdraw = await upgrades.deployProxy(Withdraw, [], { kind: "uups", redeployImplementation: "always" });
		await withdraw.waitForDeployment();
		withdraw_address = await withdraw.getAddress();

		Eth2 = await ethers.getContractFactory("AbyssEth2Depositor");
		eth2 = await Eth2.deploy();
		eth2_address = await eth2.getAddress();

		Core = await ethers.getContractFactory("Core");
		Core2 = await ethers.getContractFactory("Core");
		core = await upgrades.deployProxy(Core, [lsToken_address, withdraw_address, eth2_address], {
			kind: "uups",
			redeployImplementation: "always",
		});
		await core.waitForDeployment();
		core_address = await core.getAddress();

		await core.set_treasury_address(treasury_address);
		await lsToken.set_protocol(core_address);
		await withdraw.set_protocol(core_address);
	});

	describe("initialize", function () {
		it("should set ls_token contract address", async function () {
			expect(await core.get_ls_token_contract()).to.equal(lsToken_address);
		});

		it("should set withdraw contract address", async function () {
			expect(await core.get_withdraw_contract()).to.equal(withdraw_address);
		});
	});

	describe("upgrade", function () {
		it("should upgrade the contract", async function () {
			const implementationAddress = await upgrades.erc1967.getImplementationAddress(core_address);

			const Proxy = await upgrades.upgradeProxy(core_address, Core2);
			await Proxy.waitForDeployment();

			const implementationAddress2 = await upgrades.erc1967.getImplementationAddress(core_address);
			expect(implementationAddress).to.not.equal(implementationAddress2);
		});
	});

	describe("deposit", function () {
		it("should deposit ETH and mint corresponding ls tokens", async function () {
			const depositAmount = ethers.parseEther("1");
			await core.connect(addr1).deposit({ value: depositAmount });

			expect(await core.get_total_deposits()).to.equal(depositAmount);
			expect(await lsToken.balanceOf(addr1.address)).to.equal(depositAmount);
		});

		it("multiple users deposit ETH and mint corresponding ls tokens", async function () {
			// distribute_rewards, calculate_deposit

			const depositAmount1 = ethers.parseEther("1");
			const depositAmount2 = ethers.parseEther("2");
			const depositAmount3 = ethers.parseEther("3");

			const sendRandomRewards = async () => {
				// Random reward between 0 and 1 ETH
				const randomReward = ethers.parseEther(Math.random().toString());
				await owner.sendTransaction({ value: randomReward, to: withdraw_address });
				await core.distribute_rewards();
			};

			await sendRandomRewards();
			const expectedLsToken1 = await core.calculate_deposit(depositAmount1);
			await core.connect(addr1).deposit({ value: depositAmount1 });
			expect(await lsToken.balanceOf(addr1.address)).to.equal(expectedLsToken1);

			await sendRandomRewards();
			const expectedLsToken2 = await core.calculate_deposit(depositAmount2);
			await core.connect(addr2).deposit({ value: depositAmount2 });
			expect(await lsToken.balanceOf(addr2.address)).to.equal(expectedLsToken2);

			await sendRandomRewards();
			const expectedLsToken3 = await core.calculate_deposit(depositAmount3);
			await core.connect(addr3).deposit({ value: depositAmount3 });
			expect(await lsToken.balanceOf(addr3.address)).to.equal(expectedLsToken3);

			expect(await core.get_total_deposits()).to.equal(depositAmount1 + depositAmount2 + depositAmount3);
		});
	});

	describe("staking validators", function () {
		it("should stake 2 validators", async function () {
			const depositAmount = ethers.parseEther("64");
			await core.connect(addr1).deposit({ value: depositAmount });

			await stake_validators();

			expect(await core.get_total_deposits()).to.equal(ethers.parseEther("64"));
			expect(await ethers.provider.getBalance(core_address)).to.equal(0);
		});
	});

	describe("request_withdraw", function () {
		it("should request a non-immediate withdrawal while contract has no funds to fulfil request", async function () {
			const balanceBefore = await ethers.provider.getBalance(addr1.address);

			const depositAmount = ethers.parseEther("64");
			await core.connect(addr1).deposit({ value: depositAmount });

			await stake_validators();

			expect(await core.get_total_deposits()).to.equal(depositAmount);

			await core.connect(addr1).request_withdraw(depositAmount);

			const balanceAfter = await ethers.provider.getBalance(addr1.address);

			expect(await core.get_total_deposits()).to.equal(0);
			expect(await ethers.provider.getBalance(core_address)).to.equal(0);
			expect(balanceAfter).to.be.closeTo(balanceBefore - depositAmount, ethers.parseEther("0.001"));
			expect(await lsToken.balanceOf(addr1.address)).to.equal(0);
		});

		it("should request a immediate withdrawal while core contract has insufficient funds but core plus withdraw contract has sufficient (due to unstaked validator)", async function () {
			const depositAmount1 = ethers.parseEther("32");
			await core.connect(addr1).deposit({ value: depositAmount1 });

			const depositAmount2 = ethers.parseEther("32");
			await core.connect(addr2).deposit({ value: depositAmount2 });

			await stake_validators();

			const balanceBefore1 = await ethers.provider.getBalance(addr1.address);
			const withdrawAmount = ethers.parseEther("5");
			await core.connect(addr1).request_withdraw(withdrawAmount);
			const balanceAfter1 = await ethers.provider.getBalance(addr1.address);

			expect(balanceAfter1).to.be.closeTo(balanceBefore1, ethers.parseEther("0.001"));
			expect(await lsToken.balanceOf(addr1.address)).to.equal(depositAmount1 - withdrawAmount);

			// send ETH to the withdraw contract to simulate validator unstake
			await owner.sendTransaction({ value: ethers.parseEther("32"), to: withdraw_address });

			const balanceBefore2 = await ethers.provider.getBalance(addr2.address);
			await core.connect(addr2).request_withdraw(withdrawAmount);
			const balanceAfter2 = await ethers.provider.getBalance(addr2.address);

			expect(balanceAfter2).to.be.closeTo(balanceBefore2 + withdrawAmount, ethers.parseEther("0.001"));
			expect(await lsToken.balanceOf(addr2.address)).to.equal(depositAmount2 - withdrawAmount);

			expect(await ethers.provider.getBalance(core_address)).to.equal(ethers.parseEther("32") - withdrawAmount);
			expect(await core.get_total_deposits()).to.equal(depositAmount1 + depositAmount2 - withdrawAmount - withdrawAmount);
		});

		it("should request a immediate withdrawal while core contract has funds to fulfil request", async function () {
			const balanceBefore = await ethers.provider.getBalance(addr1.address);

			const depositAmount = ethers.parseEther("1");
			await core.connect(addr1).deposit({ value: depositAmount });

			const withdrawAmount = ethers.parseEther("0.5");
			await core.connect(addr1).request_withdraw(withdrawAmount);

			const balanceAfter = await ethers.provider.getBalance(addr1.address);

			expect(await core.get_total_deposits()).to.equal(depositAmount - withdrawAmount);
			expect(balanceAfter).to.be.closeTo(balanceBefore - depositAmount + withdrawAmount, ethers.parseEther("0.001"));
			expect(await lsToken.balanceOf(addr1.address)).to.equal(depositAmount - withdrawAmount);
		});
	});

	describe("claim withdraw", function () {
		it("should claim withdrawal", async function () {
			// claim_withdrawal, withdraw_unstaked

			const depositAmount = ethers.parseEther("64");
			await core.connect(addr1).deposit({ value: depositAmount });

			await stake_validators();

			const withdrawAmount = ethers.parseEther("5");
			await core.connect(addr1).request_withdraw(withdrawAmount);

			// send ETH to the withdraw contract to simulate validator unstake
			await owner.sendTransaction({ value: ethers.parseEther("32"), to: withdraw_address });
			await core.withdraw_unstaked();
			expect(await ethers.provider.getBalance(core_address)).to.equal(ethers.parseEther("32"));

			await core.connect(addr1).claim_withdrawal();
			expect(await ethers.provider.getBalance(core_address)).to.equal(ethers.parseEther("32") - withdrawAmount);

			expect(await core.get_total_deposits()).to.equal(depositAmount - withdrawAmount);
			expect(await lsToken.balanceOf(addr1.address)).to.equal(depositAmount - withdrawAmount);
		});
	});

	describe("Distribute rewards", function () {
		it("should distribute rewards", async function () {
			// distribute_rewards, calculate_withdraw

			const treasuryBalanceBefore = await ethers.provider.getBalance(treasury_address);

			const depositAmount = ethers.parseEther("64");
			await core.connect(addr1).deposit({ value: depositAmount });

			await stake_validators();

			// send ETH to the withdraw contract to simulate ETH2 staking rewards
			const rewardAmount = ethers.parseEther("1");
			await owner.sendTransaction({ value: rewardAmount, to: withdraw_address });
			await core.distribute_rewards();
			const calculatedProtocolFee = (rewardAmount * (await core.get_protocol_fee_percentage())) / 10000000000n;
			const calculatedProtocolReward = rewardAmount - calculatedProtocolFee;

			const balanceBefore = await ethers.provider.getBalance(addr1.address);

			const withdrawAmount = ethers.parseEther("0.1");
			const calculatedWithdraw = await core.calculate_withdraw(withdrawAmount);
			await core.connect(addr1).request_withdraw(withdrawAmount);

			const balanceAfter = await ethers.provider.getBalance(addr1.address);

			expect(balanceAfter).to.be.closeTo(balanceBefore + calculatedWithdraw, ethers.parseEther("0.001"));
			expect(await lsToken.balanceOf(addr1.address)).to.equal(depositAmount - withdrawAmount);
			expect(await core.get_total_deposits()).to.be.closeTo(depositAmount - calculatedWithdraw, ethers.parseEther("0.001"));
			expect(await ethers.provider.getBalance(core_address)).to.be.closeTo(calculatedProtocolReward - calculatedWithdraw, ethers.parseEther("0.001"));
			expect(await ethers.provider.getBalance(withdraw_address)).to.equal(0);
			expect(await core.get_total_rewards()).to.equal(calculatedProtocolReward);
			expect(await ethers.provider.getBalance(treasury_address)).to.equal(treasuryBalanceBefore + calculatedProtocolFee);
		});

		it("should distribute rewards when user request withdraw", async function () {
			const treasuryBalanceBefore = await ethers.provider.getBalance(treasury_address);

			const depositAmount = ethers.parseEther("64");
			await core.connect(addr1).deposit({ value: depositAmount });

			await stake_validators();

			// send ETH to the withdraw contract to simulate ETH2 staking rewards
			const rewardAmount = ethers.parseEther("5");
			await owner.sendTransaction({ value: rewardAmount, to: withdraw_address });
			const calculatedProtocolFee = (rewardAmount * (await core.get_protocol_fee_percentage())) / 10000000000n;
			const calculatedProtocolReward = rewardAmount - calculatedProtocolFee;

			const balanceBefore = await ethers.provider.getBalance(addr1.address);

			const withdrawAmount = ethers.parseEther("4");
			const calculatedWithdraw = await core.calculate_withdraw(withdrawAmount);
			await core.connect(addr1).request_withdraw(withdrawAmount);

			const balanceAfter = await ethers.provider.getBalance(addr1.address);

			expect(balanceAfter).to.be.closeTo(balanceBefore + calculatedWithdraw, ethers.parseEther("0.001"));
			expect(await lsToken.balanceOf(addr1.address)).to.equal(depositAmount - withdrawAmount);
			expect(await core.get_total_deposits()).to.be.closeTo(depositAmount - calculatedWithdraw, ethers.parseEther("0.001"));
			expect(await ethers.provider.getBalance(core_address)).to.be.closeTo(calculatedProtocolReward - calculatedWithdraw, ethers.parseEther("0.001"));
			expect(await ethers.provider.getBalance(withdraw_address)).to.equal(0);
			expect(await core.get_total_rewards()).to.equal(calculatedProtocolReward);
			expect(await ethers.provider.getBalance(treasury_address)).to.equal(treasuryBalanceBefore + calculatedProtocolFee);
		});
	});

	// stakes 2 validators using 64 ETH in the core contract
	const stake_validators = async () => {
		const mockData = [
			{
				pubkey: "0x996df2df8a0513891dec4e22228749f41aeae9c0a205c42bd69b8e3972479a371378859b8e35917b21a5328b78d3541c",
				withdrawal_credentials: "0x010000000000000000000000" + withdraw_address.substring(2).toLowerCase(),
				signature:
					"0xa799c9aa2ae671ba4b381914cfb1d5557df34191c3a20f93866d567623371c4ce7b54ef9a55270a7148dab67a331a26304921e40a45d726f68b52136753bf45f1024ec2698d27e9f57089edad825e0d1b944c38def6eb3955038b7a089163090",
				deposit_data_root: "0x34dcc0ce0ba81c1c3ac0f28039809fd323450e17f8930b7f13cd0256b467f084",
			},
			{
				pubkey: "0x91407af7c79e494cbd231211533784ce8ac90711e1f40ce3fed63688835477d4abb5eae1241389dd406b56b57cde5684",
				withdrawal_credentials: "0x010000000000000000000000" + withdraw_address.substring(2).toLowerCase(),
				signature:
					"0x91182d6b948c8827683cbc32c59051a40e646d78a0fe3124df31444be2de80c2aa51d0cdb3a7a00e8427b5170a19140b0b9ff98f5b4dbbedbb66d319f0b416ccf52ee265f638a79d061784c15510a5c917bddec0a28771e3f5cbc13311355ab1",
				deposit_data_root: "0xb80aad5eb8aa8bacfc42b8243ca4ee72d5bb7275b22fa0e16a3e8c565fc7fffe",
			},
		];

		const pubkeys = mockData.map((d) => d.pubkey);
		const withdrawal_credentials = mockData.map((d) => d.withdrawal_credentials);
		const signatures = mockData.map((d) => d.signature);
		const deposit_data_roots = mockData.map((d) => d.deposit_data_root);
		await core.stake_validators(pubkeys, withdrawal_credentials, signatures, deposit_data_roots);
	};
});
