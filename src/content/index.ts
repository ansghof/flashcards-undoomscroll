import { siteForHost } from "../lib/sites";
import { start } from "./app";

const site = siteForHost(location.hostname);
if (site && window === window.top) void start(site.id);
