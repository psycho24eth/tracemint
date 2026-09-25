import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Storyboard } from "@/components/start/Storyboard";
import { BEATS, POINT } from "@/lib/start/story";

afterEach(() => cleanup());

/** Clicks through every beat, the way a visitor who reads each one would. */
async function readToEnd(user: ReturnType<typeof userEvent.setup>) {
  for (const beat of BEATS.slice(0, -1)) {
    await user.click(screen.getByRole("button", { name: beat.next! }));
  }
}

describe("the walkthrough", () => {
  it("opens on the first beat alone, so nobody meets seven headings at once", () => {
    render(<Storyboard />);

    expect(screen.getByRole("heading", { name: BEATS[0].title })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: BEATS[1].title })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: BEATS[0].next! })).toBeInTheDocument();
  });

  it("keeps earlier beats on screen as it goes, so the story can be read back", async () => {
    const user = userEvent.setup();
    render(<Storyboard />);

    await user.click(screen.getByRole("button", { name: BEATS[0].next! }));

    expect(screen.getByRole("heading", { name: BEATS[0].title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: BEATS[1].title })).toBeInTheDocument();
  });

  it("ends on the point of the whole thing, and only then asks for anything", async () => {
    const user = userEvent.setup();
    render(<Storyboard />);

    expect(screen.queryByRole("link", { name: /my own picture/ })).not.toBeInTheDocument();
    await readToEnd(user);

    expect(screen.getByRole("heading", { name: POINT.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Do this with my own picture" })).toHaveAttribute(
      "href",
      "/works#register",
    );
  });

  it("says plainly that adding your own costs a fee, rather than springing it later", async () => {
    const user = userEvent.setup();
    render(<Storyboard />);
    await readToEnd(user);

    expect(screen.getByText(/needs a wallet and costs a small fee/)).toBeInTheDocument();
  });

  it("lets a judge or a second-time visitor jump to the end", async () => {
    const user = userEvent.setup();
    render(<Storyboard />);

    await user.click(screen.getByRole("button", { name: /Show me the rest at once/ }));

    expect(screen.getByRole("heading", { name: BEATS.at(-1)!.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: POINT.title })).toBeInTheDocument();
  });

  it("cites each record once, not once per beat that rests on it", async () => {
    const user = userEvent.setup();
    render(<Storyboard />);
    await user.click(screen.getByRole("button", { name: /Show me the rest at once/ }));

    // Three beats rest on the same claim, and repeating the citation under each read as filler.
    const records = new Set(BEATS.map((beat) => beat.claimId).filter((id) => id !== undefined));
    const links = screen.getAllByRole("link", { name: "read the full record" });
    expect(links).toHaveLength(records.size);
    expect(new Set(links.map((link) => link.getAttribute("href")))).toEqual(
      new Set([...records].map((id) => `/notices/${id}`)),
    );
  });

  it("shows the two pictures side by side when the beat is about comparing them", async () => {
    const user = userEvent.setup();
    render(<Storyboard />);
    await user.click(screen.getByRole("button", { name: BEATS[0].next! }));

    const theft = BEATS.find((beat) => beat.id === "theft")!;
    for (const image of theft.art!) {
      expect(screen.getByAltText(image.alt)).toBeInTheDocument();
    }
  });
});
