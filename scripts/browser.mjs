/**
 * One headless Chromium for the two asset scripts (store-assets, screenshots),
 * the way _meta/render-audit does it: playwright-core from the render-audit
 * harness plus its downloaded headless shell, or any Chromium you point at.
 *
 *   PORTFOLIO_OS_ROOT the Operating System folder (default: four levels up from this repo)
 *   PLAYWRIGHT_CORE   path to a playwright-core package (default: the OS harness)
 *   RENDER_AUDIT_EXECUTABLE / RENDER_AUDIT_CHANNEL   as in render-audit.mjs
 */
import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OS_ROOT = process.env.PORTFOLIO_OS_ROOT ?? resolve(here, "../../../..");
const HARNESS = resolve(OS_ROOT, "_meta/render-audit");

export async function launchChromium() {
  const pwPath = process.env.PLAYWRIGHT_CORE ?? join(HARNESS, "node_modules/playwright-core");
  const req = createRequire(join(pwPath, "package.json"));
  const { chromium } = req(pwPath);
  const opts = { headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1"] };
  if (process.env.RENDER_AUDIT_EXECUTABLE) opts.executablePath = process.env.RENDER_AUDIT_EXECUTABLE;
  else if (process.env.RENDER_AUDIT_CHANNEL) opts.channel = process.env.RENDER_AUDIT_CHANNEL;
  else {
    const browsers = join(HARNESS, ".browsers");
    if (existsSync(browsers)) {
      for (const d of readdirSync(browsers)) {
        if (!d.startsWith("chromium_headless_shell")) continue;
        for (const sub of readdirSync(join(browsers, d))) {
          const exe = join(browsers, d, sub, "chrome-headless-shell");
          if (existsSync(exe)) opts.executablePath = exe;
        }
      }
    }
  }
  return chromium.launch(opts);
}
