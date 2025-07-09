import { CONTRACTS } from '../constants/contracts';

export const getSwapPath = (fromToken: string, toToken: string) => {
  const tokenAddresses: Record<string, string> = {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    ARBPRO: CONTRACTS.ArbitraProToken.address,
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' // Sepolia WBTC
  };

  return [
    tokenAddresses[fromToken] || fromToken,
    tokenAddresses[toToken] || toToken
  ];
};