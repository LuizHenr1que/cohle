import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Chat scrolling done right.
 *  - It only ever scrolls the message list itself (never `scrollIntoView`, which also scrolls the containers above and pushes the message box out of the window).
 *  - Stays glued to the bottom while you are at the bottom: new messages, a message erased by the 15 limit (the count does not change!), images that finish loading.
 *  - If you scrolled up to read, it leaves you there and counts the new messages instead (`away`), with `toBottom()` to go back.
 *  `lastKey` = id of the newest message, `resetKey` = which conversation is open, `ownLast` = the newest message is mine (always follow it). */
export function useStickToBottom(lastKey: string | undefined, resetKey: string, ownLast: boolean) {
  const scroller = useRef<HTMLDivElement>(null);     // the element that scrolls
  const content = useRef<HTMLDivElement>(null);      // its only child, whose height changes
  const pinned = useRef(true);
  const prev = useRef<string | undefined>(undefined);
  const [away, setAway] = useState(0);

  const toBottom = useCallback((smooth = false) => {
    const el = scroller.current; if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    pinned.current = true; setAway(0);
  }, []);
  const onScroll = useCallback(() => {
    const el = scroller.current; if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
    if (pinned.current) setAway(0);
  }, []);
  /** Scroll a message to the middle of the list (inside the list only) and flash it. */
  const jumpTo = useCallback((id: string) => {
    const sc = scroller.current, el = document.getElementById(`msg-${id}`);
    if (!sc || !el) return;
    const a = el.getBoundingClientRect(), b = sc.getBoundingClientRect();
    sc.scrollTo({ top: sc.scrollTop + (a.top - b.top) - sc.clientHeight / 2 + a.height / 2, behavior: "smooth" });
    el.classList.add("ring-2", "ring-accent/60"); setTimeout(() => el.classList.remove("ring-2", "ring-accent/60"), 1400);
  }, []);

  useLayoutEffect(() => { pinned.current = true; prev.current = undefined; setAway(0); toBottom(); }, [resetKey, toBottom]);          // another conversation: start at the bottom
  useLayoutEffect(() => {
    if (lastKey === prev.current) return;
    const first = prev.current === undefined; prev.current = lastKey;
    if (!lastKey) return;
    if (first || pinned.current || ownLast) toBottom(); else setAway((n) => n + 1);
  }, [lastKey, ownLast, toBottom]);
  useEffect(() => {
    const c = content.current; if (!c || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => { if (pinned.current) toBottom(); });                  // pictures, the typing line, a bigger composer...
    ro.observe(c); return () => ro.disconnect();
  }, [toBottom]);
  return { scroller, content, onScroll, away, toBottom, jumpTo };
}
