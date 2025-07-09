const { ethers, upgrades, run } = require("hardhat");
 

 async function main() {
  // Get network information
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  
  // Verify helper function
  async function verify(contractAddress, args) {
    console.log("Verifying contract...");
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: args,
      });
    } catch (e) {
      if (e.message.toLowerCase().includes("already verified")) {
        console.log("Already verified!");
      } else {
        console.log(e);
      }
    }
  }
  // Deploy ARBPRO token
  const ArbitraProToken = await ethers.getContractFactory("ArbitraProToken");
  const arbpro = await ArbitraProToken.deploy();
  console.log("ARBPRO deployed to:", arbpro.address);
  
  // Wait for a few block confirmations
  await arbpro.deployTransaction.wait(6);
  
  // Verify the token contract
  await verify(arbpro.address, []);
 

  // Deploy TimelockController (min 7 day delay)
  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockController.deploy(
  7 * 24 * 60 * 60, // 7 days delay
  [process.env.OWNER_ADDRESS],
  [process.env.OWNER_ADDRESS]
  );
  console.log("TimelockController deployed to:", timelock.address);
  
  // Wait for a few block confirmations
  await timelock.deployTransaction.wait(6);
  
  // Verify the timelock contract
  await verify(timelock.address, [
    7 * 24 * 60 * 60, // 7 days delay
    [process.env.OWNER_ADDRESS],
    [process.env.OWNER_ADDRESS]
  ]);
 

  // Deploy SwapRouter
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await upgrades.deployProxy(SwapRouter, [
  timelock.address, // Owner set to timelock
  process.env.TREASURY_ADDRESS,
  50,
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
  ]);
  console.log("SwapRouter deployed to:", swapRouter.address);
 

  // Deploy ArbitrageExecutor
  const ArbitrageExecutor = await ethers.getContractFactory("ArbitrageExecutor");
  const executor = await upgrades.deployProxy(ArbitrageExecutor, [
  timelock.address, // Owner set to timelock
  "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
  swapRouter.address,
  process.env.TREASURY_ADDRESS
  ]);
  console.log("ArbitrageExecutor deployed to:", executor.address);
 

  // Deploy StakingRewards
  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  const staking = await upgrades.deployProxy(StakingRewards, [
  timelock.address, // Owner set to timelock
  arbpro.address
  ]);
  console.log("StakingRewards deployed to:", staking.address);
 

  // Deploy Governor
  const ArbitraProGovernor = await ethers.getContractFactory("ArbitraProGovernor");
  const governor = await ArbitraProGovernor.deploy(
  arbpro.address,
  timelock.address
  );
  console.log("Governor deployed to:", governor.address);
  
  // Wait for a few block confirmations
  await governor.deployTransaction.wait(6);
  
  // Verify the governor contract
  await verify(governor.address, [
    arbpro.address,
    timelock.address
  ]);
  
  console.log("All contracts deployed and verified successfully!");
 }
 

 main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
 });
 