/** Genuine Directory16 creation and SQLite. Host/clock/setup authority and
 * reviewed policies are TEST stand-ins; these are admission/order checks,
 * never hosted export or archive custody evidence. */
import { expect, test } from "vitest";
import { runInDurableObject } from "cloudflare:test";
import { PROPOSED_BOUNDS, type PlatformDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, parseStrict } from "@generalbusiness/dap-bytes";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as C, VERSIONS, platform } from "@generalbusiness/dap-platform";
import { outcomeValueDomains, ownersOf, validateDefinition, type OperationRules } from "@generalbusiness/dap-derive";
import { RULE_PROFILES } from "@generalbusiness/dap-derive/rule";
import { forecastArchiveForeignColdCopy } from "../src/archive-foreign-cost.ts";
import { forecastArchiveSourceLookup } from "../src/archive-source-cost.ts";
import { NATIVE_DECLARATION_PINS } from "../../platform/src/native-declarations.generated.ts";
import { ArchiveBudget, type ArchiveCost } from "../src/archive-budget.ts";
import { archivePrefixMetadata, archiveRootMetadata } from "../src/archive-prefix.ts";
import { ArchiveDeclarations } from "../src/archive-declarations.ts";
import { ArchiveRetainedReader } from "../src/archive-retained.ts";
import { FixtureArchiveSourcePins } from "../src/archive-source-pins.ts";
import { ArchiveForeignMetadata } from "../src/archive-foreign.ts";
import { ArchiveScout } from "../src/archive-scout.ts";
import type { ArchivePolicyRegistry } from "../src/archive-inventory.ts";
import { CAPABILITY_CODE } from "../src/ports.ts";
import { archiveSql } from "./support/archive.ts";
import { sessionRoom } from "./fixtures-native.ts";

function reviewed(named: PlatformDefinition): ArchivePolicyRegistry {
  const supplied = platform(named)!;
  const checked = validateDefinition(parseStrict(canonicalize(supplied.data)), PROPOSED_BOUNDS, RULE_PROFILES,
    { platform: true, outcomeValues: outcomeValueDomains(supplied.data, supplied.rules) });
  if (!checked.ok) throw Error("Actual native declaration must validate");
  return new Map([[named, { review: "TEST native metadata admission only", entryTypes: new Set(["genesis"]),
    support: { named, definition: checked.definition, capabilities: { ...CAPABILITY_CODE, implements: value => CAPABILITY_CODE.implements(value) },
      owners: new Map(), records: new Map(), preparations: new Map() } }]]);
}
// This observes original B*16 reservations, not validator/hash invocations.
// Whole-operation deletion is established separately by source composition.
class Counted extends ArchiveBudget {
  nativeReservations = 0;
  readonly order: string[] = [];
  override spend(cost: Partial<ArchiveCost>): void {
    if (cost.nodes === 1 && cost.inputWork === PROPOSED_BOUNDS.definitionBytes * 16) {
      this.nativeReservations++; this.order.push("native-data-reservation");
    }
    super.spend(cost);
  }
}

test("fresh native root semantics replace only the separate prefix operation and child closure stays after admission", async context => {
  const room = await sessionRoom(C.register);
  try {
    const at = await room.D.at(), through = (await room.D.summary()).at, policies = reviewed(C.directory);
    const result = await runInDurableObject(room.D.object, (_instance, state) => state.storage.transactionSync(() => {
      const native = archiveSql(state), legacy = new Counted();
      const old = archivePrefixMetadata(native, at, through, PROPOSED_BOUNDS, legacy, new Set());
      const oldDeclarations = new ArchiveDeclarations(new ArchiveRetainedReader(native, legacy), PROPOSED_BOUNDS, policies, new Set());
      const oldRoot = oldDeclarations.root(C.directory);
      const budget = new Counted(), walk = ArchiveDeclarations.prototype.walk;
      const sql = { ...native, exec(query: string, ...args: Parameters<typeof native.exec> extends [string, ...infer Rest] ? Rest : never) {
        if (query.startsWith("SELECT seq,")) budget.order.push("prefix-positions");
        return native.exec(query, ...args);
      } };
      ArchiveDeclarations.prototype.walk = function (this: ArchiveDeclarations, ...args: Parameters<ArchiveDeclarations["walk"]>) {
        expect(budget.order).toContain("prefix-positions");
        budget.order.push("child-closure"); return walk.apply(this, args);
      };
      try {
        const next = archiveRootMetadata(sql, at, through, PROPOSED_BOUNDS, budget, policies);
        expect(next.platformClosure?.complete).toBe(true);
        expect(next.prefix).toEqual(old); expect(next.definition.digest).toBe(oldRoot.definition.digest);
        expect(legacy.nativeReservations).toBe(2); expect(budget.nativeReservations).toBe(1);
        expect(budget.order).toEqual(["native-data-reservation", "prefix-positions", "child-closure"]);
        for (const key of Object.keys(legacy.admitted()) as (keyof ArchiveCost)[]) {
          expect(legacy.admitted()[key] - budget.admitted()[key]).toBe(
            key === "inputWork" ? PROPOSED_BOUNDS.definitionBytes * 16 : key === "nodes" ? 1 : 0);
        }
        return { legacy: legacy.admitted(), coupled: budget.admitted(), order: budget.order };
      } finally { ArchiveDeclarations.prototype.walk = walk; }
    }));
    (context.task.meta as Record<string, unknown>)["nativeRootCoupling"] = { result,
      qualification: "Actual Native Directory/SQLite, standalone versus coupled metadata/root operations on separate original ledgers; no child read before pin admission. Counts are B*16 reservation counts, not direct validation/hash call observations; whole-operation deletion is source-proven separately. Original trusted SQL/registry/Budget interfaces are required; observational wrappers delegate unchanged and do not mutate semantics. No caller callback interrupts validation/admission/closure. No data export or fit claim." };
  } finally { room.life.release(); }
});

test("native semantic refusal precedes prefix selection and a real checkpoint requires fresh root validation", async context => {
  const room = await sessionRoom(C.register);
  try {
    const at = await room.D.at(), through = (await room.D.summary()).at, policies = reviewed(C.directory);
    const receipt = await runInDurableObject(room.D.object, async (_instance, state) => {
      const native = archiveSql(state), policy = policies.get(C.directory)!, bad = new Map(policies), budget = new Counted();
      bad.set(C.directory, { ...policy, support: { ...policy.support, definition: { ...policy.support.definition,
        declared: { ...policy.support.definition.declared, name: "TEST wrong reviewed declaration" } } } });
      const queries: string[] = [], sql = { ...native, exec(query: string, ...args: Parameters<typeof native.exec> extends [string, ...infer Rest] ? Rest : never) {
        queries.push(query); return native.exec(query, ...args);
      } };
      state.storage.transactionSync(() => {
        expect(() => archiveRootMetadata(sql, at, through, PROPOSED_BOUNDS, budget, bad)).toThrow("archive-unsupported-archive-cohort");
      });
      expect(budget.nativeReservations).toBe(1);
      expect(queries.some(query => query.startsWith("SELECT seq,") || query.includes("FROM retained_input") || query.startsWith("SELECT bytes FROM entry"))).toBe(false);
      const scoutBudget = new Counted();
      const frame = state.storage.transactionSync(() => ArchiveScout.openRoot(native, at, through, null, PROPOSED_BOUNDS, policies, scoutBudget));
      state.storage.transactionSync(() => frame.close()); // actual Scout checkpoint, no root result escapes it
      expect(scoutBudget.nativeReservations).toBe(1);
      await Promise.resolve();
      const fresh = new Counted();
      // A changed review after the checkpoint is actually revalidated, not
      // admitted by the completed semantic result from the earlier frame.
      state.storage.transactionSync(() => {
        expect(() => archiveRootMetadata(sql, at, through, PROPOSED_BOUNDS, fresh, bad)).toThrow("archive-unsupported-archive-cohort");
      });
      expect(fresh.nativeReservations).toBe(1);
      const final = new Counted();
      const completed = state.storage.transactionSync(() => archiveRootMetadata(native, at, through, PROPOSED_BOUNDS, final, policies));
      expect(completed.platformClosure?.complete).toBe(true); expect(final.nativeReservations).toBe(1);
      return { refused: budget.admitted(), scout: scoutBudget.admitted(), freshRefused: fresh.admitted(), final: final.admitted() };
    });
    (context.task.meta as Record<string, unknown>)["nativeRootFreshFrames"] = { receipt,
      qualification: "Genuine Native scope and checkpoint. B*16 reservation counts; fresh semantic review refusal before prefix/child reads. Trusted non-mutating observational ports, not a hostile virtual-port proof. No payload export or fit claim." };
  } finally { room.life.release(); }
});


test("static native consumption admits reverted preparation and refuses lasting registry or policy changes at its fresh fence", async context => {
  const room = await sessionRoom(C.register);
  const original = platform(C.register)!;
  try {
    const rootAt = await room.R.at(), directoryAt = await room.D.at();
    const [birth] = await room.R.sealed(), history = await room.D.sealed();
    if (!birth) return expect.fail("Actual Register genesis required");
    const selected = history.find(row => row.entry.uses.some(use => canonicalize(use.fact.at) === canonicalize(rootAt)));
    if (!selected) return expect.fail("Actual Directory consumer of Register required");
    const checked = validateDefinition(original.data, PROPOSED_BOUNDS, RULE_PROFILES,
      { platform: true, outcomeValues: outcomeValueDomains(original.data, original.rules) });
    if (!checked.ok) return expect.fail("Actual native source must validate");
    expect(checked.definition.declared).toBe(original.data);
    const code = ownersOf(checked.definition, { named: C.register, rules: original.rules }, null);
    const kinds = new Map<string, OperationRules>();
    for (const kind of Object.keys(original.data.outcomes ?? {})) {
      const rules = code?.rules(C.register, kind);
      if (!rules) return expect.fail("Actual native owner rules required");
      kinds.set(kind, rules);
    }
    const policy = { review: "TEST actual native foreign consumer; no export authority", entryTypes: new Set(["genesis", "act", "delivery", "outcome"] as const),
      support: { named: C.register, definition: checked.definition, owners: new Map([[C.register, kinds]]), records: new Map(), preparations: new Map() } };
    const policies = new Map([[C.register, policy]]);
    const input = { at: rootAt, birth: { bytes: canonicalize(birth.entry), hash: birth.hash } };
    const preparation = new ArchiveBudget(), sources = new FixtureArchiveSourcePins([input], PROPOSED_BOUNDS, preparation, policies);
    expect(sources.get(rootAt, new ArchiveBudget())?.staticNative).toBe(true);
    const conservativeBudget = new ArchiveBudget();
    const conservative = new FixtureArchiveSourcePins([input], PROPOSED_BOUNDS, conservativeBudget);
    expect(conservative.get(rootAt, new ArchiveBudget())?.staticNative).toBeUndefined();
    const extra = forecastArchiveSourceLookup(71);
    for (const key of Object.keys(extra) as (keyof ArchiveCost)[]) {
      expect(conservativeBudget.admitted()[key] - preparation.admitted()[key]).toBe(
        (key === "inputWork" ? PROPOSED_BOUNDS.definitionBytes * 16 : 0) - extra[key]);
    }
    const projection = NATIVE_DECLARATION_PINS[C.register];
    try {
      Reflect.deleteProperty(NATIVE_DECLARATION_PINS, C.register);
      const missed = new ArchiveBudget();
      expect(() => new FixtureArchiveSourcePins([input], PROPOSED_BOUNDS, missed, policies)).toThrow("archive-unsupported-archive-cohort");
      expect(missed.admitted().attempts).toBe(2); // eligibility and failed static lookup both paid
    } finally { Reflect.set(NATIVE_DECLARATION_PINS, C.register, projection); }
    expect(selected.entry.uses.every(use => canonicalize(use.fact.at) === canonicalize(rootAt))).toBe(true);
    const positive = await runInDurableObject(room.D.object, (_instance, state) => state.storage.transactionSync(() => {
      const native = archiveSql(state);
      const scan = (pins: FixtureArchiveSourcePins) => {
        const budget = new ArchiveBudget();
        const prefix = archivePrefixMetadata(native, directoryAt, { seq: selected.entry.seq, hash: selected.hash }, PROPOSED_BOUNDS, budget, new Set());
        const position = prefix.positions.find(position => position.seq === selected.entry.seq)!;
        const foreign = new ArchiveForeignMetadata(native, pins, policies, PROPOSED_BOUNDS, budget, new Set(), C.directory, { record: true });
        foreign.scan(position, selected.entry.uses.length);
        const recorded = foreign.recorded(position);
        expect(foreign.selection().length).toBeGreaterThan(0);
        return { spent: budget.admitted(), recorded };
      };
      const projected = scan(sources), originalPath = scan(conservative);
      const cold = projected.recorded.requests.filter(request => request.kind === "cold");
      expect(cold.length).toBeGreaterThan(0);
      const lookup = forecastArchiveSourceLookup(null);
      for (const key of Object.keys(lookup) as (keyof ArchiveCost)[]) {
        expect(projected.spent[key] - originalPath.spent[key]).toBe(cold.length * lookup[key]);
      }
      for (const request of cold) {
        const next = forecastArchiveForeignColdCopy(request.footprint), previous = forecastArchiveForeignColdCopy({ ...request.footprint, staticNative: false });
        expect(request.footprint.staticNative).toBe(true);
        if (!next.ok || !previous.ok) return expect.fail("Actual accepted cold copy must have a finite forecast");
        for (const key of ["attempts", "calls", "metadata", "inputWork"] as const) expect(next.work[key] - previous.work[key]).toBe(lookup[key]);
      }
      return { projected: projected.spent, conservative: originalPath.spent, cold: cold.length };
    }));
    const originalDeclaredText = canonicalize(original.data);
    const branchField = original.data.acts["found"]!.fields["branch"]!;
    const originalMax = Reflect.get(branchField, "max");
    expect(originalMax).toBe(256);
    // Planner b9e821dd: preparation stages bytes, not admission. Unlike
    // the original route, a transient trusted-code defect reverted before
    // the fresh synchronous consumption fence does not force refusal.
    const { staged, observedOriginal } = await (async () => {
      try {
        Reflect.set(branchField, "max", 255);
        const staged = new FixtureArchiveSourcePins([input], PROPOSED_BOUNDS, new ArchiveBudget(), policies);
        const observedOriginal = new FixtureArchiveSourcePins([input], PROPOSED_BOUNDS, new ArchiveBudget());
        expect(staged.get(rootAt, new ArchiveBudget())!.declaration).toBe(originalDeclaredText);
        expect(observedOriginal.get(rootAt, new ArchiveBudget())!.declaration).not.toBe(originalDeclaredText);
        await Promise.resolve();
        return { staged, observedOriginal };
      } finally { Reflect.set(branchField, "max", originalMax); }
    })();
    const revertedPreparation = await runInDurableObject(room.D.object, (_instance, state) => state.storage.transactionSync(() => {
      const native = archiveSql(state);
      const consume = (pins: FixtureArchiveSourcePins, refuses: boolean) => {
        const budget = new ArchiveBudget();
        const prefix = archivePrefixMetadata(native, directoryAt, { seq: selected.entry.seq, hash: selected.hash }, PROPOSED_BOUNDS, budget, new Set());
        const position = prefix.positions.find(position => position.seq === selected.entry.seq)!;
        const foreign = new ArchiveForeignMetadata(native, pins, policies, PROPOSED_BOUNDS, budget);
        if (refuses) expect(() => foreign.scan(position, selected.entry.uses.length)).toThrow("archive-foreign-source-mismatch");
        else { foreign.scan(position, selected.entry.uses.length); expect(foreign.selection().length).toBeGreaterThan(0); }
        return budget.admitted();
      };
      return { staticAdmitsA: consume(staged, false), originalRefusesObservedB: consume(observedOriginal, true) };
    }));
    const refusals: string[] = [];
    for (const mutation of ["wrapper", "nested", "cloned-policy"] as const) {
      // The actual source preparation returns asynchronously before Scout's
      // fresh synchronous foreign join; no prepared policy admission crosses it.
      await Promise.resolve();
      try {
        if (mutation === "wrapper") Reflect.set(VERSIONS, C.register, { ...original, data: { ...original.data, name: "TEST replaced registry" } });
        else Reflect.set(branchField, "max", 255);
        if (mutation === "cloned-policy") policies.set(C.register, { ...policy, support: { ...policy.support,
          definition: { ...policy.support.definition, declared: parseStrict(originalDeclaredText) as typeof checked.definition.declared } } });
        const receipt = await runInDurableObject(room.D.object, (_instance, state) => state.storage.transactionSync(() => {
          const native = archiveSql(state), budget = new ArchiveBudget(), queries: string[] = [];
          const sql = { ...native, exec(query: string, ...args: Parameters<typeof native.exec> extends [string, ...infer Rest] ? Rest : never) {
            queries.push(query); return native.exec(query, ...args);
          } };
          const prefix = archivePrefixMetadata(sql, directoryAt, { seq: selected.entry.seq, hash: selected.hash }, PROPOSED_BOUNDS, budget, new Set());
          const position = prefix.positions.find(position => position.seq === selected.entry.seq)!;
          const foreign = new ArchiveForeignMetadata(sql, sources, policies, PROPOSED_BOUNDS, budget);
          expect(() => foreign.scan(position, selected.entry.uses.length)).toThrow("archive-foreign-source-mismatch");
          expect(queries.some(query => /^SELECT bytes FROM retained_input/.test(query))).toBe(false);
          return { mutation, spent: budget.admitted() };
        }));
        refusals.push(receipt.mutation);
      } finally {
        Reflect.set(VERSIONS, C.register, original); Reflect.set(branchField, "max", originalMax); policies.set(C.register, policy);
      }
    }
    expect(refusals).toEqual(["wrapper", "nested", "cloned-policy"]);
    (context.task.meta as Record<string, unknown>)["staticNativeBinding"] = { positive, revertedPreparation, refusals, preparation: preparation.admitted(),
      qualification: "Genuine Native Register birth, Directory retained consumer and SQLite; TEST authority/policy/clock. Intentional module configuration mutations restored in finally after an async preparation boundary. Fresh synchronous consumption before payload: reverted preparation admits reviewed A; lasting nested change, wrapper replacement and cloned-policy alias loss refuse. Nonalias sources preserve the original preparation observation. No hosted acceptance or complete export claim." };
  } finally { Reflect.set(VERSIONS, C.register, original); room.life.release(); }
});
