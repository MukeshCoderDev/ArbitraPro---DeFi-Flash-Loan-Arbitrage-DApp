 const { expect } = require("chai");
 const { ethers, network } = require("hardhat");
 const { forkNetwork } = require("./helpers");
 

 describe("ArbitrageExecutor", function () {
  let executor, router, owner;
  let aavePool, dai, usdc;
  
  before(async () => {
  await forkNetwork("mainnet", 17600000);
  [owner] = await ethers.getSigners();
  
  // Mainnet addresses
  aavePool = await ethers.getContractAt("IAavePool", "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9");
  dai = await ethers.getContractAt("IERC20", "0x6B175474E89094C44Da98b954EedeAC495271d0F");
  usdc = await ethers.getContractAt("IERC20", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  
  // Deploy SwapRouter
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  router = await upgrades.deployProxy(SwapRouter, [
  owner.address,
  owner.address,
  50,
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
  ]);
  
  // Deploy ArbitrageExecutor
  const ArbitrageExecutor = await ethers.getContractFactory("ArbitrageExecutor");
  executor = await upgrades.deployProxy(ArbitrageExecutor, [
  owner.address,
  aavePool.address,
  router.address,
  owner.address
  ]);
  
  // Fund contract
  await dai.transfer(executor.address, ethers.utils.parseUnits("1000", 18));
  });
 

  it("Should repay loan before profit distribution", async () => {
  const loanAmount = ethers.utils.parseUnits("10000", 18);
  const path = [dai.address, usdc.address, dai.address];
  const tradeData = ethers.utils.defaultAbiCoder.encode(
  ["address[]", "uint256"],
  [path, ethers.utils.parseUnits("100", 18)]
  );
  
  const treasuryBalanceBefore = await dai.balanceOf(owner.address);
  await executor.executeArbitrage(
  aavePool.address,
  dai.address,
  loanAmount,
  tradeData
  );
  
  const treasuryBalanceAfter = await dai.balanceOf(owner.address);
  expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.be.gt(0);
  });
 

  it("Should enforce path length limit", async () => {
  const longPath = new Array(8).fill(dai.address);
  const tradeData = ethers.utils.defaultAbiCoder.encode(
  ["address[]", "uint256"],
  [longPath, 0]
  );
  
  await expect(
  executor.executeArbitrage(
  aavePool.address,
  dai.address,
  ethers.utils.parseUnits("1000", 18),
  tradeData
  )
  ).to.be.revertedWith("Invalid path");
  });
 });
 