import { ethers } from 'ethers';

export const estimateAndSend = async (
  signer: ethers.JsonRpcSigner,
  txFunc: () => Promise<ethers.ContractTransaction>
) => {
  const unsignedTx = await txFunc();
  const estimatedGas = await signer.estimateGas(unsignedTx);
  const bufferGas = (estimatedGas * 120n) / 100n; // 20% buffer
  return signer.sendTransaction({
    ...unsignedTx,
    gasLimit: bufferGas
  });
};