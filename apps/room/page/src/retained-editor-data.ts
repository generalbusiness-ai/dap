/** One loaded-Page text proposal task. No automatic merge, durable outbox or replacement signature. */
import { freeze } from "@generalbusiness/dap-bytes";
import type { Answer, Beside, DeclaredDefinition, Digest, FactRef, FieldValue, Head, KeyId, ScopeId, ScopeRef, Seed, SignedIntent, Summary } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, digestBytes, intentDigest, isEntryBodyOf, isFactRef, scopeIdOf, utf8, verifySignedIntent, wellFormed } from "@generalbusiness/dap-bytes";
import { ScopeHandle, declaredHandle, httpTransport, shapeDeclaredAct, signedIntent, signedReads } from "@generalbusiness/dap-client";
import { expectedOf, heldActs, type DefinitionShape } from "@generalbusiness/dap-cli/browser";
import { answersVersionRelation, answersVersionQuestion, editPath, fileSound, platform } from "@generalbusiness/dap-platform";
import { knownLIST1 } from "./source-support.ts";
import { editProgress, preparedEditStage, transitionEdit, type EditKind, type EditRequest, type EditResult, type EditStage, type UnsentEditStep, type VerifiedEditStep } from "./retained-editor-state.ts";
import { actAssociation, CopyNotKept, endOriginal, keepToSend, openingScope, openRoom, sessionSigner, Unreadable, type ChangeView, type Room } from "./data.ts";

export interface EditSource { definition: string; manifestFact: FactRef; sourceFact: FactRef; scope: ScopeRef; manifest: number; opened: Digest; base: string; path: string; digest: Digest; size: number; content: string }
export interface EditDraft { title: string; path: string; content: string }
export type { EditStep } from "./retained-editor-state.ts";
export interface EditTask {
  association: string; source: EditSource; draft: Readonly<EditDraft>; base: string; definition: Digest; definitionBytes: string; declared: DeclaredDefinition;
  context: { service: string; directory: ScopeRef; membership: ScopeRef; key: KeyId; rules: ScopeId; destination: ScopeId };
  workflow: "legacy" | "list1"; directory: ScopeRef; stage: EditStage;
  message: string; busy: boolean;
}
export interface EditOptions { current(): boolean; changed?(): void; pause?(scopes: readonly string[]): Promise<void> }
const handle = (room: Room, scope: ScopeId) => new ScopeHandle(signedReads(httpTransport(room.session.service, room.session.fetch ? { fetch: room.session.fetch } : {}), sessionSigner(room.session), room.session.now ? { now: room.session.now } : {}), scope, room.reader?.reader() ?? null);
async function summary(h: ScopeHandle): Promise<{ value: Summary; at: Head }> { const r = await h.summary(); if (!r.ok) throw new Unreadable(`Cannot read ${h.scope}: ${r.reason}.`); if (!r.complete || r.next !== undefined) throw new Unreadable(`Incomplete read of ${h.scope}.`); return { value: r.value, at: r.at }; }
const check = (options: EditOptions) => { if (!options.current()) throw new Unreadable("The room or key changed. Nothing new was sent; return to the original task."); };
export function editFields(draft: EditDraft, base: string): Record<string, FieldValue> {
  if (!wellFormed(draft.content) || draft.content.includes("\0")) throw new Unreadable("Only well-formed UTF-8 text without NUL is supported.");
  const bytes = utf8(draft.content);
  if (bytes.length > 65536) throw new Unreadable("One text file may contain at most 65,536 UTF-8 bytes.");
  if (editPath(draft.path) === null) throw new Unreadable("Choose a relative path inside the room, at most 1,024 UTF-8 bytes.");
  if (!wellFormed(draft.title) || !draft.title.trim() || utf8(draft.title).length > 256) throw new Unreadable("Give the proposal a title of at most 256 UTF-8 bytes.");
  return { base, path: draft.path, content: draft.content, size: bytes.length, digest: digestBytes(bytes) };
}

/** Authenticate the original retained entry, not the current Git branch or rendered HTML. */
export async function readEditSource(room: Room, change: ChangeView, manifest: number): Promise<EditSource> {
  const h = handle(room, change.scope), state = await summary(h);
  const selected = change.manifests.find(value => value.id === manifest);
  const item = state.value.items.find(value => value.type === "manifest" && value.id === manifest);
  if (!selected?.file || typeof selected.file.content !== "string" || !item || selected.base !== item.values["base"]) throw new Unreadable("The selected source changed or is unavailable. Choose it again explicitly.");
  const read = await h.entry(manifest);
  if (!read.ok || !read.complete || read.next !== undefined) throw new Unreadable("The selected source entry could not be read completely.");
  const { entry, hash } = read.value, input = entry.input;
  if (!isEntryBodyOf(entry, { at: state.value.scope, seq: manifest, hash }) || item.opened !== hash || !entry.effects.some(effect => effect.effect === "open" && effect.type === "manifest" && effect.item === manifest) || input.type !== "act" || !verifySignedIntent(input.signed) || canonicalize(input.signed.intent.to) !== canonicalize(state.value.scope)) throw new Unreadable("The selected source identity could not be verified.");
  const author = input.authority.length === 1 ? input.authority[0] : null;
  if (!author || author.key !== input.signed.intent.actor || canonicalize(author.subject) !== canonicalize(item.parties["integrator"]) || !Array.isArray(item.parties["authors"]) || !item.parties["authors"].some(member => canonicalize(member) === canonicalize(author.subject))) throw new Unreadable("The source author binding could not be verified.");
  const manifestFact: FactRef = { at: state.value.scope, seq: manifest, hash };
  let sourceFact = manifestFact, sourceItem = item, sourceInput = input;
  if (input.signed.intent.kind === "propose-manifest") {
    const definition = await h.definition();
    if (!definition.ok || !definition.complete || definition.next !== undefined || !knownLIST1(definition.value, state.value.definition)) throw new Unreadable("The source declaration is not a supported one-file LIST1 version.");
    const files = input.signed.intent.fields["files"], folded = item.values["files"];
    if (!Array.isArray(files) || files.length !== 1 || !Array.isArray(folded) || folded.length !== 1) throw new Unreadable("Editing requires exactly one frozen source file.");
    const row = files[0], held = folded[0];
    if (!row || typeof row !== "object" || Array.isArray(row) || !isFactRef(row["entry"]) || !held || typeof held !== "object" || Array.isArray(held) || canonicalize(row["entry"].at) !== canonicalize(state.value.scope) || held["entry"] !== row["entry"].seq || held["path"] !== row["path"] || held["digest"] !== row["digest"] || input.signed.intent.fields["base"] !== item.values["base"]) throw new Unreadable("The frozen source reference is inconsistent.");
    sourceFact = row["entry"];
    const source = state.value.items.find(value => value.type === "source" && value.id === sourceFact.seq), sourceRead = await h.entry(sourceFact.seq);
    if (!source || !sourceRead.ok || !sourceRead.complete || sourceRead.next !== undefined) throw new Unreadable("The frozen source entry is unavailable.");
    const sourceEntry = sourceRead.value.entry, sourceHash = sourceRead.value.hash;
    if (!isEntryBodyOf(sourceEntry, sourceFact) || sourceHash !== sourceFact.hash || source.opened !== sourceHash || !sourceEntry.effects.some(effect => effect.effect === "open" && effect.type === "source" && effect.item === sourceFact.seq) || sourceEntry.input.type !== "act" || sourceEntry.input.signed.intent.kind !== "propose-file" || !verifySignedIntent(sourceEntry.input.signed) || canonicalize(sourceEntry.input.signed.intent.to) !== canonicalize(state.value.scope) || sourceEntry.input.signed.intent.actor !== input.signed.intent.actor) throw new Unreadable("The frozen source identity could not be verified.");
    const grant = sourceEntry.input.authority.length === 1 ? sourceEntry.input.authority[0] : null;
    if (!grant || grant.key !== sourceEntry.input.signed.intent.actor || canonicalize(grant.subject) !== canonicalize(author.subject) || canonicalize(grant.subject) !== canonicalize(source.parties["integrator"]) || !Array.isArray(source.parties["authors"]) || !source.parties["authors"].some(member => canonicalize(member) === canonicalize(grant.subject)) || source.values["path"] !== row["path"] || source.values["digest"] !== row["digest"] || source.values["base"] !== item.values["base"]) throw new Unreadable("The frozen source author or file reference changed.");
    sourceItem = source; sourceInput = sourceEntry.input;
  } else if (input.signed.intent.kind !== "propose-file") throw new Unreadable("The selected opening is not a supported retained-text version.");
  const { base, path, digest, size, content } = sourceInput.signed.intent.fields;
  if (typeof base !== "string" || typeof path !== "string" || typeof digest !== "string" || typeof size !== "number" || typeof content !== "string" || path !== sourceItem.values["path"] || digest !== sourceItem.values["digest"] || size !== sourceItem.values["size"] || base !== sourceItem.values["base"] || path !== selected.file.path || digest !== selected.file.digest || size !== selected.file.size || base !== selected.base || content !== selected.file.content || !fileSound({ path, digest, size, content })) throw new Unreadable("The retained source bytes do not match this version.");
  return { definition: state.value.definition, manifestFact, sourceFact, scope: state.value.scope, manifest, opened: hash, base, path, digest: digest as Digest, size, content };
}

function supports(declared: DeclaredDefinition, fields: Record<string, FieldValue>): boolean {
  try {
    const ask = declared.acts["ask-rules"], file = declared.acts["propose-file"];
    if (declared.name !== "change" || !ask || ask.step !== "transition" || ask.on !== "proposal" || !file || file.step !== "open" || file.on !== "manifest") return false;
    if (file.fields["base"]?.type !== "commit" || file.fields["digest"]?.type !== "digest" || file.fields["size"]?.type !== "int" || file.fields["path"]?.type !== "text" || file.fields["path"].detached || file.fields["content"]?.type !== "text" || file.fields["content"].detached) return false;
    shapeDeclaredAct(declared, "ask-rules", { on: 0, fields: {} }); shapeDeclaredAct(declared, "propose-file", { on: null, fields });
    const expected = [{ party: { slot: "integrator", from: { signer: true } } }, { party: { slot: "authors", from: [{ signer: true }] } }, ...["base", "path", "digest", "size"].map(slot => ({ value: { slot, from: { field: slot } } })), { value: { slot: "complete", from: { const: true } } }];
    const requests = ask.sends.filter(s => "tell" in s && s.tell.message === "rules-wanted");
    return requests.length === 1 && expected.every(wanted => file.effects.filter(e => (e.of === undefined || e.of === "on") && ("party" in wanted ? "party" in e && e.party.slot === wanted.party.slot : "value" in e && e.value.slot === wanted.value.slot)).length === 1 && file.effects.some(e => canonicalize(e) === canonicalize(wanted)))
      && ask.sends.some(s => "tell" in s && s.tell.message === "rules-wanted" && !s.tell.if
        && (canonicalize(s.tell.to) === canonicalize({ slot: "rulesScope", of: "on" })
          || canonicalize(s.tell.to) === canonicalize({ slot: "rulesScope" })));
  } catch { return false; }
}
async function currentRoom(room: Room, options: EditOptions): Promise<Room> { check(options); const fresh = await openRoom(room.session, { directory: room.directory, membership: room.membership }); check(options); if (fresh.rules !== room.rules || fresh.destination !== room.destination || fresh.me?.handle !== room.me?.handle || fresh.key !== room.key) throw new Unreadable("The room identity changed. Nothing new was sent."); return fresh; }
async function head(room: Room, list1 = false): Promise<string> { const s = await summary(handle(room, room.destination)); if (!answersVersionQuestion(s.value.definition, "pageRetainedOneFileDestination") || list1 && !answersVersionQuestion(s.value.definition, "pageRetainedManifestListDestination")) throw new Unreadable("This destination does not support the one-file text workflow."); const h = s.value.items.find(i => i.type === "branch")?.values["head"]; if (typeof h !== "string") throw new Unreadable("The room has no recorded published head."); return h; }
export async function prepareEdit(room: Room, change: ChangeView, manifest: number, draft: EditDraft, options: EditOptions): Promise<EditTask> {
  const captured = Object.freeze({ ...draft });
  editFields(captured, "0".repeat(40)); const fresh = await currentRoom(room, options);
  if (!fresh.me?.actions.includes("change.open") || !fresh.me.actions.includes("change.propose")) throw new Unreadable("Your current member does not hold permission to open and propose a change.");
  const source = freeze(await readEditSource(fresh, change, manifest)); check(options);
  const R = handle(fresh, fresh.rules); const rs = await summary(R);
  const active = rs.value.items.filter(i => i.type === "definition" && i.state === "active" && i.values["name"] === "change").sort((a,b) => b.id-a.id)[0];
  const digest = active?.values["digest"]; if (typeof digest !== "string") throw new Unreadable("No change definition is active.");
  const kept = await signedReads(httpTransport(fresh.session.service, fresh.session.fetch ? { fetch: fresh.session.fetch } : {}), sessionSigner(fresh.session), fresh.session.now ? { now: fresh.session.now } : {}).retained(fresh.rules, fresh.reader?.reader() ?? null, "definition", digest as Digest); if (!kept.ok) throw new Unreadable("The active change definition could not be read.");
  const declared = JSON.parse(kept.value.bytes) as DeclaredDefinition; if (canonicalize(declared) !== kept.value.bytes || definitionDigest(declared) !== digest) throw new Unreadable("The active definition bytes do not match their digest.");
  const workflow = knownLIST1(declared, digest) ? "list1" : "legacy";
  const base = await head(fresh, workflow === "list1"); check(options);
  if (workflow === "legacy" && !supports(declared, editFields(captured, base))) throw new Unreadable("The active change definition does not support this bounded text workflow.");
  shapeDeclaredAct(declared, "propose-file", { on: null, fields: editFields(captured, base) });
  const root = await summary(handle(fresh, fresh.directory));
  const D = await summary(handle(fresh, await openingScope(fresh)));
  const directoryShape = platform(D.value.definition)?.data as unknown as DefinitionShape | undefined;
  if (!directoryShape || !heldActs(directoryShape, fresh.me).acts.some(([kind]) => kind === "open-pr")) throw new Unreadable("The directory does not offer the supported native change opening.");
  shapeDeclaredAct(platform(D.value.definition)!.data as unknown as DeclaredDefinition, "open-pr", { on: null, fields: { definition: digest, title: captured.title, draft: false, body: "Source reference" } } as never);
  return { association: actAssociation(room, change.scope), source, draft: captured, base, definition: digest as Digest, definitionBytes: kept.value.bytes, declared, workflow, context: freeze({ service: fresh.session.service.replace(/\/+$/, ""), directory: root.value.scope, membership: fresh.membership, key: fresh.key, rules: fresh.rules, destination: fresh.destination }), directory: D.value.scope, stage: preparedEditStage(), message: "Current file comparison is unavailable. This proposal writes the target on the named published base; it may overwrite existing content and leaves the old path unchanged.", busy: false };
}

async function taskRoom(room: Room, task: EditTask, options: EditOptions): Promise<Room> {
  if (task.association !== actAssociation(room, task.source.scope.scope)) throw new Unreadable("This task belongs to another room/member/key context.");
  const fresh = await currentRoom(room, options);
  if (fresh.session.service.replace(/\/+$/, "") !== task.context.service || canonicalize(fresh.membership) !== canonicalize(task.context.membership) || fresh.key !== task.context.key || fresh.rules !== task.context.rules || fresh.destination !== task.context.destination) throw new Unreadable("The original room/key/rules/destination binding changed. Nothing new was sent.");
  const directory = await summary(handle(fresh, fresh.directory)); check(options);
  if (canonicalize(directory.value.scope) !== canonicalize(task.context.directory)) throw new Unreadable("The original directory incarnation changed. Nothing new was sent.");
  if (task.directory.scope !== fresh.directory) {
    const part = await summary(handle(fresh, task.directory.scope)); check(options);
    const control = part.value.items.find(item => item.id === 0 && item.type === "repository" && item.state === "open");
    if (!answersVersionRelation("pageRetainedOpeningPartitionPair", directory.value.definition, part.value.definition) || canonicalize(part.value.scope) !== canonicalize(task.directory)
      || !control || canonicalize(control.refs["root"]) !== canonicalize(task.context.directory) || canonicalize(control.refs["membership"]) !== canonicalize(task.context.membership)) throw new Unreadable("The original opening partition changed. Nothing new was sent.");
  }
  const rules = await summary(handle(fresh, fresh.rules)); check(options);
  if (!rules.value.items.some(item => item.type === "definition" && item.state === "active" && item.values["name"] === "change" && item.values["digest"] === task.definition)) throw new Unreadable("The confirmed change definition is no longer active. Nothing new was sent.");
  return fresh;
}

/** Only the one accepted source of this task may enter its manifest. */
async function verifiedCollectedSource(room: Room, task: EditTask): Promise<FactRef> {
  const progress = editProgress(task.stage);
  if (progress.state !== "source-recorded" || !knownLIST1(task.declared, task.definition)) throw new Unreadable("The confirmed one-file source is unavailable.");
  const { collectedSource: fact, lane, source: original } = progress;
  const h = handle(room, lane), state = await summary(h);
  if (state.value.definition !== task.definition || canonicalize(state.value.scope) !== canonicalize(fact.at)) throw new Unreadable("The source lane identity changed.");
  const collected = state.value.items.filter(item => item.type === "source" && item.state === "collected");
  if (collected.length !== 1 || collected[0]!.id !== fact.seq) throw new Unreadable("Another collected source conflicts with this one-file task. Nothing was frozen.");
  if (state.value.items.some(item => item.type === "manifest")) throw new Unreadable("This collection already has a manifest. Nothing new was frozen.");
  const item = collected[0]!, read = await h.entry(fact.seq);
  if (!read.ok || !read.complete || read.next !== undefined) throw new Unreadable("The accepted source entry could not be verified.");
  const { entry, hash } = read.value, input = entry.input;
  if (entry.seq !== fact.seq || hash !== fact.hash || !isEntryBodyOf(entry, fact) || item.opened !== hash || input.type !== "act" || input.signed.intent.kind !== "propose-file" || !verifySignedIntent(input.signed) || canonicalize(input.signed) !== canonicalize(original.signed) || !entry.effects.some(effect => effect.effect === "open" && effect.type === "source" && effect.item === fact.seq)) throw new Unreadable("The accepted source identity does not match the original request.");
  const fields = editFields(task.draft, task.base), grant = input.authority.length === 1 ? input.authority[0] : null;
  if (!grant || grant.key !== input.signed.intent.actor || canonicalize(grant.subject) !== canonicalize(item.parties["integrator"]) || !Array.isArray(item.parties["authors"]) || !item.parties["authors"].some(author => canonicalize(author) === canonicalize(grant.subject)) || ["base", "path", "digest", "size", "content"].some(name => input.signed.intent.fields[name] !== fields[name]) || ["base", "path", "digest", "size"].some(name => item.values[name] !== fields[name])) throw new Unreadable("The source author or exact file bytes changed. Nothing was frozen.");
  return fact;
}

async function prepareStep(room: Room, task: EditTask, kind: EditKind, target: ScopeId, on: number | null, fields: Record<string, FieldValue>, options: EditOptions): Promise<{ step: UnsentEditStep; transport: ScopeHandle }> {
  const fresh = await taskRoom(room, task, options);
  if (await head(fresh, task.workflow === "list1") !== task.base) throw new Unreadable("The published base moved. Keep this task and compare/reconfirm before a new proposal; nothing new was sent.");
  check(options); const h = handle(fresh, target); const s = await summary(h); check(options);
  if (kind === "open-pr" && canonicalize(s.value.scope) !== canonicalize(task.directory)) throw new Unreadable("The original directory incarnation changed. Nothing new was sent.");
  const supplied = platform(s.value.definition);
  const shape = (supplied?.data ?? task.declared) as unknown as DefinitionShape;
  const declaration = shape.acts[kind]; if (!declaration || !heldActs(shape, fresh.me).acts.some(([k]) => k === kind)) throw new Unreadable(`The current ${kind} action is unavailable to your member.`);
  if (kind !== "open-pr" && s.value.definition !== task.definition) throw new Unreadable("The created lane does not run the confirmed definition.");
  const expected = expectedOf(declaration, s.value.items, on, fields);
  const signer = sessionSigner(fresh.session); const signing = fresh.session.now ? { now: fresh.session.now() } : {};
  let signed: SignedIntent, beside: Beside;
  if (supplied) {
    const shaped = shapeDeclaredAct(supplied.data as unknown as DeclaredDefinition, kind, { on, fields } as never);
    signed = await signedIntent(signer, { to: s.value.scope, kind, on: shaped.on, fields: shaped.fields, expected }, signing);
    beside = { ...shaped.beside, values: [task.definitionBytes] };
  } else {
    const typed = await declaredHandle(h, task.declared); if (!typed.ok) throw new Unreadable(`Cannot bind the created lane: ${typed.reason}.`);
    const built = await typed.handle.intent(signer, kind, { on, fields, expected } as never, signing); signed = built.signed; beside = built.beside;
  }
  // The exact serializable envelope belongs to this task before any mutation crosses the transport boundary.
  const step: UnsentEditStep = { kind, target: s.value.scope, signed: freeze(JSON.parse(JSON.stringify(signed)) as SignedIntent), grants: freeze([]), beside: freeze(JSON.parse(JSON.stringify(beside)) as Beside), status: "unsent", attempted: false };
  return { step, transport: h };
}

/** Stage writes stay in the controller; every network helper returns its result. */
const applyEdit = (task: EditTask, result: EditResult): void => { task.stage = transitionEdit(task.stage, result); };
async function keepStep(room: Room, task: EditTask, step: UnsentEditStep, options: EditOptions): Promise<Room> {
  const current = await taskRoom(room, task, options);
  if (await head(current, task.workflow === "list1") !== task.base) throw new Unreadable("The published base moved before submission. Nothing new was sent.");
  if (step.kind === "propose-manifest") await verifiedCollectedSource(current, task);
  await keepToSend(current, step.signed, step.beside, () => check(options), () => check(options));
  return current;
}
const submitStep = (transport: ScopeHandle, step: EditRequest): Promise<Answer> => transport.submit(step.signed, step.grants, step.beside);
const settleStep = (transport: ScopeHandle, step: EditRequest): ReturnType<ScopeHandle["settle"]> => transport.settle(step.signed);
async function verifyStep(transport: ScopeHandle, step: EditRequest, answer: Extract<Answer, { answer: "accepted" }>): Promise<boolean> {
  const followed = await transport.followReceipt(answer.receipt);
  return followed.ok && followed.entry.input.type === "act" && canonicalize(followed.entry.input.signed) === canonicalize(step.signed);
}
async function runStep(room: Room, task: EditTask, kind: EditKind, target: ScopeId, on: number | null, fields: Record<string, FieldValue>, options: EditOptions): Promise<boolean> {
  const { step, transport } = await prepareStep(room, task, kind, target, on, fields, options);
  applyEdit(task, { type: "prepared-step", step }); options.changed?.();
  let current: Room;
  try { current = await keepStep(room, task, step, options); }
  catch (error) {
    if (!(error instanceof CopyNotKept)) throw error;
    applyEdit(task, { type: "copy-not-kept" }); task.message = error.message; options.changed?.();
    return false;
  }
  applyEdit(task, { type: "attempted" }); options.changed?.();
  let answer: Answer;
  try { answer = await submitStep(transport, step); }
  catch { task.message = `${kind}: outcome unknown. The original request is kept in this loaded Page. No next step was sent.`; options.changed?.(); return false; }
  applyEdit(task, { type: "answer", answer }); options.changed?.();
  const digest = intentDigest(step.signed.intent);
  if (answer.answer === "refused" || answer.answer === "archived" || answer.answer === "mismatch") await endOriginal(current, digest);
  if (answer.answer === "refused") { task.message = `${kind} refused: ${answer.reason}${answer.name ? ` (${answer.name})` : ""}. Earlier accepted steps remain recorded.`; return false; }
  if (answer.answer !== "accepted") { task.message = `${kind}: ${answer.answer}; outcome unknown. Check the original request before another action.`; return false; }
  if (!await verifyStep(transport, step, answer)) { task.message = `${kind} returned acceptance; its recorded entry could not be verified. The answer and request are retained.`; return false; }
  applyEdit(task, { type: "receipt-verified" });
  await endOriginal(current, digest);
  applyEdit(task, { type: "step-recorded", workflow: task.workflow });
  return true;
}

type OpenedLaneRead = { state: "waiting" } | { state: "ready"; scope: ScopeId; proposal: number; transport: ScopeHandle };
async function readOpenedLane(room: Room, task: EditTask, opening: VerifiedEditStep<"open-pr">, options: EditOptions): Promise<OpenedLaneRead> {
  const fresh = await taskRoom(room, task, options), D = handle(fresh, task.directory.scope);
  const original = await D.followReceipt(opening.answer.receipt); if (!original.ok) throw new Unreadable("Change opened; its creation entry is currently unreadable.");
  const children = original.entry.sends.filter(send => "creator" in send.to && send.to.kind === "lane").map(send => scopeIdOf(send.to as Seed));
  if (children.length !== 1) throw new Unreadable("The original opening does not name exactly one change lane.");
  const scope = children[0]!;
  await options.pause?.([task.directory.scope, scope]); check(options);
  const transport = handle(fresh, scope), lane = await summary(transport);
  if (lane.value.status === "refused") throw new Unreadable("The opened change refused its creation. The directory opening remains recorded.");
  if (lane.value.status !== "active") return { state: "waiting" };
  const proposal = lane.value.items.find(item => item.type === "proposal"); if (!proposal) throw new Unreadable("The active change has no proposal item.");
  return { state: "ready", scope, proposal: proposal.id, transport };
}
async function rulesReady(room: Room, lane: ScopeId, transport: ScopeHandle, options: EditOptions): Promise<boolean> {
  await options.pause?.([lane, room.rules]); check(options);
  const ready = await summary(transport);
  return ready.value.items.some(item => item.type === "rules" && typeof item.values["revision"] === "number");
}

/** Continue only the stage's next unsent step. Accepted requests are never rebuilt or resent. */
export async function continueEdit(room: Room, task: EditTask, options: EditOptions): Promise<void> {
  if (task.busy || ["unknown", "refused", "recorded", "stopped"].includes(task.stage.state)) return;
  task.busy = true; options.changed?.();
  try {
    check(options);
    if (task.stage.state === "prepared") {
      const body = `Based on retained source ${task.source.scope.scope}, version ${task.source.manifest}, opening ${task.source.opened}. Original path: ${task.source.path}. This is a new proposal; it does not replace the source version.`;
      if (!await runStep(room, task, "open-pr", task.directory.scope, null, { definition: task.definition, title: task.draft.title, body, draft: false }, options)) return;
    }
    let progress = editProgress(task.stage);
    if (!("opening" in progress)) return;
    const lane = await readOpenedLane(room, task, progress.opening, options);
    if (lane.state === "waiting") { task.message = "Change opened; waiting for its native lane. Continue checks progress without reopening it."; return; }
    if (progress.state === "waiting-lane") applyEdit(task, { type: "lane-ready", lane: lane.scope, proposal: lane.proposal });
    progress = editProgress(task.stage);
    if (progress.state === "lane-ready") {
      if (!await runStep(room, task, "ask-rules", progress.lane, progress.proposal, {}, options)) return;
    }
    progress = editProgress(task.stage);
    if (progress.state !== "waiting-rules" && progress.state !== "source-recorded") return;
    if (!await rulesReady(room, progress.lane, lane.transport, options)) { task.message = "Change opened; waiting for its native rules. Continue checks progress without asking again."; return; }
    if (progress.state === "waiting-rules") {
      if (!await runStep(room, task, "propose-file", progress.lane, null, editFields(task.draft, task.base), options)) return;
      const recorded = editProgress(task.stage);
      if (recorded.state === "recorded") { task.message = `Proposal recorded in ${recorded.lane}, version ${recorded.version.seq}. Not published. The original source/history is unchanged.`; return; }
    }
    progress = editProgress(task.stage);
    if (progress.state !== "source-recorded") return;
    task.message = "Source recorded. It is not a version until its one-file manifest is confirmed."; options.changed?.();
    const source = await verifiedCollectedSource(room, task);
    if (!await runStep(room, task, "propose-manifest", progress.lane, null, { base: task.base, files: [{ path: task.draft.path, entry: source, digest: editFields(task.draft, task.base)["digest"]! }] }, options)) return;
    const recorded = editProgress(task.stage);
    if (recorded.state === "recorded") task.message = `One-file manifest recorded in ${recorded.lane}, version ${recorded.version.seq}. Not published. The original source/history is unchanged.`;
  } catch (error) { applyEdit(task, { type: "stopped" }); task.message = `${error instanceof Error ? error.message : "The task could not continue."} Earlier accepted steps and the draft are retained.`; }
  finally { task.busy = false; options.changed?.(); }
}

/** Read-only reconciliation under the original association; only the retained attempted request can settle. */
export async function checkEditRequest(room: Room, task: EditTask, options: EditOptions): Promise<void> {
  if (task.busy || task.stage.state !== "unknown") return;
  if (task.association !== actAssociation(room, task.source.scope.scope)) { task.message = "Check this task using its original room/key context."; return; }
  const step = task.stage.step;
  task.busy = true;
  try {
    const transport = handle(room, step.target.scope);
    const result = await settleStep(transport, step);
    if (!result.ok) { task.message = `Original ${step.kind} request remains unresolved: ${result.reason}. No replacement was signed.`; return; }
    const answer: Extract<Answer, { answer: "accepted" }> = { answer: "accepted", receipt: result.value };
    applyEdit(task, { type: "answer", answer }); options.changed?.();
    if (!await verifyStep(transport, step, answer)) { task.message = "The acceptance could not be verified; the task stays unknown."; return; }
    applyEdit(task, { type: "receipt-verified" });
    await endOriginal(room, intentDigest(step.signed.intent));
    applyEdit(task, { type: "step-recorded", workflow: task.workflow });
    if (step.kind === "propose-manifest" || step.kind === "propose-file" && task.workflow === "legacy") task.message = "Proposal recorded. Not published; the original source remains unchanged.";
    else if (step.kind === "propose-file") task.message = "Original source recorded. Continue verifies it before freezing the one-file manifest.";
    else task.message = "Original request recorded. Continue reads its progress before the next unsent step.";
  } catch { task.message = "The original request could not be checked. It stays unresolved; no replacement was signed."; }
  finally { task.busy = false; options.changed?.(); }
}
