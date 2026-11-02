export interface Site {
  id: string;
  name: string;
  /** Match patterns; must also be listed in the manifest. */
  origins: string[];
  hosts: RegExp;
}

export const SITES: Site[] = [
  {
    id: "youtube",
    name: "YouTube",
    origins: ["*://www.youtube.com/*", "*://m.youtube.com/*"],
    hosts: /^(www|m)\.youtube\.com$/,
  },
  {
    id: "reddit",
    name: "Reddit",
    origins: ["*://*.reddit.com/*"],
    hosts: /(^|\.)reddit\.com$/,
  },
];

export function siteForHost(hostname: string): Site | undefined {
  return SITES.find((s) => s.hosts.test(hostname));
}
