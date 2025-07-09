const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Get the network
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  
  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("Account address:", deployer.address);
  
  // Get and format the balance
  const balanceWei = await ethers.provider.getBalance(deployer.address);
  const balanceEth = ethers.formatEther(balanceWei);
  
  console.log(`Account balance: ${balanceWei.toString()} wei`);
  console.log(`Account balance: ${balanceEth} ETH`);
  
  // Check if there's enough ETH for deployment
  if (parseFloat(balanceEth) < 0.1) {
    console.log("\nWARNING: Your account balance is low. You might not have enough ETH to deploy all contracts.");
    console.log("Consider getting more Sepolia ETH from a faucet like https://sepoliafaucet.com/");
  } else {
    console.log("\nYour account has sufficient balance for deployment.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });