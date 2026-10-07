// Time allocations for writes. Kept apart from genlayer.ts, which reads files with node:fs, so the browser can
// price a wallet's payout with the same preset the server signer uses.

export const LIGHT_FEES = { leaderTimeunitsAllocation: 100, validatorTimeunitsAllocation: 200, rotations: [1] };
// validatorTimeunitsAllocation capped at 600 by the chain (PhaseTimeoutOutOfBounds(1200,30,600) observed at 1200); see docs/platform-checks.md.
// Judgments compare model verdicts, and a leader whose model reads the page differently (or cannot see images)
// is outvoted. Funding the chain's maximum of three rotations lets other leaders try before the claim is dropped.
export const HEAVY_FEES = { leaderTimeunitsAllocation: 600, validatorTimeunitsAllocation: 600, rotations: [3] };
export type FeePreset = typeof LIGHT_FEES;
