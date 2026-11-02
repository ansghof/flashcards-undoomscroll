const SCROLL_KEYS = new Set([
  " ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
]);

/**
 * Freezes the page under the modal: no wheel/touch/key scrolling, no site
 * hotkeys, no focus outside the modal, media paused. Scroll positions are
 * pinned separately by ScrollMeter.locked.
 */
export class PageLock {
  private paused: HTMLMediaElement[] = [];
  private savedStyle: string | null = null;

  constructor(
    private isOwn: (e: Event) => boolean,
    private refocus: () => void,
  ) {}

  engage(): void {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});

    const html = document.documentElement;
    this.savedStyle = html.getAttribute("style");
    html.style.setProperty("overflow", "hidden", "important");
    html.style.setProperty("overscroll-behavior", "none", "important");

    this.paused = [...document.querySelectorAll<HTMLMediaElement>("video, audio")].filter((m) => !m.paused);
    for (const m of this.paused) m.pause();
    document.addEventListener("play", this.onPlay, true);

    window.addEventListener("wheel", this.block, { capture: true, passive: false });
    window.addEventListener("touchmove", this.block, { capture: true, passive: false });
    for (const type of ["keydown", "keypress", "keyup"]) {
      window.addEventListener(type, this.onKey, true);
    }
    document.addEventListener("focusin", this.onFocus, true);
  }

  release(): void {
    const html = document.documentElement;
    if (this.savedStyle === null) html.removeAttribute("style");
    else html.setAttribute("style", this.savedStyle);

    document.removeEventListener("play", this.onPlay, true);
    for (const m of this.paused) m.play().catch(() => {});
    this.paused = [];

    window.removeEventListener("wheel", this.block, true);
    window.removeEventListener("touchmove", this.block, true);
    for (const type of ["keydown", "keypress", "keyup"]) {
      window.removeEventListener(type, this.onKey, true);
    }
    document.removeEventListener("focusin", this.onFocus, true);
  }

  private block = (e: Event): void => {
    e.preventDefault();
  };

  private onKey = (e: Event): void => {
    if (this.isOwn(e)) return;
    // Keys aimed at the page: site hotkeys and scroll keys both die here.
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type === "keydown" && !SCROLL_KEYS.has((e as KeyboardEvent).key)) this.refocus();
  };

  private onFocus = (e: Event): void => {
    if (!this.isOwn(e)) this.refocus();
  };

  private onPlay = (e: Event): void => {
    // Autoplaying feeds (Shorts, Reddit videos) try to start the next clip.
    const m = e.target as HTMLMediaElement;
    m.pause();
    if (!this.paused.includes(m)) this.paused.push(m);
  };
}
