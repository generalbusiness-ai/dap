/** Test-only answer oracle. No input, reader, clock or proof is serialized. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

export const oracleBase = "270dc8c7a69a4506fc3d5525339f08a4adb2803f";
export const oracleOwners = [
  "packages/derive/test/judge.test.ts",
  ...[
    "archive-anchor-ranges", "archive-command", "archive-git", "archive", "capacity",
    "child-definitions", "cli", "decisions", "definition-format", "floor", "genesis-bodies",
    "late", "recovered-bytes", "room-recovery", "room-verification", "source-order",
    "text-refusals", "verify", "view",
  ].map(name => `packages/replay/test/${name}.test.ts`),
] as const;

// These are the only paths a baseline worktree may overlay before capture.
export const oracleHarnessPaths = [
  "packages/derive/test/judge-oracle.ts", "packages/derive/test/judge-oracle.setup.ts",
  "packages/derive/test/judge-oracle.test.ts", "packages/derive/vitest.config.ts",
  "packages/replay/vitest.config.ts", "scripts/e1-judge-oracle.mjs",
  "notes/implementation/2026-11-14-e1-explore.md",
];
export const sha256 = (bytes: string): string => createHash("sha256").update(bytes).digest("hex");
export type OracleList = "runtime" | "replay";
export interface OracleCase { kind: "test" | "collection"; path: readonly string[]; position: string }
export interface OracleRow { list: OracleList; owner: string; case: OracleCase; calls: number; sha256: string }
export interface OracleAnswer { list: OracleList; owner: string; case: OracleCase; index: number; bytes: string; sha256: string }
export interface OracleFixture { format: 1; base: string; harness: string; owners: readonly string[]; cases: OracleRow[] }

/** Tags distinguish absent fields, undefined, array holes, and collection order.
 * Reject other values instead of silently dropping an answer field. */
export function answerBytes(answer: unknown): string {
  const active = new Set<object>();
  const encode = (value: unknown): unknown => {
    if (value === null) return ["null"];
    switch (typeof value) {
      case "undefined": return ["undefined"];
      case "string": return ["string", value];
      case "boolean": return ["boolean", value];
      case "number": return ["number", Object.is(value, -0) ? "-0" : String(value)];
      case "bigint": return ["bigint", String(value)];
      case "object": break;
      default: throw new Error(`Unsupported oracle answer value: ${typeof value}`);
    }
    if (active.has(value)) throw new Error("Cyclic oracle answer");
    active.add(value);
    try {
      if (value instanceof Map || value instanceof Set) {
        if (Reflect.ownKeys(value).length) throw new Error("Oracle collection has extra own fields");
        return value instanceof Map
          ? ["map", [...value].map(([key, item]) => [encode(key), encode(item)])]
          : ["set", [...value].map(encode)];
      }
      if (Array.isArray(value)) {
        if (Reflect.ownKeys(value).some(key => key !== "length" && (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length))) {
          throw new Error("Oracle array has extra own fields");
        }
        return ["array", Array.from({ length: value.length }, (_, index) => {
          const descriptor = Object.getOwnPropertyDescriptor(value, index);
          if (!descriptor) return ["hole"];
          if (!descriptor.enumerable || !("value" in descriptor)) throw new Error("Oracle array has a non-data field");
          return encode(descriptor.value);
        })];
      }
      const prototype: unknown = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) throw new Error("Unsupported oracle answer object");
      const keys = Reflect.ownKeys(value);
      if (keys.some(key => typeof key !== "string")) throw new Error("Oracle answer has symbol fields");
      return [prototype === null ? "null-object" : "object", (keys as string[]).sort().map(key => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
        if (!descriptor.enumerable || !("value" in descriptor)) throw new Error("Oracle answer has a non-data field");
        return [key, encode(descriptor.value)];
      })];
    } finally { active.delete(value); }
  };
  return JSON.stringify(encode(answer));
}

const caseKey = (row: Pick<OracleRow, "list" | "owner" | "case">): string => JSON.stringify([row.list, row.owner, row.case.kind, row.case.path, row.case.position]);
const aggregate = (hashes: readonly string[]): string => sha256(hashes.map(hash => hash + "\n").join(""));
const ordered = (rows: OracleRow[]): OracleRow[] => rows.sort((a, b) => caseKey(a) < caseKey(b) ? -1 : caseKey(a) > caseKey(b) ? 1 : 0);

export class AnswerOracle {
  readonly answers: OracleAnswer[] = [];
  readonly #counts = new Map<string, number>();
  readonly owner: string;
  constructor(owner: string) { this.owner = owner; }
  record(list: OracleList, label: OracleCase, answer: unknown): void {
    const key = caseKey({ list, owner: this.owner, case: label });
    const index = this.#counts.get(key) ?? 0;
    const bytes = answerBytes(answer);
    this.answers.push({ list, owner: this.owner, case: label, index, bytes, sha256: sha256(bytes) });
    this.#counts.set(key, index + 1);
  }
  rows(): OracleRow[] { return rowsOf(this.answers); }
}

export function rowsOf(answers: readonly OracleAnswer[]): OracleRow[] {
  const groups = new Map<string, OracleAnswer[]>();
  for (const answer of answers) {
    if (!Number.isSafeInteger(answer.index) || answer.index < 0 || answer.sha256 !== sha256(answer.bytes)) throw new Error("Invalid oracle answer bytes or hash");
    const key = caseKey(answer), group = groups.get(key) ?? [];
    if (answer.index !== group.length) throw new Error("Oracle call index changed; no realignment allowed");
    group.push(answer); groups.set(key, group);
  }
  return ordered([...groups.values()].map(group => {
    const first = group[0]!;
    return { list: first.list, owner: first.owner, case: first.case, calls: group.length, sha256: aggregate(group.map(answer => answer.sha256)) };
  }));
}

function validCase(value: unknown): value is OracleCase {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (v["kind"] === "test" || v["kind"] === "collection") && Array.isArray(v["path"])
    && v["path"].every(name => typeof name === "string") && typeof v["position"] === "string";
}

export function readFixture(path: string): OracleFixture {
  const f: OracleFixture = JSON.parse(readFileSync(path, "utf8"));
  if (f.format !== 1 || f.base !== oracleBase || !/^[0-9a-f]{40}$/.test(f.harness)
    || JSON.stringify(f.owners) !== JSON.stringify(oracleOwners) || !Array.isArray(f.cases)) throw new Error("Invalid E1 answer fixture header");
  const seen = new Set<string>();
  for (const row of f.cases) {
    if (!row || !["runtime", "replay"].includes(row.list) || !f.owners.includes(row.owner) || !validCase(row.case)
      || !Number.isSafeInteger(row.calls) || row.calls <= 0 || !/^[0-9a-f]{64}$/.test(row.sha256) || seen.has(caseKey(row))) throw new Error("Invalid or repeated E1 case row");
    seen.add(caseKey(row));
  }
  return f;
}

export function regenerationCommand(harness: string): string {
  return [
    `# Capture-only harness checkpoint; production and owner bytes are checked against ${oracleBase}.`,
    `git worktree add --detach <baseline-worktree> ${harness}`,
    "# Give that worktree an owned, lock-matching dependency view. Do not install into it.",
    "cd <baseline-worktree>",
    "node scripts/e1-judge-oracle.mjs capture <new-external-directory>",
  ].join("\n");
}

/** The committed rows alone decide equality. Raw bytes only explain a failure. */
export function compareAnswers(expected: readonly OracleRow[], current: AnswerOracle, options: { harness: string; raw?: string | undefined }): string[] {
  const actual = current.rows(), want = new Map(expected.map(row => [caseKey(row), row]));
  const got = new Map(actual.map(row => [caseKey(row), row]));
  const differences: string[] = [];
  let baseline: OracleAnswer[] | undefined;
  let rawProblem: string | undefined;
  const rawAnswers = (): OracleAnswer[] | undefined => {
    if (baseline || rawProblem) return baseline;
    if (!options.raw || !existsSync(options.raw)) { rawProblem = "Baseline raw capture absent."; return undefined; }
    try {
      const records = readFileSync(options.raw, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line) as OracleAnswer);
      baseline = records.filter(row => row.owner === current.owner);
      const rows = rowsOf(baseline);
      if (JSON.stringify(rows) !== JSON.stringify(ordered([...expected]))) throw new Error("raw capture does not match committed case rows");
      return baseline;
    } catch (error) { baseline = undefined; rawProblem = `Baseline raw capture unusable: ${String(error)}`; return undefined; }
  };
  for (const key of [...new Set([...want.keys(), ...got.keys()])].sort()) {
    const before = want.get(key), after = got.get(key);
    if (before && after && before.calls === after.calls && before.sha256 === after.sha256) continue;
    const now = current.answers.filter(row => caseKey(row) === key);
    const lines = [`E1 answer difference ${key}`, `baseline calls: ${before?.calls ?? 0}; current calls: ${after?.calls ?? 0}`,
      ...now.map(row => `current[${row.index}]: ${row.bytes}`)];
    const old = rawAnswers()?.filter(row => caseKey(row) === key);
    if (old) {
      const index = Array.from({ length: Math.max(old.length, now.length) }, (_, i) => i).find(i => old[i]?.sha256 !== now[i]?.sha256);
      if (index !== undefined) lines.push(`first differing call: ${index}`, `baseline[${index}]: ${old[index]?.bytes ?? "<no call>"}`);
    } else lines.push(rawProblem!, "Regenerate at the unchanged baseline:", regenerationCommand(options.harness));
    differences.push(lines.join("\n"));
  }
  return differences;
}
