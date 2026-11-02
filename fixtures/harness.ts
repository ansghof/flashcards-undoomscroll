// Runs the content script on a plain page. index.html installs an in-memory
// `browser.storage` stub first, so nothing needs to be installed.
import { start } from "../src/content/app";

void start("fixture");
