/**
 * `publication-paths@1` (ruling 68356c6c, point 4): the directory prefixes
 * under which an application of the `base` family may publish files. A
 * package declares them as a capability, `{ name: "publication-paths@1",
 * bounds: { prefixes } }`. No declaration means no `publish-file` authority.
 *
 * A prefix is a literal directory path: one to eight of them, in ascending
 * byte order, none inside another, each at most 256 UTF-8 bytes and ending
 * in one slash. No glob, root, absolute path, empty or dot segment, `.git`
 * segment or `.github/` prefix. Prefixes compare by path segment, so
 * `shelf/` does not admit `shelf-other/page.md`.
 */
import { DEVICE_COMMAND, type DeviceCommandBounds, type Digest } from "@generalbusiness/dap-contract";
import { canonicalize, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { isObject } from "@generalbusiness/dap-derive";
import type { ApplicationSemantics } from "./application-codec/application.ts";
import { deviceApplicationRequirement } from "./device-application-package.ts";

export const PUBLICATION_PATHS = "publication-paths@1" as const;
export const PUBLICATION_PREFIXES = 8;
export const PUBLICATION_PREFIX_BYTES = 256;
/** The canonical text of a full declaration's prefix list fits this many UTF-8 bytes. */
export const PUBLICATION_TEXT_BYTES = 2304;

const segmentsOf = (path: string): string[] | null => {
  const segments = path.split("/");
  return segments.every(part => part !== "" && part !== "." && part !== ".." && part.toLowerCase() !== ".git"
    && !/[*?[\]{}\\\u0000-\u001f\u007f]/.test(part)) ? segments : null;
};

/** One prefix of the declaration, or false. */
export function isPublicationPrefix(value: unknown): value is string {
  if (typeof value !== "string" || !value.endsWith("/") || utf8(value).length > PUBLICATION_PREFIX_BYTES) return false;
  const segments = segmentsOf(value.slice(0, -1));
  return segments !== null && segments[0]!.toLowerCase() !== ".github";
}

/** The prefixes of a `publication-paths@1` capability's bounds. Null: the bounds are not exactly one valid declaration. */
export function readPublicationPrefixes(bounds: unknown): readonly string[] | null {
  if (!isObject(bounds) || Object.keys(bounds).length !== 1 || !Array.isArray(bounds["prefixes"])) return null;
  const prefixes: unknown[] = bounds["prefixes"];
  if (prefixes.length < 1 || prefixes.length > PUBLICATION_PREFIXES || !prefixes.every(isPublicationPrefix)) return null;
  for (let index = 1; index < prefixes.length; index++) if (!(prefixes[index - 1]! < prefixes[index]!)) return null;
  return prefixesOverlap(prefixes, prefixes, true) ? null : [...prefixes];
}

/** The prefixes of a canonical text that a Directory or Destination field carries. Null: not one valid declaration's list. */
export function readPublicationText(raw: unknown): readonly string[] | null {
  if (typeof raw !== "string" || utf8(raw).length > PUBLICATION_TEXT_BYTES) return null;
  try {
    const prefixes = parseStrict(raw);
    return canonicalize(prefixes) === raw ? readPublicationPrefixes({ prefixes }) : null;
  } catch { return null; }
}

/** True when a prefix of one list contains, or is, a prefix of the other. `distinct`: the lists are one list, compared with itself. */
export function prefixesOverlap(a: readonly string[], b: readonly string[], distinct = false): boolean {
  return a.some((x, i) => b.some((y, j) => !(distinct && i === j) && (x.startsWith(y) || y.startsWith(x))));
}

/** True when the path is a file path with no empty or dot segment, inside one of the prefixes. */
export function withinPublicationPrefixes(path: unknown, prefixes: readonly string[]): boolean {
  return typeof path === "string" && segmentsOf(path) !== null && prefixes.some(prefix => path.startsWith(prefix));
}

/** The four capability sets of the `base` family's Rules (ruling 68356c6c, point 4e): none, publication, device, and device with publication. */
export interface ApplicationCapabilities {
  readonly device: { bounds: DeviceCommandBounds; definitions: readonly Digest[] } | null;
  readonly publication: readonly string[] | null;
}

/** Null: the package states a duplicate, an unknown capability or malformed bounds. */
export function applicationCapabilities(semantic: Pick<ApplicationSemantics, "capabilities" | "definitions">): ApplicationCapabilities | null {
  const names = semantic.capabilities.map(capability => capability.name);
  if (new Set(names).size !== names.length || names.some(name => name !== DEVICE_COMMAND && name !== PUBLICATION_PATHS)) return null;
  const device = semantic.capabilities.find(capability => capability.name === DEVICE_COMMAND);
  const declared = semantic.capabilities.find(capability => capability.name === PUBLICATION_PATHS);
  const requirement = device ? deviceApplicationRequirement({ ...semantic, capabilities: [device] }) : null;
  const publication = declared ? readPublicationPrefixes(declared.bounds) : null;
  if ((device && !requirement) || (declared && !publication)) return null;
  return { device: requirement, publication };
}
