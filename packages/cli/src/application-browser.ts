/** Local trusted-author browser compilation. This is not a sandbox or host
 * admission check. Output allowances are the portable package's limits. */
import { basename, dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { APPLICATION_PACKAGE_LIMITS as LIMITS } from "@generalbusiness/dap-client";

export interface ApplicationBrowserSource { entry: string; html: string; script: string }
export interface ApplicationBrowserAsset { path: string; mediaType: string; bytes: Uint8Array }

/** Reads use the caller's bounded regular-file reader. Esbuild resolves the
 * trusted author's other modules and dependencies. No plugins or build scripts
 * from the application execute. Inputs are not an atomic filesystem snapshot. */
export async function bundleApplicationBrowser(root: string, entryAsset: string, source: ApplicationBrowserSource,
  read: (path: string, most: number) => Promise<Uint8Array>): Promise<ApplicationBrowserAsset[]> {
  if (!/^[A-Za-z0-9_-]+\.js$/.test(source.script)) throw new Error("The browser script must be a simple .js filename.");
  const sourceHtml = new TextDecoder("utf-8", { fatal: true }).decode(await read(source.html, LIMITS.assetBytes));
  await read(source.entry, LIMITS.assetBytes);
  const relative = posix.relative(posix.dirname(source.html), source.entry);
  const script = `<script type="module" src="${relative.startsWith(".") ? relative : "./" + relative}"></script>`;
  if (sourceHtml.split(script).length !== 2) throw new Error("The browser HTML must contain exactly one module script for its entry.");
  const { build } = await import("esbuild");
  const output = join(root, ".dap-browser-output", source.script);
  const built = await build({ absWorkingDir: root, entryPoints: [join(root, source.entry)], outfile: output,
    bundle: true, platform: "browser", format: "esm", target: "es2022", minify: true,
    legalComments: "none", write: false, logLevel: "silent",
    plugins: [{ name: "owned-browser-client", setup(builder) {
      builder.onResolve({ filter: /^@generalbusiness\/artroom-client(?:\/.*)?$/ }, args => ({ path: fileURLToPath(import.meta.resolve(args.path)) }));
    } }],
  });
  const base = posix.dirname(entryAsset), prefix = base === "." ? "" : base + "/";
  const css = source.script.replace(/\.js$/, ".css"), assets: ApplicationBrowserAsset[] = [];
  let hasScript = false, hasCss = false, total = 0;
  for (const file of built.outputFiles) {
    if (dirname(file.path) !== dirname(output)) throw new Error("The browser build emitted an unexpected path.");
    const name = basename(file.path);
    if (name === source.script && !hasScript) hasScript = true;
    else if (name === css && !hasCss) hasCss = true;
    else throw new Error("The browser build emitted an unexpected asset.");
    if (file.contents.byteLength > LIMITS.assetBytes) throw new Error("A browser asset exceeds its package allowance.");
    total += file.contents.byteLength;
    assets.push({ path: prefix + name, mediaType: name === css ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", bytes: file.contents });
  }
  if (!hasScript) throw new Error("The browser build emitted no script.");
  let html = sourceHtml.replace(script, `<script type="module" src="./${source.script}"></script>`);
  if (hasCss) {
    if (html.split("</head>").length !== 2) throw new Error("The browser HTML needs one closing head for its stylesheet.");
    html = html.replace("</head>", `<link rel="stylesheet" href="./${css}"></head>`);
  }
  const bytes = new TextEncoder().encode(html);
  if (bytes.byteLength > LIMITS.assetBytes || total + bytes.byteLength > LIMITS.totalAssetBytes) throw new Error("Browser assets exceed their package allowance.");
  return [{ path: entryAsset, mediaType: "text/html; charset=utf-8", bytes }, ...assets];
}
