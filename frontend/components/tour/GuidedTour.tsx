"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/genlayer/wallet";
import { cn } from "@/lib/utils";

import { TOUR_STEPS, type TourStep } from "./steps";

const SEEN_KEY = "tracemint.tour";
const HOME = "/";
const AUTO_START_MS = 1600;

type Tour = { active: boolean; start: () => void };

const TourContext = createContext<Tour>({ active: false, start: () => {} });

export const useTour = () => useContext(TourContext);

function hasSeenTour(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    // Without storage the tour can't remember a dismissal, so it never starts on its own.
    return true;
  }
}

function rememberTour() {
  try {
    window.localStorage.setItem(SEEN_KEY, "seen");
  } catch {
    // Nothing to remember it in; the Guide button still replays it.
  }
}

/** The on-screen element for a step: desktop and mobile navigation both carry the same data-tour name. */
function findTarget(target: string): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)) {
    const box = element.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) return element;
  }
  return null;
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A step-by-step guide to the site. It starts once on a first visit to the home page, can be skipped at any
 * step, and replays from the Guide button. It never blocks the page: clicking through ends it.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { modal } = useWallet();
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const startedOn = useRef<string | null>(null);
  const startOnArrival = useRef(false);
  const walletOpen = useRef(modal.open);
  useEffect(() => {
    walletOpen.current = modal.open;
  }, [modal.open]);

  const begin = useCallback((page: string) => {
    if (walletOpen.current) return;
    const onScreen = TOUR_STEPS.filter((step) => !step.target || findTarget(step.target));
    startedOn.current = page;
    setIndex(0);
    setSteps(onScreen);
  }, []);

  const finish = useCallback(() => {
    rememberTour();
    setSteps(null);
  }, []);

  const start = useCallback(() => {
    if (pathname === HOME) {
      begin(HOME);
      return;
    }
    startOnArrival.current = true;
    router.push(HOME);
  }, [begin, pathname, router]);

  useEffect(() => {
    if (pathname !== HOME) return;
    if (startOnArrival.current) {
      startOnArrival.current = false;
      const timer = setTimeout(() => begin(HOME), 600);
      return () => clearTimeout(timer);
    }
    if (hasSeenTour()) return;
    // Give the hero a moment to arrive before the first-visit tour offers itself.
    const timer = setTimeout(() => !hasSeenTour() && begin(HOME), AUTO_START_MS);
    return () => clearTimeout(timer);
  }, [pathname, begin]);

  // The visitor took over, by leaving the page or opening the wallet menu: step aside.
  useEffect(() => {
    if (steps && startedOn.current !== null && pathname !== startedOn.current) finish();
  }, [pathname, steps, finish]);
  useEffect(() => {
    if (steps && modal.open) finish();
  }, [modal.open, steps, finish]);

  const value = useMemo(() => ({ active: steps !== null, start }), [steps, start]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {steps && steps.length > 0 && <TourOverlay steps={steps} index={index} onIndex={setIndex} onFinish={finish} />}
    </TourContext.Provider>
  );
}

type Box = { top: number; left: number; width: number; height: number };

/** Follows the element's box every frame, so scrolling and layout shifts carry the spotlight along. */
function useTargetBox(target: string | undefined): Box | null {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    const element = target ? findTarget(target) : null;
    if (!element) {
      setBox(null);
      return;
    }
    const initial = element.getBoundingClientRect();
    const offScreen = initial.top < 72 || initial.bottom > document.documentElement.clientHeight - 16;
    // Items in the sticky header are always in view; scrolling for them would only jump the page.
    if (offScreen && !element.closest("header")) {
      element.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }

    let frame = 0;
    const track = () => {
      const { top, left, width, height } = element.getBoundingClientRect();
      setBox((current) =>
        current && current.top === top && current.left === left && current.width === width && current.height === height
          ? current
          : { top, left, width, height },
      );
      frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return box;
}

const readViewport = () => ({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight });

function useViewport() {
  const [viewport, setViewport] = useState(readViewport);
  useEffect(() => {
    const onResize = () => setViewport(readViewport());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return viewport;
}

const PAD = 8;
const GAP = 16;
const EDGE = 16;
const TAG_ROOM = 30;

/** Where the viewfinder and the card go: the card beside the target where it fits, never off screen. */
function layout(target: Box | null, cardHeight: number, viewport: { width: number; height: number }) {
  const narrow = viewport.width < 640;
  const width = Math.min(narrow ? viewport.width - EDGE * 2 : 368, viewport.width - EDGE * 2);
  const height = cardHeight || 230;
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

  if (!target) {
    const left = (viewport.width - width) / 2;
    const top = clamp((viewport.height - height) / 2, EDGE, viewport.height - height - EDGE);
    return {
      frame: { top: top - PAD, left: left - PAD, width: width + PAD * 2, height: height + PAD * 2 },
      card: { top, left, width },
      tagBelow: false,
    };
  }

  // Keep the frame inside the screen so its corners stay visible around targets at an edge or too tall to fit.
  const frameTop = Math.max(target.top - PAD, 6);
  const frameBottom = Math.min(target.top + target.height + PAD, viewport.height - 6);
  const frameLeft = Math.max(target.left - PAD, 6);
  const frameRight = Math.min(target.left + target.width + PAD, viewport.width - 6);
  const frame = {
    top: frameTop,
    left: frameLeft,
    width: Math.max(frameRight - frameLeft, 0),
    height: Math.max(frameBottom - frameTop, 0),
  };
  const tagBelow = frame.top < TAG_ROOM;
  const centredLeft = clamp(target.left + target.width / 2 - width / 2, EDGE, viewport.width - width - EDGE);

  const below = frame.top + frame.height + GAP + (tagBelow ? TAG_ROOM : 0);
  if (below + height <= viewport.height - EDGE) return { frame, card: { top: below, left: centredLeft, width }, tagBelow };

  const above = frame.top - GAP - height - (tagBelow ? 0 : TAG_ROOM);
  if (above >= EDGE) return { frame, card: { top: above, left: centredLeft, width }, tagBelow };

  // A target too tall for either: sit beside it when there's room, otherwise over its lower edge.
  const sideTop = clamp(frame.top + frame.height / 2 - height / 2, EDGE, viewport.height - height - EDGE);
  if (!narrow && frame.left - GAP - width >= EDGE) return { frame, card: { top: sideTop, left: frame.left - GAP - width, width }, tagBelow };
  if (!narrow && frame.left + frame.width + GAP + width <= viewport.width - EDGE) {
    return { frame, card: { top: sideTop, left: frame.left + frame.width + GAP, width }, tagBelow };
  }
  return { frame, card: { top: viewport.height - height - EDGE, left: centredLeft, width }, tagBelow };
}

function TourOverlay({
  steps,
  index,
  onIndex,
  onFinish,
}: {
  steps: TourStep[];
  index: number;
  onIndex: (index: number) => void;
  onFinish: () => void;
}) {
  const step = steps[index];
  const last = index === steps.length - 1;
  const target = useTargetBox(step.target);
  const viewport = useViewport();
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [cardHeight, setCardHeight] = useState(0);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const measure = () => setCardHeight(card.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });
  }, [index]);

  const next = useCallback(() => (last ? onFinish() : onIndex(index + 1)), [last, onFinish, onIndex, index]);
  const back = useCallback(() => index > 0 && onIndex(index - 1), [index, onIndex]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]");
      if (event.key === "Escape") onFinish();
      else if (typing) return;
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") back();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, onFinish]);

  const { frame, card, tagBelow } = layout(target, cardHeight, viewport);
  const stops = steps.filter((candidate) => candidate.target).length;
  const stop = steps.slice(0, index + 1).filter((candidate) => candidate.target).length;

  return createPortal(
    <>
      <div className="tour-frame" style={frame} aria-hidden="true">
        <span key={step.id} className="tour-lock">
          <span className="tour-corner" data-corner="tl" />
          <span className="tour-corner" data-corner="tr" />
          <span className="tour-corner" data-corner="bl" />
          <span className="tour-corner" data-corner="br" />
        </span>
        <span className="tour-tag" data-below={tagBelow || undefined}>
          {step.target ? `${String(stop).padStart(2, "0")} / ${String(stops).padStart(2, "0")} · ${step.label}` : step.label}
        </span>
      </div>

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="tour-card border border-line bg-popover shadow-[8px_8px_0_rgb(255_90_31/0.9)]"
        style={card}
      >
        <div className="flex gap-1 px-4 pt-4" aria-hidden="true">
          {steps.map((candidate, position) => (
            <span
              key={candidate.id}
              className={cn(
                "h-0.5 flex-1 transition-colors duration-300",
                position < index && "bg-mint",
                position === index && "bg-signal",
                position > index && "bg-[var(--line-strong)]",
              )}
            />
          ))}
        </div>
        <div key={step.id} className="tour-card-body space-y-2 px-4 pb-4 pt-3" aria-live="polite">
          <h2 id="tour-title" className="display-wide text-lg leading-tight tracking-[-0.01em]">
            {step.title}
          </h2>
          <p id="tour-body" className="text-sm leading-relaxed text-muted-foreground">
            {step.body}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={onFinish}
            className="text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <span className="t-label tabular-nums" aria-label={`Step ${index + 1} of ${steps.length}`}>
              {index + 1}/{steps.length}
            </span>
            {index > 0 && (
              <Button type="button" variant="outline" size="icon-sm" onClick={back} aria-label="Previous step">
                <ArrowLeft aria-hidden="true" />
              </Button>
            )}
            <Button ref={primaryRef} type="button" size="sm" onClick={next}>
              {index === 0 ? "Show me around" : last ? "Finish" : "Next"}
              {!last && <ArrowRight aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
