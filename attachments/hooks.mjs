// In-process TypeScript transform for the trace (rolldown's oxc binding): no child process, no file written.
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const { transformSync } = await import(pathToFileURL(process.env.TRACE_ROOT + "/node_modules/rolldown/dist/utils-index.mjs").href);
registerHooks({
  load(url, context, nextLoad) {
    if (!url.startsWith("file:") || !url.endsWith(".ts")) return nextLoad(url, context);
    const file = fileURLToPath(url);
    const out = transformSync(file, readFileSync(file, "utf8"), { lang: "ts" });
    if (out.errors?.length) throw new Error(`${file}: ${out.errors[0].message}`);
    return { format: "module", source: out.code, shortCircuit: true };
  },
});
