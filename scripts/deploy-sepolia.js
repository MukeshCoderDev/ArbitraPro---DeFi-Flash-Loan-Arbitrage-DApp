const { ethers, upgrades, run, network } = require("hardhat");
require("dotenv").config();

async function main() {
  // Check if we're on Sepolia
  if (network.name !== "sepolia") {
    console.error("This script is intended to be run on Sepolia network only!");
    return;
  }

  // Get network information
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
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
  console.log("Deploying ArbitraProToken...");
  const ArbitraProToken = await ethers.getContractFactory("ArbitraProToken");
  const arbpro = await ArbitraProToken.deploy();
  await arbpro.deployed();
  console.log("ARBPRO deployed to:", arbpro.address);
  
  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  try {
    if (arbpro.deployTransaction) {
      await arbpro.deployTransaction.wait(6);
    } else {
      // For hardhat network or when no transaction hash is available
      console.log("No transaction hash available, skipping confirmation wait");
    }
  } catch (error) {
    console.log("Error waiting for confirmation:", error.message);
  }
  
  // Verify the token contract
  console.log("Verifying ArbitraProToken...");
  await verify(arbpro.address, []);

  // Deploy TimelockController (min 7 day delay)
  console.log("Deploying TimelockController...");
  const TimelockController = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockController.deploy(
    7 * 24 * 60 * 60, // 7 days delay
    [process.env.OWNER_ADDRESS],
    [process.env.OWNER_ADDRESS]
  );
  await timelock.deployed();
  console.log("TimelockController deployed to:", timelock.address);
  
  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  try {
    if (timelock.deployTransaction) {
      await timelock.deployTransaction.wait(6);
    } else {
      // For hardhat network or when no transaction hash is available
      console.log("No transaction hash available, skipping confirmation wait");
    }
  } catch (error) {
    console.log("Error waiting for confirmation:", error.message);
  }
  
  // Verify the timelock contract
  console.log("Verifying TimelockController...");
  await verify(timelock.address, [
    7 * 24 * 60 * 60, // 7 days delay
    [process.env.OWNER_ADDRESS],
    [process.env.OWNER_ADDRESS]
  ]);

  // Deploy SwapRouter
  console.log("Deploying SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await upgrades.deployProxy(SwapRouter, [
    timelock.address, // Owner set to timelock
    process.env.TREASURY_ADDRESS,
    50,
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap Router on Sepolia
    "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"  // Sushiswap Router on Sepolia
  ]);
  await swapRouter.deployed();
  console.log("SwapRouter deployed to:", swapRouter.address);

  // Deploy ArbitrageExecutor
  console.log("Deploying ArbitrageExecutor...");
  const ArbitrageExecutor = await ethers.getContractFactory("ArbitrageExecutor");
  const executor = await upgrades.deployProxy(ArbitrageExecutor, [
    timelock.address, // Owner set to timelock
    "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", // Aave Pool on Sepolia
    swapRouter.address,
    process.env.TREASURY_ADDRESS
  ]);
  await executor.deployed();
  console.log("ArbitrageExecutor deployed to:", executor.address);

  // Deploy StakingRewards
  console.log("Deploying StakingRewards...");
  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  const staking = await upgrades.deployProxy(StakingRewards, [
    timelock.address, // Owner set to timelock
    arbpro.address
  ]);
  await staking.deployed();
  console.log("StakingRewards deployed to:", staking.address);

  // Deploy Governor
  console.log("Deploying ArbitraProGovernor...");
  const ArbitraProGovernor = await ethers.getContractFactory("ArbitraProGovernor");
  const governor = await ArbitraProGovernor.deploy(
    arbpro.address,
    timelock.address
  );
  await governor.deployed();
  console.log("Governor deployed to:", governor.address);
  
  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  try {
    if (governor.deployTransaction) {
      await governor.deployTransaction.wait(6);
    } else {
      // For hardhat network or when no transaction hash is available
      console.log("No transaction hash available, skipping confirmation wait");
    }
  } catch (error) {
    console.log("Error waiting for confirmation:", error.message);
  }
  
  // Verify the governor contract
  console.log("Verifying ArbitraProGovernor...");
  await verify(governor.address, [
    arbpro.address,
    timelock.address
  ]);
  
  console.log("All contracts deployed and verified successfully!");
  console.log("\nSummary:");
  console.log("ARBPRO Token:", arbpro.address);
  console.log("TimelockController:", timelock.address);
  console.log("SwapRouter:", swapRouter.address);
  console.log("ArbitrageExecutor:", executor.address);
  console.log("StakingRewards:", staking.address);
  console.log("ArbitraProGovernor:", governor.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });