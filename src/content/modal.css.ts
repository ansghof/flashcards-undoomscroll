export const css = `
:host { color-scheme: light dark; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }

.overlay {
  --bg: #fbfaf7;
  --fg: #1d1c1a;
  --muted: #6b6760;
  --line: #d9d5cc;
  --accent: #c2410c;
  --on-accent: #fff;
  --ok: #15803d;
  --bad: #b91c1c;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 14, 12, 0.72);
  backdrop-filter: blur(8px);
  font: 16px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--fg);
}
@media (prefers-color-scheme: dark) {
  .overlay {
    --bg: #1f1e1c;
    --fg: #f1efe9;
    --muted: #a39e94;
    --line: #3a3833;
    --accent: #fb923c;
    --on-accent: #1f1e1c;
    --ok: #4ade80;
    --bad: #f87171;
  }
}

.card {
  width: min(420px, 100%);
  max-height: 100%;
  overflow: auto;
  padding: 20px 20px 16px;
  border-radius: 16px;
  background: var(--bg);
  border: 1px solid var(--line);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  text-align: center;
}
.card.ok { border-color: var(--ok); }
.card.shake { animation: shake 0.3s; }
@keyframes shake {
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

.brand {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.instruction { margin: 8px 0 4px; color: var(--muted); }

[lang="zh-Hans"] {
  font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", sans-serif;
}
.prompt { font-size: 28px; font-weight: 600; margin: 4px 0; overflow-wrap: anywhere; }
.prompt.lang-zh-Hans { font-size: 48px; font-weight: 500; }

.hint-row { min-height: 32px; display: flex; align-items: center; justify-content: center; }
.hint {
  font: inherit;
  font-size: 14px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}
.pinyin { color: var(--muted); font-size: 18px; }

.solution {
  margin: 8px 0;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--bad);
}
.solution p { margin: 0; color: var(--muted); font-size: 14px; }
.expected { font-size: 32px; font-weight: 600; margin: 4px 0 0; color: var(--bad); }
.expected[lang="zh-Hans"] { font-size: 44px; font-weight: 500; }
.dots { margin-top: 6px; font-size: 20px; letter-spacing: 6px; color: var(--accent); }

form { display: flex; gap: 8px; margin-top: 12px; }
input {
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: 20px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--fg);
}
input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.submit {
  font: inherit;
  font-weight: 600;
  padding: 0 16px;
  border: 0;
  border-radius: 10px;
  background: var(--accent);
  color: var(--on-accent);
  cursor: pointer;
}
.feedback { min-height: 1.4em; margin: 10px 0 0; font-size: 14px; color: var(--muted); }
.card.ok .feedback { color: var(--ok); font-weight: 600; }
`;
