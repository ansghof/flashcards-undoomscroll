// Runs the content script on a plain page. stub.js provides `browser.*`; the
// real background script is bundled in so card picking works as installed.
import "../src/background";
import { start } from "../src/content/app";

void start("fixture");
