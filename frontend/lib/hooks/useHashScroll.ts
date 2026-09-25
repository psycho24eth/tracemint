"use client";

import { useEffect } from "react";

/** Inputs that mean the visitor is scrolling for themselves, so nothing should move the page under them. */
const TAKEOVER = ["wheel", "touchmove", "keydown", "pointerdown"] as const;

/** How long to keep an anchor in view while a page is still settling. */
const SETTLE_MS = 8_000;

/**
 * Keeps the URL's #hash in view while the page around it is still arriving.
 *
 * A browser jumps to a hash as soon as it has parsed the document. On a page whose list is fetched from
 * the chain in the browser, that is before the list exists, so the anchor slides down the page afterwards
 * and the visitor is left sitting at the top -- which is what `/works#register` did to everybody arriving
 * from the walkthrough or from an empty dashboard.
 *
 * Waiting for a "loaded" flag from the caller is not enough: react-query reports a disabled query as not
 * loading, so the flag can read as done on the very first render, before there is anything to fetch. This
 * watches the page size instead, which is the thing that actually breaks the jump, and re-aligns until it
 * stops changing. It gives up as soon as the visitor scrolls for themselves -- being yanked mid-read is
 * worse than a link that misses -- and in any case after a few seconds.
 */
export function useHashScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    let owned = true;
    const release = () => {
      owned = false;
    };

    const align = () => {
      if (!owned) return;
      // scroll-margin-top on the target keeps it clear of the fixed nav. The jump is instant on
      // purpose: the page sets scroll-behavior: smooth, and gliding hundreds of pixels every time the
      // list grows would both look broken and race the layout it is trying to correct for.
      document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
    };

    for (const event of TAKEOVER) window.addEventListener(event, release, { passive: true });
    const deadline = window.setTimeout(release, SETTLE_MS);
    align();

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(align);
    observer?.observe(document.body);

    return () => {
      for (const event of TAKEOVER) window.removeEventListener(event, release);
      window.clearTimeout(deadline);
      observer?.disconnect();
    };
  }, []);
}
