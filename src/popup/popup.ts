import { ext } from "../lib/browser";
import { HSK_LEVELS } from "../lib/hsk";
import { SITES, type Site } from "../lib/sites";
import { dayKey, getCustomCards, getSettings, getStats, updateSettings, type Settings } from "../lib/store";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function renderStats(): Promise<void> {
  const today = (await getStats())[dayKey()];
  $("prompts").textContent = String(today?.prompts ?? 0);
  $("correct").textContent = String((today?.correct ?? 0) + (today?.hinted ?? 0));
  $("wrong").textContent = String(today?.wrong ?? 0);
}

async function siteRow(site: Site, settings: Settings): Promise<HTMLLIElement> {
  const li = document.createElement("li");
  const label = document.createElement("span");
  label.textContent = site.name;
  li.append(label);

  // Firefox MV3 lets users withhold host permissions; offer to grant them.
  const granted = await ext.permissions.contains({ origins: site.origins });
  if (!granted) {
    const button = document.createElement("button");
    button.textContent = "Zugriff erlauben";
    button.addEventListener("click", async () => {
      if (await ext.permissions.request({ origins: site.origins })) render();
    });
    li.append(button);
    return li;
  }

  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.checked = !settings.disabledSites.includes(site.id);
  toggle.ariaLabel = `${site.name} aktiv`;
  toggle.addEventListener("change", async () => {
    const current = await getSettings();
    const others = current.disabledSites.filter((id) => id !== site.id);
    await updateSettings({ disabledSites: toggle.checked ? others : [...others, site.id] });
  });
  li.append(toggle);
  return li;
}

async function renderDeck(settings: Settings): Promise<void> {
  const labels = HSK_LEVELS[settings.hskVersion]
    .filter(({ level }) => settings.hskLevels.includes(level))
    .map(({ label }) => label);
  const own = settings.customEnabled ? (await getCustomCards()).length : 0;
  $("deck-summary").textContent =
    `HSK ${settings.hskVersion}.0` +
    (labels.length ? ` · Stufe ${labels.join(", ")}` : "") +
    (own ? ` · ${own} eigene` : "");
}

$("open-options").addEventListener("click", () => {
  void ext.runtime.openOptionsPage();
  window.close();
});

async function render(): Promise<void> {
  const settings = await getSettings();
  await renderDeck(settings);
  $<HTMLUListElement>("sites").replaceChildren(...(await Promise.all(SITES.map((s) => siteRow(s, settings)))));
  $<HTMLSelectElement>("direction").value = settings.direction;
  $<HTMLSelectElement>("factor").value = String(settings.factor);
  $<HTMLInputElement>("strict").checked = settings.strict;
  await renderStats();
}

$<HTMLSelectElement>("direction").addEventListener("change", (e) => {
  void updateSettings({ direction: (e.target as HTMLSelectElement).value as Settings["direction"] });
});
$<HTMLSelectElement>("factor").addEventListener("change", (e) => {
  void updateSettings({ factor: Number((e.target as HTMLSelectElement).value) });
});
$<HTMLInputElement>("strict").addEventListener("change", (e) => {
  void updateSettings({ strict: (e.target as HTMLInputElement).checked });
});

void render();
