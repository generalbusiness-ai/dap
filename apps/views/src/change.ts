/** The Change card: one exact version of a change on an accepted pin, read from native records. The card grants nothing; the scope judges each act. */
import { canonicalize, isMemberRef, isScopeRef, utf8 } from "@generalbusiness/dap-bytes";
import type { FieldValue, Item, MemberRef, ReadMinimum, ScopeRef } from "@generalbusiness/dap-contract";
import { changeFinding, changeJ4 } from "@generalbusiness/dap-lanes";
import { signerWords, type ActSigner, type Card, type CardAction, type Projection } from "@generalbusiness/dap-mcp";
import { type ActLike } from "@generalbusiness/dap-client";
import { MERGE_STARTED, changeKicker, decidedLine, mergeHolds, reviewRecorded } from "./attention.ts";
import { captureInput } from "./capture.ts";
import { findingProfile, malformedRange, openFindings, requiredSource, shownText } from "./findings.ts";
import { sameOptional, Unread, type Collection, type Frame } from "./reads.ts";
import { changes as changeProfile, questions, type RepoInAi } from "./repo-in-ai.ts";

const LINKED_ISSUES = 4;
export const changeSubject = (scope: ScopeRef): string => JSON.stringify(scope);
function selector(subject: string | undefined): ScopeRef {
  if (!subject || subject.length > 256) throw new Unread("change-selector");
  const value: unknown = JSON.parse(subject);
  if (!isScopeRef(value)) throw new Unread("change-selector");
  return value;
}
const idOf = (value: unknown): number | null => typeof value === "number" ? value : value && typeof value === "object" && "seq" in value && typeof value["seq"] === "number" ? value["seq"] : null;

export interface LinkedIssue { scope: ScopeRef; title?: string; conditions?: readonly string[]; decided?: readonly { ask: number; question: string; decidedAt: number | null }[]; unread?: string }
/**
 * One open finding, and whether it holds this change's merge. `answerAt` is the revisions that `resolve-finding-any` and `mark-finding-irrelevant` bind, as this read saw them.
 * The ordinary act tools need no `at`: they read an earlier version's revision themselves. A caller passes this as `at` to bind what this read showed.
 */
export interface ShownFinding { item: Item; required: boolean; holdsMerge: boolean; answerAt: Record<string, number> }
export interface ChangeContext {
  scope: ScopeRef; head: Frame["head"]; definition: string; destination: string; viewer: MemberRef; key: string; actions: readonly string[];
  signer: ActSigner | null;
  proposal: Item; manifest: Item | null; versions: number; rules: Item | null;
  reviews: Item[]; requests: Item[]; jobs: Item[]; results: Item[]; merges: Item[]; items: Item[];
  /** The merge items this viewer's key signed, with the request key of each. */
  mergeKeys: Record<number, string>;
  linked: LinkedIssue[];
  /** Present only on the finding profile. Every other profile has no findings to show. */
  findings?: ShownFinding[];
  /** Lines naming each member the card shows, from the membership it read. */
  who: (member: unknown) => string;
}

/** Read one change. One linked issue that does not read says why; the card still shows the change. */
export async function readChange(app: RepoInAi, scope: ScopeRef, minimum?: ReadMinimum, withSigner = false): Promise<{ context: ChangeContext; collection: Collection }> {
  const { value, collection } = await app.collect(async collection => {
    const frame = await collection.frame(scope, minimum);
    if (!changeProfile(frame.summary.definition)) throw new Unread("change-profile-unsupported");
    const live = (type: string) => frame.items.filter(item => item.type === type);
    const proposal = live("proposal")[0] ?? (await collection.items(frame, "proposal", ["merged"]))[0];
    if (!proposal) throw new Unread("change-absent");
    const superseded = await collection.items(frame, "manifest", ["superseded"]);
    const manifest = live("manifest").find(item => item.state === "current") ?? superseded.at(-1) ?? null;
    const results = await collection.items(frame, "result", ["recorded"]);
    const merges = [...live("merge"), ...await collection.items(frame, "merge", ["published", "refused", "aborted"])].sort((a, b) => a.id - b.id);
    const mergeKeys: Record<number, string> = {};
    for (const merge of merges.filter(item => item.state === "unknown")) {
      const input = (await collection.entry(frame, merge.id)).entry.input;
      if (input.type === "act" && input.signed.intent.kind === "merge" && input.signed.intent.actor === collection.options.signer.key) mergeKeys[merge.id] = input.signed.intent.idempotencyKey;
    }
    const linked: LinkedIssue[] = [];
    for (const link of live("link").filter(item => item.state === "set")) {
      const ref = link.refs["issue"];
      if (!isScopeRef(ref)) continue;
      if (linked.length >= LINKED_ISSUES) { linked.push({ scope: ref, unread: "the card reads at most four linked issues" }); continue; }
      linked.push(await linkedIssue(collection, ref));
    }
    const owner = (member: unknown): string => {
      if (!isMemberRef(member)) return "an unknown member";
      const actor = collection.actor(member);
      if (actor.kind === "person") return `${actor.name} (person)`;
      if (actor.kind === "unknown") return `${actor.name} (not a current member)`;
      return `${actor.name} (${actor.kind}${actor.controller ? ` of ${actor.controller}` : ", no controller shown"}; not a person)`;
    };
    const rules = live("rules")[0] ?? null;
    const findings = findingProfile(frame.summary.definition) ? openFindings(frame.items).map(item => {
      const required = requiredSource(rules, item.values["source"]);
      const answer = changeFinding.acts["resolve-finding-any"] as unknown as ActLike;
      return { item, required, holdsMerge: required && proposal.state !== "merged", answerAt: captureInput(answer, [...frame.items, ...superseded, proposal], scope, item.id, {}).at };
    }) : undefined;
    let signer: ActSigner | null = null;
    try { if (withSigner) signer = await collection.openingSigner(frame, manifest ?? proposal); } catch { /* Attribution cannot hide the record or its controls. */ }
    return { signer, scope, head: frame.head, definition: frame.summary.definition, destination: collection.config.repository!.destination, viewer: collection.viewer, key: collection.options.signer.key, actions: collection.actions,
      proposal, manifest, versions: live("manifest").length + superseded.length, rules,
      reviews: manifest ? live("review").filter(item => idOf(item.refs["manifest"]) === manifest.id) : [], requests: live("review-request"),
      jobs: manifest ? live("job").filter(item => idOf(item.refs["manifest"]) === manifest.id) : [], results, merges, items: [...frame.items, ...superseded, proposal], mergeKeys, linked, ...(findings ? { findings } : {}), who: owner };
  }, scope, true);
  return { context: value, collection };
}

async function linkedIssue(collection: Collection, ref: ScopeRef): Promise<LinkedIssue> {
  try {
    if (!collection.inRoom(ref)) return { scope: ref, unread: "the issue is not listed in this room" };
    const frame = await collection.frame(ref);
    const intent = frame.items.find(item => item.type === "intent");
    const conditions = intent?.values["conditions"];
    const decided = questions(frame.summary.definition) ? await collection.items(frame, "ask", ["decided"]) : [];
    return { scope: ref, ...(typeof intent?.values["title"] === "string" ? { title: intent.values["title"] } : {}),
      conditions: Array.isArray(conditions) ? conditions.filter((text): text is string => typeof text === "string") : [],
      decided: decided.map(ask => ({ ask: ask.id, question: String(ask.values["question"]), decidedAt: idOf(ask.refs["decisionAt"]) })) };
  } catch (error) {
    if (!(error instanceof Unread)) throw error;
    return { scope: ref, unread: error.reason };
  }
}

const countOf = (rules: Item | null): number | null => typeof rules?.values["approvals"] === "number" ? rules.values["approvals"] : null;
const approvals = (context: ChangeContext) => context.reviews.filter(item => item.state === "submitted" && item.values["verdict"] === "approve");
const requiredChecks = (rules: Item | null): { name: string }[] => {
  const checks = rules?.values["checks"];
  return Array.isArray(checks) ? (checks as { name?: unknown; required?: unknown }[]).filter(check => check.required === true && typeof check.name === "string") as { name: string }[] : [];
};
const activeMerge = (context: ChangeContext) => context.merges.find(item => ["intended", "committed", "unknown"].includes(item.state));

/**
 * A review counts for the one extent it names, so an approval with no extent counts for nothing where the rules hold extents.
 * The card's Approve names the first extent of class `content`. An approval for the rules or for deployment files stays outside the card.
 */
function approvalExtent(rules: Item | null): string | null {
  const extents = rules?.values["extents"];
  if (!Array.isArray(extents)) return null;
  const named = (extents as { name?: unknown; class?: unknown }[]).find(extent => typeof extent.name === "string" && extent.class === "content");
  return typeof named?.name === "string" ? named.name : null;
}
const act = (context: ChangeContext, kind: "review-verdict" | "merge") => (findingProfile(context.definition) ? changeFinding : changeJ4).acts[kind] as unknown as ActLike;
const holding = (context: ChangeContext): ShownFinding[] => (context.findings ?? []).filter(finding => finding.holdsMerge);
function verdict(context: ChangeContext, manifest: Item, value: "approve" | "request-changes"): CardAction {
  const request = context.requests.find(item => item.state === "open" && sameOptional(item.parties["requested"], context.viewer));
  const extent = approvalExtent(context.rules);
  const fields: Record<string, FieldValue> = { manifest: manifest.id, verdict: value, ...(request ? { request: request.id } : {}), ...(value === "approve" && extent ? { extent } : {}) };
  return { id: value, label: value === "approve" ? "Approve" : "Request changes", purpose: "approve", kind: "review-verdict", done: reviewRecorded(value), args: { ...captureInput(act(context, "review-verdict"), context.items, context.scope, null, fields) } };
}
function merging(context: ChangeContext, manifest: Item): CardAction {
  const selected = manifest.values["selected"];
  const reports = (Array.isArray(selected) ? selected as { report?: FieldValue }[] : []).flatMap(selection => selection.report === undefined ? [] : [selection.report]);
  return { id: "merge", label: "Merge", purpose: "act", kind: "merge", done: MERGE_STARTED, args: { ...captureInput(act(context, "merge"), context.items, context.scope, null, { manifest: manifest.id, reports }) } };
}
/** At most two acts. Each carries the revisions of the subjects it binds, read with this card. */
function changeActions(context: ChangeContext): CardAction[] {
  const { manifest, proposal, rules, actions, viewer } = context;
  if (!manifest || manifest.state !== "current" || proposal.state !== "open" || activeMerge(context)) return [];
  const authors = manifest.parties["authors"];
  const reviewable = actions.includes("change.review") && !(Array.isArray(authors) && authors.some(author => sameOptional(author, viewer)))
    && !context.reviews.some(item => item.state === "submitted" && sameOptional(item.parties["reviewer"], viewer));
  const ready = mergeHolds(context.items, manifest, rules, holding(context).map(finding => finding.item.id), context.versions, context.scope).length === 0;
  if (ready && actions.includes("change.merge")) return [merging(context, manifest), ...(reviewable ? [verdict(context, manifest, "request-changes")] : [])];
  return reviewable ? [verdict(context, manifest, "approve"), verdict(context, manifest, "request-changes")] : [];
}

/** Each author-controlled value stands alone on a labelled line, after a status line that no finding's text can reach. */
function findingLines(context: ChangeContext, findings: readonly ShownFinding[]): string[] {
  const lines = ["", "Open findings:"];
  if (!findings.length) return [...lines, "None."];
  if (holding(context).length) {
    lines.push("A required source has an open finding, so this change cannot merge until someone answers it.");
    if (activeMerge(context)) lines.push("The merge in progress does not wait for it. It holds the next merge if this one is refused.");
  }
  lines.push("Each range belongs to the version the finding names.");
  const manifests = context.items.filter(item => item.type === "manifest").map(item => item.id).sort((a, b) => a - b);
  for (const { item, required, holdsMerge } of findings) {
    const id = idOf(item.refs["version"]), ordinal = id === null ? 0 : manifests.indexOf(id) + 1;
    lines.push(`Finding ${item.id}: ${holdsMerge ? "holds the merge." : required ? "open. The change has merged, so it holds nothing." : "open. It does not hold the merge, because its source is not required."}`,
      `File: ${shownText(item.values["file"])}`,
      `Lines: ${shownText(item.values["start"])} to ${shownText(item.values["end"])}${malformedRange(item) ? ". Malformed: the end comes before the start." : ""}`,
      `Class: ${shownText(item.values["class"])}`,
      `Severity: ${shownText(item.values["severity"])}`,
      `Source: ${shownText(item.values["source"])}`,
      `Source version: ${shownText(item.values["sourceVersion"])}`,
      `Change version: ${ordinal > 0 ? `${ordinal}, ` : ""}manifest ${id ?? "unknown"}${id === context.manifest?.id ? ", the version this card shows" : ""}.`,
      `Filed by: ${context.who(item.parties["reporter"])}`);
  }
  lines.push("This card does not answer a finding. The ordinary dap mcp server does: change.resolve-finding-any or change.mark-finding-irrelevant for a holder of change.dismiss, and change.resolve-finding-own for the source that filed it. The change's opener and the authors of the finding's version cannot answer it with change.dismiss. None of these tools needs at, on the current version or an earlier one. To sign the revisions that the change read showed, pass the finding's answerAt as at.");
  return lines;
}

/** The earlier versions of the change, oldest first, each with its ordinal. An interdiff can read those that name commits. */
function earlierVersions(context: ChangeContext): { manifest: Item; label: string }[] {
  const all = context.items.filter(item => item.type === "manifest").sort((a, b) => a.id - b.id);
  return all.map((manifest, n) => ({ manifest, label: `Version ${n + 1}` })).filter(({ manifest }) => context.manifest !== null && manifest.id < context.manifest.id);
}
const namesCommits = (manifest: Item): boolean => typeof manifest.values["base"] === "string" && typeof manifest.values["integration"] === "string";
/** The interdiffs that a card offers. A version beyond this count stays readable through the generic reads. */
const INTERDIFFS = 4;

function bodyOf(context: ChangeContext): string {
  const { manifest, rules, who } = context, lines: string[] = [];
  if (!manifest) lines.push("No version yet.");
  else {
    lines.push(`Version ${context.versions}, manifest ${manifest.id}${manifest.state === "current" ? "." : ": superseded."}`);
    lines.push(`Base: ${String(manifest.values["base"])}`);
    if (typeof manifest.values["integration"] === "string") lines.push(`Integration: ${manifest.values["integration"]}`, ...(typeof manifest.values["tree"] === "string" ? [`Tree: ${manifest.values["tree"]}`] : []));
    else lines.push(`Integration: none yet. This version holds one file, ${String(manifest.values["path"])}, and the destination writes the commit when it publishes. It has no diff.`);
    const earlier = earlierVersions(context);
    if (earlier.length) lines.push("", "Earlier versions:");
    for (const { manifest: version, label } of earlier) lines.push(namesCommits(version) ? `${label}, manifest ${version.id}. Base: ${String(version.values["base"])}. Integration: ${String(version.values["integration"])}.` : `${label}, manifest ${version.id}: one file and no commit, so no interdiff reads it.`);
  }
  lines.push("", "Reviews of this version:");
  if (!context.reviews.length) lines.push("None.");
  for (const review of context.reviews) lines.push(`${who(review.parties["reviewer"])}: ${String(review.values["verdict"])}.`);
  lines.push("", "Checks of this version:");
  const required = requiredChecks(rules).filter(check => !context.jobs.some(job => job.values["name"] === check.name));
  if (!context.jobs.length && !required.length) lines.push("None.");
  for (const job of context.jobs) {
    const result = context.results.filter(item => idOf(item.refs["job"]) === job.id).at(-1);
    lines.push(`${String(job.values["name"])}: ${job.state}${result ? `, by ${who(result.parties["checker"])}` : ""}.`);
  }
  for (const check of required) lines.push(`${check.name}: required, not run.`);
  if (context.findings) lines.push(...findingLines(context, context.findings));
  lines.push("", "Rules:", `Lane definition: ${context.definition}.`);
  const needed = countOf(rules);
  if (!rules || needed === null || rules.values["revision"] === undefined || rules.values["revision"] === null) lines.push("Not known yet.");
  else lines.push(`Approvals needed: ${needed}. Given: ${approvals(context).length}. The owner may review: ${rules.values["ownerMayReview"] === true ? "yes" : "no"}. Rules revision: ${String(rules.values["revision"])}.`);
  const extent = approvalExtent(rules);
  if (rules && extent) lines.push(`Approve here counts for the ${extent} extent. It does not approve a change to the rules or to deployment files.`);
  if (context.merges.length) lines.push("", "Merges:");
  for (const merge of context.merges) {
    if (merge.state === "unknown") lines.push(`Merge ${merge.id}: unknown. ${who(merge.parties["merger"])} started it. The destination cannot say yet if the push landed. No card can merge until it can.`);
    else lines.push(`Merge ${merge.id}: ${merge.state}. ${who(merge.parties["merger"])} started it.${typeof merge.values["commit"] === "string" ? ` Commit: ${merge.values["commit"]}.` : ""}${typeof merge.values["reason"] === "string" ? ` Reason: ${merge.values["reason"]}.` : ""}`);
  }
  lines.push("", "Linked issues:");
  if (!context.linked.length) lines.push("None.");
  for (const issue of context.linked) {
    if (issue.unread !== undefined) { lines.push(`${issue.scope.scope}: not read (${issue.unread}).`); continue; }
    lines.push(`${issue.title ?? issue.scope.scope}:`);
    lines.push(...(issue.conditions?.length ? issue.conditions.map(condition => `Condition: ${condition}`) : ["No conditions."]));
    for (const decided of issue.decided ?? []) lines.push(decidedLine(decided.question, decided.decidedAt));
  }
  return lines.join("\n");
}

/** The words on this page of the card. A person is not told to do what the card offers no way to do. */
function reasonsOf(page: string, actions: readonly CardAction[]): string[] {
  const acts = actions.filter(action => action.purpose !== "check-original"), rules = "The room's rules decide each act.";
  if (page !== "summary") return acts.length ? [rules] : [];
  const reviews = acts.some(action => action.id === "approve" || action.id === "request-changes"), merges = acts.some(action => action.id === "merge");
  const offered = reviews && merges ? "read the change, review it or merge it" : reviews ? "read the change or review it" : merges ? "read the change or merge it" : "read the change";
  return [`Open this card to ${offered}.${acts.length ? ` ${rules}` : ""}`];
}

export async function changeProjection(app: RepoInAi, subject: string | undefined, minimum?: ReadMinimum, page = "summary"): Promise<Projection> {
  const scope = selector(subject), { context, collection } = await readChange(app, scope, minimum, true);
  const { manifest, proposal } = context;
  const unknown = context.merges.find(item => item.state === "unknown");
  let actions = changeActions(context);
  const original = unknown ? context.mergeKeys[unknown.id] : undefined;
  if (original !== undefined) actions = [{ id: "check-original", label: "Check original request", purpose: "check-original", kind: "", args: { target: scope.scope, idempotencyKey: original } }];
  const at: Record<string, number> = { ...(manifest ? { manifest: manifest.revision } : {}), proposal: proposal.revision, ...(context.rules ? { rules: context.rules.revision } : {}) };
  for (const action of actions) if (!action.local) Object.assign(at, action.args["at"] ?? {});
  const integration = manifest?.values["integration"], base = manifest?.values["base"];
  const diffable = manifest?.state === "current" && typeof integration === "string" && typeof base === "string";
  const label = `Version ${earlierVersions(context).length + 1}`;
  const interdiffReads = diffable ? earlierVersions(context).filter(({ manifest: version }) => namesCommits(version)).reverse().slice(0, INTERDIFFS).map(({ manifest: version, label: from }) => ({ target: context.destination,
    from: { label: from, base: version.values["base"] as string, integration: version.values["integration"] as string }, to: { label, base, integration } })) : [];
  const held = holding(context).length;
  const card: Card = { identity: { item: String((manifest ?? proposal).id), kind: manifest ? "manifest" : "proposal", revision: String((manifest ?? proposal).revision), subject: { scope: scope.scope, item: proposal.id }, at },
    ...(context.signer?.actor ? { actor: context.signer.actor, actorLabel: manifest ? "Version signed by" : "Opening act signed by" } : {}),
    kicker: changeKicker(proposal, manifest ? context.versions : null), title: String(proposal.values["title"]), summary: `${typeof proposal.values["number"] === "number" ? `Change ${proposal.values["number"]}` : "Change"}, ${proposal.state}${manifest ? `, version ${context.versions}` : ""}.${held ? ` ${held} open finding${held === 1 ? " holds" : "s hold"} the merge.` : ""}`,
    body: bodyOf(context), reasons: [...reasonsOf(page, actions), ...(!context.signer?.actor ? [context.signer ? `${manifest ? "Version" : "Opening act"} signed by ${signerWords(context.signer)}.` : "The signer of this entry is unavailable in this read."] : [])],
    projection: collection.points().map(point => ({ scope: point.scope.scope, seq: point.head.seq, hash: point.head.hash })),
    reviewIntended: [], unavailable: [], waitsOn: [], settles: [], actions, ...(original !== undefined ? { unresolvedOriginal: true } : {}),
    ...(diffable ? { diffAvailable: true, diffRead: { target: context.destination, base, integration, label }, ...(interdiffReads.length ? { interdiffReads } : {}) } : {}),
    fallback: "Read change for this version's base, integration, reviews, checks, rules and linked issues." };
  if (utf8(canonicalize(card)).length > 60 * 1024) return { status: "incomplete", position: 0, count: 0, fallback: "This change is too large for its card. It offers no acts here; read change." };
  return { status: "ready", position: 0, count: 1, card, fallback: card.fallback };
}
