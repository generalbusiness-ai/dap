import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import type { ScopeKind, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as cohort } from "@generalbusiness/dap-platform";
import { memoryStore } from "../../../packages/cli/src/store.ts";
import { laneState } from "../journal.ts";
import { retain, retained, type SetupPlan } from "../plan.ts";
import { publicationPhase } from "../publication.ts";
import type { Session } from "../session.ts";

// The actual phases, helper and receipts run. The sessions and the lane's fold
// are stand-ins: this file writes each answer, and no journal stands behind it.
// test/session.test.mjs reads a pending lane through the actual session and fold.
vi.mock("../journal.ts", () => ({ laneState: vi.fn() }));

const ref = (kind: ScopeKind): ScopeRef => ({ scope: scopeIdOf({ v: 1, kind, definition: "platform:membership@8", creator: null, cause: textDigest("SCRIPTED publication " + kind), ordinal: 0 }), genesis: textDigest("SCRIPTED publication genesis " + kind) });
const WORDS = {
  "stage-ready": "The actual stage/check outcome is not ready. Read this phase again.",
  published: "The actual publication is not complete. Read this phase again.",
} as const;
type Phase = keyof typeof WORDS;
const NEVER = Number.POSITIVE_INFINITY, COMMIT = "c".repeat(40), INTENT = textDigest("SCRIPTED staged intent");
const phases: Phase[] = ["stage-ready", "published"];

/** `laneAt` and `headAt` name the first attempt, from 0, that sees each outcome settled. */
async function fixture(phase: Phase, script: { laneAt?: number; headAt?: number } = {}) {
  const lane = ref("lane"), refs = { directory: ref("directory"), membership: ref("membership"), rules: ref("rules"), destination: ref("destination") };
  const store = memoryStore(), pauses: unknown[] = [], writes: string[] = [];
  let reads = 0, laneAt = script.laneAt ?? NEVER, headAt = script.headAt ?? (phase === "published" ? NEVER : 0), failure: Error | null = null;
  const written = (name: string) => async (): Promise<never> => { writes.push(name); return { result: { isError: true, structuredContent: {} }, privateRecord: "" } as never; };
  const summary = (scope: ScopeRef, definition: string, items: unknown[] = []) => ({ scope, definition, status: "active", time: "2030-01-01T00:00:00Z", counts: [], items }) as unknown as Summary;
  const read: Session["read"] = async target => {
    if (target.scope === refs.directory.scope) return summary(target, cohort.directory, [{ type: "repository", state: "open", refs }]);
    if (target.scope === refs.membership.scope) return summary(target, cohort.membership);
    if (target.scope === refs.rules.scope) return summary(target, cohort.rules);
    if (target.scope === refs.destination.scope) return summary(target, cohort.destination, [{ type: "branch", refs: {}, values: { head: reads - 1 >= headAt ? COMMIT : "b".repeat(40) } }]);
    return summary(target, "lane");
  };
  const session = (ctx: Session["ctx"]): Session => ({ ctx, read, intent: written("intent"), resolve: written("resolve"), call: written("call"), request: written("request"), submitPrepared: written("submitPrepared"), accepted: written("accepted") });
  await store.save({ v: 2, service: "https://publication.test", key: "operator", repository: { directory: refs.directory, membership: refs.membership, rules: refs.rules.scope, destination: refs.destination.scope } });
  await retain(store, "s1-seed-lane", lane);
  await retain(store, "s1-done-hold", { phase: "hold", status: "accepted", fact: { seq: 1 } });
  await retain(store, "s1-done-manifest-stage", { phase: "manifest-stage", status: "accepted", intent: INTENT });
  await retain(store, "s1-done-manifest", { phase: "manifest", status: "accepted", fact: { seq: 8 } });
  await retain(store, "s1-done-merge", { phase: "merge", status: "accepted", fact: { seq: 9 } });
  await retain(store, "s1-candidate", { base: "a".repeat(40), commit: COMMIT, tree: "d".repeat(40), objects: [], expected: [] });
  vi.mocked(laneState).mockImplementation(async () => {
    const attempt = reads++;
    if (failure) throw failure;
    const settled = attempt >= laneAt;
    const records: Record<string, unknown> = { pin: { state: "provisional", values: { root: 7 } }, root: { state: "live" } };
    return { entries: [], memory: { record: (_owner: string, type: string) => settled ? records[type] : undefined, records: () => settled ? [{}] : [], item: () => ({ state: settled ? "published" : "merged" }) } } as never;
  });
  const owner = session({ store, pause: async (waiting: readonly unknown[]) => { pauses.push(waiting); } } as Session["ctx"]);
  const other = session({ store: memoryStore() } as Session["ctx"]);
  const receipt = () => retained(store, "s1-done-" + phase);
  return {
    owner, pauses, writes, receipt,
    reads: () => reads,
    settle: () => { laneAt = 0; headAt = 0; },
    fail: (error: Error) => { failure = error; },
    /** A stopped phase answers its words, so that a wrong answer fails by an assertion. */
    attempt: (mode: "new" | "check" | "continue") => publicationPhase(owner, other, other, {} as SetupPlan, phase, mode).catch((error: Error) => error.message),
  };
}

beforeEach(() => { vi.mocked(laneState).mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); });

test.each([
  ["stage-ready", "stage-ready", { laneAt: 15 }],
  ["published on its lane", "published", { laneAt: 15, headAt: 0 }],
  ["published on its destination head", "published", { laneAt: 0, headAt: 15 }],
] as const)("%s settling on the last recheck completes in the first attempt and submits nothing", async (_name, phase, script) => {
  const f = await fixture(phase, script);
  expect(await f.attempt("new")).toEqual({ phase, status: "observed" });
  expect([f.reads(), f.pauses.length, f.writes]).toEqual([16, 15, []]);
  expect(await f.receipt()).toEqual({ phase, status: "observed" });
});

test.each(phases)("%s that stays pending stops at the bound with its words, and check recovers it without a wait", async phase => {
  const f = await fixture(phase);
  expect(await f.attempt("new")).toBe(WORDS[phase]);
  expect([f.reads(), f.pauses.length, f.writes]).toEqual([16, 15, []]);
  expect(await f.receipt(), "a stopped phase retains no receipt").toBeNull();
  f.settle();
  expect(await f.attempt("check")).toEqual({ phase, status: "observed" });
  expect([f.reads(), f.pauses.length, f.writes]).toEqual([17, 15, []]);
  expect(await f.receipt()).toEqual({ phase, status: "observed" });
});

test.each(phases)("check on a pending %s reads once and does not pause, and continue waits as new does", async phase => {
  const f = await fixture(phase);
  expect(await f.attempt("check")).toBe(WORDS[phase]);
  expect([f.reads(), f.pauses.length]).toEqual([1, 0]);
  expect(await f.attempt("continue")).toBe(WORDS[phase]);
  expect([f.reads(), f.pauses.length, f.writes]).toEqual([17, 15, []]);
});

test.each(phases)("a failed read of %s stops at once with its own words and no wait", async phase => {
  const f = await fixture(phase);
  f.fail(new Error("The native lane journal is unavailable."));
  expect(await f.attempt("new")).toBe("The native lane journal is unavailable.");
  expect([f.reads(), f.pauses.length]).toEqual([1, 0]);
});

test("the operator's run pauses on the stated timer: 15 rechecks, 2 seconds apart", async () => {
  const f = await fixture("stage-ready"), delays: (number | undefined)[] = [], wait = setTimeout;
  delete (f.owner.ctx as { pause?: unknown }).pause;
  vi.stubGlobal("setTimeout", ((run: () => void, ms?: number) => { delays.push(ms); return wait(run, 0); }) as typeof setTimeout);
  expect(await f.attempt("new")).toBe(WORDS["stage-ready"]);
  expect(delays).toEqual(Array.from({ length: 15 }, () => 2000));
});
