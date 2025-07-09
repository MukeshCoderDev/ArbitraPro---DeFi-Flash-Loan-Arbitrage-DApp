import { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';

interface Web3ContextType {
  provider?: ethers.BrowserProvider;
  signer?: ethers.JsonRpcSigner;
  address?: string;
  connectWallet: () => Promise<void>;
  switchNetwork: () => Promise<boolean>;
  isOwner: boolean;
  refreshOwnership: () => Promise<void>;
}

export const Web3Context = createContext<Web3ContextType>({} as Web3ContextType);

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider>();
  const [signer, setSigner] = useState<ethers.JsonRpcSigner>();
  const [address, setAddress] = useState<string>();
  const [isOwner, setIsOwner] = useState(false);

  const connectWallet = async () => {
    if (window.ethereum) {
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await newProvider.getSigner();
      const addresses = await newProvider.send("eth_requestAccounts", []);
      
      setProvider(newProvider);
      setSigner(newSigner);
      setAddress(addresses[0]);
    }
  };

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }] // Sepolia chain ID
      });
      return true;
    } catch (error) {
      console.error('Network switch failed:', error);
      return false;
    }
  };

  const refreshOwnership = async () => {
    if (!signer || !address) return;
    
    try {
      const executorContract = new ethers.Contract(
        import.meta.env.VITE_ARBITRAGE_EXECUTOR_ADDRESS,
        ['function owner() view returns (address)'],
        signer
      );
      const owner = await executorContract.owner();
      setIsOwner(address.toLowerCase() === owner.toLowerCase());
    } catch (error) {
      console.error("Ownership refresh error:", error);
    }
  };

  return (
    <Web3Context.Provider value={{ 
      provider, 
      signer, 
      address, 
      connectWallet, 
      switchNetwork,
      isOwner,
      refreshOwnership
    }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);