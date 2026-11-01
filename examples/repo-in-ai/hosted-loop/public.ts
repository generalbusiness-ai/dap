/** The only way a word leaves this script: a closed projection, then a scan of the bytes. */
import { stop, type LoopPhase } from "./words.ts";

export interface PublicResult {
  phase: LoopPhase;
  actor: "operator" | "person" | "agent";
  status: "observed" | "accepted" | "refused" | "unresolved" | "not-found" | "timed-out";
  facts?: Record<string, unknown>;
  refs?: Record<string, unknown>;
  values?: Record<string, unknown>;
}

/** A reference or a fixed word. Free text, a body, a link, a bearer and a secret fit none of these. */
const PUBLIC_STRING = [
  /^sc_[a-z2-7]{52}$/, /^in_[a-z2-7]{26}$/, /^sha256:[0-9a-f]{64}$/, /^key_[A-Za-z0-9_-]{43}$/, /^[0-9a-f]{40}$/,
  /^platform:[a-z]+@[0-9]+$/, /^@[a-z0-9][a-z0-9-]{0,47}$/, /^(?!.*[a-z0-9_-]{32})[a-z][a-z0-9._-]{0,47}$/, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
];
const closedValue = (value: unknown, depth = 0): boolean => {
  if (depth > 8) return false;
  if (value === null || typeof value === "boolean" || typeof value === "number" && Number.isSafeInteger(value)) return true;
  if (typeof value === "string") return PUBLIC_STRING.some(shape => shape.test(value));
  if (Array.isArray(value)) return value.length <= 128 && value.every(entry => closedValue(entry, depth + 1));
  return typeof value === "object" && Object.entries(value).length <= 64
    && Object.entries(value).every(([key, entry]) => /^[A-Za-z][A-Za-z0-9-]{0,47}$/.test(key) && !FORBIDDEN_KEYS.has(key.toLowerCase()) && closedValue(entry, depth + 1));
};
const FORBIDDEN_KEYS = new Set(["bearer", "secret", "token", "link", "body", "text", "content", "comment", "conditions", "question", "authorization", "invitation", "seed", "key-secret"]);

/** The line a phase prints. A value outside the closed shapes stops the phase before any byte is written. */
export function publicLine(result: PublicResult): string {
  const { phase, actor, status, facts, refs, values, ...rest } = result;
  if (Object.keys(rest).length > 0 || !closedValue({ phase, actor, status }) || !closedValue(facts ?? null) || !closedValue(refs ?? null) || !closedValue(values ?? null)) return stop("public-output");
  return JSON.stringify(result) + "\n";
}

const SHAPES: readonly [string, RegExp][] = [
  ["bearer-header", /\bBearer\s/],
  ["control-header", /\bControl\s+[A-Za-z0-9_-]{16}/],
  ["invitation-link", /artroom-(?:agent-key|checker-key|invite|invitation)[:-]/i],
  ["private-key-name", /"(?:bearer|secret|link|body|content|comment|conditions|question|token|authorization)"\s*:/i],
  ["agent-object-or-bearer", /(?<!sha256:)\b[0-9a-f]{64}\b/],
];
/** A long run of token characters that no public reference explains. */
const TOKEN = /[A-Za-z0-9_-]{32,}/g;
const EXPLAINED = [/^sc_[a-z2-7]{52}$/, /^in_[a-z2-7]{26}$/, /^key_[A-Za-z0-9_-]{43}$/, /^[0-9a-f]{40}$/];
const afterDigest = (text: string, at: number): boolean => text.slice(Math.max(0, at - 7), at) === "sha256:";

/** Every problem in text a run produced. `exact` holds the run's private bytes: the bearer, its secret, the link, the room's texts. */
export function scanPublic(text: string, exact: readonly string[] = []): string[] {
  const found: string[] = [];
  for (const value of exact) if (value.length > 0 && text.includes(value)) found.push("exact-private-value");
  for (const [name, shape] of SHAPES) if (shape.test(text)) found.push(name);
  for (const match of text.matchAll(TOKEN)) {
    if (!EXPLAINED.some(shape => shape.test(match[0])) && !afterDigest(text, match.index)) found.push("unexplained-token");
  }
  return [...new Set(found)];
}
