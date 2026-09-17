// genlayer-js 2.0.0-rc.1 does not export isDecidedState from its entry point; this mirrors its DECIDED_STATES.
const DECIDED_STATES = ["ACCEPTED", "UNDETERMINED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT", "CANCELED", "FINALIZED"];

export function isDecidedState(status: string): boolean {
  return DECIDED_STATES.includes(status);
}
