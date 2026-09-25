"use client";

import { useEffect, useRef } from "react";

/** Inputs that mean the visitor is scrolling for themselves, so nothing should move the page under them. */
const TAKEOVER = ["wheel", "touchmove", "keydown"] as const;

/**
 * Scrolls to the URL's #hash once `ready` says the content above that anchor has arrived.
 *
 * A browser jumps to a hash as soon as it has parsed the document. On a page whose list is fetched from
 * the chain in the browser, that is before the list exists, so the anchor slides down the page afterwards
 * and the visitor is left sitting at the top -- which is what `/works#register` did to everybody arriving
 * from the walkthrough or from an empty dashboard. Scrolling again once the data has landed puts them
 * where the link promised.
 *
 * It fires at most once, and not at all if the visitor has already started scrolling: being yanked away
 * mid-read would be worse than the link not working.
 */
export function useHashScroll(ready: boolean) {
  const settled = useRef(false);

  useEffect(() => {
    const takeOver = () => {
      settled.current = true;
    };
    for (const event of TAKEOVER) window.addEventListener(event, takeOver, { passive: true });
    return () => {
      for (const event of TAKEOVER) window.removeEventListener(event, takeOver);
    };
  }, []);

  useEffect(() => {
    if (!ready || settled.current) return;

    const id = window.location.hash.slice(1);
    if (!id) return;

    const target = document.getElementById(decodeURIComponent(id));
    if (!target) return;

    settled.current = true;
    // scroll-margin-top on the target keeps the heading clear of the fixed nav.
    target.scrollIntoView();
  }, [ready]);
}
