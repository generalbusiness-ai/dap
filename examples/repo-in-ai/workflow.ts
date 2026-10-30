/** Native setup phases. Each invocation performs at most one signed operation. */
import type { Digest, FactRef, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { canonicalize, isFactRef, isScopeRef } from "@generalbusiness/dap-bytes";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as cohort } from "@generalbusiness/dap-platform";
import { issueJ4, changeJ4 } from "../../apps/room/lanes/src/j4.ts";
import { J4_DIGESTS } from "../../apps/room/lanes/src/digests-j4.ts";
import { appendedActions, preservesActions, roleActions, seedRules, type RoleActions } from "./policy.ts";
import { retain, retained } from "./plan.ts";
import type { Session, SessionMode, SessionArgs, PrivateResult } from "./session.ts";

export interface RoomRefs { directory: ScopeRef; membership: ScopeRef; rules: ScopeRef; destination: ScopeRef }
export interface PhaseResult { phase: string; status: "accepted" | "refused" | "observed"; fact?: FactRef; intent?: Digest; refusalReason?: "unauthorized" }
const equal = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b);
const stop = (): never => { throw new Error("The phase is unresolved. Check its retained original before continuing."); };

export async function roomRefs(session: Session): Promise<RoomRefs> {
  const config = await session.ctx.store.config(), repository = config?.repository;
  if (!repository) throw new Error("Create the room before reading its scopes.");
  const directory = await session.read(repository.directory);
  if (directory.definition !== cohort.directory) throw new Error("This setup requires the explicit Destination12 cohort.");
  const row = directory.items.find(item => item.type === "repository" && item.state === "open");
  const membership = row?.refs["membership"], rules = row?.refs["rules"], destination = row?.refs["destination"];
  if (!isScopeRef(membership) || !equal(membership, repository.membership) || !isScopeRef(rules) || rules.scope !== repository.rules || !isScopeRef(destination) || destination.scope !== repository.destination) throw new Error("The configured sibling references do not match the directory.");
  const siblings = await Promise.all([session.read(membership), session.read(rules), session.read(destination)]);
  if (siblings[0]!.definition !== cohort.membership || siblings[1]!.definition !== cohort.rules || siblings[2]!.definition !== cohort.destination) throw new Error("The room's actual sibling pins differ from the setup cohort.");
  const refs = { directory: directory.scope, membership, rules, destination };
  await retain(session.ctx.store, "s1-room-refs", refs);
  return refs;
}

export function nativeResult(phase: string, privateResult: PrivateResult, refused = false): PhaseResult {
  const result = privateResult.result;
  if (result.isError) return stop();
  const body = result.structuredContent;
  if (refused) {
    if (body["answer"] !== "refused" || body["reason"] !== "unauthorized") throw new Error("The automated review was not refused for its missing grant. Stop for policy review.");
    return { phase, status: "refused", refusalReason: "unauthorized" };
  }
  const receipt = body["receipt"] as { fact?: unknown } | undefined;
  const fact = body["fact"] ?? receipt?.fact;
  if (body["answer"] !== "accepted" || !isFactRef(fact)) return stop();
  return { phase, status: "accepted", fact };
}

export async function done(session: Session, phase: string): Promise<PhaseResult | null> {
  return retained<PhaseResult>(session.ctx.store, "s1-done-" + phase);
}

export async function requiredDone(session: Session, phase: string): Promise<PhaseResult> {
  const result = await done(session, phase);
  if (result === null) throw new Error("A preceding setup phase has no completed receipt.");
  return result;
}

export async function actPhase(owner: Session, actor: Session, phase: string, mode: SessionMode, target: ScopeRef, pin: string, kind: string, fields: Record<string, unknown>, options: { on?: number; values?: string[]; refused?: boolean } = {}): Promise<PhaseResult> {
  const prior = await done(owner, phase);
  if (prior !== null) return prior;
  const name = "s1-args-" + phase;
  let original = await retained<{ target: ScopeRef; args: SessionArgs }>(owner.ctx.store, name);
  if (original === null) {
    if (mode !== "new") throw new Error("No original is retained for this phase. Nothing was signed.");
    original = { target, args: { target: target.scope, digest: pin, kind, fields, idempotencyKey: "s1:" + phase, ...(options.on === undefined ? {} : { on: options.on }), ...(options.values ? { values: options.values } : {}) } };
    await retain(owner.ctx.store, name, original);
  } else if (!equal(original.target, target)) throw new Error("The phase's original target incarnation differs.");
  const result = nativeResult(phase, await actor.request(mode, "act", original.args, { target: original.target }), options.refused);
  await retain(owner.ctx.store, "s1-done-" + phase, result);
  return result;
}

export async function configurePhase(owner: Session, phase: string, mode: SessionMode): Promise<PhaseResult> {
  const refs = await roomRefs(owner);
  if (phase === "activate-issue" || phase === "activate-change") {
    const name = phase === "activate-issue" ? "issue" : "change";
    const definition = name === "issue" ? issueJ4 : changeJ4;
    return actPhase(owner, owner, phase, mode, refs.rules, cohort.rules, "activate", { name, digest: J4_DIGESTS[name] }, { values: [canonicalize(definition)] });
  }
  if (phase === "roles-before") {
    const original = roleActions(await owner.read(refs.membership));
    await retain(owner.ctx.store, "s1-roles-before", original);
    const result: PhaseResult = { phase, status: "observed" };
    await retain(owner.ctx.store, "s1-done-" + phase, result);
    return result;
  }
  if (phase.startsWith("role-")) {
    const original = await retained<RoleActions>(owner.ctx.store, "s1-roles-before");
    const role = phase.slice(5) as keyof RoleActions;
    if (original === null || !Object.hasOwn(original, role)) throw new Error("Read all five original role lists first.");
    return actPhase(owner, owner, phase, mode, refs.membership, cohort.membership, "set-actions", { role, actions: appendedActions(original)[role] }, { on: 0 });
  }
  if (phase === "roles-after") {
    const original = await retained<RoleActions>(owner.ctx.store, "s1-roles-before");
    const current = roleActions(await owner.read(refs.membership));
    if (original === null || !preservesActions(original, current) || !equal(appendedActions(original), current)) throw new Error("The five role lists do not preserve the exact planned union.");
    await retain(owner.ctx.store, "s1-roles-after", current);
    const result: PhaseResult = { phase, status: "observed" };
    await retain(owner.ctx.store, "s1-done-" + phase, result);
    return result;
  }
  if (phase === "rules") return actPhase(owner, owner, phase, mode, refs.rules, cohort.rules, "publish", { ...seedRules }, { on: 0 });
  throw new Error("This is not a configuration phase.");
}

export function singleton(summary: Summary, type: string, state?: string) {
  const items = summary.items.filter(item => item.type === type && (state === undefined || item.state === state));
  if (items.length !== 1) throw new Error("One exact native item is required for this phase.");
  return items[0]!;
}

export const profiles: Readonly<Record<"issue" | "change", Digest>> = J4_DIGESTS;
