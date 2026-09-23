/**
 * What a GenLayer transaction goes through between "sent" and "decided", in the order someone
 * watching the page sees it. The explanations are for a visitor who has never met a validator.
 */
export const VALIDATOR_STAGES = [
  {
    name: "Sent",
    detail: "The transaction reached a GenLayer node and is queued for the next validator round.",
  },
  {
    name: "Leader proposes",
    detail: "One validator runs the contract — web reads and LLM prompts included — and proposes a result.",
  },
  {
    name: "Validators vote",
    detail: "The other validators repeat the work and vote on whether that result is reasonable.",
  },
  {
    name: "Decided",
    detail: "The votes settled, and the outcome is recorded on chain.",
  },
] as const;

export type Stage = 0 | 1 | 2 | 3;

// genlayer-js TransactionStatus, grouped into the four stages above. READY_TO_FINALIZE sits with the
// vote because the app keeps polling past it (lib/genlayer/tx-utils.ts), so calling it decided would lie.
const STAGE_BY_STATUS: Record<string, Stage> = {
  UNINITIALIZED: 0,
  SUBMITTED: 0,
  PENDING: 0,
  PROPOSING: 1,
  COMMITTING: 2,
  REVEALING: 2,
  LEADER_REVEALING: 2,
  APPEAL_COMMITTING: 2,
  APPEAL_REVEALING: 2,
  READY_TO_FINALIZE: 2,
  ACCEPTED: 3,
  FINALIZED: 3,
  UNDETERMINED: 3,
  LEADER_TIMEOUT: 3,
  VALIDATORS_TIMEOUT: 3,
  CANCELED: 3,
};

/** The stage a status name belongs to, or null when the network hasn't said anything usable yet. */
export function stageOf(status: string | undefined): Stage | null {
  return status === undefined ? null : (STAGE_BY_STATUS[status] ?? null);
}

export type Progress = { stage: Stage; round: number };

export const FIRST_ROUND: Progress = { stage: 0, round: 1 };

/**
 * Folds a status name into the progress so far. A status that steps backwards means the validators
 * rotated to a new leader and started the round over, which is normal and worth showing rather than
 * hiding behind a stuck bar. An unknown status — a lookup that failed, say — changes nothing.
 */
export function advance(progress: Progress, status: string | undefined): Progress {
  const stage = stageOf(status);
  if (stage === null) return progress;
  if (stage < progress.stage && progress.stage < 3) return { stage, round: progress.round + 1 };
  return stage > progress.stage ? { ...progress, stage } : progress;
}

/** The current stage for a status line, naming the round once the validators have restarted one. */
export function stageLabel({ stage, round }: Progress): string {
  const { name } = VALIDATOR_STAGES[stage];
  return round > 1 ? `${name} · round ${round}` : name;
}

/** The progress of the slowest of several transactions: a batch is only as far along as its laggard. */
export function slowest(all: Progress[]): Progress {
  if (all.length === 0) return FIRST_ROUND;
  return all.reduce((behind, one) => ({
    stage: Math.min(behind.stage, one.stage) as Stage,
    round: Math.max(behind.round, one.round),
  }));
}
