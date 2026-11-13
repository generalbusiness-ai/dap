/**
 * The person's phases. A person acts in a session and a home apart from the agent's, with a key the agent never sees. Each phase
 * reads the record it needs and makes at most one signed act, so a phase that an earlier phase did not prepare stops with its word.
 */
import { canonicalize } from "@generalbusiness/dap-bytes";
import type { Entry, FactRef, Item, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { ROLE_LISTS } from "@generalbusiness/dap-platform";
import { QUESTION_DIGESTS, issueQuestions } from "@generalbusiness/dap-lanes";
import { changeJ4 } from "../../../apps/room/lanes/src/j4.ts";
import { J4_DIGESTS } from "../../../apps/room/lanes/src/digests-j4.ts";
import { seedRules } from "../policy.ts";
import { stop, TEXT, type PersonPhase, type StopWord } from "./words.ts";
import type { PublicResult } from "./public.ts";

/** The person's session: a read tool of the local server, and one signed act that keeps its original under the phase's name. */
export interface PersonPort {
  read(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>>;
  act(phase: PersonPhase, target: ScopeRef, digest: string, kind: string, input: { fields: Record<string, unknown>; on?: number; values?: string[] }): Promise<FactRef>;
}

const seqOf = (ref: unknown): number => typeof ref === "number" ? ref : (ref as FactRef | undefined)?.seq ?? stop("record-differs");
const PERSON_ACTIONS = ["issue.approve", "issue.decide"] as const;

/** A scope by its name or ID: its full reference, its definition and its live items. */
async function scopeOf(port: PersonPort, scope: string): Promise<{ ref: ScopeRef; digest: string; items: Item[] }> {
  const read = await port.read("inspect", { scope });
  const items = [...read["items"] as Item[]];
  for (let cursor = read["cursor"] as string | undefined, page = 0; cursor !== undefined; page++) {
    if (page >= 8) return stop("read-incomplete");
    const next = await port.read("inspect", { scope, cursor });
    items.push(...next["items"] as Item[]);
    cursor = next["cursor"] as string | undefined;
  }
  const actions = await port.read("actions", { scope });
  return { ref: read["ref"] as ScopeRef, digest: String(actions["digest"]), items };
}
async function issueLane(port: PersonPort, absent: StopWord = "no-issue-lane"): Promise<ScopeId> {
  const lanes = ((await port.read("room", {}))["lanes"] as { scope: ScopeId; kind: string }[] | undefined ?? []).filter(row => row.kind === "issue");
  return lanes.length === 1 ? lanes[0]!.scope : stop(absent);
}
async function factOf(port: PersonPort, scope: ScopeId, seq: number): Promise<FactRef> {
  const read = await port.read("step", { scope, seq });
  const entry = read["entry"] as Entry, hash = read["hash"] as FactRef["hash"];
  return { at: { scope, genesis: "genesis" in entry ? entry.genesis : hash }, seq, hash };
}
const accepted = (phase: PersonPhase, fact: FactRef): PublicResult => ({ phase, actor: "person", status: "accepted", facts: { [phase]: fact } });

export async function personPhase(phase: PersonPhase, port: PersonPort, agentHandle: string): Promise<PublicResult> {
  if (phase === "roles") {
    const membership = await scopeOf(port, "membership");
    const roster = membership.items.find(item => item.type === "roster") ?? stop("no-standing");
    const prior = roster.values[ROLE_LISTS.admin] as string[];
    const actions = [...prior, ...PERSON_ACTIONS.filter(action => !prior.includes(action))];
    if (actions.length === prior.length) return { phase, actor: "person", status: "observed", values: { added: 0 } };
    return accepted(phase, await port.act(phase, membership.ref, membership.digest, "set-actions", { on: 0, fields: { role: "admin", actions } }));
  }
  if (phase === "rules") {
    const rules = await scopeOf(port, "rules");
    return accepted(phase, await port.act(phase, rules.ref, rules.digest, "publish", { on: 0, fields: { ...seedRules } }));
  }
  if (phase === "activate-issue" || phase === "activate-change") {
    const rules = await scopeOf(port, "rules");
    const [name, digest, definition] = phase === "activate-issue" ? ["issue", QUESTION_DIGESTS.issue, issueQuestions] as const : ["change", J4_DIGESTS.change, changeJ4] as const;
    return accepted(phase, await port.act(phase, rules.ref, rules.digest, "activate", { fields: { name, digest }, values: [canonicalize(definition as never)] }));
  }
  if (phase === "open-issue") {
    const directory = await scopeOf(port, "directory");
    const opened = await port.act(phase, directory.ref, directory.digest, "open-issue", { fields: { definition: QUESTION_DIGESTS.issue, title: TEXT.issueTitle, conditions: [...TEXT.conditions] } });
    const born = await port.read("wait", { scope: "directory", entry: opened.seq, seconds: 60 });
    if (born["timedOut"] !== false) return stop("no-issue-lane");
    return accepted(phase, opened);
  }
  const lane = await issueLane(port);
  const scope = await scopeOf(port, lane);
  if (phase === "offer" || phase === "offer-new") {
    const membership = await scopeOf(port, "membership");
    return accepted(phase, await port.act(phase, scope.ref, scope.digest, "offer", { fields: { offeree: { membership: membership.ref, member: agentHandle } } }));
  }
  const asked = scope.items.filter(item => item.type === "ask" && item.state === "asked");
  if (phase === "approve") {
    if (asked.length !== 1) return stop("no-question");
    const request = scope.items.find(item => item.type === "approval-request" && item.state === "open") ?? stop("no-approval-request");
    const bodyAt = await factOf(port, lane, seqOf(asked[0]!.refs["bodyAt"]));
    return accepted(phase, await port.act(phase, scope.ref, scope.digest, "approve", { fields: { request: request.id, bodyAt, verdict: "approve", comment: TEXT.comment } }));
  }
  if (phase === "decide") {
    if (asked.length !== 1) return stop("no-question");
    const bodyAt = await factOf(port, lane, seqOf(asked[0]!.refs["bodyAt"]));
    return accepted(phase, await port.act(phase, scope.ref, scope.digest, "decide", { on: asked[0]!.id, fields: { bodyAt } }));
  }
  // revise: a decided question does not change the terms. Only the owner's revision and a new offer do.
  return accepted(phase, await port.act(phase, scope.ref, scope.digest, "revise", { on: 0, fields: { conditions: [...TEXT.newConditions] } }));
}
