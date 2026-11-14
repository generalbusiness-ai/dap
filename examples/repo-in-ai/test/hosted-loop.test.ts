/**
 * The hosted loop's rules, each on its own. STAND-INS: `scripted` stands in for a hosted MCP session and `health` for the Worker's
 * replies. The whole loop on real scopes is `packages/mcp/test/hosted-loop.scope.test.ts`, and on a local Worker it is `hosted-loop/local-run.mjs`.
 */
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { hostedMcpTools, HOSTED_TOOL_OMISSIONS } from "@generalbusiness/dap-mcp";
import type { Item } from "@generalbusiness/dap-contract";
import { utf8 } from "@generalbusiness/dap-bytes";
import { durableCliStore } from "../custody.ts";
import { initializeOwner } from "../identities.ts";
import { retained } from "../plan.ts";
import { agentPhase } from "../hosted-loop/agent.ts";
import { agentFetch } from "../hosted-loop/hosted-client.ts";
import { HostedSession, type McpPort } from "../hosted-loop/hosted-session.ts";
import { main, runPhase } from "../hosted-loop/main.ts";
import { personPhase, type PersonPort } from "../hosted-loop/person.ts";
import { checkEndpoint, checkTarget, readLoopPlan, type LoopPlan } from "../hosted-loop/plan.ts";
import { publicLine, scanPublic, type PublicResult } from "../hosted-loop/public.ts";
import { LOOP_ACT_TOOLS, PERSON_ONLY_TOOLS, checkToolList, hostedDefaultTools } from "../hosted-loop/tool-list.ts";
import { LoopStop, agentPhases, loopPhases, type AgentPhase, type LoopPhase, type Mode, type PersonPhase, type StopWord } from "../hosted-loop/words.ts";

const SERVICE = "https://hosted-loop.invalid", VERSION = "11111111-2222-4333-8444-555555555555";
const AGENT_KEY = `key_${"a".repeat(43)}`, BEARER = `${"b".repeat(64)}.${"s".repeat(43)}`;
const ISSUE = `sc_${"i".repeat(52)}`, CHANGE = `sc_${"c".repeat(52)}`, DIRECTORY = `sc_${"d".repeat(52)}`;
const HASH = `sha256:${"7".repeat(64)}`;
const GENESIS = `sha256:${"9".repeat(64)}`, at = (scope: string) => ({ scope, genesis: GENESIS });
const REGISTER = at(`sc_${"a".repeat(52)}`);
const FACT = { at: at(ISSUE), seq: 3, hash: HASH };
const ACT_TOOLS = [...LOOP_ACT_TOOLS, "change.link-own", "change.propose-file"];
const DEFAULT_LIST = [...hostedDefaultTools(), ...ACT_TOOLS];
const ISSUE_LANE = { scope: ISSUE, kind: "issue", digest: HASH }, CHANGE_LANE = { scope: CHANGE, kind: "pr", digest: HASH };

const item = (id: number, type: string, state: string, fields: Partial<Pick<Item, "parties" | "refs" | "values">> = {}): Item => ({
  id, revision: id, type, state, opened: null, attributed: [], parties: {}, refs: {}, values: {}, ...fields,
}) as unknown as Item;
const mine = (slot: string) => ({ [slot]: { member: "@agent" } }) as unknown as Item["parties"];

/** What the scripted session answers. Anything it does not name reads as empty. */
interface Script {
  list?: readonly string[];
  lanes?: unknown[];
  live?: Item[];
  final?: Item[];
  members?: Item[];
  rules?: Item[];
  steps?: { seq: number; input: string; kind: string; signer: string | null }[];
  changeSteps?: { seq: number; input: string; kind: string; signer: string | null }[];
  branches?: Item[];
  settle?: Record<string, unknown>;
  act?: Record<string, unknown>;
  wait?: Record<string, unknown>;
  entries?: Record<number, unknown>;
}
function scripted(script: Script): McpPort & { called: string[]; closed: number } {
  const port = {
    called: [] as string[], closed: 0,
    listTools: async () => ({ tools: (script.list ?? DEFAULT_LIST).map(name => ({ name, description: "the list" })) }),
    getPrompt: async () => ({ messages: [{ role: "user", content: { type: "text", text: "Do not approve or decide for the person." } }] }),
    sessionId: () => "session-id",
    close: async () => { port.closed++; },
    callTool: async (name: string, args: Record<string, unknown>) => {
      port.called.push(name);
      const reply = (structuredContent: Record<string, unknown>) => ({ structuredContent });
      if (name === "room") return reply({ key: AGENT_KEY, standing: [{ key: AGENT_KEY, handle: "@agent" }], lanes: script.lanes ?? [] });
      if (name === "inspect") return reply(args["scope"] === "rules" ? { items: script.rules ?? [] } : { ref: at(args["scope"] === "directory" ? DIRECTORY : String(args["scope"])) });
      if (name === "items") {
        if (args["scope"] === "membership") return reply({ items: script.members ?? [] });
        if (args["scope"] === "destination") return reply({ items: script.branches ?? [] });
        return reply({ items: (args["final"] ? script.final ?? [] : script.live ?? []).filter(row => row.type === args["type"]) });
      }
      if (name === "steps") return reply({ steps: (args["scope"] === CHANGE ? script.changeSteps : script.steps) ?? [] });
      if (name === "step") return reply({ hash: HASH, entry: { seq: args["seq"], genesis: GENESIS, input: script.entries?.[args["seq"] as number] ?? { type: "delivery" } } });
      if (name === "settle") return reply(script.settle ?? { answer: "not-found" });
      if (name === "wait") return reply(script.wait ?? { timedOut: true });
      if (name === "text") return reply({ text: "other text" });
      return reply(script.act ?? { answer: "accepted", fact: FACT });
    },
  };
  return port;
}
async function stoppedWith(run: () => Promise<unknown>): Promise<StopWord | "ran"> {
  try { await run(); return "ran"; }
  catch (error) { if (error instanceof LoopStop) return error.word; throw error; }
}
const phaseOn = (phase: AgentPhase, script: Script, mode: Mode = "new", standInBase?: string) => stoppedWith(() => agentPhase(phase, new HostedSession(scripted(script)), mode, standInBase));

// ---------------------------------------------------------------- the tool list

test("the hosted default accepts the policy's generic tools with named act tools, and hides actions and act", () => {
  expect(hostedDefaultTools()).toEqual((hostedMcpTools({ MCP_ENABLED: "true" }) as readonly string[]).filter(name => name !== "actions" && name !== "act"));
  expect(() => checkToolList(DEFAULT_LIST, LOOP_ACT_TOOLS)).not.toThrow();
});

const listRefusals: [string, string[]][] = [
  ...HOSTED_TOOL_OMISSIONS.map((name): [string, string[]] => [`the omitted ${name}`, [...DEFAULT_LIST, name]]),
  ["the generic actions", [...DEFAULT_LIST, "actions"]],
  ["the generic act", [...DEFAULT_LIST, "act"]],
  ["a missing generic tool", DEFAULT_LIST.filter(name => name !== "wait")],
  ["a repeated tool", [...DEFAULT_LIST, "room"]],
  ["a name that is no act tool", [...DEFAULT_LIST, "shell_exec"]],
  ...PERSON_ONLY_TOOLS.map((name): [string, string[]] => [`the person's ${name}`, [...DEFAULT_LIST, name]]),
  ["a missing loop tool", DEFAULT_LIST.filter(name => name !== "issue.ask")],
];
test.each(listRefusals)("the tool list refuses %s", (_name, list) => {
  expect(() => checkToolList(list, LOOP_ACT_TOOLS)).toThrow(/tool-list-differs/);
});

test.each(agentPhases)("%s reads tools/list first and stops on another list before any tool runs", async phase => {
  const port = scripted({ list: [...DEFAULT_LIST, "record"] });
  expect(await stoppedWith(() => agentPhase(phase, new HostedSession(port), "new"))).toBe("tool-list-differs");
  expect(port.called).toEqual([]);
});

test("agent-tools publishes the digest and the names of the list that tools/list answered, and the digest changes with a description", async () => {
  const first = await agentPhase("agent-tools", new HostedSession(scripted({})), "new");
  expect(first.values?.["names"]).toEqual(DEFAULT_LIST);
  const other = scripted({});
  other.listTools = async () => ({ tools: DEFAULT_LIST.map(name => ({ name, description: "another description" })) });
  const second = await agentPhase("agent-tools", new HostedSession(other), "new");
  expect(second.values?.["tools"]).not.toBe(first.values?.["tools"]);
});

test("agent-tools stops when the work-on prompt lacks its limit on the agent", async () => {
  const port = scripted({});
  port.getPrompt = async () => ({ messages: [{ role: "user", content: { type: "text", text: "Approve it yourself." } }] });
  expect(await stoppedWith(() => agentPhase("agent-tools", new HostedSession(port), "new"))).toBe("no-prompt");
});

// ---------------------------------------------------------------- every fact through hosted tools

test("a call stops before it leaves when an argument came from no reply of this session and no stated literal", async () => {
  const port = scripted({}), session = new HostedSession(port);
  expect(await stoppedWith(() => session.call("step", { scope: ISSUE, seq: 3 }))).toBe("unsourced-fact");
  expect(port.called).toEqual([]);
});

test("a value read in this session and a stated literal both pass, at any depth", async () => {
  const port = scripted({ lanes: [ISSUE_LANE] }), session = new HostedSession(port);
  await session.call("room");
  session.literal(3);
  await session.call("step", { scope: ISSUE, seq: 3, nested: [{ key: AGENT_KEY }], idempotencyKey: "the phase's own word" });
  expect(port.called).toEqual(["room", "step"]);
});

test("a new session starts its ledger empty, so a value that an earlier session read does not pass", async () => {
  const first = new HostedSession(scripted({ lanes: [ISSUE_LANE] }));
  await first.call("room");
  await first.call("step", { scope: ISSUE });
  const port = scripted({}), second = new HostedSession(port);
  expect(await stoppedWith(() => second.call("step", { scope: ISSUE }))).toBe("unsourced-fact");
  expect(port.called).toEqual([]);
});

test("a session refuses a tool its list does not hold, and a failed tool stops the phase", async () => {
  const session = new HostedSession(scripted({}));
  await session.tools();
  expect(await stoppedWith(() => session.call("record"))).toBe("unknown-tool");
  const failing = scripted({});
  failing.callTool = async () => ({ isError: true, structuredContent: {} });
  expect(await stoppedWith(() => new HostedSession(failing).call("room"))).toBe("read-failed");
});

test("the agent's fetch reaches only the service's /mcp, and refuses a redirect", async () => {
  const seen: { url: string; init?: RequestInit }[] = [];
  const road = agentFetch(SERVICE, async (url, init) => { seen.push({ url: String(url), ...(init ? { init } : {}) }); return new Response("{}"); });
  await road(SERVICE + "/mcp", { method: "POST" });
  expect(seen).toEqual([{ url: SERVICE + "/mcp", init: { method: "POST", redirect: "error" } }]);
  for (const elsewhere of [`${SERVICE}/v1/scopes/${ISSUE}/summary`, `${SERVICE}/mcp/agents`, `${SERVICE}/health`, "https://other.invalid/mcp"]) {
    expect(await stoppedWith(() => road(elsewhere))).toBe("bypass-read");
  }
  expect(seen).toHaveLength(1);
});

test("agent.ts imports no way to reach a home, an input, an earlier result or the network", () => {
  const source = readFileSync(new URL("../hosted-loop/agent.ts", import.meta.url), "utf8");
  const imports = [...source.matchAll(/from "([^"]+)"/g)].map(match => match[1]).sort();
  expect(imports).toEqual(["./hosted-session.ts", "./public.ts", "./tool-list.ts", "./words.ts", "@generalbusiness/dap-bytes", "@generalbusiness/dap-contract"]);
  expect(source).not.toMatch(/\bfetch\(|\bprocess\.|\bimport\(|\brequire\(|globalThis/);
});

// ---------------------------------------------------------------- each phase's input

const offered = item(2, "commitment", "offered", { parties: mine("offeree"), refs: { termsAt: 1 } });
const active = item(2, "commitment", "accepted", { parties: mine("performer") });
const asked = item(4, "ask", "asked", { parties: mine("asker"), refs: { bodyAt: 4 }, values: { body: HASH } });
const decided = item(4, "ask", "decided", { parties: mine("asker"), refs: { bodyAt: 4, decisionAt: 8 }, values: { body: HASH } });
const blocked = item(6, "block", "blocked", { refs: { commitment: 2, on: 4 } });
const decide = { 8: { type: "act", signed: { intent: { kind: "decide", on: 4 } } } };
const newOffer = item(10, "commitment", "offered", { parties: mine("offeree"), refs: { termsAt: 9 } });
const lanes = [ISSUE_LANE];
const refusals: [string, AgentPhase, Script, StopWord][] = [
  ["no issue lane", "agent-accept", {}, "no-issue-lane"],
  ["two issue lanes", "agent-accept", { lanes: [ISSUE_LANE, ISSUE_LANE] }, "no-issue-lane"],
  ["no offer to the agent", "agent-accept", { lanes }, "no-offer"],
  ["an offer to another member", "agent-accept", { lanes, live: [item(2, "commitment", "offered", { parties: { offeree: { member: "@other" } } as unknown as Item["parties"] })] }, "no-offer"],
  ["no commitment", "agent-ask", { lanes }, "no-commitment"],
  ["no question", "agent-request", { lanes }, "no-question"],
  ["no controller", "agent-request", { lanes, live: [asked] }, "no-controller"],
  ["no commitment", "agent-block", { lanes, live: [asked] }, "no-commitment"],
  ["no question", "agent-block", { lanes, live: [active] }, "no-question"],
  ["no question", "agent-wait-open", { lanes }, "no-question"],
  ["a question that is decided", "agent-wait-open", { lanes, final: [decided] }, "no-question"],
  ["a wait that does not time out", "agent-wait-open", { lanes, live: [asked], wait: { timedOut: false } }, "record-differs"],
  ["no question", "agent-wait", { lanes }, "no-question"],
  ["a question that stays open", "agent-wait", { lanes, live: [asked] }, "still-open"],
  ["a question gone from the record", "agent-wait", { lanes, final: [decided], wait: { timedOut: true } }, "question-changed"],
  ["a wait that ends on another state", "agent-wait", { lanes, live: [asked], wait: { timedOut: false } }, "question-changed"],
  ["no block", "agent-resume", { lanes }, "no-block"],
  ["no decision", "agent-resume", { lanes, live: [blocked, asked] }, "no-decision"],
  ["a decisionAt that is no decide act", "agent-resume", { lanes, live: [blocked], final: [decided] }, "no-decision"],
  ["no new offer", "agent-resume", { lanes, live: [blocked, active], final: [decided], entries: decide }, "no-new-offer"],
  ["no text of the question it asked", "agent-resume", { lanes, live: [blocked, newOffer], final: [decided], entries: decide }, "question-changed"],
  ["no block", "agent-accept-new", { lanes }, "no-block"],
  ["no new offer", "agent-accept-new", { lanes, live: [blocked, active], final: [decided], entries: decide }, "no-new-offer"],
  ["no block", "agent-release", { lanes }, "no-block"],
  ["no decision", "agent-release", { lanes, live: [blocked, asked] }, "no-decision"],
  ["no change definition", "agent-open-change", { rules: [] }, "no-definition"],
  ["no change lane", "agent-link", { lanes }, "no-change-lane"],
  ["no issue lane", "agent-link", { lanes: [CHANGE_LANE] }, "no-issue-lane"],
  ["no change lane", "agent-propose", { lanes }, "no-change-lane"],
  ["no published head", "agent-propose", { lanes: [ISSUE_LANE, CHANGE_LANE] }, "no-published-head"],
  ["no issue lane", "agent-verify", { lanes: [CHANGE_LANE] }, "no-issue-lane"],
  ["no change lane", "agent-verify", { lanes }, "no-change-lane"],
  ["another order of acts", "agent-verify", { lanes: [ISSUE_LANE, CHANGE_LANE], steps: [{ seq: 1, input: "act", kind: "offer", signer: "someone" }] }, "record-differs"],
];
test.each(refusals)("with %s, %s stops", async (_case, phase, script, word) => {
  expect(await phaseOn(phase, script)).toBe(word);
});

test("a phase's stop signs nothing: no act tool runs in any refusal above", async () => {
  for (const [, phase, script] of refusals) {
    const port = scripted(script);
    await stoppedWith(() => agentPhase(phase, new HostedSession(port), "new"));
    expect(port.called.filter(name => name.includes(".")), phase).toEqual([]);
  }
});

const ACCEPTABLE = { lanes, live: [offered] } satisfies Script;
test("check and continue sign nothing without an original, and new does not repeat an accepted original", async () => {
  for (const mode of ["check", "continue"] as const) {
    const port = scripted(ACCEPTABLE);
    expect(await stoppedWith(() => agentPhase("agent-accept", new HostedSession(port), mode))).toBe("no-original");
    expect(port.called).not.toContain("issue.take");
  }
  const port = scripted({ ...ACCEPTABLE, settle: { answer: "accepted", fact: FACT } });
  const result = await agentPhase("agent-accept", new HostedSession(port), "new");
  expect(result.values?.["reused"]).toBe(true);
  expect(result.facts).toEqual({ accept: FACT });
  expect(port.called).not.toContain("issue.take");
});

test("a refused or unknown original stops, and an act the scope refuses stops with its word", async () => {
  expect(await phaseOn("agent-accept", { ...ACCEPTABLE, settle: { answer: "refused" } })).toBe("act-refused");
  expect(await phaseOn("agent-accept", { ...ACCEPTABLE, settle: { answer: "unknown" } })).toBe("act-unresolved");
  expect(await phaseOn("agent-accept", { ...ACCEPTABLE, act: { answer: "refused" } })).toBe("act-refused");
  expect(await phaseOn("agent-accept", { ...ACCEPTABLE, act: { answer: "unknown" } })).toBe("act-unresolved");
});

test("agent-accept signs the offer and terms it read in this session", async () => {
  const port = scripted(ACCEPTABLE), calls: [string, Record<string, unknown>][] = [], call = port.callTool;
  port.callTool = async (name, args) => { calls.push([name, args]); return call(name, args); };
  const result = await agentPhase("agent-accept", new HostedSession(port), "new");
  expect(result.values?.["reused"]).toBe(false);
  expect(calls.at(-1)).toEqual(["issue.take", { target: ISSUE, on: 2, fields: { terms: { at: at(ISSUE), seq: 1, hash: HASH } }, idempotencyKey: "hosted-loop-accept" }]);
});

test("a stand-in base is the only head that no reply supplied, and it passes only as the phase's stated literal", async () => {
  const change = { lanes: [ISSUE_LANE, CHANGE_LANE] };
  const port = scripted(change);
  const result = await agentPhase("agent-propose", new HostedSession(port), "new", "1".repeat(40));
  expect(result.status).toBe("accepted");
  expect(port.called).toContain("change.propose-file");
});

// ---------------------------------------------------------------- the proposal's base

const PERSON_KEY = `key_${"p".repeat(43)}`, COMMIT_A = "a".repeat(40), COMMIT_B = "b".repeat(40);
const ORDER = ["offer", "accept", "ask", "request-approval", "block", "approve", "decide", "revise", "offer", "accept", "release-block"];
const PERSON_ACTS = new Set(["offer", "approve", "decide", "revise"]);
/** A record that passes every check of `agent-verify`, with the two commits a case names. */
const recorded = (base: unknown, head: unknown): Script => ({
  lanes: [ISSUE_LANE, CHANGE_LANE],
  steps: ORDER.map((kind, seq) => ({ seq, input: "act", kind, signer: PERSON_ACTS.has(kind) ? PERSON_KEY : AGENT_KEY })),
  changeSteps: [{ seq: 1, input: "act", kind: "link-own", signer: AGENT_KEY }, { seq: 2, input: "act", kind: "propose-file", signer: AGENT_KEY }],
  live: [item(2, "commitment", "accepted", { parties: mine("performer") }), item(10, "commitment", "accepted", { parties: mine("performer") }), item(4, "manifest", "current", { values: { digest: HASH, base } as Item["values"] })],
  final: [item(6, "block", "released")],
  branches: head === undefined ? [] : [item(1, "branch", "ready", { values: { head } as Item["values"] })],
});

test("agent-verify prints the signed base beside the branch's head, says they are equal, and prints in the projection", async () => {
  const port = scripted(recorded(COMMIT_A, COMMIT_A));
  const result = await agentPhase("agent-verify", new HostedSession(port), "new");
  expect(result.values).toMatchObject({ base: COMMIT_A, head: COMMIT_A, baseIsHead: true, standIn: false });
  expect(scanPublic(publicLine(result))).toEqual([]);
  expect(port.called.filter(name => name.includes("."))).toEqual([]);
});
test("agent-verify says when the signed base differs from the branch's head", async () => {
  const result = await agentPhase("agent-verify", new HostedSession(scripted(recorded(COMMIT_A, COMMIT_B))), "new");
  expect(result.values).toMatchObject({ base: COMMIT_A, head: COMMIT_B, baseIsHead: false, standIn: false });
  expect(publicLine(result)).toContain(COMMIT_B);
});
test("a stand-in input says so, prints the manifest's base and no head, and reads as no real base", async () => {
  const result = await agentPhase("agent-verify", new HostedSession(scripted(recorded(COMMIT_A, undefined))), "new", COMMIT_B);
  expect(result.values).toMatchObject({ base: COMMIT_A, head: null, baseIsHead: false, standIn: true });
  expect(scanPublic(publicLine(result))).toEqual([]);
});
test("with no stand-in and no head, agent-verify stops at no-published-head", async () => {
  expect(await phaseOn("agent-verify", recorded(COMMIT_A, undefined))).toBe("no-published-head");
});
test.each<[string, unknown, unknown]>([
  ["a 64-hex base", "a".repeat(64), COMMIT_A],
  ["a 64-hex head", COMMIT_A, "a".repeat(64)],
  ["a base with no value", undefined, COMMIT_A],
  ["a short head", COMMIT_A, "abc1234"],
  ["an uppercase base", "A".repeat(40), COMMIT_A],
])("with %s, agent-verify stops at commit-format and signs nothing", async (_name, base, head) => {
  const port = scripted(recorded(base, head));
  expect(await stoppedWith(() => agentPhase("agent-verify", new HostedSession(port), "new"))).toBe("commit-format");
  expect(port.called.filter(name => name.includes("."))).toEqual([]);
});
test("a 40-hex commit fits agent-verify's base and head alone", () => {
  const verify = (values: Record<string, unknown>): PublicResult => ({ phase: "agent-verify", actor: "agent", status: "observed", values });
  expect(() => publicLine(verify({ base: COMMIT_A, head: COMMIT_A }))).not.toThrow();
  expect(() => publicLine(verify({ base: COMMIT_A, head: null }))).not.toThrow();
  for (const refused of [
    verify({ base: COMMIT_A, head: COMMIT_A, other: COMMIT_A }),
    verify({ base: "a".repeat(64), head: COMMIT_A }),
    verify({ base: COMMIT_A, head: "word" }),
    verify({ base: null, head: COMMIT_A }),
    { ...ROW, values: { base: COMMIT_A } },
    { ...ROW, facts: { base: COMMIT_A } },
  ]) expect(() => publicLine(refused), JSON.stringify(refused)).toThrow(/public-output/);
});

// ---------------------------------------------------------------- the person's phases

function personOn(record: { lanes?: unknown[]; items?: Item[] }): PersonPort & { acts: string[] } {
  const acts: string[] = [];
  return {
    acts,
    read: async name => name === "room" ? { lanes: record.lanes ?? [] } : name === "actions" ? { digest: HASH } : name === "inspect" ? { ref: at(ISSUE), items: record.items ?? [] } : { hash: HASH, entry: { seq: 4, at: at(ISSUE) } },
    act: async (phase, _target, _digest, kind) => { acts.push(`${phase}:${kind}`); return FACT as never; },
  };
}
const personRefusals: [PersonPhase, Parameters<typeof personOn>[0], StopWord][] = [
  ["offer", {}, "no-issue-lane"], ["offer-new", {}, "no-issue-lane"],
  ["approve", {}, "no-issue-lane"], ["decide", {}, "no-issue-lane"], ["revise", {}, "no-issue-lane"],
  ["approve", { lanes }, "no-question"],
  ["approve", { lanes, items: [asked] }, "no-approval-request"],
  ["decide", { lanes }, "no-question"],
  ["roles", {}, "no-standing"],
];
test.each(personRefusals)("%s stops without its input", async (phase, record, word) => {
  const port = personOn(record);
  expect(await stoppedWith(() => personPhase(phase, port, "@agent"))).toBe(word);
  expect(port.acts).toEqual([]);
});
test("a decision is two acts of the person: approve answers the request, and decide closes the question", async () => {
  const port = personOn({ lanes, items: [asked, item(5, "approval-request", "open")] });
  await personPhase("approve", port, "@agent");
  await personPhase("decide", port, "@agent");
  expect(port.acts).toEqual(["approve:approve", "decide:decide"]);
});

// ---------------------------------------------------------------- the public output

const ROW: PublicResult = { phase: "agent-accept", actor: "agent", status: "accepted", facts: { accept: { at: at(ISSUE), seq: 3, hash: HASH } }, values: { tools: HASH, names: ["room", "application_installation", "issue.take"], agentKey: AGENT_KEY } };
test("a line of references and fixed words prints, and it passes the scan", () => {
  expect(scanPublic(publicLine(ROW), [BEARER])).toEqual([]);
});
test.each<[string, Record<string, unknown>]>([
  ["a sentence", { note: "TEST the person's reasons" }],
  ["a bearer", { value: BEARER }],
  ["a secret", { value: "s".repeat(43) }],
  ["an invitation link", { value: "artroom-agent-key:abc" }],
  ["a key named body", { body: "word" }],
  ["a key named content", { content: "word" }],
  ["a key named comment", { nested: { comment: "word" } }],
  ["a key named token", { token: "word" }],
  ["a key named bearer", { bearer: "word" }],
  ["a nested sentence", { list: [{ deep: "a sentence, with words" }] }],
])("a result with %s prints nothing", (_name, values) => {
  expect(() => publicLine({ ...ROW, values })).toThrow(/public-output/);
});
test("a result with another field prints nothing", () => {
  expect(() => publicLine({ ...ROW, text: "word" } as never)).toThrow(/public-output/);
});
test.each<[string, string, string]>([
  ["exact-private-value", "the private TEXT here", "private TEXT"],
  ["bearer-header", "authorization: Bearer abc", ""],
  ["control-header", "Control abcdefghijklmnopqrstuvwxyz", ""],
  ["invitation-link", "artroom-agent-key:abc", ""],
  ["private-key-name", '{"body":"x"}', ""],
  ["agent-object-or-bearer", `agent ${"f".repeat(64)} here`, ""],
  ["unexplained-token", `value ${"Q".repeat(32)} here`, ""],
])("the scan names %s", (problem, text, exact) => {
  expect(scanPublic(text, exact ? [exact] : [])).toContain(problem);
});
test("the scan passes a digest, a scope, a key and a commit, each by its own shape", () => {
  expect(scanPublic(`${HASH} ${ISSUE} ${AGENT_KEY} ${"a".repeat(40)} in_${"n".repeat(26)}`)).toEqual([]);
});

// ---------------------------------------------------------------- the input and its target

let temp = "";
beforeEach(() => { temp = realpathSync(mkdtempSync(join(tmpdir(), "hosted-loop-"))); });
afterEach(() => { rmSync(temp, { recursive: true, force: true }); vi.restoreAllMocks(); });
const example = () => JSON.parse(readFileSync(new URL("../hosted-loop/input.example.json", import.meta.url), "utf8")) as Record<string, unknown>;
const inputOf = (value: unknown): string => { const path = join(temp, "input.json"); writeFileSync(path, JSON.stringify(value)); return path; };
const usable = (home = join(temp, "home")) => ({ ...example(), register: REGISTER, deploymentVersion: VERSION, service: SERVICE, deployment: "the-worker", home });
const planOf = (): LoopPlan => readLoopPlan(inputOf(usable()));

test("the example stops until someone supplies the reviewed version and register", () => {
  expect(() => readLoopPlan(inputOf(example()))).toThrow(/stopped: input/);
  expect(() => readLoopPlan(inputOf({ ...example(), deploymentVersion: VERSION }))).toThrow(/stopped: input/);
  expect(() => readLoopPlan(inputOf({ ...example(), register: REGISTER }))).toThrow(/stopped: input/);
  expect(readLoopPlan(inputOf({ ...example(), register: REGISTER, deploymentVersion: VERSION })).name).toBe("hosted-loop-scratch-1");
});
test.each<[string, Record<string, unknown>, StopWord]>([
  ["the real room's name", { name: "repo-in-ai" }, "scratch-only"],
  ["a home on the real room's path", { home: "/absolute/repo-in-ai/agent" }, "scratch-only"],
  ["an unknown version word on HTTPS", { deploymentVersion: "unknown" }, "input"],
  ["a stand-in base on HTTPS", { standInBase: "1".repeat(40) }, "input"],
  ["plain HTTP off loopback", { service: "http://hosted-loop.invalid" }, "input"],
  ["a service with a path", { service: `${SERVICE}/mcp` }, "input"],
  ["a relative home", { home: "relative/home" }, "input"],
  ["one handle twice", { handles: { person: "@same", agent: "@same" } }, "input"],
  ["another field", { providerOrigin: SERVICE }, "input"],
])("the input refuses %s", (_name, change, word) => {
  expect(() => readLoopPlan(inputOf({ ...usable(), ...change }))).toThrow(new RegExp(`stopped: ${word}`));
});
test("loopback alone takes the unknown version and a stand-in base", () => {
  expect(readLoopPlan(inputOf({ ...usable(), service: "http://127.0.0.1:8791", deploymentVersion: "unknown", standInBase: "1".repeat(40) })).standInBase).toBe("1".repeat(40));
});

/** STAND-IN for the Worker: its health, and the status of a POST to /mcp with no bearer. */
const health = (version = VERSION, mcp = 401, deployment = "the-worker") => (async (url: string) => {
  if (url.endsWith("/health")) return new Response(JSON.stringify({ deployment, version, sessions: "ok", register: "ready" }));
  return new Response(null, { status: mcp });
}) as (url: string, init?: RequestInit) => Promise<Response>;

test("the target check refuses another version, another deployment and a Worker that does not answer", async () => {
  const plan = planOf();
  await expect(checkTarget(plan, health())).resolves.toBeUndefined();
  expect(await stoppedWith(() => checkTarget(plan, health("99999999-2222-4333-8444-555555555555")))).toBe("target-version");
  expect(await stoppedWith(() => checkTarget(plan, health(VERSION, 401, "dap-grow")))).toBe("target-version");
  expect(await stoppedWith(() => checkTarget(plan, async () => { throw new Error("offline"); }))).toBe("target-unavailable");
});
test("the endpoint check tells a closed endpoint from an open one", async () => {
  const plan = planOf();
  await expect(checkEndpoint(plan, health())).resolves.toBeUndefined();
  expect(await stoppedWith(() => checkEndpoint(plan, health(VERSION, 404)))).toBe("endpoint-closed");
  expect(await stoppedWith(() => checkEndpoint(plan, health(VERSION, 500)))).toBe("target-unavailable");
});

test.each(loopPhases)("%s refuses a Worker version that differs from its input, and prints only its stop", async phase => {
  const input = inputOf(usable()), out = vi.spyOn(process.stdout, "write").mockReturnValue(true), err = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  const open = vi.fn(async () => scripted({}));
  const code = await main(["--input", input, "--phase", phase, "--mode", "new", "--diagnostics", join(temp, "diagnostics")], { fetch: health("99999999-2222-4333-8444-555555555555"), open });
  expect(code).toBe(1);
  expect(open).not.toHaveBeenCalled();
  expect(out).not.toHaveBeenCalled();
  expect(String(err.mock.calls[0]?.[0])).toBe(`Hosted loop stopped at ${phase}: target-version. Use check on this phase; use continue only for the same retained original.\n`);
  expect(JSON.parse(readFileSync(join(temp, "diagnostics", "receipt.json"), "utf8"))["stop"]).toBe("target-version");
  expect(() => lstatSync(join(temp, "home", "person"))).toThrow(/ENOENT/);
});
test("preflight and owner stop on a closed endpoint before any home exists", async () => {
  const plan = planOf();
  for (const phase of ["preflight", "owner"] as const) expect(await stoppedWith(() => runPhase(plan, phase, "new", { fetch: health(VERSION, 404) }))).toBe("endpoint-closed");
  expect(() => lstatSync(join(temp, "home", "person"))).toThrow(/ENOENT/);
});
test("a command without its input, its phase or its diagnostics runs nothing", async () => {
  vi.spyOn(process.stderr, "write").mockReturnValue(true);
  expect(await main(["--phase", "preflight"])).toBe(2);
  expect(await main(["--input", "x", "--phase", "not-a-phase", "--diagnostics", "y"])).toBe(2);
  expect(await main(["--unknown", "x"])).toBe(2);
});

// ---------------------------------------------------------------- the agent's home

const writeAgent = (plan: LoopPlan, files: Record<string, string>) => {
  mkdirSync(join(plan.home, "agent"), { recursive: true, mode: 0o700 });
  for (const [name, bytes] of Object.entries(files)) writeFileSync(join(plan.home, "agent", name), bytes, { mode: 0o600 });
};
test.each<[string, Record<string, string> | null, StopWord]>([
  ["no agent home", null, "no-bearer"],
  ["an empty agent home", {}, "no-bearer"],
  ["another file beside the bearer", { bearer: BEARER, "agent.key": "held" }, "agent-home-differs"],
  ["another file and no bearer", { config: "held" }, "agent-home-differs"],
  ["a malformed bearer", { bearer: "not-a-bearer" }, "bearer-unusable"],
])("an agent phase with %s opens no session", async (_name, files, word) => {
  const plan = planOf(), open = vi.fn(async () => scripted({}));
  if (files) writeAgent(plan, files);
  expect(await stoppedWith(() => runPhase(plan, "agent-accept", "new", { fetch: health(), open }))).toBe(word);
  expect(open).not.toHaveBeenCalled();
});
test("each agent phase opens a new session from the service and the bearer, closes it, and leaves the one file", async () => {
  const plan = planOf(), ports: ReturnType<typeof scripted>[] = [], given: string[][] = [];
  writeAgent(plan, { bearer: BEARER });
  const open = async (service: string, bearer: string) => { given.push([service, bearer]); const port = scripted({ lanes }); ports.push(port); return port; };
  await runPhase(plan, "agent-tools", "new", { fetch: health(), open });
  await runPhase(plan, "agent-wait-open", "new", { fetch: health(), open }).catch(() => {});
  expect(given).toEqual([[SERVICE, BEARER], [SERVICE, BEARER]]);
  expect(ports.map(port => port.closed)).toEqual([1, 1]);
  expect(readdirSync(join(plan.home, "agent"))).toEqual(["bearer"]);
});
test("a client fails to connect with a bad bearer, and the phase says only that", async () => {
  const plan = planOf();
  writeAgent(plan, { bearer: BEARER });
  expect(await stoppedWith(() => runPhase(plan, "agent-tools", "new", { fetch: health(), open: async () => { throw new Error(`refused ${BEARER}`); } }))).toBe("bearer-unusable");
});

// ---------------------------------------------------------------- the person's home

const personPhases: LoopPhase[] = ["create", "roles", "rules", "activate-issue", "activate-change", "invite-agent", "create-agent", "open-issue", "offer", "approve", "decide", "revise", "offer-new"];
test.each(personPhases)("%s stops without the person's home", async phase => {
  expect(await stoppedWith(() => runPhase(planOf(), phase, "new", { fetch: health() }))).toBe("no-person-home");
});
test("owner writes the person's home, and create-agent and invite-agent stop without a room", async () => {
  const plan = planOf();
  await runPhase(plan, "owner", "new", { fetch: health() });
  expect(await stoppedWith(() => runPhase(plan, "invite-agent", "new", { fetch: health() }))).toBe("room-unresolved");
  expect(await stoppedWith(() => runPhase(plan, "create-agent", "new", { fetch: health() }))).toBe("no-original");
  expect(() => lstatSync(join(plan.home, "agent"))).toThrow(/ENOENT/);
});
test("another input against the same person's home stops", async () => {
  const plan = planOf();
  await runPhase(plan, "owner", "new", { fetch: health() });
  expect(await stoppedWith(() => runPhase({ ...plan, name: "hosted-loop-another" }, "roles", "new", { fetch: health() }))).toBe("plan-differs");
});

test("an HTTPS input does not adopt a key that planned a register, because that stand-in serves a local Worker alone", async () => {
  const plan = planOf(), home = join(plan.home, "person");
  mkdirSync(home, { recursive: true, mode: 0o700 });
  const store = durableCliStore(home), config = { v: 2, service: SERVICE, key: "operator", register: plan.register, plan: {} } as never;
  await store.save(config);
  const answer = await runPhase(plan, "owner", "new", { fetch: health() }).catch(() => null);
  expect(answer?.values?.["localFounder"]).toBeUndefined();
  expect((await store.config())?.handle).toBeUndefined();
});

test.each(personPhases)("%s refuses an existing home with no retained plan, and writes no plan into it", async phase => {
  const plan = planOf(), home = join(plan.home, "person");
  mkdirSync(plan.home, { recursive: true, mode: 0o700 });
  await initializeOwner(home, { service: SERVICE, register: plan.register, handle: plan.handles.person }, "new");
  expect(await stoppedWith(() => runPhase(plan, phase, "new", { fetch: health() }))).toBe("no-retained-plan");
  expect(await retained(durableCliStore(home), "hosted-loop-plan")).toBeNull();
});
test("owner's own continue writes the plan into a home that owner began, and the next phase then accepts it", async () => {
  const plan = planOf(), home = join(plan.home, "person");
  mkdirSync(plan.home, { recursive: true, mode: 0o700 });
  await initializeOwner(home, { service: SERVICE, register: plan.register, handle: plan.handles.person }, "new");
  expect(await stoppedWith(() => runPhase(plan, "owner", "new", { fetch: health() }))).toBe("no-retained-plan");
  await runPhase(plan, "owner", "continue", { fetch: health() });
  expect(await retained(durableCliStore(home), "hosted-loop-plan")).toEqual(plan);
  expect(await stoppedWith(() => runPhase(plan, "invite-agent", "new", { fetch: health() }))).toBe("room-unresolved");
});

test("the run's own scan holds the person's link: a line that carries it prints nothing", async () => {
  // A real link cannot fit the closed projection, so this home's link is the fixed word that preflight prints. That reaches the second check.
  const input = inputOf(usable()), home = join(temp, "home", "person");
  const out = vi.spyOn(process.stdout, "write").mockReturnValue(true), err = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  mkdirSync(home, { recursive: true, mode: 0o700 });
  await durableCliStore(home).keepPrivate("hosted-loop-link", utf8("open"));
  expect(await main(["--input", input, "--phase", "preflight", "--mode", "new", "--diagnostics", join(temp, "diagnostics")], { fetch: health() })).toBe(1);
  expect(out).not.toHaveBeenCalled();
  expect(String(err.mock.calls[0]?.[0])).toContain("preflight: public-output.");
});
test("with no person's home and no link, preflight prints its one line, with a deployed Worker's version in it", async () => {
  const input = inputOf(usable()), out = vi.spyOn(process.stdout, "write").mockReturnValue(true);
  expect(await main(["--input", input, "--phase", "preflight", "--mode", "new", "--diagnostics", join(temp, "diagnostics")], { fetch: health() })).toBe(0);
  const line = JSON.parse(String(out.mock.calls[0]?.[0]));
  expect(line["values"]).toEqual({ version: VERSION, deployment: "the-worker", endpoint: "open" });
});

test("every agent line says that a script drove its session", async () => {
  const session = new HostedSession(scripted({ lanes, live: [asked] }));
  const tools = await agentPhase("agent-tools", session, "new");
  const waited = await agentPhase("agent-wait-open", new HostedSession(scripted({ lanes, live: [asked] })), "new");
  const accepted = await agentPhase("agent-accept", new HostedSession(scripted(ACCEPTABLE)), "new");
  expect([tools, waited, accepted].map(row => row.values?.["driver"])).toEqual(["script", "script", "script"]);
});

test("S1's owner still refuses plain HTTP unless its caller names a local Worker", async () => {
  const register = REGISTER as never, input = { register, handle: "@owner" };
  const answer = (home: string, service: string, options?: { loopback: boolean }) => initializeOwner(join(temp, home), { ...input, service }, "new", options).then(() => "accepted", (error: Error) => error.message);
  expect(await answer("s1", "http://127.0.0.1:8791")).toMatch(/owner-input-invalid/);
  expect(await answer("s1b", "http://example.invalid", { loopback: true })).toMatch(/owner-input-invalid/);
  expect(await answer("s1c", "http://127.0.0.1:8791", { loopback: true })).toBe("accepted");
});
