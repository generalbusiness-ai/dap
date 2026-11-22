/**
 * The public JSON result of one finite command: the envelope of
 * `notes/2026-10-12-cli-json-output-design.md`, sections 2 to 4.
 *
 * A command builds a typed result or a typed error before anything is
 * rendered. The text renderer prints an Outcome's lines, which stay the
 * private carrier of the existing human words. The JSON renderer takes only
 * the typed value: it never reads those lines, an exception, a path or argv.
 * Every error comes from the closed factories below, whose messages are
 * fixed templates.
 */
import type { Digest, Entry, Head, PlatformDefinition, Read, ScopeRef } from "@generalbusiness/dap-contract";
import type { ActShape } from "./browser-helpers.ts";
import type { Outcome } from "./command-context.ts";

/** Where execution stopped (section 3). */
export type Phase = "parse" | "preflight" | "prepare" | "submit" | "observe" | "local" | "read" | "verify" | "child" | "complete";

/** Each status and its exit (section 3). The process exit is the envelope's `exit`. */
export const STATUS_EXIT = {
  done: 0, partial: 1, refused: 1, unavailable: 1, mismatch: 1, unknown: 1, "not-found": 1, unreadable: 1,
  unsupported: 1, "no-answer": 1, incomplete: 1, inconsistent: 1, usage: 2, waiting: 3, error: 1,
} as const satisfies Record<string, 0 | 1 | 2 | 3>;
export type Status = keyof typeof STATUS_EXIT;

/** The origin of an error (section 3, "Errors identify their origin"). */
export type ErrorKind = "intent" | "creation" | "observed" | "read" | "transport" | "local" | "usage" | "unexpected";

/**
 * The closed codes, each with its fixed message template. `{reason}` takes
 * only a native kebab-case reason. No template takes a path, a key name,
 * argv, exception text or child output.
 */
const MESSAGES = {
  usage: {
    "usage": "The command line does not match a command's usage.",
    "no-room": "No room is set up here.",
    "no-repository": "No repository is known here.",
    "unknown-scope": "No scope of that name is known here.",
    "entry-name": "Name an entry as <scope>:<seq>.",
    "long-lived": "This command runs until it is stopped. It has no finite JSON result.",
    "operator-command": "This operator command has no JSON result in version 1.",
    "no-json-output": "This command has no JSON output yet.",
  },
  local: {
    "config-path-not-directory": "An existing config path is not a directory. Set DAP_HOME explicitly; no configuration was changed.",
    "config-directory-uninspectable": "An existing config directory could not be inspected. Set DAP_HOME explicitly; no configuration was changed.",
    "config-home-conflict": "DAP_HOME and ARTROOM_HOME name different directories. Set only one, or set both to the same directory; no configuration was read or changed.",
    "retired-home": "The config directory names rooms of the old format, which retired at the identifier cutover. Set a new DAP_HOME. Nothing in that directory was changed.",
    "key-missing": "The configured key is missing from the config directory; nothing was signed.",
    "read-session-cache": "The private read-session cache could not be read or saved; no credential was printed.",
    "session-owner-ended": "The read session owner ended; its result was not used.",
    "session-clock-margin": "The issued read session has no 30-second refresh margin on this clock.",
    "no-session": "No read session was issued.",
  },
  read: {
    "refused": "The scope refused the read: {reason}.",
    "session-refused": "The read session was refused: {reason}.",
    "session-check-refused": "The read session check was refused: {reason}.",
    "unsupported-destination": "The destination scope has no supported destination definition.",
    "no-recorded-repository": "The destination records no repository.",
    "history-unreadable": "A history could not be read: {reason}.",
  },
  transport: {
    "no-answer": "No answer was received.",
  },
  unexpected: {
    "unexpected-error": "An unexpected local failure stopped the command.",
  },
} as const;
type Coded = keyof typeof MESSAGES;
export type ErrorCode<K extends Coded> = keyof (typeof MESSAGES)[K] & string;

/** A native refused read, unchanged. */
export type RefusedRead = Extract<Read<unknown>, { ok: false }>;

/** The public error shape of section 4. */
export interface PublicError {
  kind: ErrorKind;
  code: string;
  message: string;
  /** Kind `usage` at the command line: the fixed usage text. */
  usage?: string;
  /** Kind `read`, code `refused`: the native refused Read. */
  read?: RefusedRead;
  /** A native reason, when the code carries one. */
  reason?: string;
  retryAfterSeconds?: number;
  /** Kind `transport`: whether a mutation dispatch may have begun. */
  dispatch?: "none" | "possible";
}

/** A native reason, or `unknown` when the value is not a kebab-case word. */
const nativeReason = (value: unknown): string => typeof value === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(value) ? value : "unknown";
const template = <K extends Coded>(kind: K, code: ErrorCode<K>, reason?: string): string =>
  ((MESSAGES[kind] as Record<string, string>)[code] ?? MESSAGES.unexpected["unexpected-error"]).replace("{reason}", reason ?? "unknown");

export const usageError = (code: ErrorCode<"usage">, usage?: string): PublicError =>
  ({ kind: "usage", code, message: template("usage", code), ...(usage === undefined ? {} : { usage }) });
export const localError = (code: ErrorCode<"local">): PublicError => ({ kind: "local", code, message: template("local", code) });
export const transportError = (dispatch: "none" | "possible"): PublicError =>
  ({ kind: "transport", code: "no-answer", message: template("transport", "no-answer"), dispatch });
export const unexpectedError = (): PublicError => ({ kind: "unexpected", code: "unexpected-error", message: template("unexpected", "unexpected-error") });
/** A read error that carries a native reason but no refused Read. */
export function readReasonError(code: Exclude<ErrorCode<"read">, "refused">, reason?: unknown, retryAfterSeconds?: number): PublicError {
  const native = reason === undefined ? undefined : nativeReason(reason);
  return { kind: "read", code, message: template("read", code, native), ...(native === undefined ? {} : { reason: native }),
    ...(retryAfterSeconds === undefined || !Number.isSafeInteger(retryAfterSeconds) || retryAfterSeconds < 0 ? {} : { retryAfterSeconds }) };
}
/** A native refused read: not-found when the scope says so, unreadable otherwise (section 3). */
export function readError(read: RefusedRead): { status: "not-found" | "unreadable"; error: PublicError } {
  const reason = nativeReason(read.reason);
  return { status: read.reason === "not-found" ? "not-found" : "unreadable", error: { kind: "read", code: "refused", message: template("read", "refused", reason), read } };
}

// ---------------------------------------------------------------- typed results

/** `dap remote` (section 5). `remoteUrl` is null where the room's record does not give the whole URL. */
export interface RemoteResult {
  destination: ScopeRef; head: Head; mode: "published" | "unpublished";
  repository: { host: string; namespace: string; name: string } | null;
  remoteUrl: string | null;
}
/** `dap show` (section 5): the whole native Entry, with its full computed hash and the head of the read. */
export interface ShowResult { scope: ScopeRef; seq: number; hash: Digest; head: Head; entry: Entry }
/** One act's form in the `acts` catalog: native declarations, no programs (section 5). */
export interface ActForm {
  step: ActShape["step"]; on: ActShape["on"]; grant: ActShape["grant"]; fields: ActShape["fields"];
  also?: ActShape["also"]; presents?: Record<string, unknown>;
}
/** An act's public form: its native step, item, grant and field declarations, and its `also` and `presents` when not empty. No guards, effects, sends or other programs. */
export function actFormOf(act: ActShape): ActForm {
  const presents = (act as ActShape & { presents?: Record<string, unknown> }).presents;
  return { step: act.step, on: act.on, grant: act.grant, fields: act.fields,
    ...(act.also !== undefined && Object.keys(act.also).length > 0 ? { also: act.also } : {}),
    ...(presents !== undefined && Object.keys(presents).length > 0 ? { presents } : {}) };
}
/** `dap acts` (section 5). The catalog lists forms, not availability: the scope's guards still decide. */
export interface ActsResult {
  scope: ScopeRef; head: Head; definition: Digest | PlatformDefinition;
  caller: { key: string; standing: { handle: string; role: string } | null };
  membership: { scope: ScopeRef; head: Head } | null;
  acts: Record<string, ActForm>;
  hidden: number;
}
export type PublicResult = RemoteResult | ShowResult | ActsResult;

/** One execution's typed outcome: the input of the JSON renderer. */
export interface Typed { phase: Phase; status: Status; result?: PublicResult; error?: PublicError }

/** An Outcome whose exit follows its typed status; `lines` keep the text renderer's words. */
export const typedOutcome = (typed: Typed, lines: string[]): Outcome => ({ code: STATUS_EXIT[typed.status], lines, typed });
export const typedDone = (result: PublicResult, lines: string[]): Outcome => typedOutcome({ phase: "complete", status: "done", result }, lines);
export const typedStop = (status: Status, phase: Phase, error: PublicError, lines: string[]): Outcome => typedOutcome({ phase, status, error }, lines);

/** The one compact document of a finite invocation (sections 2 and 3), without its newline. */
export function envelope(command: readonly string[], typed: Typed): string {
  return JSON.stringify({ v: 1, command: [...command], phase: typed.phase, status: typed.status, exit: STATUS_EXIT[typed.status],
    ...(typed.result === undefined ? {} : { result: typed.result }), ...(typed.error === undefined ? {} : { error: typed.error }) });
}
