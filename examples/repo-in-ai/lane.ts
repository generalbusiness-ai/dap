/** One agent-authored seed Change, using the explicit J4 profile. */
import type { Entry, FactRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isEntry, isSeed, scopeIdOf } from "@generalbusiness/dap-bytes";
import { sentBy } from "@generalbusiness/dap-derive";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as cohort } from "@generalbusiness/dap-platform";
import { J4_DIGESTS } from "../../apps/room/lanes/src/digests-j4.ts";
import type { Session, SessionMode } from "./session.ts";
import { retained, retain } from "./plan.ts";
import { actPhase, done, requiredDone, roomRefs, type PhaseResult } from "./workflow.ts";

const equal = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b);
async function entry(session: Session, fact: FactRef): Promise<Entry> {
  const read = (await session.call("step", { scope: fact.at.scope, seq: fact.seq })).result;
  const value = read.structuredContent["entry"];
  if (read.isError || !isEntry(value) || entryHash(value) !== fact.hash || !equal(value.at, fact.at) || value.seq !== fact.seq) throw new Error("The exact phase entry is unavailable. Nothing was submitted.");
  return value;
}

export async function seedLane(owner: Session): Promise<ScopeRef> {
  const old = await retained<ScopeRef>(owner.ctx.store, "s1-seed-lane");
  if (old !== null) { await owner.read(old); return old; }
  const opened = await requiredDone(owner, "open-change");
  if (!opened.fact) throw new Error("The seed opening has no accepted fact.");
  const opening = await entry(owner, opened.fact);
  const sends = opening.sends.filter(send => isSeed(send.to) && send.to.kind === "lane" && send.to.definition === J4_DIGESTS.change);
  if (sends.length !== 1 || !isSeed(sends[0]!.to)) throw new Error("The directory opening did not create exactly one J4 Change.");
  const seed = sends[0]!.to;
  const summary = await owner.resolve(scopeIdOf(seed), J4_DIGESTS.change);
  const genesisRead = (await owner.call("step", { scope: summary.scope.scope, seq: 0 })).result;
  const genesis = genesisRead.structuredContent["entry"];
  if (genesisRead.isError || !isEntry(genesis) || genesis.input.type !== "genesis" || !equal(genesis.input.seed, seed)
    || !equal(genesis.input.source, opened.fact) || !equal(genesis.at, summary.scope)
    || !sentBy(opening, { from: opened.fact, n: genesis.input.n, to: seed, message: genesis.input.message })) throw new Error("The Change genesis does not match its retained directory creation.");
  await retain(owner.ctx.store, "s1-seed-lane", summary.scope);
  return summary.scope;
}

export async function lanePhase(owner: Session, agent: Session, phase: string, mode: SessionMode, roomName: string): Promise<PhaseResult> {
  if (phase === "open-change") {
    const refs = await roomRefs(owner);
    return actPhase(owner, agent, phase, mode, refs.directory, cohort.directory, "open-pr", { definition: J4_DIGESTS.change, title: "Seed " + roomName, draft: false });
  }
  const lane = await seedLane(owner);
  if (phase === "ask-rules") return actPhase(owner, agent, phase, mode, lane, J4_DIGESTS.change, "ask-rules", {}, { on: 0 });
  if (phase === "offer") {
    const config = await agent.ctx.store.config();
    if (!config?.repository || !config.handle) throw new Error("The seed agent is not enrolled.");
    return actPhase(owner, agent, phase, mode, lane, J4_DIGESTS.change, "offer", { offeree: { membership: config.repository.membership, member: config.handle }, terms: "Publish the unchanged task-list seed." });
  }
  const offer = await requiredDone(owner, "offer");
  if (!offer.fact) throw new Error("The seed offer has no accepted fact.");
  if (phase === "accept") return actPhase(owner, agent, phase, mode, lane, J4_DIGESTS.change, "accept", { terms: offer.fact }, { on: offer.fact.seq });
  if (phase === "hold") return actPhase(owner, agent, phase, mode, lane, J4_DIGESTS.change, "take-hold", { commitment: offer.fact.seq });
  if (phase === "release") {
    const hold = await requiredDone(owner, "hold");
    if (!hold.fact) throw new Error("The seed hold has no accepted fact.");
    return actPhase(owner, agent, phase, mode, lane, J4_DIGESTS.change, "release-hold", {}, { on: hold.fact.seq });
  }
  const prior = await done(owner, phase);
  if (prior !== null) return prior;
  throw new Error("This is not a lane phase.");
}
