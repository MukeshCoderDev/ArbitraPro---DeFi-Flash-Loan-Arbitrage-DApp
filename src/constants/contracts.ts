export const CONTRACTS = {
  ArbitraProToken: {
    address: import.meta.env.VITE_ARBITRAPRO_TOKEN_ADDRESS,
    abi: [
      "function balanceOf(address) view returns (uint256)",
      "function allowance(address, address) view returns (uint256)",
      "function approve(address, uint256) returns (bool)",
      "function decimals() view returns (uint8)"
    ]
  },
  SwapRouter: {
    address: import.meta.env.VITE_SWAP_ROUTER_ADDRESS,
    abi: [
      "function getAmountsOut(uint256, address[]) view returns (uint256[])",
      "function swapExactTokensForTokens(uint256,uint256,address[],address,uint256) returns (uint256[])",
      "function swapExactETHForTokens(uint256,address[],address,uint256) payable returns (uint256[])"
    ]
  },
  ArbitrageExecutor: {
    address: import.meta.env.VITE_ARBITRAGE_EXECUTOR_ADDRESS,
    abi: [
      "function executeArbitrage(address,address,uint256,bytes) returns (uint256)",
      "function owner() view returns (address)"
    ]
  },
  StakingRewards: {
    address: import.meta.env.VITE_STAKING_REWARDS_ADDRESS,
    abi: [
      "function stake(uint256 amount)",
      "function unstake(uint256 amount)",
      "function earned(address account) view returns (uint256)"
    ]
  }
};