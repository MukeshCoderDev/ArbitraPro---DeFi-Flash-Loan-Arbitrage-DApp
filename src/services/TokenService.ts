import { ethers } from 'ethers';
import { CONTRACTS } from '../constants/contracts';

const TOKEN_DECIMALS: Record<string, number> = {
  ETH: 18,
  ARBPRO: 18,
  USDC: 6,
  WBTC: 8,
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE': 18,
  [CONTRACTS.ArbitraProToken.address]: 18,
};

export const getTokenDecimals = async (
  tokenAddress: string,
  provider: ethers.Provider
): Promise<number> => {
  if (TOKEN_DECIMALS[tokenAddress]) {
    return TOKEN_DECIMALS[tokenAddress];
  }

  if (tokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
    return 18;
  }

  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function decimals() view returns (uint8)'],
      provider
    );
    const decimals = await tokenContract.decimals();
    TOKEN_DECIMALS[tokenAddress] = decimals;
    return decimals;
  } catch (error) {
    console.error(`Failed to get decimals for ${tokenAddress}:`, error);
    return 18;
  }
};

export const parseTokenUnits = async (
  amount: string,
  tokenAddress: string,
  provider: ethers.Provider
): Promise<bigint> => {
  const decimals = await getTokenDecimals(tokenAddress, provider);
  return ethers.parseUnits(amount, decimals);
};

export const formatTokenUnits = async (
  amount: bigint,
  tokenAddress: string,
  provider: ethers.Provider
): Promise<string> => {
  const decimals = await getTokenDecimals(tokenAddress, provider);
  return ethers.formatUnits(amount, decimals);
};