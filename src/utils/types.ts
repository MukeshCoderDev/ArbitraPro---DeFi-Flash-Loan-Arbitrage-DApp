export interface DAppError extends Error {
  reason?: string;
  code?: string;
  data?: {
    message?: string;
  };
}