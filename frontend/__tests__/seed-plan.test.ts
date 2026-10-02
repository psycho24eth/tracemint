import { describe, expect, it } from "vitest";

import { imagePath, registeredByPath } from "../../deploy/seedPlan";

const CREATOR = "0x10516B67e54C3c252493b55d10Db1c779684C543";
const OTHER = "0xa417D08dA1B8C07c2CBBa5947b8d10874b45a3F6";

describe("imagePath", () => {
  it("keeps the path and drops the domain and query", () => {
    expect(imagePath("https://tracemint.vercel.app/demo/paper-crane.png")).toBe("/demo/paper-crane.png");
    expect(imagePath("https://images.unsplash.com/photo-1?w=1600&q=80")).toBe("/photo-1");
  });

  it("returns null for something that is not a URL", () => {
    expect(imagePath("not a url")).toBeNull();
  });
});

describe("registeredByPath", () => {
  it("treats the same image under either of the site's domains as one work", () => {
    const registered = registeredByPath(
      [
        { id: 2, creator: CREATOR, image_url: "https://licensehunter.vercel.app/demo/koi-current.png" },
        { id: 8, creator: CREATOR, image_url: "https://tracemint.vercel.app/demo/paper-crane.png" },
      ],
      CREATOR,
    );

    expect(registered.get("/demo/koi-current.png")).toBe(2);
    expect(registered.get("/demo/paper-crane.png")).toBe(8);
  });

  it("ignores works another wallet registered", () => {
    const registered = registeredByPath(
      [{ id: 9, creator: OTHER, image_url: "https://tracemint.vercel.app/demo/paper-crane.png" }],
      CREATOR,
    );

    expect(registered.has("/demo/paper-crane.png")).toBe(false);
  });

  it("compares the creator address without regard to case", () => {
    const registered = registeredByPath(
      [{ id: 3, creator: CREATOR.toLowerCase(), image_url: "https://licensehunter.vercel.app/demo/chrome-bloom.png" }],
      CREATOR,
    );

    expect(registered.get("/demo/chrome-bloom.png")).toBe(3);
  });

  it("keeps the earliest work when a path was registered twice", () => {
    const registered = registeredByPath(
      [
        { id: 2, creator: CREATOR, image_url: "https://licensehunter.vercel.app/demo/koi-current.png" },
        { id: 11, creator: CREATOR, image_url: "https://tracemint.vercel.app/demo/koi-current.png" },
      ],
      CREATOR,
    );

    expect(registered.get("/demo/koi-current.png")).toBe(2);
  });

  it("skips an image URL that does not parse", () => {
    const registered = registeredByPath([{ id: 4, creator: CREATOR, image_url: "" }], CREATOR);

    expect(registered.size).toBe(0);
  });
});
