 const { expect } = require("chai");
 const { ethers, network } = require("hardhat");
 const { forkNetwork } = require("./helpers");
 

 describe("SwapRouter", function () {
  let router, owner, user, treasury;
  let dai, usdc;
  
  before(async () => {
  await forkNetwork("mainnet", 17600000);
  [owner, user, treasury] = await ethers.getSigners();
  
  dai = await ethers.getContractAt("IERC20", "0x6B175474E89094C44Da98b954EedeAC495271d0F");
  usdc = await ethers.getContractAt("IERC20", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  router = await upgrades.deployProxy(SwapRouter, [
  owner.address,
  treasury.address,
  50,
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
  ]);
  
  // Fund user
  await dai.transfer(user.address, ethers.utils.parseUnits("10000", 18));
  });
 

  it("Should implement approve-and-revoke pattern", async () => {
  const amountIn = ethers.utils.parseUnits("1000", 18);
  await dai.connect(user).approve(router.address, amountIn);
  
  const allowanceBefore = await dai.allowance(router.address, "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
  expect(allowanceBefore).to.equal(0);
  
  await router.connect(user).swapExactTokensForTokens(
  amountIn,
  0,
  [dai.address, usdc.address],
  user.address,
  Math.floor(Date.now() / 1000) + 300
  );
  
  const allowanceAfter = await dai.allowance(router.address, "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
  expect(allowanceAfter).to.equal(0);
  });
 

  it("Should calculate fees correctly", async () => {
  const treasuryBalanceBefore = await usdc.balanceOf(treasury.address);
  
  await dai.connect(user).approve(router.address, ethers.utils.parseUnits("1000", 18));
  await router.connect(user).swapExactTokensForTokens(
  ethers.utils.parseUnits("1000", 18),
  0,
  [dai.address, usdc.address],
  user.address,
  Math.floor(Date.now() / 1000) + 300
  );
  
  const treasuryBalanceAfter = await usdc.balanceOf(treasury.address);
  expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.be.gt(0);
  });
 });
 