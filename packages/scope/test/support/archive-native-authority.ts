/** Genuine Native Membership8 authority for archive fixture signed histories.
 * Lane definitions, clock, host, target, token and policy are TEST fixtures.
 * The reported budget covers source birth/pin validation only, not native
 * sessionRoom/seat/key/role RPC or wall work; all are external fixture setup.
 * Each writer still pays its existing source lookup charges. No production
 * source-RPC, throughput, custody or full preparation-cost claim follows. */
import { env } from "cloudflare:test";
import { expect, inject, onTestFinished } from "vitest";
import { ARCHIVE_DEVICE_APPLICATION_COHORT, FIRST_ACTIONS_OF } from "@generalbusiness/dap-platform";
import type { Bounds, FactRef, Grant, MemberRef } from "@generalbusiness/dap-contract";
import { canonicalize, isFactRef, isRecord, LATE, unb64url, within } from "@generalbusiness/artroom-bytes";
import type { ValidDefinition } from "@generalbusiness/dap-derive";
import { growArchivePolicies } from "../../../../apps/room/archive-policy.ts";
import { ArchiveBudget } from "../../src/archive-budget.ts";
import { FixtureArchiveSourcePins } from "../../src/archive-source-pins.ts";
import type { ArchivePolicyRegistry } from "../../src/archive-inventory.ts";
import { namespace } from "../../src/namespace.ts";
import { readNativeBirth } from "../../src/native-birth.ts";
import { net, ScriptedClock } from "../../src/testing.ts";
import type { ReadBounds } from "../../src/reads.ts";
import { create, Lane, START, rita } from "../support.ts";
import { rita as repositoryRita } from "../repository.ts";
import { sessionRoom } from "./session-room.ts";
import { archiveDefinition, archivePolicies } from "./archive.ts";
import type {} from "./maintained-applications.ts";

interface Basis { pins: FixtureArchiveSourcePins; policies: ArchivePolicyRegistry; observed: Map<string, FactRef>; setupCost: ReturnType<ArchiveBudget["admitted"]> }
const bases = new WeakMap<Lane, Basis>();
let activeClockOwner: object | null = null;
/** Every public asynchronous Lane entry used by these fixtures is owned.
 * The inherited convenience methods dispatch through these fenced methods. */
class NativeArchiveLane extends Lane {
  constructor(lane: Lane, private readonly active: () => void,
    private readonly run: <T>(action: () => Promise<T>) => Promise<T>) {
    super(lane.name, lane.c, lane.at, lane.genesis, lane.signed);
  }
  override grants(): Grant[] { this.active(); return []; }
  override get object(): Lane["object"] { this.active(); return super.object; }
  override get stub(): Lane["stub"] {
    this.active();
    const source = super.stub;
    return new Proxy(source, { get: (target, key) => {
      this.active();
      const value: unknown = Reflect.get(target, key, target);
      return typeof value === "function" ? (...args: unknown[]) => this.run(() => Promise.resolve(Reflect.apply(value, target, args))) : value;
    } });
  }
  override restart(): Promise<void> { return this.run(() => super.restart()); }
  override alarm(): Promise<boolean> { return this.run(() => super.alarm()); }
  override inside<T>(work: (state: DurableObjectState, instance: object) => T | Promise<T>): Promise<T> {
    return this.run(() => super.inside((state, instance) => { this.active(); return work(state, instance); }));
  }
}
export function archiveAuthorityAnchors(lane: Lane): readonly FactRef[] {
  const basis = bases.get(lane);
  if (!basis) throw Error("Actual Native authority basis required");
  return [...basis.observed.values()].sort((a, b) => a.seq - b.seq || canonicalize(a.at).localeCompare(canonicalize(b.at)));
}
export function archiveAuthorityBasis(lane: Lane): Basis | undefined { return bases.get(lane); }
export function archiveAuthorityPolicies(lane: Lane, policies: ArchivePolicyRegistry = archivePolicies): ArchivePolicyRegistry {
  const basis = bases.get(lane);
  return basis ? new Map([...policies, ...basis.policies]) : policies;
}
export async function nativeArchiveFixture() {
  if (activeClockOwner !== null) throw Error("Native archive fixture clock already owned");
  const owner = {}, previousClock = net.clock, clock = new ScriptedClock(START);
  activeClockOwner = owner; net.clock = clock;
  let nativeLife: Awaited<ReturnType<typeof sessionRoom>>["life"] | undefined;
  const lanes: Lane[] = [];
  let closing = false, closed = false;
  const pending = new Set<Promise<unknown>>(), failures: unknown[] = [];
  const active = () => {
    if (closing || closed || activeClockOwner !== owner || net.clock !== clock) throw Error("Native archive fixture ended");
  };
  const owned = () => {
    if (closed || activeClockOwner !== owner || net.clock !== clock) throw Error("Native archive fixture ownership ended");
  };
  const run = <T>(action: () => Promise<T>, continuation = false): Promise<T> => {
    // An already admitted Lane RPC can still need its inner authority read
    // while closing. Only that internal port can use continuation admission.
    if (continuation) { owned(); if (closing && !pending.size) throw Error("Native archive fixture has no live continuation"); }
    else active();
    // Register before the first await. Completion is fenced too, so a retired
    // test cannot continue through this fixture into a successor's state.
    const task = Promise.resolve().then(() => {
      if (continuation) owned(); else if (!closing) active();
      // This task was registered before close, even if its microtask starts later.
      return action();
    }).then(value => { if (continuation) owned(); else active(); return value; });
    pending.add(task);
    void task.then(() => pending.delete(task), error => { pending.delete(task); failures.push(error); });
    return task;
  };
  let completion: Promise<void> | undefined;
  const close = (): Promise<void> => completion ??= (async () => {
    closing = true;
    const joined = await within(9, async () => {
      for (let round = 0; round < 64; round++) {
        if (!pending.size) break;
        if (pending.size > 4096) throw Error("Native archive fixture exceeded pending-work bound");
        await Promise.allSettled([...pending]);
      }
      if (pending.size) throw Error("Native archive fixture exceeded pending-work rounds");
      // Join existing callbacks on all known native fixture handles, including
      // children discovered during setup. No effect/dispatch or clock advance.
      // This is a finite callback frontier, not transitive quiescence.
      let callbackCount = 0;
      for (let round = 0; round < 64; round++) {
        const nodes = nativeLife?.platforms() ?? [], names = new Set(nodes.map(node => node.name));
        let callbacks = 0;
        for (const node of nodes) {
          const result = await nativeLife!.wait(() => (node.stub as unknown as { awaitScheduledCallbacks(): Promise<{ callbacks: number }> }).awaitScheduledCallbacks());
          if (!Number.isSafeInteger(result.callbacks) || result.callbacks < 0) throw Error("Invalid native fixture callback count");
          callbacks += result.callbacks; callbackCount += result.callbacks;
          if (callbackCount > 4096) throw Error("Native archive fixture callback bound exceeded");
        }
        if (!callbacks && (nativeLife?.platforms() ?? []).every(node => names.has(node.name))) return true;
      }
      throw Error("Native archive fixture callback rounds exceeded");
    });
    // A stuck operation is not cancellable. Fail boundedly but retain the
    // owner/clock/resources: never release live work under a successor.
    if (joined === LATE) throw Error("Native archive fixture work did not settle; ownership retained");
    {
      closed = true;
      try { nativeLife?.release(); }
      finally {
        for (const lane of lanes) { lane.c.membership = null; bases.delete(lane); }
        if (activeClockOwner !== owner || net.clock !== clock) throw Error("Native archive fixture clock ownership changed");
        net.clock = previousClock; activeClockOwner = null;
      }
    }
    if (failures.length) throw new AggregateError(failures, "Native archive fixture owned work failed");
  })();
  // Install before the first await, including native setup itself.
  onTestFinished(close);
  try {
    return await run(async () => {
    if (rita !== repositoryRita) throw Error("Lane and native repository Rita must share the exact fixture identity");
    const room = await sessionRoom(ARCHIVE_DEVICE_APPLICATION_COHORT.register, undefined, undefined, { finish: "external", capture: value => { nativeLife = value; } });
    const life = room.life, membership = room.children[0]!;
    const at = await life.wait(() => membership.at());
    const seat = await life.wait(async () => membership.did(rita, "seat", { expected: await membership.expected({ roster: 0 }) }));
    await life.wait(async () => membership.did(rita, "first-key", { fields: { member: seat }, expected: await membership.expected({ roster: 0, member: seat }) }));
    const packet = unb64url(inject("maintainedApplications").growDemo.bytes);
    if (!packet) throw Error("Exact native archive policy packet required");
    const nativePolicy = growArchivePolicies(new TextDecoder().decode(packet)).get(ARCHIVE_DEVICE_APPLICATION_COHORT.membership);
    if (!nativePolicy) throw Error("Membership8 archive policy required");
    return {
      create(bounds: Partial<Bounds> = {}, reads: Partial<ReadBounds> = {}, under: ValidDefinition = archiveDefinition): Promise<Lane> {
        return run(async () => {
        const actions = [...new Set([...FIRST_ACTIONS_OF[ARCHIVE_DEVICE_APPLICATION_COHORT.membership]!.admin,
          ...Object.values(under.declared.acts).flatMap(act => typeof act.grant === "string" ? [act.grant] : [])])];
        await life.wait(async () => membership.did(rita, "set-actions", { on: 0, expected: await membership.expected({ on: 0 }), fields: { role: "admin", actions } }));
        const opener: MemberRef = { membership: at, member: rita.member.member };
        const made = await create(bounds, reads, under, { opener, clock });
        const lane = new NativeArchiveLane(made, active, run);
        lanes.push(lane);
        // This adapter forwards the real Native observation without replacing
        // its head, content, key status, actions, read number or freshness.
        const observed = new Map<string, FactRef>();
        lane.c.membership = { at, answers: async asked => {
          const value = await run(() => life.wait(() => membership.stub.observe(asked)), true);
          // Independently capture the exact actual observation read by the
          // authority. Never take caller trust from the archive publication.
          if (isRecord(value) && isRecord(value["head"])) {
            const fact = { at, seq: value["head"]["seq"], hash: value["head"]["hash"] };
            if (!isFactRef(fact)) throw Error("Actual Membership observation head required");
            observed.set(canonicalize(fact), fact);
          }
          return value;
        } };
        expect((await life.wait(() => membership.stub.observe({ of: at, key: rita.key })) as { keyState?: unknown }).keyState).toBe("active");
        const budget = new ArchiveBudget();
        budget.spend({ nodes: 1, calls: 1, metadata: 256 * 1024, inputWork: 256 * 1024 * 8 });
        const birth = readNativeBirth(await life.wait(() => namespace(env.PLATFORM).births.read(at, 10_000, 256 * 1024)), at, 256 * 1024);
        if (!birth || birth.named !== ARCHIVE_DEVICE_APPLICATION_COHORT.membership) throw Error("Actual Membership8 birth required");
        const policies = new Map([[ARCHIVE_DEVICE_APPLICATION_COHORT.membership, nativePolicy]]);
        const pins = new FixtureArchiveSourcePins([{ at, birth: { bytes: birth.proof.bytes, hash: birth.proof.fact.hash } }], lane.c.bounds, budget, policies);
        bases.set(lane, { pins, policies, observed, setupCost: budget.admitted() });
        console.info("Native archive source-birth/pin setup budget only", canonicalize(budget.admitted()));
        return lane;
        });
      },
    };
    });
  } catch (error) { await close(); throw error; }
}
export async function createNativeArchiveLane(bounds: Partial<Bounds> = {}, reads: Partial<ReadBounds> = {}, under: ValidDefinition = archiveDefinition): Promise<Lane> {
  return (await nativeArchiveFixture()).create(bounds, reads, under);
}
