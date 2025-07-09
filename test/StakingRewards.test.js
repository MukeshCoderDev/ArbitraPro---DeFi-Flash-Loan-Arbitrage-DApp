 const { expect } = require("chai");
 const { ethers } = require("hardhat");
 

 describe("StakingRewards", function () {
  let staking, token, owner, user;
  
  before(async () => {
  [owner, user] = await ethers.getSigners();
  
  const Token = await ethers.getContractFactory("ArbitraProToken");
  token = await Token.deploy();
  
  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  staking = await upgrades.deployProxy(StakingRewards, [
  owner.address,
  token.address
  ]);
  
  // Fund user and approve
  await token.transfer(user.address, ethers.utils.parseUnits("1000", 18));
  await token.connect(user).approve(staking.address, ethers.utils.parseUnits("1000", 18));
  });
 

  it("Should reset reward state on rate change", async () => {
  await staking.setRewardRate(ethers.utils.parseUnits("0.1", 18));
  
  const rewardPerTokenStored = await staking.rewardPerTokenStored();
  const lastUpdateTime = await staking.lastUpdateTime();
  const periodFinish = await staking.periodFinish();
  
  expect(lastUpdateTime).to.equal(await ethers.provider.getBlockNumber());
  expect(periodFinish).to.equal(lastUpdateTime + 365 * 24 * 60 * 60);
  expect(rewardPerTokenStored).to.be.gt(0);
  });
 

  it("Should properly distribute rewards", async () => {
  // Stake tokens
  await staking.connect(user).stake(ethers.utils.parseUnits("100", 18));
  
  // Advance time
  await network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
  await network.provider.send("evm_mine");
  
  // Claim rewards
  const balanceBefore = await token.balanceOf(user.address);
  await staking.connect(user).getReward();
  const balanceAfter = await token.balanceOf(user.address);
  
  expect(balanceAfter.sub(balanceBefore)).to.be.gt(0);
  });
 });
 