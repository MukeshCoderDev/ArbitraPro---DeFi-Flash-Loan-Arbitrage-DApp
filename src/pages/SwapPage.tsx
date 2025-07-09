import { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';
import { CONTRACTS } from '../constants/contracts';
import { toast } from 'react-toastify';
import { getTokenDecimals, parseTokenUnits } from '../services/TokenService';
import { getSwapPath } from '../utils/swapUtils';
import { useContractTransaction } from '../hooks/useContractTransaction';
import { estimateAndSend } from '../utils/transactionUtils';

const SwapPage = () => {
  const { signer, address } = useWeb3();
  const { executeTx } = useContractTransaction();
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('ARBPRO');
  const [amountIn, setAmountIn] = useState('');
  const [balance, setBalance] = useState('0');
  const [slippage, setSlippage] = useState(50); // 0.5%

  // Fetch balance with dynamic decimals
  useEffect(() => {
    const fetchBalance = async () => {
      if (!signer || !address) return;
      
      try {
        const tokenContract = new ethers.Contract(
          CONTRACTS.ArbitraProToken.address,
          ['function balanceOf(address) view returns (uint256)'],
          signer
        );
        
        const balance = await tokenContract.balanceOf(address);
        const decimals = await getTokenDecimals(CONTRACTS.ArbitraProToken.address, signer.provider!);
        setBalance(ethers.formatUnits(balance, decimals));
      } catch (error) {
        console.error("Balance fetch error:", error);
        toast.error("Failed to fetch balance");
      }
    };

    fetchBalance();
  }, [signer, address]);

  const handleSwap = async () => {
    if (!signer || !address) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    await executeTx(
      async () => {
        const routerContract = new ethers.Contract(
          CONTRACTS.SwapRouter.address,
          CONTRACTS.SwapRouter.abi,
          signer
        );

        const path = getSwapPath(fromToken, toToken);
        const isETH = fromToken === 'ETH';
        const amountInWei = isETH 
          ? ethers.parseEther(amountIn)
          : await parseTokenUnits(amountIn, path[0], signer.provider!);

        // Handle ERC20 approval if needed
        if (!isETH) {
          const tokenContract = new ethers.Contract(
            path[0],
            ['function allowance(address, address) view returns (uint256)', 'function approve(address, uint256) returns (bool)'],
            signer
          );
          
          const allowance = await tokenContract.allowance(
            address, 
            CONTRACTS.SwapRouter.address
          );
          
          if (allowance < amountInWei) {
            await estimateAndSend(signer, () => 
              tokenContract.approve(CONTRACTS.SwapRouter.address, amountInWei)
            );
          }
        }

        // Get minimum amount out
        const amounts = await routerContract.getAmountsOut(amountInWei, path);
        const minAmountOut = (amounts[1] * (10000n - BigInt(slippage))) / 10000n;

        // Execute swap
        const swapArgs = isETH
          ? [minAmountOut, path, address, Date.now() + 300_000]
          : [amountInWei, minAmountOut, path, address, Date.now() + 300_000];

        return estimateAndSend(signer, () => 
          routerContract[
            isETH ? 'swapExactETHForTokens' : 'swapExactTokensForTokens'
          ](...swapArgs, { value: isETH ? amountInWei : 0 })
        );
      },
      {
        pending: `Processing ${fromToken}→${toToken} swap...`,
        success: "Swap executed successfully!",
        error: "Swap failed"
      }
    );
  };

  return (
    <div className="swap-container">
      <h2>Token Swap</h2>
      <div className="input-group">
        <label>From:</label>
        <select value={fromToken} onChange={(e) => setFromToken(e.target.value)}>
          <option value="ETH">ETH</option>
          <option value="ARBPRO">ARBPRO</option>
          <option value="USDC">USDC</option>
          <option value="WBTC">WBTC</option>
        </select>
        <input
          type="number"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
          placeholder="Amount"
        />
      </div>
      
      <div className="input-group">
        <label>To:</label>
        <select value={toToken} onChange={(e) => setToToken(e.target.value)}>
          <option value="ARBPRO">ARBPRO</option>
          <option value="ETH">ETH</option>
          <option value="USDC">USDC</option>
          <option value="WBTC">WBTC</option>
        </select>
      </div>
      
      <div className="input-group">
        <label>Slippage (%):</label>
        <input
          type="number"
          value={slippage / 100}
          onChange={(e) => setSlippage(Number(e.target.value) * 100)}
          step="0.1"
          min="0.1"
          max="5"
        />
      </div>
      
      <button onClick={handleSwap} disabled={!amountIn || !signer}>
        Swap
      </button>
      
      <p>Your ARBPRO Balance: {balance}</p>
    </div>
  );
};

export default SwapPage;