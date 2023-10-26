const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("Governance", function () {
	let governance, governance_address, owner, addr1, addr2, addr3, govToken, sGovToken, gov_token_address, sgov_token_address;

	beforeEach(async function () {
		[owner, addr1, addr2, addr3] = await ethers.getSigners();

		const Gov_Token = await ethers.getContractFactory("Gov_Token");
		govToken = await upgrades.deployProxy(Gov_Token, [], { kind: "uups", redeployImplementation: "always" });
		await govToken.waitForDeployment();
		gov_token_address = await govToken.getAddress();

		const sGov_Token = await ethers.getContractFactory("sGov_Token");
		sGovToken = await upgrades.deployProxy(sGov_Token, [], { kind: "uups", redeployImplementation: "always" });
		await sGovToken.waitForDeployment();
		sgov_token_address = await sGovToken.getAddress();

		const Governance = await ethers.getContractFactory("Governance");
		governance = await upgrades.deployProxy(Governance, [gov_token_address, sgov_token_address], { kind: "uups", redeployImplementation: "always" });
		await governance.waitForDeployment();
		governance_address = await governance.getAddress();

		await sGovToken.set_protocol(governance_address);

		// Fund governance contract with 1 billion tokens
		await govToken.transfer(governance_address, ethers.parseEther("10000000000"));
	});

	describe("initialize", function () {
		it("should set the correct state variables", async function () {
			expect(await governance.get_gov_token()).to.equal(gov_token_address);
			expect(await governance.get_sgov_token()).to.equal(sgov_token_address);
		});
	});

	describe("stake", function () {
		it("should allow users to stake tokens", async function () {
			await govToken.transfer(addr1.address, ethers.parseEther("100"));
			await govToken.connect(addr1).approve(governance_address, ethers.parseEther("100"));
			await governance.connect(addr1).stake(ethers.parseEther("100"));

			expect(await govToken.balanceOf(addr1.address)).to.equal(0);
			expect(await sGovToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
		});
	});

	describe("unstake", function () {
		it("should allow users to unstake tokens", async function () {
			await govToken.transfer(addr1.address, ethers.parseEther("100"));
			await govToken.connect(addr1).approve(governance_address, ethers.parseEther("100"));
			await governance.connect(addr1).stake(ethers.parseEther("100"));

			await governance.connect(addr1).unstake(ethers.parseEther("50"));

			expect(await govToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("50"));
			expect(await sGovToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("50"));
		});
	});

	describe("claim", function () {
		it("should allow users to claim rewards", async function () {
			await govToken.transfer(addr1.address, ethers.parseEther("100"));
			await govToken.connect(addr1).approve(governance_address, ethers.parseEther("100"));
			await governance.connect(addr1).stake(ethers.parseEther("100"));

			for (let i = 0; i < 7200; i++) {
				await ethers.provider.send("evm_mine");
			}

			await governance.connect(addr1).claim();

			// console.log(ethers.formatEther(await govToken.balanceOf(addr1.address)));

			const blocksElapsed = 7201n;
			const estimatedEmissions = blocksElapsed * (await governance.get_emission_rate());
			const actualEmission = await govToken.balanceOf(addr1.address);

			expect(actualEmission).to.be.closeTo(estimatedEmissions, ethers.parseEther("0.001"));
		});
	});

	describe("transfer_stake", function () {
		it("should allow the sGov_Token contract to transfer stake", async function () {
			await govToken.transfer(addr1.address, ethers.parseEther("100"));
			await govToken.connect(addr1).approve(governance_address, ethers.parseEther("100"));
			await governance.connect(addr1).stake(ethers.parseEther("100"));

			await sGovToken.connect(addr1).transfer(addr2.address, ethers.parseEther("50"));

			expect(await sGovToken.balanceOf(addr2.address)).to.equal(ethers.parseEther("50"));
		});

		it("should not allow non-sGov_Token contracts to transfer stake", async function () {
			await expect(governance.transfer_stake(addr1.address, addr2.address, ethers.parseEther("50"))).to.be.revertedWith(
				"caller is not staked governance token contract"
			);
		});
	});

	describe("emissions and voting power calculations", function () {
		beforeEach(async function () {
			await govToken.transfer(addr1.address, ethers.parseEther("100"));
			await govToken.connect(addr1).approve(governance_address, ethers.parseEther("100"));
			await govToken.transfer(addr2.address, ethers.parseEther("100"));
			await govToken.connect(addr2).approve(governance_address, ethers.parseEther("100"));
			await govToken.transfer(addr3.address, ethers.parseEther("100"));
			await govToken.connect(addr3).approve(governance_address, ethers.parseEther("100"));
		});

		it("should correctly generate emissions after staking", async function () {
			await governance.connect(addr1).stake(ethers.parseEther("100"));

			for (let i = 0; i < 7200; i++) {
				await ethers.provider.send("evm_mine");
			}

			await governance.connect(addr1).claim();

			const blocksElapsed = 7201n;
			const estimatedEmissions = blocksElapsed * (await governance.get_emission_rate());
			const actualEmission = await govToken.balanceOf(addr1.address);

			expect(actualEmission).to.be.closeTo(estimatedEmissions, ethers.parseEther("0.001"));
		});

		it("should correctly generate emissions staking multiple users simultaeously", async function () {
			// 7200 blocks is 24 hours
			// Emission rate is set at around 1 token per day
			// In this scenario, 1 token should be distributed equally among the users after 24 hours

			await governance.connect(addr1).stake(ethers.parseEther("100"));
			await governance.connect(addr2).stake(ethers.parseEther("100"));
			await governance.connect(addr3).stake(ethers.parseEther("100"));

			for (let i = 0; i < 7200; i++) {
				await ethers.provider.send("evm_mine");
			}

			await governance.connect(addr1).claim();
			await governance.connect(addr2).claim();
			await governance.connect(addr3).claim();

			const actualEmission1 = await govToken.balanceOf(addr1.address);
			const actualEmission2 = await govToken.balanceOf(addr2.address);
			const actualEmission3 = await govToken.balanceOf(addr3.address);
			const totalEmission = actualEmission1 + actualEmission2 + actualEmission3;

			// console.log(ethers.formatEther(actualEmission1));
			// console.log(ethers.formatEther(actualEmission2));
			// console.log(ethers.formatEther(actualEmission3));
			// console.log(ethers.formatEther(totalEmission));

			const blocksElapsed = 7203n;
			const estimatedEmissions = blocksElapsed * (await governance.get_emission_rate());

			expect(totalEmission).to.be.closeTo(estimatedEmissions, ethers.parseEther("0.001"));
		});

		it("should correctly generate emissions after multiple stakes by 3 different users at different blocks", async function () {
			await governance.connect(addr1).stake(ethers.parseEther("100"));

			// Simulate 2400 blocks (8 hours)
			for (let i = 0; i < 2400; i++) {
				await ethers.provider.send("evm_mine");
			}

			await governance.connect(addr2).stake(ethers.parseEther("100"));

			// Simulate another 2400 blocks (8 hours)
			for (let i = 0; i < 2400; i++) {
				await ethers.provider.send("evm_mine");
			}

			await governance.connect(addr3).stake(ethers.parseEther("100"));

			// Simulate another 2400 blocks (8 hours)
			for (let i = 0; i < 2400; i++) {
				await ethers.provider.send("evm_mine");
			}

			await governance.connect(addr1).claim();
			await governance.connect(addr2).claim();
			await governance.connect(addr3).claim();

			const actualEmission1 = await govToken.balanceOf(addr1.address);
			const actualEmission2 = await govToken.balanceOf(addr2.address);
			const actualEmission3 = await govToken.balanceOf(addr3.address);
			const totalEmission = actualEmission1 + actualEmission2 + actualEmission3;

			// console.log(ethers.formatEther(actualEmission1));
			// console.log(ethers.formatEther(actualEmission2));
			// console.log(ethers.formatEther(actualEmission3));
			// console.log(ethers.formatEther(totalEmission));

			const blocksElapsed = 7205n;
			const estimatedEmissions = blocksElapsed * (await governance.get_emission_rate());

			expect(totalEmission).to.be.closeTo(estimatedEmissions, ethers.parseEther("0.001"));
		});

		it("should correctly generate emissions after multiple stakes", async function () {
			await governance.connect(addr1).stake(ethers.parseEther("100"));

			for (let i = 0; i < 7200; i++) {
				await ethers.provider.send("evm_mine");
			}

			await governance.connect(addr1).claim();

			await govToken.transfer(addr1.address, ethers.parseEther("100"));
			await govToken.connect(addr1).approve(governance_address, ethers.parseEther("100"));
			await governance.connect(addr1).stake(ethers.parseEther("100"));

			for (let i = 0; i < 7200; i++) {
				await ethers.provider.send("evm_mine");
			}

			await governance.connect(addr1).claim();

			const blocksElapsed = 14404n;
			const estimatedEmissions = blocksElapsed * (await governance.get_emission_rate());
			const actualEmission = await govToken.balanceOf(addr1.address);

			expect(actualEmission).to.be.closeTo(estimatedEmissions, ethers.parseEther("0.001"));
		});
		/*
		it("should correctly generate emissions with multiple users staking and unstaking in various orders", async function () {
			// User 1 stakes
			await governance.connect(addr1).stake(ethers.parseEther("100"));

			// Simulate 1200 blocks
			for (let i = 0; i < 1200; i++) {
				await ethers.provider.send("evm_mine");
			}

			// User 2 stakes
			await governance.connect(addr2).stake(ethers.parseEther("100"));

			// Simulate 1200 blocks
			for (let i = 0; i < 1200; i++) {
				await ethers.provider.send("evm_mine");
			}

			// User 3 stakes
			await governance.connect(addr3).stake(ethers.parseEther("100"));

			// Simulate 1200 blocks
			for (let i = 0; i < 1200; i++) {
				await ethers.provider.send("evm_mine");
			}

			// User 1 unstakes half
			await governance.connect(addr1).unstake(ethers.parseEther("50"));

			// Simulate 600 blocks
			for (let i = 0; i < 600; i++) {
				await ethers.provider.send("evm_mine");
			}

			// User 2 unstakes half
			await governance.connect(addr2).unstake(ethers.parseEther("50"));

			// Simulate 600 blocks
			for (let i = 0; i < 600; i++) {
				await ethers.provider.send("evm_mine");
			}

			// User 3 unstakes half
			await governance.connect(addr3).unstake(ethers.parseEther("50"));

			// Simulate 600 blocks
			for (let i = 0; i < 600; i++) {
				await ethers.provider.send("evm_mine");
			}

			// User 1 stakes again
			await govToken.connect(addr1).approve(governance_address, ethers.parseEther("50"));
			await governance.connect(addr1).stake(ethers.parseEther("50"));

			// Simulate 600 blocks
			for (let i = 0; i < 600; i++) {
				await ethers.provider.send("evm_mine");
			}

			// User 3 unstakes all
			// Also to test that users are able to claim unclaimed rewards even if they have fully unstaked
			await governance.connect(addr3).unstake(ethers.parseEther("50"));

			// Simulate 1200 blocks
			for (let i = 0; i < 1200; i++) {
				await ethers.provider.send("evm_mine");
			}

			// Users claim their rewards
			await governance.connect(addr1).claim();
			await governance.connect(addr2).claim();
			await governance.connect(addr3).claim();

			const actualEmission1 = await govToken.balanceOf(addr1.address);
			const actualEmission2 = await govToken.balanceOf(addr2.address);
			const actualEmission3 = await govToken.balanceOf(addr3.address);
			const totalEmission = actualEmission1 + actualEmission2 + actualEmission3 - ethers.parseEther("150");

			const blocksElapsed = 7211n;
			const estimatedEmissions = blocksElapsed * (await governance.get_emission_rate());

			expect(totalEmission).to.be.closeTo(estimatedEmissions, ethers.parseEther("0.001"));
		});
		
		it("should correctly generate voting power after staking", async function () {
			await governance.connect(addr1).stake(ethers.parseEther("100"));

			// Simulate some blocks
			for (let i = 0; i < 10; i++) {
				await ethers.provider.send("evm_mine");
			}

			const blocksElapsed = 10n; // 10 blocks have passed
			const blockRate = (blocksElapsed * ethers.parseEther("1")) / (await governance.get_vp_rate());
			const expectedVP = (((blockRate * ethers.parseEther("100")) / (await governance.get_total_staked())) * 1000n) / ethers.parseEther("1");

			const actualVP = await calculate_vp(addr1.address, blocksElapsed);
			expect(actualVP).to.equal(expectedVP);
		});
		
		it("should correctly generate voting power after multiple stakes", async function () {
			await governance.connect(addr1).stake(ethers.parseEther("100"));

			// Simulate some blocks
			for (let i = 0; i < 5; i++) {
				await ethers.provider.send("evm_mine");
			}

			await governance.connect(addr1).stake(ethers.parseEther("100"));

			for (let i = 0; i < 5; i++) {
				await ethers.provider.send("evm_mine");
			}

			const blocksElapsed = 10n; // 10 blocks have passed
			const blockRate = blocksElapsed * ethers.parseEther("1").div(await governance.get_vp_rate());
			const expectedVP = blockRate
				.mul(ethers.parseEther("200"))
				.div(await governance.get_total_staked())
				.mul(1000)
				.div(ethers.parseEther("1"));

			const actualVP = await calculate_vp(addr1.address, blocksElapsed);
			expect(actualVP).to.equal(expectedVP);
		});*/
	});

	const calculate_vp = async (user, blocksElapsed) => {
		const userStakedBalance = await governance.get_user_data(user)[1];
		const vpRate = await governance.get_vp_rate();

		const blockRate = (blocksElapsed * ethers.WeiPerEther) / vpRate;
		const vp = (userStakedBalance * blockRate * 1000n) / ethers.WeiPerEther;

		return vp;
	};
});
