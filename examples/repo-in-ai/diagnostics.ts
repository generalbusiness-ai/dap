/** One new public metadata unit per operator invocation. No private payloads. */
import { chmodSync, closeSync, constants, fchmodSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, parse, resolve, sep } from "node:path";
import type { Fetch } from "@generalbusiness/dap-client";
import type { ScopeRef, SessionRefusal } from "@generalbusiness/dap-contract";

const sessionReasons: Record<SessionRefusal, true> = {
  "sessions-unavailable": true, "bad-request": true, "not-found": true,
  misaddressed: true, "clock-behind": true, expired: true, unauthorized: true,
  replayed: true, "rate-limited": true,
};
type NativeReadReason = SessionRefusal | "unavailable" | "forbidden";
const readReasons: Record<NativeReadReason, true> = { ...sessionReasons, unavailable: true, forbidden: true };
const isReadReason = (reason: unknown): reason is NativeReadReason => typeof reason === "string" && Object.hasOwn(readReasons, reason);

export interface EnrollmentDiagnostic {
  stage: "identity" | "plan-only-check" | "plan-only-proof" | "invitation-pre-root" | "invitation-root-retaining" | "invitation-root-retained" | "invitation-resume" | "invitation-result" | "receiver";
  cause?: "engine-error" | "filesystem-error" | "identity-refusal" | "prepared" | "unknown" | "refused" | "verified";
  identityReason?: string;
  filesystemCode?: string;
  nativeReason?: NativeReadReason;
  read?: { method: "GET" | "POST" | "other"; category: "membership-session" | "membership-summary" | "membership-entry" | "other"; status: number | null };
}

const identityReasons = new Set([
  "invalid-mode", "invalid-home", "home-unavailable", "linked-or-nondirectory-home", "home-not-owner-only", "occupied-new-home",
  "invalid-private-name", "private-record-bound", "private-record-invalid", "private-record-changed", "private-readback", "private-journal-invalid", "private-journal-bound",
  "private-original-missing", "private-original-digest", "private-original-invalid", "invitation-chain-bound", "invitation-operation-changed", "invitation-chain-invalid",
  "enrollment-owner-invalid", "handoff-plan-changed", "handoff-pointer-changed", "handoff-link-changed", "another-invitation-pending", "identity-plan-missing", "identity-plan-changed", "identity-plan-digest-changed",
  "original-invitation-missing", "invitation-private-bound", "invitation-output-changed", "invitation-pointer-changed", "handoff-original-changed", "unowned-receiver-original", "original-receiver-missing",
  "plan-only-binding", "plan-only-receiver-conflict", "plan-only-owner-conflict", "plan-only-orphan", "plan-only-prior-proof", "plan-only-bound",
]);
const filesystemCodes = new Set(["ENOENT", "EACCES", "EPERM", "ENOSPC", "EEXIST", "EIO", "EMFILE", "ENFILE", "EROFS"]);

/** The caller identifies its own refusal class; no arbitrary message escapes. */
export function failureDiagnostic(error: unknown, prior: EnrollmentDiagnostic | null, identityReason?: string): EnrollmentDiagnostic {
  const result: EnrollmentDiagnostic = { ...(prior ?? { stage: "identity" }), cause: "engine-error" };
  if (identityReason !== undefined && identityReasons.has(identityReason)) {
    result.cause = "identity-refusal"; result.identityReason = identityReason;
  }
  const code = error !== null && typeof error === "object" && "code" in error ? error.code : null;
  if (typeof code === "string" && filesystemCodes.has(code)) { result.cause = "filesystem-error"; result.filesystemCode = code; }
  const reason = error !== null && typeof error === "object" && "reason" in error ? error.reason : null;
  if (isReadReason(reason)) result.nativeReason = reason;
  const outcome = error !== null && typeof error === "object" && "outcome" in error ? error.outcome : null;
  if (outcome !== null && typeof outcome === "object" && "lines" in outcome && Array.isArray(outcome.lines)) {
    for (const known of Object.keys(readReasons).filter(isReadReason)) {
      if (outcome.lines.some(line => typeof line === "string" && line.startsWith(`Read session refused: ${known}.`))) result.nativeReason = known;
    }
  }
  return result;
}

/** Observe response status only. Do not clone, decode or retain a body/header. */
export function diagnosticFetch(fetcher: Fetch, membership: ScopeRef, observe: (read: NonNullable<EnrollmentDiagnostic["read"]>) => void): Fetch {
  return async (url, init) => {
    const path = new URL(url).pathname, prefix = `/v1/scopes/${membership.scope}`;
    const category = path === prefix + "/sessions" ? "membership-session" : path === prefix ? "membership-summary" : path.startsWith(prefix + "/entries/") ? "membership-entry" : "other";
    const method = init?.method === "POST" ? "POST" : init?.method === undefined || init.method === "GET" ? "GET" : "other";
    try {
      const response = await fetcher(url, init);
      observe({ method, category, status: response.status });
      return response;
    } catch (error) { observe({ method, category, status: null }); throw error; }
  };
}

export interface Diagnostics {
  finish(value: { phase: string; mode: string; exitCode: number; enrollment: EnrollmentDiagnostic | null }, stderr: string): void;
}

/** Read public input first, then reserve a new directory outside private homes.
 * Missing/invalid arguments start no identity operation. Never reuse a unit. */
export function newDiagnostics(path: string, privateRoot: string): Diagnostics {
  if (!isAbsolute(path) || resolve(path) !== path || path === parse(path).root || path === privateRoot || path.startsWith(privateRoot + sep) || privateRoot.startsWith(path + sep)
    || path.split(sep).includes(".config")) throw Error("Invalid diagnostics directory");
  let current = parse(path).root;
  for (const part of dirname(path).slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, part);
    const info = lstatSync(current);
    if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o222) === 0) throw Error("Invalid diagnostics parent");
  }
  mkdirSync(path, { mode: 0o700 });
  chmodSync(path, 0o700);
  const directory = lstatSync(path);
  if (directory.uid !== process.getuid!() || (directory.mode & 0o077) !== 0) throw Error("Invalid diagnostics owner");
  let finished = false;
  const flushDirectory = (directory = path) => {
    const fd = openSync(directory, constants.O_RDONLY | constants.O_NOFOLLOW);
    try { fsyncSync(fd); } finally { closeSync(fd); }
  };
  flushDirectory(dirname(path)); flushDirectory();
  return { finish(value, stderr) {
    if (finished || stderr.length > 512) throw Error("Diagnostics already closed or oversized");
    const files = [["receipt.json", JSON.stringify({ v: 1, ...value, qualification: "Safe helper status only; response bodies, private originals and arbitrary exception messages are withheld." }, null, 2) + "\n"], ["stderr.log", stderr]] as const;
    for (const [name, body] of files) {
      const file = join(path, name), fd = openSync(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      try {
        const info = fstatSync(fd);
        if (!info.isFile() || info.uid !== process.getuid!() || info.nlink !== 1 || (info.mode & 0o077) !== 0) throw Error("Invalid diagnostics file");
        fchmodSync(fd, 0o600); writeFileSync(fd, body); fsyncSync(fd);
      } finally { closeSync(fd); }
      if (readFileSync(file, "utf8") !== body) throw Error("Diagnostics readback failed");
    }
    flushDirectory(); finished = true;
  } };
}
