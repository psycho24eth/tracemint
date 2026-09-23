import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import ScanNowButton from "@/components/ScanNowButton";
import { UNDECIDED_MESSAGE } from "@/lib/tx";

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock("@/lib/hooks/useLicenseHunter", () => ({
  useRefreshLicenseHunter: () => refreshMock,
}));

const mockFetch = vi.fn();

describe("ScanNowButton", () => {
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
    refreshMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("posts workId and runId when useRunId is true", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: 10,
        filed: [
          {
            hash: "0xabc123",
            pageUrl: "https://example.com",
            imageUrl: "https://example.com/image.png",
            distance: 0.95,
          },
        ],
        skipped: 0,
        errors: [],
      }),
    });

    render(<ScanNowButton workId={1} useRunId={true} />);
    const user = userEvent.setup();

    const button = screen.getByText("Scan now");
    await user.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"workId":1'),
      });
    });
    const { runId } = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(runId).toMatch(/^[a-z0-9-]{1,32}$/i);

    await waitFor(() => {
      expect(screen.getByText(/Checked 10 candidate image/)).toBeInTheDocument();
    });
  });

  it("follows each filed claim until validators decide", async () => {
    const decisions: Record<string, object> = {
      "/api/tx/0xshop": { hash: "0xshop", status: "UNDETERMINED", result: "FINISHED_WITH_RETURN", decided: true, successful: false },
      "/api/tx/0xblog": { hash: "0xblog", status: "ACCEPTED", result: "FINISHED_WITH_RETURN", decided: true, successful: true },
    };
    mockFetch.mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        url === "/api/scan"
          ? {
              candidates: 2,
              filed: [
                { hash: "0xshop", pageUrl: "https://example.com/shop", imageUrl: "https://example.com/a.png", distance: 9 },
                { hash: "0xblog", pageUrl: "https://example.com/blog", imageUrl: "https://example.com/b.png", distance: 0 },
              ],
              skipped: 0,
              errors: [],
            }
          : decisions[url],
    }));

    render(<ScanNowButton workId={1} useRunId={true} />);
    await userEvent.setup().click(screen.getByText("Scan now"));

    expect(await screen.findByText(UNDECIDED_MESSAGE)).toBeInTheDocument();
    expect(await screen.findByText("Decided. See the result under Claims below.")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("/api/tx/0xshop", { cache: "no-store" });
    expect(mockFetch).toHaveBeenCalledWith("/api/tx/0xblog", { cache: "no-store" });
    expect(refreshMock).toHaveBeenCalledTimes(2);
  });

  it("times the batch and freezes once the last claim lands", async () => {
    mockFetch.mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        url === "/api/scan"
          ? {
              candidates: 1,
              filed: [{ hash: "0xblog", pageUrl: "https://example.com/blog", imageUrl: "https://example.com/b.png", distance: 0 }],
              skipped: 0,
              errors: [],
            }
          : { hash: "0xblog", status: "ACCEPTED", result: "FINISHED_WITH_RETURN", decided: true, successful: true },
    }));

    render(<ScanNowButton workId={1} useRunId={true} />);
    await userEvent.setup().click(screen.getByText("Scan now"));

    expect(await screen.findByText(/Decided in \d:\d\d/)).toBeInTheDocument();
    expect(screen.getByRole("timer")).toBeInTheDocument();
  });

  describe("while a claim has no decision", () => {
    const scanResponse = {
      ok: true,
      json: async () => ({
        candidates: 1,
        filed: [{ hash: "0xshop", pageUrl: "https://example.com/shop", imageUrl: "https://example.com/a.png", distance: 9 }],
        skipped: 0,
        errors: [],
      }),
    };

    it("says validators are judging it", async () => {
      mockFetch.mockImplementation((url: string) =>
        url === "/api/scan" ? Promise.resolve(scanResponse) : new Promise(() => {}),
      );

      render(<ScanNowButton workId={1} useRunId={true} />);
      await userEvent.setup().click(screen.getByText("Scan now"));

      expect(await screen.findByText("Validators are judging this claim…")).toBeInTheDocument();
    });

    it("names the step it is on once the network reports one", async () => {
      mockFetch.mockImplementation(async (url: string) => ({
        ok: true,
        json: async () =>
          url === "/api/scan"
            ? (await scanResponse.json())
            : { hash: "0xshop", status: "COMMITTING", result: null, decided: false, successful: null },
      }));

      render(<ScanNowButton workId={1} useRunId={true} />);
      await userEvent.setup().click(screen.getByText("Scan now"));

      expect(await screen.findByText("Validators vote…")).toBeInTheDocument();
      expect(screen.getByRole("timer")).toHaveTextContent("0:00");
    });

    it("points to the explorer when the status lookup fails", async () => {
      mockFetch.mockImplementation((url: string) =>
        url === "/api/scan" ? Promise.resolve(scanResponse) : Promise.reject(new Error("offline")),
      );

      render(<ScanNowButton workId={1} useRunId={true} />);
      await userEvent.setup().click(screen.getByText("Scan now"));

      expect(await screen.findByText(/Still waiting for validators/)).toBeInTheDocument();
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
  });

  it("posts without runId when useRunId is false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: 0,
        filed: [],
        skipped: 0,
        errors: [],
      }),
    });

    render(<ScanNowButton workId={1} useRunId={false} />);
    const user = userEvent.setup();

    const button = screen.getByText("Scan now");
    await user.click(button);

    await waitFor(() => {
      const callBody = mockFetch.mock.calls[0][1].body;
      expect(callBody).not.toContain("runId");
    });
  });

  it("shows 429 error message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: "A scan just ran. Try again in a minute." }),
    });

    render(<ScanNowButton workId={1} useRunId={true} />);
    const user = userEvent.setup();

    const button = screen.getByText("Scan now");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("A scan just ran. Try again in a minute.");
    });
  });

  it("disables button while request is in flight", async () => {
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ candidates: 0, filed: [], skipped: 0, errors: [] }),
              }),
            100,
          );
        }),
    );

    render(<ScanNowButton workId={1} useRunId={true} />);
    const user = userEvent.setup();

    const button = screen.getByText("Scan now");
    await user.click(button);

    expect(screen.getByText("Scanning…")).toBeDisabled();

    await waitFor(() => {
      expect(screen.queryByText("Scanning…")).not.toBeInTheDocument();
    });
  });
});
