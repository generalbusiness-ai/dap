/** Select one config directory without reading or moving configuration or key bytes. */
import { readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

/** The closed set of selection failures. No message names a path. */
const CONFIG_DIRECTORY_MESSAGES = {
  "config-path-not-directory": "An existing config path is not a directory. Set DAP_HOME explicitly; no configuration was changed.",
  "config-directory-uninspectable": "An existing config directory could not be inspected. Set DAP_HOME explicitly; no configuration was changed.",
  "config-home-conflict": "DAP_HOME and ARTROOM_HOME name different directories. Set only one, or set both to the same directory; no configuration was read or changed.",
} as const;

export type ConfigDirectoryCode = keyof typeof CONFIG_DIRECTORY_MESSAGES;

// No parameter property: `node --test` loads this module with type stripping alone.
export class ConfigDirectoryError extends Error {
  override name = "ConfigDirectoryError";
  readonly code: ConfigDirectoryCode;
  constructor(code: ConfigDirectoryCode) { super(CONFIG_DIRECTORY_MESSAGES[code]); this.code = code; }
}

/** Optional inputs let resolver tests use synthetic homes and directory metadata. */
export interface ConfigDirectoryOptions {
  home?: string;
  cwd?: string;
  occupied?: (directory: string) => boolean;
}

/** Even incomplete or unrecognized records must not be silently replaced by a new default. */
function occupied(directory: string): boolean {
  try {
    if (!statSync(directory).isDirectory()) throw new ConfigDirectoryError("config-path-not-directory");
    return readdirSync(directory).length > 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    if (error instanceof ConfigDirectoryError) throw error;
    throw new ConfigDirectoryError("config-directory-uninspectable");
  }
}

/** Explicit variables agree or refuse. Otherwise preserve occupied legacy custody before using a new dap default. */
export function configDir(env: Readonly<Record<string, string | undefined>> = process.env, options: ConfigDirectoryOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  const dap = env["DAP_HOME"] ? resolve(cwd, env["DAP_HOME"]) : undefined;
  const artroom = env["ARTROOM_HOME"] ? resolve(cwd, env["ARTROOM_HOME"]) : undefined;
  if (dap && artroom && dap !== artroom) {
    throw new ConfigDirectoryError("config-home-conflict");
  }
  if (dap || artroom) return (dap ?? artroom)!;
  const home = options.home ?? homedir();
  const base = resolve(cwd, env["XDG_CONFIG_HOME"] || join(home, ".config"));
  const probe = options.occupied ?? occupied;
  // The current XDG location has always had precedence. The home fallback
  // still finds custody from before XDG_CONFIG_HOME was selected.
  for (const legacy of new Set([join(base, "artroom"), resolve(cwd, home, ".config", "artroom")])) {
    if (probe(legacy)) return legacy;
  }
  return join(base, "dap");
}
