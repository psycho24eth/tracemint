// Helper functions for transaction status checking
export function isDecidedState(status: string): boolean {
  return ["ACCEPTED", "FINALIZED", "UNDETERMINED"].includes(status);
}
