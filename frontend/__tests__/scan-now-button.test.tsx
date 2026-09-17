import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import ScanNowButton from "@/components/ScanNowButton";

vi.mock("@/lib/hooks/useLicenseHunter", () => ({
  useRefreshLicenseHunter: () => vi.fn(),
}));

const mockFetch = vi.fn();

describe("ScanNowButton", () => {
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockClear();
  });

  afterEach(() => {
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
