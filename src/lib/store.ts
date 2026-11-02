import { ext } from "./browser";
import type { Direction } from "./check";
import { grade, type Outcome, type ProgressMap } from "./scheduler";

export interface Settings {
  direction: "mixed" | Direction;
  /** Strict: German articles and umlauts must be right. */
  strict: boolean;
  /** Screen lengths of scrolling between prompts. */
  factor: number;
  disabledSites: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  direction: "mixed",
  strict: false,
  factor: 1,
  disabledSites: [],
};

export interface DayStats {
  prompts: number;
  correct: number;
  hinted: number;
  wrong: number;
}

export function withDefaults(s: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...s };
}

export async function getSettings(): Promise<Settings> {
  const { settings } = await ext.storage.local.get("settings");
  return withDefaults(settings as Partial<Settings> | undefined);
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const settings = { ...(await getSettings()), ...patch };
  await ext.storage.local.set({ settings });
  return settings;
}

export async function getProgress(): Promise<ProgressMap> {
  const { progress } = await ext.storage.local.get("progress");
  return (progress as ProgressMap | undefined) ?? {};
}

export function dayKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function getStats(): Promise<Record<string, DayStats>> {
  const { stats } = await ext.storage.local.get("stats");
  return (stats as Record<string, DayStats> | undefined) ?? {};
}

/** Time of the last card on any site; decides whether a fresh page gets one on its first scroll. */
export async function getLastPromptAt(): Promise<number> {
  const { lastPromptAt } = await ext.storage.local.get("lastPromptAt");
  return (lastPromptAt as number | undefined) ?? 0;
}

export async function markPrompted(): Promise<void> {
  await ext.storage.local.set({ lastPromptAt: Date.now() });
}

export async function recordOutcome(key: string, outcome: Outcome): Promise<void> {
  const now = Date.now();
  const [progress, stats] = await Promise.all([getProgress(), getStats()]);
  progress[key] = grade(progress[key], outcome, now);
  const today = (stats[dayKey()] ??= { prompts: 0, correct: 0, hinted: 0, wrong: 0 });
  today.prompts++;
  today[outcome]++;
  await ext.storage.local.set({ progress, stats });
}
