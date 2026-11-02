import type { Outcome } from "../lib/scheduler";
import { css } from "./modal.css";

export interface Prompt {
  instruction: string;
  prompt: string;
  promptLang: "de" | "zh-Hans";
  /** The single form shown after a miss, which must be copied 3×. */
  expected: string;
  expectedLang: "de" | "zh-Hans";
  /** Pinyin of the hanzi involved (prompt or answer). */
  pinyin: string;
  /** Whether revealing the pinyin downgrades a correct answer to "hinted". */
  hintCounts: boolean;
  check(input: string): boolean;
  checkCopy(input: string): boolean;
}

const COPIES = 3;
const HOST_STYLE = [
  "all: initial",
  "position: fixed",
  "top: 0",
  "left: 0",
  "width: 100vw",
  "height: 100vh",
  "z-index: 2147483647",
  "display: block",
  "pointer-events: auto",
].map((d) => `${d} !important`).join(";");

/** Events that must not leak from the modal to the page's own handlers. */
const CONTAINED = [
  "keydown", "keypress", "keyup", "beforeinput", "input",
  "compositionstart", "compositionupdate", "compositionend",
  "paste", "drop", "pointerdown", "pointerup", "mousedown", "mouseup", "click",
  "touchstart", "touchend", "wheel",
];

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export class Modal {
  readonly host = document.createElement("div");
  private card: HTMLDivElement;
  private input: HTMLInputElement;
  private feedback: HTMLParagraphElement;
  private hintButton: HTMLButtonElement;
  private hintText: HTMLSpanElement;
  private solution: HTMLDivElement;
  private dots: HTMLDivElement;
  private copies = -1; // -1: still answering; 0..3: copying after a miss
  private hinted = false;
  private done = false;
  private resolve!: (o: Outcome) => void;
  private observer = new MutationObserver(() => {
    if (!this.done && !this.host.isConnected) document.documentElement.append(this.host);
  });

  constructor(private p: Prompt) {
    this.host.setAttribute("style", HOST_STYLE);
    const root = this.host.attachShadow({ mode: "closed" });
    for (const type of CONTAINED) root.addEventListener(type, (e) => e.stopPropagation());

    this.hintText = el("span", { className: "pinyin", hidden: true }, p.pinyin);
    this.hintButton = el("button", { type: "button", className: "hint", title: "Pinyin anzeigen" }, "拼音");
    this.hintButton.addEventListener("click", () => this.revealHint());

    this.dots = el("div", { className: "dots", ariaLabel: `0 von ${COPIES}` });
    this.solution = el(
      "div",
      { className: "solution", hidden: true },
      el("p", {}, "Leider falsch. Richtig ist:"),
      el("div", { className: "expected", lang: p.expectedLang }, p.expected),
      el("div", { className: "pinyin" }, p.pinyin),
      el("p", {}, `Tippe es ${COPIES}× genau so ab.`),
      this.dots,
    );

    this.input = el("input", {
      type: "text",
      autocomplete: "off",
      spellcheck: false,
      lang: p.expectedLang,
      placeholder: p.expectedLang === "de" ? "auf Deutsch …" : "汉字 …",
      ariaLabel: "Antwort",
    });
    this.input.setAttribute("autocorrect", "off");
    this.input.setAttribute("autocapitalize", "off");
    this.input.setAttribute("enterkeyhint", "done");
    for (const type of ["paste", "drop"]) this.input.addEventListener(type, (e) => e.preventDefault());
    this.input.addEventListener("beforeinput", (e) => {
      if (/^insertFrom(Paste|Drop)/.test(e.inputType)) e.preventDefault();
    });
    this.input.addEventListener("keydown", (e) => {
      // Enter that confirms an IME candidate must not submit the answer.
      // (Not keyCode 229: Android keyboards report that for every key.)
      if (e.key === "Enter" && e.isComposing) e.preventDefault();
    });

    const form = el("form", {}, this.input, el("button", { type: "submit", className: "submit" }, "Prüfen"));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.submit();
    });

    this.feedback = el("p", { className: "feedback", role: "status" });
    this.card = el(
      "div",
      { className: "card", role: "dialog", ariaModal: "true", ariaLabel: "undoomscroll" },
      el("div", { className: "brand" }, "undoomscroll"),
      el("p", { className: "instruction" }, p.instruction),
      el("div", { className: `prompt lang-${p.promptLang}`, lang: p.promptLang }, p.prompt),
      el("div", { className: "hint-row" }, this.hintButton, this.hintText),
      this.solution,
      form,
      this.feedback,
    );
    root.append(el("style", {}, css), el("div", { className: "overlay" }, this.card));
  }

  open(): Promise<Outcome> {
    document.documentElement.append(this.host);
    this.observer.observe(document.documentElement, { childList: true });
    window.visualViewport?.addEventListener("resize", this.fit);
    window.visualViewport?.addEventListener("scroll", this.fit);
    this.fit();
    this.focus();
    return new Promise((resolve) => (this.resolve = resolve));
  }

  focus(): void {
    if (!this.done) this.input.focus({ preventScroll: true });
  }

  /** Keep the card above the on-screen keyboard on mobile. */
  private fit = (): void => {
    const vv = window.visualViewport;
    if (!vv) return;
    const s = this.host.style;
    s.setProperty("top", `${vv.offsetTop}px`, "important");
    s.setProperty("left", `${vv.offsetLeft}px`, "important");
    s.setProperty("width", `${vv.width}px`, "important");
    s.setProperty("height", `${vv.height}px`, "important");
  };

  private revealHint(): void {
    this.hintText.hidden = false;
    this.hintButton.hidden = true;
    if (this.p.hintCounts) this.hinted = true;
    this.focus();
  }

  private submit(): void {
    const value = this.input.value;
    if (this.done || value.trim() === "") return;

    if (this.copies < 0) {
      if (this.p.check(value)) {
        this.finish(this.hinted ? "hinted" : "correct", "Richtig! ✓");
      } else {
        this.copies = 0;
        this.card.classList.add("missed");
        this.solution.hidden = false;
        this.hintButton.parentElement!.hidden = true;
        this.input.value = "";
        this.input.placeholder = `1/${COPIES}`;
        this.renderDots();
        this.say("");
      }
      return;
    }

    if (this.p.checkCopy(value)) {
      this.copies++;
      this.renderDots();
      this.input.value = "";
      if (this.copies >= COPIES) {
        this.finish("wrong", "Geschafft. Weiter geht's.");
      } else {
        this.input.placeholder = `${this.copies + 1}/${COPIES}`;
        this.say(`${this.copies} von ${COPIES} ✓`);
      }
    } else {
      this.say("Nicht ganz – genau so abtippen.");
      this.shake();
      this.input.select();
    }
  }

  private renderDots(): void {
    this.dots.textContent = "●".repeat(this.copies) + "○".repeat(COPIES - this.copies);
    this.dots.ariaLabel = `${this.copies} von ${COPIES}`;
  }

  private say(text: string): void {
    this.feedback.textContent = text;
  }

  private shake(): void {
    this.card.classList.remove("shake");
    void this.card.offsetWidth; // restart the animation
    this.card.classList.add("shake");
  }

  private finish(outcome: Outcome, message: string): void {
    this.done = true;
    this.input.disabled = true;
    this.card.classList.add("ok");
    this.say(message);
    setTimeout(() => {
      this.observer.disconnect();
      window.visualViewport?.removeEventListener("resize", this.fit);
      window.visualViewport?.removeEventListener("scroll", this.fit);
      this.host.remove();
      this.resolve(outcome);
    }, 700);
  }
}
