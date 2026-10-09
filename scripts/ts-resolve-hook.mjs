/**
 * Node ESM wants extensions on relative imports and an import attribute on JSON; the app's TypeScript (bundled by
 * Metro) has neither. This hook appends ".ts" to an extensionless relative specifier and loads a .json file as an
 * ES module whose default export is the parsed file, so `node --experimental-strip-types` can run the pure
 * src/lib files unchanged in tests. Registered by scripts/register-ts-hook.mjs; never shipped (the FatTonic hook
 * plus the JSON case).
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[a-z]+$/i.test(specifier) && context.parentURL) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && url.endsWith(".json")) {
    return { format: "module", shortCircuit: true, source: `export default ${readFileSync(fileURLToPath(url), "utf8")};` };
  }
  return nextLoad(url, context);
}
