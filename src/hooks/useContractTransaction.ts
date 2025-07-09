import { useState } from 'react';
import { toast } from 'react-toastify';
import { DAppError } from '../utils/types';

export const useContractTransaction = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const executeTx = async (
    txFunction: () => Promise<any>,
    {
      pending,
      success,
      error
    }: { pending: string; success: string; error: string }
  ) => {
    setIsLoading(true);
    setStatusMessage(pending);
    const toastId = toast.loading(pending);

    try {
      const result = await txFunction();
      toast.update(toastId, {
        render: success,
        type: 'success',
        isLoading: false,
        autoClose: 5000
      });
      return result;
    } catch (err) {
      const error = err as DAppError;
      const message = error.reason || error.message || 'Transaction failed';
      toast.update(toastId, {
        render: `${error}: ${message}`,
        type: 'error',
        isLoading: false,
        autoClose: 5000
      });
      throw error;
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  return { executeTx, isLoading, statusMessage };
};