 const { network } = require("hardhat");
 

 // Helper function to fork mainnet at specific block
 const forkNetwork = async (networkName, blockNumber) => {
  await network.provider.request({
  method: "hardhat_reset",
  params: [{
  forking: {
  jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
  blockNumber: blockNumber
  }
  }]
  });
 };
 

 // Helper to increase EVM time
 const increaseTime = async (seconds) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
 };
 

 // Helper to get current block timestamp
 const currentTime = async () => {
  const block = await network.provider.send("eth_getBlockByNumber", ["latest", true]);
  return parseInt(block.timestamp, 16);
 };
 

 module.exports = {
  forkNetwork,
  increaseTime,
  currentTime
 };
 