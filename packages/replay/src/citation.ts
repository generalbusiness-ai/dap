/** Integrity of cited bytes and their first-predecessor chain; never Native judgment. */
import { canonicalBytes, hex, isRecord, parseCitation, parseStrict, sha256, unbase32, utf8, verify, type Citation } from "@generalbusiness/dap-bytes";

export type CitationLevel = 0 | 1 | 2 | 3;
export type CitationReason = "syntax" | "format" | "unavailable" | "depth" | "profile" | "digest" | "sequence" | "position" | "genesis" | "anchor" | "signature";
export interface CitationReport {
  readonly citation: string;
  readonly requested: CitationLevel;
  readonly result: "ok" | "mismatch" | "incomplete" | "invalid";
  readonly reached: CitationLevel | null;
  readonly reason: CitationReason | null;
  readonly anchor: string | null;
  readonly trusts: readonly string[];
}

/** Both reads return untrusted bytes. A cached event is not an anchor. */
export interface CitationSource {
  event(citation: Citation): Promise<Uint8Array | null>;
  predecessor(format: string, digest: string): Promise<Uint8Array | null>;
}

export interface CitationOptions {
  readonly requested?: CitationLevel;
  readonly anchors?: readonly string[];
  /** Predecessor edges, including an edge to an explicit anchor. Null means no limit. */
  readonly depth?: number | null;
  /** Trusted SHA-1 object hashing by Git itself or collision-detecting Git hashing. */
  readonly hashGitCommit?: (content: Uint8Array) => Promise<string | null>;
}

interface DapEvent { readonly value: Record<string, unknown>; readonly input: Record<string, unknown> }
interface GitEvent { readonly parent: string | null }
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const equal = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((byte, i) => byte === b[i]);
const digest = (format: string, value: unknown): value is string => typeof value === "string" && value.length === (format === "git" ? 40 : 64) && !/[^0-9a-f]/.test(value);

function joined(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a); result.set(b, a.length);
  return result;
}

function dapEvent(bytes: Uint8Array): DapEvent | null {
  try {
    const value: unknown = parseStrict(decoder.decode(bytes));
    if (!isRecord(value) || !isRecord(value["input"]) || typeof value["input"]["type"] !== "string" || !equal(canonicalBytes(value), bytes)) return null;
    return { value, input: value["input"] };
  } catch { return null; }
}

/** Only raw header lines identify parents. A message or second parent never supplies an event. */
function gitEvent(bytes: Uint8Array, format: string): GitEvent | null {
  let end = -1;
  for (let i = 0; i + 1 < bytes.length; i++) if (bytes[i] === 10 && bytes[i + 1] === 10) { end = i; break; }
  if (end < 0) return null;
  const lines = new TextDecoder("latin1").decode(bytes.subarray(0, end)).split("\n");
  if (!lines[0]?.startsWith("tree ") || !digest(format, lines[0].slice(5))) return null;
  const parents = lines.filter(line => line.startsWith("parent ")).map(line => line.slice(7));
  if (parents.some(parent => !digest(format, parent))) return null;
  return { parent: parents[0] ?? null };
}

function dapFields(event: DapEvent, position: number, genesis: string): CitationReason | null {
  // This order is part of the format's fast rejection, including absent members.
  if (position > 0 && event.value["genesis"] !== `sha256:${genesis}`) return "sequence";
  return !Number.isSafeInteger(event.value["seq"]) || event.value["seq"] !== position ? "position" : null;
}

function dapGenesis(event: DapEvent): boolean {
  const nonce = typeof event.input["nonce"] === "string" ? unbase32(event.input["nonce"]) : null;
  return event.value["seq"] === 0 && event.value["prev"] === null && event.input["type"] === "genesis" && nonce?.length === 16;
}

function signatures(event: DapEvent): boolean {
  const type = event.input["type"];
  if (type !== "act" && type !== "preparation" && type !== "genesis") return true;
  if (type === "genesis" && event.input["founding"] === null) return true;
  const signed = event.input[type === "genesis" ? "founding" : "signed"];
  if (!isRecord(signed) || !isRecord(signed["intent"])) return false;
  try { return verify(signed["intent"]["actor"], signed["sig"], joined(utf8("artroom-intent-1\n"), canonicalBytes(signed["intent"]))); }
  catch { return false; }
}

/** Caller options fail before I/O; their misuse is not a new protocol reason. */
function optionsOf(options: CitationOptions): { requested: CitationLevel; depth: number | null; anchors: readonly { text: string; value: Citation }[] } {
  const requested = options.requested === undefined ? 3 : options.requested, depth = options.depth ?? null;
  if (![0, 1, 2, 3].includes(requested)) throw new RangeError("The requested citation level is 0 through 3");
  if (depth !== null && (!Number.isSafeInteger(depth) || depth < 0)) throw new RangeError("Citation depth is a nonnegative safe integer or null");
  if (options.anchors !== undefined && !Array.isArray(options.anchors)) throw new TypeError("Citation anchors must be an array");
  const byPosition = new Map<string, { text: string; value: Citation }>();
  for (const text of options.anchors ?? []) {
    const value = parseCitation(text);
    if (!value) throw new TypeError("An anchor must be a citation");
    const key = `${value.format}:${value.genesis}/${value.position}`, earlier = byPosition.get(key);
    if (earlier && earlier.value.event !== value.event) throw new TypeError("Conflicting anchors at one sequence position");
    byPosition.set(key, { text, value });
  }
  return { requested, depth, anchors: [...byPosition.values()] };
}

export async function verifyCitation(text: string, source: CitationSource, options: CitationOptions = {}): Promise<CitationReport> {
  if (typeof text !== "string") throw new TypeError("A citation must be text");
  const { requested, depth, anchors } = optionsOf(options);
  const report = (result: CitationReport["result"], reached: CitationLevel | null, reason: CitationReason | null, anchor: string | null = null, trusts: readonly string[] = []): CitationReport => ({ citation: text, requested, result, reached, reason, anchor, trusts });
  const cited = parseCitation(text);
  if (!cited) return report("invalid", null, "syntax");
  if (!["dap1", "git", "git256"].includes(cited.format) || cited.format === "git" && !options.hashGitCommit) return report("incomplete", null, "format");
  const read = async (operation: () => Promise<Uint8Array | null>): Promise<Uint8Array | null> => {
    try { const bytes = await operation(); return bytes instanceof Uint8Array ? new Uint8Array(bytes) : null; }
    catch { return null; }
  };
  const hash = async (bytes: Uint8Array): Promise<string | null> => {
    if (cited.format === "git") {
      try { const value = await options.hashGitCommit!(bytes); return digest("git", value) ? value : null; }
      catch { return null; }
    }
    return hex(sha256(joined(utf8(cited.format === "dap1" ? "artroom-entry-1\n" : `commit ${bytes.length}\0`), bytes)));
  };
  let bytes = await read(() => source.event({ ...cited }));
  if (!bytes) return report("incomplete", null, "unavailable");
  let currentDigest = await hash(bytes);
  if (currentDigest === null) return report("incomplete", null, "unavailable");
  if (currentDigest !== cited.event) return report("mismatch", null, "digest");
  if (requested === 0) return report("ok", 0, null);
  let dap = cited.format === "dap1" ? dapEvent(bytes) : null;
  if (cited.format === "dap1") {
    if (!dap) return report("mismatch", 0, "position");
    const why = dapFields(dap, cited.position, cited.genesis);
    if (why) return report("mismatch", 0, why);
  }
  if (requested === 1) return report("ok", 1, null);
  const readDap: DapEvent[] = dap ? [dap] : [];
  let position = cited.position, remaining = depth, anchor: string | null = null, trusts: readonly string[] = [];
  while (true) {
    const git = cited.format === "dap1" ? null : gitEvent(bytes, cited.format);
    if (cited.format !== "dap1" && !git) return report("mismatch", 1, "position");
    const genesis = dap ? dapGenesis(dap) : git!.parent === null;
    if (position === 0) {
      if (!genesis) return report("mismatch", 1, "position");
      if (currentDigest !== cited.genesis) return report("mismatch", 1, "genesis");
      anchor = "genesis"; break;
    }
    const prev = dap ? dap.value["prev"] : git!.parent;
    const predecessor = dap ? typeof prev === "string" && prev.startsWith("sha256:") && digest("dap1", prev.slice(7)) ? prev.slice(7) : null : git!.parent;
    if (!predecessor || genesis) return report("mismatch", 1, "position");
    if (remaining === 0) return report("incomplete", 1, "depth");
    if (remaining !== null) remaining--;
    const accepted = anchors.find(row => row.value.format === cited.format && row.value.genesis === cited.genesis && row.value.position === position - 1);
    if (accepted) {
      if (accepted.value.event !== predecessor) return report("mismatch", 1, "anchor");
      anchor = accepted.text; trusts = [accepted.text]; break;
    }
    bytes = await read(() => source.predecessor(cited.format, predecessor));
    if (!bytes) return report("incomplete", 1, "unavailable");
    currentDigest = await hash(bytes);
    if (currentDigest === null) return report("incomplete", 1, "unavailable");
    if (currentDigest !== predecessor) return report("mismatch", 1, "digest");
    position--;
    if (cited.format === "dap1") {
      dap = dapEvent(bytes);
      if (!dap) return report("mismatch", 1, "position");
      const why = dapFields(dap, position, cited.genesis);
      if (why) return report("mismatch", 1, why);
      readDap.push(dap);
    }
  }
  if (requested === 2) return report("ok", 2, null, anchor, trusts);
  if (cited.format !== "dap1") return report("incomplete", 2, "profile", anchor, trusts);
  return readDap.every(signatures) ? report("ok", 3, null, anchor, trusts) : report("mismatch", 2, "signature", anchor, trusts);
}
