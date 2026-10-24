/** Immutable application release addresses, shared by CLI and host. Parsing
 * grants no trust and performs no network or Git operation. */
// The narrow standard Web URL surface keeps this portable package free of a
// dependency on all DOM or Node declarations.
declare const URL: new (input: string) => { href: string; hostname: string; username: string; password: string };
export class ApplicationUriError extends Error {
  constructor() { super("application-uri-invalid"); }
}
export interface ApplicationReleaseUri {
  readonly uri: string;
  readonly remote: string;
  readonly commit: string;
  readonly objectFormat: "sha1" | "sha256";
  readonly path: string;
  readonly segments: readonly string[];
}
const invalid = (): never => { throw new ApplicationUriError(); };
// RFC 3986 unreserved spelling. Percent hex is uppercase; Unicode must be
// well-formed UTF-8. Encoded separators never become extra tree components.
const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, char => "%" + char.charCodeAt(0).toString(16).toUpperCase());
function segments(path: string): string[] {
  const parts = path.split("/");
  if (parts.length > 64) return invalid();
  return parts.map(part => {
    let decoded: string;
    try { decoded = decodeURIComponent(part); } catch { return invalid(); }
    if (!decoded || decoded === "." || decoded === ".." || /[\u0000-\u001f\u007f/\\]/.test(decoded) || encode(decoded) !== part) return invalid();
    return decoded;
  });
}
export function readApplicationReleaseUri(value: unknown): ApplicationReleaseUri {
  if (typeof value !== "string" || value.length > 4096 || /[?#]/.test(value)) return invalid();
  const match = /^git\+https:\/\/([^/]+)\/(.+\.git)\/@([0-9a-f]{40}|[0-9a-f]{64})\/(.+)$/.exec(value);
  if (!match) return invalid();
  const host = match[1]!, repository = match[2]!, commit = match[3]!, file = match[4]!;
  let origin: InstanceType<typeof URL>;
  try { origin = new URL("https://" + host + "/"); } catch { return invalid(); }
  // Canonical host spelling excludes credentials, ports, URL normalization and
  // implicit percent/IDN aliases. DNS hosts use their lowercase ASCII spelling.
  if (host !== host.toLowerCase() || origin.href !== "https://" + host + "/" || origin.hostname !== host || origin.username || origin.password) return invalid();
  segments(repository);
  const path = segments(file);
  return Object.freeze({ uri: value, remote: "https://" + host + "/" + repository, commit,
    objectFormat: commit.length === 40 ? "sha1" : "sha256", path: path.join("/"), segments: Object.freeze(path) });
}
