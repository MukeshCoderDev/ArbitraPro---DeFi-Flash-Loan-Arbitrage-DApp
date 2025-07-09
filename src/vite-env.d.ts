/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SEPOLIA_RPC_URL: string
  readonly VITE_ARBITRAPRO_TOKEN_ADDRESS: string
  readonly VITE_SWAP_ROUTER_ADDRESS: string
  readonly VITE_ARBITRAGE_EXECUTOR_ADDRESS: string
  readonly VITE_STAKING_REWARDS_ADDRESS: string
  readonly VITE_GOVERNOR_ADDRESS: string
  readonly VITE_TIMELOCK_CONTROLLER_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  ethereum?: import('@metamask/providers').MetaMaskInpageProvider
}