export type TourStep = {
  id: string;
  /** The data-tour value of the element to spotlight; without one the card stands alone. */
  target?: string;
  /** The short annotation on the viewfinder. */
  label: string;
  title: string;
  body: string;
  /** Where the final step sends the visitor, so the tour ends with something to do rather than a goodbye. */
  href?: string;
  /** The label on that link. */
  cta?: string;
};

/** A first look at the site, one stop at a time. Stops whose element isn't on screen are skipped. */
export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    label: "Welcome",
    title: "Welcome to TraceMint",
    body: "An agent finds copies of your art online, GenLayer validators judge each copy, and the site owner settles with a license. Here's a quick look around.",
  },
  {
    id: "loop",
    target: "hero-stage",
    label: "The loop",
    title: "Trace, judge, mint",
    body: "These are live cards from the contract: a registered work, the notice validators issued for a copy of it, and the license a site owner bought.",
  },
  {
    id: "works",
    target: "nav-works",
    label: "Works",
    title: "Register your art",
    body: "Works lists every registered piece and the pages it watches. Open one and press Scan now to look for copies.",
  },
  {
    id: "notices",
    target: "nav-notices",
    label: "Notices",
    title: "Read the verdicts",
    body: "Each notice is a copy validators judged: the verdict, how the image is used, and the fee to license it.",
  },
  {
    id: "dashboard",
    target: "nav-dashboard",
    label: "Dashboard",
    title: "Your side of it",
    body: "Creators see their earnings and withdraw them here. Site owners see the notices addressed to them and the licenses they hold.",
  },
  {
    id: "wallet",
    target: "wallet",
    label: "Wallet",
    title: "Connect to act",
    body: "Pay a notice, register a work, or dispute from your own wallet. TraceMint adds the GenLayer network for you. No wallet? The same menu hands out a demo code.",
  },
  {
    id: "guide",
    target: "guide",
    label: "Guide",
    title: "Come back anytime",
    body: "Replay this tour from here whenever you like. But the quickest way to understand TraceMint is to watch it catch one copy, start to finish — no wallet, nothing to fill in.",
    href: "/start",
    cta: "Show me one, start to finish",
  },
];
