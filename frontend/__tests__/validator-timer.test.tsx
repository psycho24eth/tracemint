import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ValidatorTimer } from "@/components/ValidatorTimer";
import { advance, FIRST_ROUND, slowest, stageLabel, stageOf } from "@/lib/validator-stages";

describe("validator stages", () => {
  it("places each GenLayer status on the step a visitor can see", () => {
    expect(stageOf("PENDING")).toBe(0);
    expect(stageOf("PROPOSING")).toBe(1);
    expect(stageOf("REVEALING")).toBe(2);
    expect(stageOf("APPEAL_COMMITTING")).toBe(2);
    expect(stageOf("ACCEPTED")).toBe(3);
    expect(stageOf("UNDETERMINED")).toBe(3);
  });

  // The status route answers UNKNOWN for a transaction it cannot read yet.
  it("has no step for a status it doesn't recognise", () => {
    expect(stageOf("UNKNOWN")).toBeNull();
    expect(stageOf(undefined)).toBeNull();
  });

  it("moves forward and stays there", () => {
    const voting = advance(advance(FIRST_ROUND, "PROPOSING"), "COMMITTING");

    expect(voting).toEqual({ stage: 2, round: 1 });
    expect(advance(voting, "PROPOSING")).toEqual({ stage: 1, round: 2 });
    expect(advance(voting, "UNKNOWN")).toBe(voting);
  });

  it("counts a round each time the validators rotate leaders", () => {
    const second = advance(advance(FIRST_ROUND, "COMMITTING"), "PROPOSING");
    const third = advance(advance(second, "REVEALING"), "PROPOSING");

    expect(stageLabel(second)).toBe("Leader proposes · round 2");
    expect(stageLabel(third)).toBe("Leader proposes · round 3");
    expect(stageLabel(FIRST_ROUND)).toBe("Sent");
  });

  it("does not reopen a decided transaction", () => {
    const decided = advance(FIRST_ROUND, "ACCEPTED");

    expect(advance(decided, "PROPOSING")).toEqual({ stage: 3, round: 1 });
  });

  it("reports a batch as far along as its slowest transaction", () => {
    expect(slowest([{ stage: 3, round: 1 }, { stage: 1, round: 2 }])).toEqual({ stage: 1, round: 2 });
    expect(slowest([])).toEqual(FIRST_ROUND);
  });
});

describe("ValidatorTimer", () => {
  const START = 1_700_000_000_000;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(START);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const tick = (seconds: number) => act(() => void vi.advanceTimersByTime(seconds * 1_000));

  it("counts the wait up in minutes and seconds", () => {
    render(<ValidatorTimer startedAt={START} progress={FIRST_ROUND} />);

    expect(screen.getByRole("timer")).toHaveTextContent("0:00");

    tick(75);

    expect(screen.getByRole("timer")).toHaveTextContent("1:15");
  });

  it("names the step the validators are on", () => {
    render(<ValidatorTimer startedAt={START} progress={{ stage: 2, round: 2 }} />);

    expect(screen.getByRole("status")).toHaveTextContent("Validators vote · round 2");
  });

  it("says when the wait has run past the usual window", () => {
    render(<ValidatorTimer startedAt={START} progress={{ stage: 2, round: 1 }} />);

    expect(screen.queryByText(/Longer than usual/)).not.toBeInTheDocument();

    tick(121);

    expect(screen.getByText(/Longer than usual/)).toBeInTheDocument();
  });

  it("freezes on the time the decision took", () => {
    render(
      <ValidatorTimer
        startedAt={START}
        progress={{ stage: 3, round: 1 }}
        settled={{ at: START + 83_000, verdict: "accepted" }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Decided in 1:23");

    tick(60);

    expect(screen.getByRole("timer")).toHaveTextContent("1:23");
  });

  it("does not claim a decision when the validators never reached one", () => {
    render(
      <ValidatorTimer
        startedAt={START}
        progress={{ stage: 2, round: 3 }}
        settled={{ at: START + 300_000, verdict: "unknown" }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Still undecided after 5:00");
  });

  it("explains a step when it is tapped", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ValidatorTimer startedAt={START} progress={FIRST_ROUND} />);

    expect(screen.getByText(/queued for the next validator round/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Validators vote/ }));

    expect(screen.getByText(/repeat the work and vote/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Validators vote/ }));

    expect(screen.getByText(/queued for the next validator round/)).toBeInTheDocument();
  });

  it("leaves the steps to the transaction panel in its compact form", () => {
    render(<ValidatorTimer startedAt={START} progress={{ stage: 1, round: 1 }} compact />);

    expect(screen.getByRole("status")).toHaveTextContent("Leader proposes");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
