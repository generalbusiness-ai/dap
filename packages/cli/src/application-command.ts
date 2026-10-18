/** Local package commands run under Node; they do not contact a room. */
import { resolve } from "node:path";
import { ApplicationPackageError, secretSigner } from "@generalbusiness/artroom-client";
import type { Outcome } from "./commands.ts";
import type { Store } from "./store.ts";
import { parse } from "./line.ts";
import { ApplicationSourceError, packDirectory } from "./application-files.ts";

export const PACK_USAGE = "dap pack [<directory>] [--out <file>] [--publisher <existing-key-name>]";
export async function packCommand(store: Store, argv: readonly string[], cwd = process.cwd()): Promise<Outcome> {
  const parsed = parse(argv);
  if (!parsed || parsed.words[0] !== "pack" || parsed.words.length > 2 || [...parsed.flags].some(([name, values]) => !["out", "publisher"].includes(name) || values.length !== 1 || values[0] === "" || values[0]!.startsWith("--"))) return { code: 2, lines: [PACK_USAGE] };
  const keyName = parsed.flags.get("publisher")?.[0] ?? "operator";
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(keyName)) return { code: 2, lines: ["Choose an existing publisher key by name.", PACK_USAGE] };
  const directory = resolve(cwd, parsed.words[1] ?? ".");
  const output = resolve(cwd, parsed.flags.get("out")?.[0] ?? resolve(directory, "application.dap.json"));
  let secret: Uint8Array | null = null;
  try {
    const stored = await store.secret(keyName);
    if (stored === null) return { code: 1, lines: [`No existing publisher key named ${keyName}. Pack does not create a key.`] };
    secret = new Uint8Array(stored);
    const packed = await packDirectory(directory, output, secretSigner(secret));
    return { code: 0, lines: [`Package: ${output}`, `Semantic: ${packed.ids.semantic}`, `Presentation: ${packed.ids.presentation}`, `Release: ${packed.ids.release}`, `Publisher: ${packed.package.release.manifest.publisher}`] };
  } catch (error) {
    if (error instanceof ApplicationSourceError || error instanceof ApplicationPackageError) return { code: 1, lines: [error.message] };
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST") return { code: 1, lines: ["Output already exists; choose a new --out file."] };
    if (code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP" || code === "EACCES" || code === "EPERM") return { code: 1, lines: ["An application source or output directory is missing, inaccessible or a symlink."] };
    // Do not echo unknown key-store errors: implementations may contain secrets.
    return { code: 1, lines: ["Could not pack the application."] };
  } finally { secret?.fill(0); }
}
