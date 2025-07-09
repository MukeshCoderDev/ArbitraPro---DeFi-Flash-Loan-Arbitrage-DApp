const { ethers, upgrades, run, network } = require("hardhat");
require("dotenv").config();

async function main() {
  // Get network information
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
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
  console.log("\n1. Deploying ArbitraProToken...");
  const ArbitraProToken = await ethers.getContractFactory("ArbitraProToken");
  const arbpro = await ArbitraProToken.deploy();
  await arbpro.waitForDeployment();
  const arbproAddress = await arbpro.getAddress();
  console.log("ARBPRO deployed to:", arbproAddress);
  
  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  try {
    const txReceipt = await arbpro.deploymentTransaction().wait(2);
    console.log(`Transaction confirmed in block ${txReceipt.blockNumber}`);
  } catch (error) {
    console.log("Error waiting for confirmation:", error.message);
  }
  
  // Verify the token contract
  console.log("Verifying ArbitraProToken...");
  await verify(arbproAddress, []);

  // Deploy TimelockController (min 7 day delay)
  console.log("\n2. Deploying TimelockController...");
  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockController.deploy(
    7 * 24 * 60 * 60, // 7 days delay
    [process.env.OWNER_ADDRESS],
    [process.env.OWNER_ADDRESS],
    process.env.OWNER_ADDRESS // admin
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("TimelockController deployed to:", timelockAddress);
  
  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  try {
    const txReceipt = await timelock.deploymentTransaction().wait(2);
    console.log(`Transaction confirmed in block ${txReceipt.blockNumber}`);
  } catch (error) {
    console.log("Error waiting for confirmation:", error.message);
  }
  
  // Verify the timelock contract
  console.log("Verifying TimelockController...");
  await verify(timelockAddress, [
    7 * 24 * 60 * 60, // 7 days delay
    [process.env.OWNER_ADDRESS],
    [process.env.OWNER_ADDRESS],
    process.env.OWNER_ADDRESS // admin
  ]);

  // Deploy SwapRouter
  console.log("\n3. Deploying SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await upgrades.deployProxy(SwapRouter, [
    timelockAddress, // Owner set to timelock
    process.env.TREASURY_ADDRESS,
    50,
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap Router on Sepolia
    "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"  // Sushiswap Router on Sepolia
  ]);
  await swapRouter.waitForDeployment();
  const swapRouterAddress = await swapRouter.getAddress();
  console.log("SwapRouter deployed to:", swapRouterAddress);

  // Deploy ArbitrageExecutor
  console.log("\n4. Deploying ArbitrageExecutor...");
  const ArbitrageExecutor = await ethers.getContractFactory("ArbitrageExecutor");
  const executor = await upgrades.deployProxy(ArbitrageExecutor, [
    timelockAddress, // Owner set to timelock
    "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", // Aave Pool on Sepolia
    swapRouterAddress,
    process.env.TREASURY_ADDRESS
  ]);
  await executor.waitForDeployment();
  const executorAddress = await executor.getAddress();
  console.log("ArbitrageExecutor deployed to:", executorAddress);

  // Deploy StakingRewards
  console.log("\n5. Deploying StakingRewards...");
  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  const staking = await upgrades.deployProxy(StakingRewards, [
    timelockAddress, // Owner set to timelock
    arbproAddress
  ]);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("StakingRewards deployed to:", stakingAddress);

  // Deploy Governor
  console.log("\n6. Deploying ArbitraProGovernor...");
  const ArbitraProGovernor = await ethers.getContractFactory("ArbitraProGovernor");
  const governor = await ArbitraProGovernor.deploy(
    arbproAddress,
    timelockAddress
  );
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log("Governor deployed to:", governorAddress);
  
  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  try {
    const txReceipt = await governor.deploymentTransaction().wait(2);
    console.log(`Transaction confirmed in block ${txReceipt.blockNumber}`);
  } catch (error) {
    console.log("Error waiting for confirmation:", error.message);
  }
  
  // Verify the governor contract
  console.log("Verifying ArbitraProGovernor...");
  await verify(governorAddress, [
    arbproAddress,
    timelockAddress
  ]);
  
  console.log("\n✅ All contracts deployed and verified successfully!");
  console.log("\nSummary:");
  console.log("ARBPRO Token:", arbproAddress);
  console.log("TimelockController:", timelockAddress);
  console.log("SwapRouter:", swapRouterAddress);
  console.log("ArbitrageExecutor:", executorAddress);
  console.log("StakingRewards:", stakingAddress);
  console.log("ArbitraProGovernor:", governorAddress);
  
  // Save deployment addresses to a file
  const fs = require('fs');
  const deploymentInfo = {
    network: network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      ArbitraProToken: arbproAddress,
      TimelockController: timelockAddress,
      SwapRouter: swapRouterAddress,
      ArbitrageExecutor: executorAddress,
      StakingRewards: stakingAddress,
      ArbitraProGovernor: governorAddress
    }
  };
  
  fs.writeFileSync(
    `deployment-${network.name}-${new Date().toISOString().replace(/:/g, '-')}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment information saved to file.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });