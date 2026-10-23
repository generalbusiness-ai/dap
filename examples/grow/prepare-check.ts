/** Prepare the maintained G0 data-only check fixture. The page and authority
 * are labelled TEST fixtures, with no room install or device/provider calls. */
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { room } from "./room.ts";
import { site } from "./site.ts";

/** An explicit destination must not exist. Generated definitions always come
 * from the maintained TypeScript declarations, never a second hand copy. */
export async function prepareGrowCheck(destination?: string): Promise<string> {
  const root = destination === undefined
    ? await mkdtemp(join(tmpdir(), "dap-grow-check-"))
    : resolve(destination);
  if (destination !== undefined) await mkdir(root, { mode: 0o700 });
  for (const [name, definition] of [["site.json", site], ["room.json", room]] as const) {
    await writeFile(join(root, name), canonicalize(definition), { flag: "wx", mode: 0o600 });
  }
  for (const name of ["dap.application.json", "site-scenario.json", "fault-scenario.json", "index.html", "grid.html", "site.html"]) {
    const bytes = await readFile(new URL(`./check/${name}`, import.meta.url));
    await writeFile(join(root, name), bytes, { flag: "wx", mode: 0o600 });
  }
  return root;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length > 3) throw new Error("Usage: prepare-check.ts [new-directory]");
  console.log(await prepareGrowCheck(process.argv[2]));
}
