/** Scroll distance before the very first prompt; filters out load jitter. */
const FIRST_SCROLL_PX = 20;
/** How long after a wheel/touch/key/pointer event scrolling counts as the user's (covers fling momentum). */
const INTENT_MS = 1500;
const INTENT_EVENTS = ["wheel", "touchstart", "touchmove", "touchend", "keydown", "pointerdown"];

/**
 * Sums vertical scrolling of the page and of every inner scroll container
 * (one capture-phase listener sees them all). Only user-driven scrolling
 * counts: scroll restoration on reload and scripted jumps don't. While
 * `locked`, it instead snaps every scroller back to its last known position,
 * which also covers scrollbar drags that no input-event blocking would catch.
 */
export class ScrollMeter {
  locked = false;
  private last = new WeakMap<EventTarget, number>();
  private distance = 0;
  private screen = window.innerHeight;
  private lastIntent = -Infinity;
  private pointerHeld = false;

  /** @param armed whether the first scroll triggers a card right away */
  constructor(
    private armed: boolean,
    private factor: () => number,
    private onTrigger: () => void,
    private isOwn: (e: Event) => boolean,
  ) {
    document.addEventListener("scroll", this.onScroll, { capture: true, passive: true });
    for (const type of INTENT_EVENTS) {
      window.addEventListener(type, this.onIntent, { capture: true, passive: true });
    }
    // Scrollbar drags can outlast INTENT_MS.
    window.addEventListener("pointerup", () => (this.pointerHeld = false), { capture: true, passive: true });
    window.addEventListener("resize", () => {
      // The on-screen keyboard shrinks innerHeight while the modal is open.
      if (!this.locked) this.screen = window.innerHeight;
    });
  }

  reset(): void {
    this.distance = 0;
  }

  private onIntent = (e: Event): void => {
    if (this.isOwn(e)) return;
    this.lastIntent = e.timeStamp;
    if (e.type === "pointerdown") this.pointerHeld = true;
  };

  private userDriven(e: Event): boolean {
    return this.pointerHeld || e.timeStamp - this.lastIntent < INTENT_MS;
  }

  private onScroll = (e: Event): void => {
    if (this.isOwn(e)) return;
    const target = e.target === document.documentElement || e.target === document.body ? document : e.target;
    if (!target) return;
    const pos = target === document ? window.scrollY : (target as Element).scrollTop;
    const prev = this.last.get(target) ?? 0;

    if (this.locked) {
      if (pos === prev) return;
      if (target === document) window.scrollTo(window.scrollX, prev);
      else (target as Element).scrollTop = prev;
      return;
    }

    this.last.set(target, pos);
    if (!this.userDriven(e)) return;
    this.distance += Math.abs(pos - prev);
    const needed = this.armed ? FIRST_SCROLL_PX : this.screen * this.factor();
    if (this.distance >= needed) {
      this.armed = false;
      this.distance = 0;
      this.onTrigger();
    }
  };
}
