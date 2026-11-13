/**
 * The hosted agent's phases. A phase takes one `HostedSession` and nothing else: no home, no input file, no earlier result and no
 * fetch. It reconstructs its room from `room`, `inspect`, `items`, `steps`, `step` and `text` in this session, as the work-on prompt
 * says a fresh session does. `test/hosted-loop.test.ts` holds this file to its imports.
 */
import { canonicalize, digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import type { Entry, FactRef, Item, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import type { HostedSession, Reply } from "./hosted-session.ts";
import { LOOP_ACT_TOOLS, checkToolList, hostedDefaultTools } from "./tool-list.ts";
import { stop, TEXT, type AgentPhase, type Mode, type StopWord } from "./words.ts";
import { isCommit, type PublicResult } from "./public.ts";

const WAIT_SECONDS = 60, WAIT_ROUNDS = 30, OPEN_WAIT_SECONDS = 1;
const refused = (reply: Reply): StopWord => reply["answer"] === "refused" ? "act-refused" : "act-unresolved";
const seqOf = (ref: unknown): number => typeof ref === "number" ? ref : (ref as FactRef | undefined)?.seq ?? stop("record-differs");
const factOfAnswer = (reply: Reply): FactRef => {
  const fact = reply["fact"] ?? (reply["receipt"] as { fact?: unknown } | undefined)?.fact;
  if (!fact) return stop("act-unresolved");
  const { at, seq, hash } = fact as FactRef;
  return { at, seq, hash };
};

interface Lane { scope: ScopeId; kind: string; digest: string }

/** What a phase learns of its room, read now. */
type Step = { seq: number; input: string; kind: string; signer: string | null };

class Room {
  constructor(readonly mcp: HostedSession, readonly key: string, readonly handle: string, readonly lanes: readonly Lane[]) {}
  static async read(mcp: HostedSession): Promise<Room> {
    const room = await mcp.call("room");
    if (room["cursor"] !== undefined) return stop("read-incomplete");
    const standing = (room["standing"] as { key: string; handle: string }[] | undefined)?.find(row => row.key === room["key"]);
    if (!standing || typeof standing.handle !== "string") return stop("no-standing");
    return new Room(mcp, String(room["key"]), standing.handle, (room["lanes"] as Lane[] | undefined) ?? []);
  }
  lane(kind: "issue" | "pr", absent: StopWord): ScopeId {
    const rows = this.lanes.filter(row => row.kind === kind);
    return rows.length === 1 ? rows[0]!.scope : stop(absent);
  }
  /** Every item of one type, across its pages. */
  async items(scope: ScopeId, type: string, final = false): Promise<Item[]> {
    const all: Item[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 8; page++) {
      this.mcp.literal(type);
      const read = await this.mcp.call("items", { scope, type, final, ...(cursor === undefined ? {} : { cursor }) });
      all.push(...(read["items"] as Item[]));
      cursor = read["cursor"] as string | undefined;
      if (cursor === undefined) return all;
    }
    return stop("read-incomplete");
  }
  /** The full fact of one entry. A hash comes from the record, never from a sequence number. */
  async fact(scope: ScopeId, seq: number): Promise<FactRef> {
    const read = await this.mcp.call("step", { scope, seq });
    const entry = read["entry"] as Entry | undefined;
    if (!entry || entry.seq !== seq) return stop("read-failed");
    const hash = read["hash"] as FactRef["hash"];
    return { at: { scope, genesis: "genesis" in entry ? entry.genesis : hash }, seq, hash };
  }
  async entry(scope: ScopeId, seq: number): Promise<Entry> {
    return (await this.mcp.call("step", { scope, seq }))["entry"] as Entry ?? stop("read-failed");
  }
  /** A detached text, whole, by the digest its record holds. Room text is data here: the phase compares it and acts on none of it. */
  async text(scope: ScopeId, digest: string): Promise<string> {
    let whole = "", offset: number | undefined;
    for (let page = 0; page < 64; page++) {
      const part = await this.mcp.call("text", { scope, kind: "text", digest, ...(offset === undefined ? {} : { offset }) });
      whole += part["text"] as string;
      offset = part["offset"] as number | undefined;
      if (offset === undefined) return whole;
    }
    return stop("read-incomplete");
  }
  mine(item: Item, slot: string): boolean { return (item.parties[slot] as { member?: string } | undefined)?.member === this.handle; }
}

/** One signed act under the phase's fixed key. The agent object keeps the envelope, so a fresh session finds it by that key. */
async function acted(mcp: HostedSession, mode: Mode, tool: string, target: ScopeId, key: string, build: () => Promise<Record<string, unknown>>): Promise<{ fact: FactRef; reused: boolean }> {
  const settled = await mcp.call("settle", { target, idempotencyKey: key });
  if (settled["answer"] === "accepted") return { fact: factOfAnswer(settled), reused: true };
  if (settled["answer"] !== "not-found" && mode !== "continue") return stop(refused(settled));
  if (settled["answer"] === "not-found" && mode !== "new") return stop("no-original");
  if (settled["answer"] === "mismatch" || settled["answer"] === "refused") return stop("act-refused");
  const args = await build();
  const answer = await mcp.call(tool, { target, ...args, idempotencyKey: key });
  if (answer["answer"] !== "accepted") return stop(refused(answer));
  return { fact: factOfAnswer(answer), reused: false };
}

/** Every agent line says that a script drove its session. No model chose this phase or read the prompt. */
const accepted = (phase: AgentPhase, facts: Record<string, unknown>, values: Record<string, unknown>, session: HostedSession): PublicResult => ({
  phase, actor: "agent", status: "accepted", facts, values: { ...values, driver: "script", tools: session.listDigest, session: session.sessionDigest() },
});
const observed = (phase: AgentPhase, facts: Record<string, unknown>, values: Record<string, unknown>, session: HostedSession): PublicResult => ({
  phase, actor: "agent", status: "observed", facts, values: { ...values, driver: "script", tools: session.listDigest, session: session.sessionDigest() },
});

/** The agent's commitment in one state, or a stop. */
const commitmentOf = async (room: Room, issue: ScopeId, state: "offered" | "accepted", slot: "offeree" | "performer", absent: StopWord, skip: readonly number[] = []): Promise<Item> => {
  const rows = (await room.items(issue, "commitment")).filter(item => item.state === state && room.mine(item, slot) && !skip.includes(item.id));
  return rows[0] ?? stop(absent);
};
const askOf = async (room: Room, issue: ScopeId, state: "asked" | "decided"): Promise<Item> => {
  const rows = (await room.items(issue, "ask", state === "decided")).filter(item => item.state === state && room.mine(item, "asker"));
  return rows.length === 1 ? rows[0]! : stop(state === "decided" ? "no-decision" : "no-question");
};
const blockedBlock = async (room: Room, issue: ScopeId): Promise<Item> => {
  const rows = (await room.items(issue, "block")).filter(item => item.state === "blocked");
  return rows.length === 1 ? rows[0]! : stop("no-block");
};

/**
 * What a fresh session rebuilds from the record alone after a decision: the old commitment, its block, the question, the decision,
 * and the new offer with its terms. It signs nothing. `agent-accept-new` and `agent-release` run on this same rebuild.
 */
async function rebuild(mcp: HostedSession): Promise<{ room: Room; issue: ScopeId; block: Item; commitment: number; asked: Item; decision: FactRef; offer: Item; terms: FactRef }> {
  const room = await Room.read(mcp), issue = room.lane("issue", "no-issue-lane");
  const block = await blockedBlock(room, issue);
  const commitment = seqOf(block.refs["commitment"]);
  const asked = (await room.items(issue, "ask", true)).find(item => item.id === seqOf(block.refs["on"]) && item.state === "decided") ?? stop("no-decision");
  const decision = await room.fact(issue, seqOf(asked.refs["decisionAt"]));
  const input = (await room.entry(issue, decision.seq)).input as { type: string; signed?: { intent?: { kind?: string; on?: number } } };
  if (input.type !== "act" || input.signed?.intent?.kind !== "decide" || input.signed.intent.on !== asked.id) return stop("no-decision");
  const offer = await commitmentOf(room, issue, "offered", "offeree", "no-new-offer", [commitment]);
  const terms = await room.fact(issue, seqOf(offer.refs["termsAt"]));
  return { room, issue, block, commitment, asked, decision, offer, terms };
}

/** One phase on one session. The session already holds its list; this function checks that list before anything else. */
export async function agentPhase(phase: AgentPhase, mcp: HostedSession, mode: Mode, standInBase?: string): Promise<PublicResult> {
  checkToolList(await mcp.tools(), phase === "agent-tools" ? LOOP_ACT_TOOLS : []);
  mcp.literal("membership", "directory", "destination", "rules", "manual", "branch", "text", "decided", "ask", "member", TEXT.goal, TEXT.question, TEXT.body, TEXT.changeTitle, TEXT.path, TEXT.content, WAIT_SECONDS, OPEN_WAIT_SECONDS);
  if (phase === "agent-tools") {
    const prompt = await mcp.prompt(TEXT.goal);
    return observed(phase, {}, { prompt, listed: mcp.listed.length, generic: hostedDefaultTools().length, names: [...mcp.listed] }, mcp);
  }
  if (phase === "agent-accept") {
    const room = await Room.read(mcp), issue = room.lane("issue", "no-issue-lane");
    const done = await acted(mcp, mode, "issue.take", issue, "hosted-loop-accept", async () => {
      const offered = await commitmentOf(room, issue, "offered", "offeree", "no-offer");
      return { on: offered.id, fields: { terms: await room.fact(issue, seqOf(offered.refs["termsAt"])) } };
    });
    return accepted(phase, { accept: done.fact }, { reused: done.reused }, mcp);
  }
  if (phase === "agent-ask") {
    const room = await Room.read(mcp), issue = room.lane("issue", "no-issue-lane");
    await commitmentOf(room, issue, "accepted", "performer", "no-commitment");
    const done = await acted(mcp, mode, "issue.ask", issue, "hosted-loop-ask", async () => ({ fields: { question: TEXT.question, body: TEXT.body } }));
    return accepted(phase, { ask: done.fact }, { reused: done.reused }, mcp);
  }
  if (phase === "agent-request") {
    const room = await Room.read(mcp), issue = room.lane("issue", "no-issue-lane");
    const done = await acted(mcp, mode, "issue.request-approval", issue, "hosted-loop-request", async () => {
      const asked = await askOf(room, issue, "asked");
      const members = (await mcp.call("items", { scope: "membership", type: "member" }))["items"] as Item[];
      const controller = (members.find(row => (row.values["handle"]) === room.handle)?.parties["controller"] as { member?: string } | undefined)?.member ?? stop("no-controller");
      return { fields: { ask: asked.id, bodyAt: await room.fact(issue, seqOf(asked.refs["bodyAt"])), requested: controller } };
    });
    return accepted(phase, { request: done.fact }, { reused: done.reused }, mcp);
  }
  if (phase === "agent-block") {
    const room = await Room.read(mcp), issue = room.lane("issue", "no-issue-lane");
    const done = await acted(mcp, mode, "issue.block", issue, "hosted-loop-block", async () => {
      const commitment = await commitmentOf(room, issue, "accepted", "performer", "no-commitment");
      const asked = await askOf(room, issue, "asked");
      return { fields: { commitment: commitment.id, on: await room.fact(issue, asked.id) } };
    });
    return accepted(phase, { block: done.fact }, { reused: done.reused }, mcp);
  }
  if (phase === "agent-wait-open") {
    const room = await Room.read(mcp), issue = room.lane("issue", "no-issue-lane");
    const asked = await askOf(room, issue, "asked");
    const before = (await mcp.call("steps", { scope: issue }));
    const waited = await mcp.call("wait", { scope: issue, item: asked.id, type: "ask", states: ["decided"], seconds: OPEN_WAIT_SECONDS });
    if (waited["timedOut"] !== true) return stop("record-differs");
    const after = (await mcp.call("steps", { scope: issue }));
    if (canonicalize(before as never) !== canonicalize(after as never)) return stop("record-differs");
    return { phase, actor: "agent", status: "timed-out", values: { timedOut: true, entries: (after["steps"] as unknown[]).length, driver: "script", tools: mcp.listDigest, session: mcp.sessionDigest() } };
  }
  if (phase === "agent-wait") {
    const room = await Room.read(mcp), issue = room.lane("issue", "no-issue-lane");
    const open = (await room.items(issue, "ask", false)).filter(item => room.mine(item, "asker"));
    const decided = (await room.items(issue, "ask", true)).filter(item => room.mine(item, "asker"));
    const asked = open[0] ?? decided[0] ?? stop("no-question");
    for (let round = 0; round < WAIT_ROUNDS; round++) {
      const waited = await mcp.call("wait", { scope: issue, item: asked.id, type: "ask", states: ["decided"], seconds: WAIT_SECONDS });
      if (waited["timedOut"] === false) {
        const seen = (await room.items(issue, "ask", true)).find(item => item.id === asked.id && item.state === "decided") ?? stop("question-changed");
        return observed(phase, { decision: await room.fact(issue, seqOf(seen.refs["decisionAt"])) }, { state: "decided", rounds: round + 1 }, mcp);
      }
      const reread = (await room.items(issue, "ask", false)).find(item => item.id === asked.id);
      if (!reread || reread.state !== "asked") return stop("question-changed");
    }
    return stop("still-open");
  }
  if (phase === "agent-resume") {
    const signedBefore = mcp.calls.length;
    const seen = await rebuild(mcp);
    const steps = (await mcp.call("steps", { scope: seen.issue }))["steps"] as { seq: number; kind: string | null }[];
    if (await seen.room.text(seen.issue, seen.asked.values["body"] as string) !== TEXT.body) return stop("question-changed");
    const approval = steps.find(row => row.kind === "approve") ?? stop("no-decision");
    const signed = (await seen.room.entry(seen.issue, approval.seq)).input as { signed?: { intent?: { fields?: { comment?: string } } } };
    const comment = await seen.room.text(seen.issue, signed.signed?.intent?.fields?.comment ?? stop("no-decision"));
    if (mcp.calls.slice(signedBefore).some(name => name.includes("."))) return stop("signed-in-read-phase");
    return observed(phase, { decision: seen.decision, terms: seen.terms }, {
      block: seen.block.id, commitment: seen.commitment, asked: seen.asked.id, offer: seen.offer.id,
      bodyDigest: digestBytes(utf8(TEXT.body)), commentDigest: digestBytes(utf8(comment)), lane: seen.issue,
    }, mcp);
  }
  if (phase === "agent-accept-new") {
    const room = await Room.read(mcp), issue = room.lane("issue", "no-issue-lane");
    const done = await acted(mcp, mode, "issue.take", issue, "hosted-loop-accept-new", async () => {
      const seen = await rebuild(mcp);
      return { on: seen.offer.id, fields: { terms: seen.terms } };
    });
    return accepted(phase, { accept: done.fact }, { reused: done.reused }, mcp);
  }
  if (phase === "agent-release") {
    const room = await Room.read(mcp), issue = room.lane("issue", "no-issue-lane");
    const done = await acted(mcp, mode, "issue.release-block", issue, "hosted-loop-release", async () => {
      const block = await blockedBlock(room, issue);
      const asked = (await room.items(issue, "ask", true)).find(item => item.id === seqOf(block.refs["on"]) && item.state === "decided") ?? stop("no-decision");
      return { on: block.id, fields: { commitment: seqOf(block.refs["commitment"]), answer: await room.fact(issue, seqOf(asked.refs["decisionAt"])) } };
    });
    return accepted(phase, { release: done.fact }, { reused: done.reused }, mcp);
  }
  if (phase === "agent-open-change") {
    const directory = ((await mcp.call("inspect", { scope: "directory" }))["ref"] as ScopeRef).scope;
    const done = await acted(mcp, mode, "change.create", directory, "hosted-loop-open-change", async () => {
      const active = (await mcp.call("inspect", { scope: "rules" }))["items"] as Item[];
      const row = active.find(item => item.type === "definition" && item.values["name"] === "change" && item.state === "active") ?? stop("no-definition");
      return { fields: { definition: row.values["digest"], title: TEXT.changeTitle, draft: false } };
    });
    const made = await mcp.call("wait", { scope: "directory", entry: done.fact.seq, seconds: WAIT_SECONDS });
    if (made["timedOut"] !== false) return stop("no-change-lane");
    return accepted(phase, { open: done.fact }, { reused: done.reused }, mcp);
  }
  if (phase === "agent-link") {
    const room = await Room.read(mcp), change = room.lane("pr", "no-change-lane"), issue = room.lane("issue", "no-issue-lane");
    const done = await acted(mcp, mode, "change.link-own", change, "hosted-loop-link", async () => {
      const ref = (await mcp.call("inspect", { scope: issue }))["ref"] as ScopeRef;
      return { fields: { issue: ref, how: "manual" } };
    });
    return accepted(phase, { linked: done.fact }, { reused: done.reused }, mcp);
  }
  if (phase === "agent-propose") {
    const room = await Room.read(mcp), change = room.lane("pr", "no-change-lane");
    const bytes = utf8(TEXT.content), digest = digestBytes(bytes);
    mcp.literal(digest, bytes.length);
    const done = await acted(mcp, mode, "change.propose-file", change, "hosted-loop-propose", async () => {
      const branches = (await mcp.call("items", { scope: "destination", type: "branch" }))["items"] as Item[];
      const head = branches.find(item => typeof item.values["head"] === "string")?.values["head"] ?? (standInBase === undefined ? undefined : (mcp.literal(standInBase), standInBase));
      return { fields: { base: head ?? stop("no-published-head"), path: TEXT.path, digest, size: bytes.length, content: TEXT.content } };
    });
    return accepted(phase, { propose: done.fact }, { reused: done.reused, fileDigest: digest }, mcp);
  }
  // agent-verify reads the two lanes' whole order back from the record.
  const room = await Room.read(mcp), issue = room.lane("issue", "no-issue-lane"), change = room.lane("pr", "no-change-lane");
  const issueSteps = (await mcp.call("steps", { scope: issue }))["steps"] as Step[];
  const changeSteps = (await mcp.call("steps", { scope: change }))["steps"] as Step[];
  const issueActs = issueSteps.filter(row => row.input === "act"), order = issueActs.map(row => row.kind);
  const expected = ["offer", "accept", "ask", "request-approval", "block", "approve", "decide", "revise", "offer", "accept", "release-block"];
  if (canonicalize(order as never) !== canonicalize(expected as never)) return stop("record-differs");
  const byKind = (kinds: readonly string[]) => issueActs.filter(row => kinds.includes(row.kind)).map(row => row.signer);
  if (byKind(["accept", "ask", "request-approval", "block", "release-block"]).some(signer => signer !== room.key)) return stop("record-differs");
  if (byKind(["offer", "approve", "decide", "revise"]).some(signer => signer === room.key)) return stop("record-differs");
  const version = (await room.items(change, "manifest")).find(item => item.state === "current") ?? stop("no-manifest");
  const proposal = changeSteps.find(row => row.kind === "propose-file") ?? stop("no-manifest");
  // The base that the proposal signed, beside the branch's head, both read in this session. Only a loopback input may have no head.
  const branches = (await mcp.call("items", { scope: "destination", type: "branch" }))["items"] as Item[];
  const base = version.values["base"], head = branches.find(item => typeof item.values["head"] === "string")?.values["head"] ?? null;
  if (head === null && standInBase === undefined) return stop("no-published-head");
  if (!isCommit(base) || (head !== null && !isCommit(head))) return stop("commit-format");
  if (changeSteps.filter(row => row.input === "act").some(row => row.signer !== room.key)) return stop("record-differs");
  const commitments = await room.items(issue, "commitment");
  const released = (await room.items(issue, "block", true)).filter(item => item.state === "released");
  if (commitments.filter(item => item.state === "accepted" && room.mine(item, "performer")).length !== 2 || released.length !== 1) return stop("record-differs");
  return observed(phase, { propose: await room.fact(change, proposal.seq) }, {
    issueOrder: order, changeOrder: changeSteps.filter(row => row.input === "act").map(row => row.kind), issue, change, version: version.id, fileDigest: version.values["digest"], base, head, baseIsHead: base === head, standIn: standInBase !== undefined, agentKey: room.key, entries: issueSteps.length + changeSteps.length, modelChoseStep: false,
  }, mcp);
}
