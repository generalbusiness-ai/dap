/** Issue workflows and closure links. */
import { type ActShape, expectedOf } from "./browser-helpers.ts";
import type { Context, Outcome } from "./command-context.ts";
import { accepted, answered, configOf, createdBy, done, failed, handleOf, readerOf, run, signerOf, signing, stopCommand, summaryOf, usage, waitFor } from "./command-support.ts";
import { activeDefinition, definitionOf, directoryReader, laneActive, laneOf, openingDirectory } from "./command-targets.ts";
import type { Config } from "./store.ts";
import { textDigest } from "@generalbusiness/dap-bytes";
import { partitionIndexes, signedIntent } from "@generalbusiness/dap-client";
import type { DeclaredDefinition, FieldValue, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";

// ---------------------------------------------------------------- issues, and the link that closes one

/** An issue of the room, as its own lane has it now. The directory's row gives its lane and its number. */
export interface Issue { lane: ScopeId; ref: ScopeRef; number: number | null; title: string; state: string; reason: string | null; opener: string | null; assignees: string[] }

const memberOf = (party: unknown): string | null => (party && typeof party === "object" && typeof (party as { member?: unknown }).member === "string" ? (party as { member: string }).member : null);

/**
 * The issues of the room, oldest first: each row of the directory whose kind is `issue`, read in its own lane. The lane is read and
 * not the row, because the directory's row is an index that the lane's own acts update, and a merge that closes the issue sends
 * the directory nothing (the `closes` handler of the issue lane has no send). A row whose lane is not created yet is left out.
 */
async function issuesOf(ctx: Context, config: Config, reader: string | null): Promise<Issue[]> {
  const D = await handleOf(ctx, config, config.repository!.directory.scope, reader);
  const summary = await summaryOf(D);
  let rows = summary.items;
  if (summary.definition === "platform:directory@10") {
    const coverage = await partitionIndexes(directoryReader(ctx, config, reader), config.repository!.directory, config.repository!.membership);
    if (!coverage.complete) return stopCommand(failed(`Directory indexes incomplete: ${coverage.reason}. No issue absence is inferred.`));
    rows = coverage.indexes.flatMap(index => [...index.lanes]);
  }
  rows = rows.filter((item) => item.type === "lane" && item.values["kind"] === "issue").sort((a, b) => Number(a.values["number"] ?? a.id) - Number(b.values["number"] ?? b.id));
  const issues: Issue[] = [];
  for (const row of rows) {
    const lane = (row.refs["scope"] as ScopeRef | undefined)?.scope;
    if (!lane) continue;
    const summary = await summaryOf(await handleOf(ctx, config, lane, reader));
    const intent = summary.items.find((item) => item.type === "intent");
    if (!intent) continue;
    const assignees = intent.parties["assignees"];
    issues.push({
      lane, ref: summary.scope, number: typeof intent.values["number"] === "number" ? intent.values["number"] : null,
      title: String(intent.values["title"] ?? ""), state: intent.state,
      reason: typeof intent.values["closeReason"] === "string" ? intent.values["closeReason"] : null,
      opener: memberOf(intent.parties["requester"]),
      assignees: (Array.isArray(assignees) ? assignees : []).map(memberOf).filter((m): m is string => m !== null),
    });
  }
  return issues;
}

/** An issue by its number (`3` or `#3`) or its lane's scope ID. */
export async function issueNamed(ctx: Context, config: Config, reader: string | null, named: string): Promise<Issue> {
  const issues = await issuesOf(ctx, config, reader);
  const number = /^#?(\d+)$/.exec(named);
  const matched = number ? issues.find((issue) => issue.number === Number(number[1])) : issues.find((issue) => issue.lane === named);
  return matched ?? stopCommand(usage(`No issue ${named} is listed in the directory ${config.repository!.directory.scope}. Run: dap issues`));
}

/**
 * One act of an issue's own lane, under the definition that the lane runs, signed through the client's declared handle. `choose`
 * gives the act, its item and its fields from the issue as it is now and the caller's handle. The lane judges it.
 */
function issueAct(ctx: Context, named: string, choose: (issue: Issue, handle: string | undefined, membership: ScopeRef) => { kind: string; on: number | null; fields: Record<string, unknown> }, took: string): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    const repository = config.repository ?? stopCommand(usage("No repository is known here. Run: dap create <name>, or dap join <link>."));
    const reader = await readerOf(ctx, config);
    const issue = await issueNamed(ctx, config, reader, named);
    const L = await handleOf(ctx, config, issue.lane, reader);
    const read = await L.definition();
    if (!read.ok) return failed(`Cannot read the definition of ${issue.lane}: ${read.reason}.`);
    const { kind, on, fields } = choose(issue, config.handle, repository.membership);
    const declaration = read.value.acts[kind] ?? stopCommand(failed(`The issue ${issue.lane} is under ${read.value.name}, which has no act ${kind}.`));
    const items = (await summaryOf(L)).items;
    const I = await laneOf(ctx, config, issue.lane, reader, read.value);
    const signer = await signerOf(ctx, config);
    const { signed, beside } = await I.intent(signer, kind as never, { on, fields, expected: expectedOf(declaration as unknown as ActShape, items, on, fields as Record<string, FieldValue>) } as never, signing(ctx));
    return answered(issue.lane, await I.submit(signed, [], beside), took);
  });
}

/**
 * `dap issue open --title <text> [--body <text>]`: the directory's `open-issue`, under the issue definition that the rules
 * scope holds active, whose bytes go beside the act; the directory creates the issue's lane, and the command waits for it. The
 * issue's one condition is its title: the lane's genesis refuses an empty list of conditions, `required-unset`, and the command
 * has no flag for them (the delivery note's gap 1).
 */
export function issueOpen(ctx: Context, options: { title?: string; body?: string } = {}): Promise<Outcome> {
  return run(async () => {
    if (options.title === undefined) return usage("issue open needs --title <text>.");
    const config = await configOf(ctx);
    if (!config.repository) return usage("No repository is known here. Run: dap create <name>, or dap join <link>.");
    const signer = await signerOf(ctx, config);
    const reader = await readerOf(ctx, config);
    const issue = await activeDefinition(ctx, config, reader, "issue");
    const { D, summary, target } = await openingDirectory(ctx, config, reader);
    const shape = (await definitionOf(D, summary)).shape;
    // The body is a detached text: the intent holds its digest, and the text travels beside it.
    const fields = { definition: issue.digest, title: options.title, ...(options.body !== undefined ? { body: textDigest(options.body) } : {}), conditions: [options.title] };
    const signed = await signedIntent(signer, { to: target, kind: "open-issue", fields, expected: expectedOf(shape.acts["open-issue"]!, summary.items, null, fields) }, signing(ctx));
    const opened = accepted(await D.submit(signed, [], { values: [issue.bytes], ...(options.body !== undefined ? { texts: [options.body] } : {}) }), D.scope, "Opened").receipt.fact.seq;
    const lane = (await createdBy(D, opened)).find((made) => made.seed.kind === "lane")?.scope ?? stopCommand(failed(`Entry ${D.scope}:${opened} opens no lane.`));
    const L = await handleOf(ctx, config, lane, reader);
    const created = await waitFor(ctx, () => [D.scope, lane], () => laneActive(L, `${D.scope}:${opened}`), `the issue ${lane}`);
    const number = created.items.find((item) => item.type === "intent")?.values["number"];
    return done(`Opened issue #${String(number)}: ${options.title}. Its lane is ${lane}.`);
  });
}

/** `dap issue comment <issue> <text>`: the issue lane's `comment`. Any member may comment. */
export function issueComment(ctx: Context, named: string, text: string): Promise<Outcome> {
  return issueAct(ctx, named, () => ({ kind: "comment", on: null, fields: { body: text } }), "Commented");
}

/** `dap issue assign <issue> <@member>`: the issue lane's `assign`, which sets the one assignee. It needs `issue.triage`. */
export function issueAssign(ctx: Context, named: string, member: string): Promise<Outcome> {
  return issueAct(ctx, named, (_, __, membership) => ({ kind: "assign", on: 0, fields: { assignees: [{ membership, member }] } }), "Assigned");
}

/**
 * `dap issue close <issue>`: `close-own` when the caller opened the issue, and otherwise `close-any`, which needs
 * `issue.triage`. The reason is `completed`. The demo profile has no rule that lets an assignee close an issue.
 */
export function issueClose(ctx: Context, named: string): Promise<Outcome> {
  return issueAct(ctx, named, (issue, handle) => ({ kind: issue.opener !== null && issue.opener === handle ? "close-own" : "close-any", on: 0, fields: { reason: "completed" } }), "Closed");
}

/** `dap issues`: every issue of the room, oldest first, with its number, state, title, assignees and lane. */
export function issues(ctx: Context): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    if (!config.repository) return usage("No repository is known here. Run: dap create <name>, or dap join <link>.");
    const all = await issuesOf(ctx, config, await readerOf(ctx, config));
    if (all.length === 0) return done("No issues.");
    const lines = all.map((issue) => `#${issue.number ?? "?"}  ${issue.state}${issue.reason ? ` (${issue.reason})` : ""}  ${issue.title}${issue.assignees.length > 0 ? `; assigned to ${issue.assignees.join(", ")}` : ""}; lane ${issue.lane}`);
    return done(...lines, `${all.length} issues, ${all.filter((issue) => issue.state === "open").length} open.`);
  });
}

/**
 * The change lane's `link-own` to an issue, by keyword: the link that the merge, once published, sends to the issue, which then
 * closes (plan 019, default 3). The lane takes it from the change's author only; the demo profile has no `link-any`.
 */
export async function linking(ctx: Context, config: Config, lane: ScopeId, reader: string | null, declared: DeclaredDefinition, issue: Issue): Promise<Outcome> {
  const declaration = declared.acts["link-own"] ?? stopCommand(failed(`The change ${lane} is under a definition with no act link-own.`));
  const fields = { issue: issue.ref, how: "keyword" } as Record<string, FieldValue>;
  const items = (await summaryOf(await handleOf(ctx, config, lane, reader))).items;
  const C = await laneOf(ctx, config, lane, reader, declared);
  const signer = await signerOf(ctx, config);
  const { signed, beside } = await C.intent(signer, "link-own" as never, { on: null, fields, expected: expectedOf(declaration as unknown as ActShape, items, null, fields) } as never, signing(ctx));
  const answer = await C.submit(signed, [], beside);
  if (answer.answer !== "accepted") return answered(lane, answer, "Linked");
  return done(`Linked: when it is published, the change ${lane} closes issue #${issue.number ?? "?"} (${issue.lane}).`);
}
