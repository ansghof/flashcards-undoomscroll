/** Scroll distance before the very first prompt; filters out load jitter. */
const FIRST_SCROLL_PX = 20;

/**
 * Sums vertical scrolling of the page and of every inner scroll container
 * (one capture-phase listener sees them all). While `locked`, it instead
 * snaps every scroller back to its last known position, which also covers
 * scrollbar drags that no input-event blocking would catch.
 */
export class ScrollMeter {
  locked = false;
  private last = new WeakMap<EventTarget, number>();
  private distance = 0;
  private armed = true;
  private screen = window.innerHeight;

  constructor(
    private factor: () => number,
    private onTrigger: () => void,
    private isOwn: (e: Event) => boolean,
  ) {
    document.addEventListener("scroll", this.onScroll, { capture: true, passive: true });
    window.addEventListener("resize", () => {
      // The on-screen keyboard shrinks innerHeight while the modal is open.
      if (!this.locked) this.screen = window.innerHeight;
    });
  }

  reset(): void {
    this.distance = 0;
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
    this.distance += Math.abs(pos - prev);
    const needed = this.armed ? FIRST_SCROLL_PX : this.screen * this.factor();
    if (this.distance >= needed) {
      this.armed = false;
      this.distance = 0;
      this.onTrigger();
    }
  };
}
