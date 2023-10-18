const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Core", function() {
  let LS_Token, Withdraw, Core;
  let lsToken, withdraw, core;
  let owner, addr1, addr2;

  before(async function() {  // <-- Using 'before' instead of 'beforeEach' for setup
    LS_Token = await ethers.getContractFactory("LS_Token");
    Withdraw = await ethers.getContractFactory("Withdraw");
    Core = await ethers.getContractFactory("Core");
    
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    if (!lsToken) {  // Check if it's already deployed and initialized
        lsToken = await LS_Token.deploy();
        await lsToken.deployed();
        await lsToken.initialize(owner.address);
    }

    if (!withdraw) {
        withdraw = await Withdraw.deploy();
        await withdraw.deployed();
        await withdraw.initialize(owner.address);
    }

    if (!core) {
        core = await Core.deploy();
        await core.deployed();
        await core.initialize(lsToken.address, withdraw.address);
    }
  });

  describe("deposit()", function() {
    it("Should increase total deposits when depositing", async function() {
      const initialDeposit = await core.total_deposits();
      const depositAmount = ethers.utils.parseEther("1");

      await core.connect(addr1).deposit({ value: depositAmount });

      const finalDeposit = await core.total_deposits();
      expect(finalDeposit).to.equal(initialDeposit.add(depositAmount));
    });
  });

//   describe("request_withdraw()", function() {
//     it("Should decrease total deposits and burn lsTokens on withdrawal", async function() {
//       const depositAmount = ethers.utils.parseEther("1");
//       await core.connect(addr1).deposit({ value: depositAmount });

//       const initialDeposit = await core.total_deposits();
//       const lsTokenAmount = await lsToken.balanceOf(addr1.address);

//       await core.connect(addr1).request_withdraw(lsTokenAmount);

//       const finalDeposit = await core.total_deposits();
//       expect(finalDeposit).to.be.lt(initialDeposit);
//       expect(await lsToken.balanceOf(addr1.address)).to.equal(0);
//     });
//   });

//   describe("claim_withdrawal()", function() {
//     it("Should transfer ETH on claim", async function() {
//       const depositAmount = ethers.utils.parseEther("1");
//       await core.connect(addr1).deposit({ value: depositAmount });
//       const lsTokenAmount = await lsToken.balanceOf(addr1.address);
//       await core.connect(addr1).request_withdraw(lsTokenAmount);

//       const initialEth = await addr1.getBalance();
//       await core.connect(addr1).claim_withdrawal();
//       expect(await addr1.getBalance()).to.be.gt(initialEth);
//     });
//   });

//   describe("withdraw_unstaked()", function() {
//     it("Should be able to withdraw unstaked ETH", async function() {
//       // The actual logic will vary based on how the contract is set up to handle unstaked ETH. 
//       // This is a mock representation based on the given contract.
//       await core.withdraw_unstaked();
//       // Check that the core's ETH balance increased or other expected behaviors
//     });
//   });

//   describe("distribute_rewards()", function() {
//     it("Should distribute rewards and update state", async function() {
//       const initialRewards = await core.distributed_rewards();

//       await core.distribute_rewards();

//       expect(await core.distributed_rewards()).to.be.gt(initialRewards);
//     });
//   });

//   // stake_validator() does not have an implementation in the provided code, 
//   // so we cannot write a test for it until we know its intended behavior.

//   // Add tests for other functions, if needed.
});
