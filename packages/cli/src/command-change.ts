/** File proposals and required-check publication. */
import { type ActShape, expectedOf } from "./browser-helpers.ts";
import type { Context, Outcome } from "./command-context.ts";
import { type Issue, issueNamed, linking } from "./command-issues.ts";
import { destinationOf } from "./command-repository.ts";
import { accepted, answered, configOf, createdBy, done, failed, handleOf, readerOf, run, signerOf, signing, Stop, stopCommand, summaryOf, usage, waitFor } from "./command-support.ts";
import { activeDefinition, definitionOf, fileOf, laneActive, laneOf, openingDirectory, scopeNamed, textOf } from "./command-targets.ts";
import { supportsManifestListDestination, supportsOneFileDestination } from "./destination-protocol.ts";
import type { Config } from "./store.ts";
import { canonicalize, digestBytes, intentDigest, READ_REFUSALS } from "@generalbusiness/dap-bytes";
import { shapeDeclaredAct, ShapeError, signedIntent, TransportError } from "@generalbusiness/dap-client";
import type { DeclaredDefinition, Digest, EffectForm, Entry, FactRef, FieldValue, ScopeId } from "@generalbusiness/dap-contract";
import { SourceError } from "@generalbusiness/dap-replay";

// ---------------------------------------------------------------- a one-file change: edit, and merge

/** The most bytes of a file that `edit` proposes: the bound of the field `content` of the change lane's `propose-file`, a text. */
export const EDIT_BYTES = 65536;

/** One entry's effect on one item, of one kind, from a sealed entry. */
type Effects = Entry["effects"];

const stateOf = (effects: Effects, item: number): string | null => { const matched = effects.find((e) => e.effect === "state" && e.item === item); return matched?.effect === "state" ? matched.state : null; };

const valueOf_ = (effects: Effects, item: number, slot: string): unknown => { const matched = effects.find((e) => e.effect === "value" && e.item === item && e.slot === slot); return matched?.effect === "value" ? matched.value : undefined; };

/** The fixed edit workflow needs these declared inputs and effects. Guards
 * remain the room's policy. No digest or profile name decides support. */
function supportsEdit(declared: DeclaredDefinition, path: string, content: string, bytes: Uint8Array): boolean {
  try {
    const ask = declared.acts["ask-rules"];
    const propose = declared.acts["propose-file"];
    const merge = declared.acts["merge"];
    if (declared.name !== "change" || !ask || !propose || !merge
      || ask.step !== "transition" || ask.on !== "proposal"
      || propose.step !== "open" || propose.on !== "manifest"
      || merge.step !== "open" || merge.on !== "merge") return false;
    const fields = propose.fields;
    if (fields["base"]?.type !== "commit" || fields["digest"]?.type !== "digest" || fields["size"]?.type !== "int"
      || fields["path"]?.type !== "text" || fields["path"].detached
      || fields["content"]?.type !== "text" || fields["content"].detached
      || merge.fields["manifest"]?.type !== "item" || merge.fields["manifest"].of !== "manifest"
      || merge.fields["reports"]?.type !== "list" || merge.fields["reports"].of.type !== "fact") return false;
    // The shared client validator rejects extra required fields/presentations
    // and narrower input bounds before any lane is opened or intent signed.
    shapeDeclaredAct(declared, "ask-rules", { on: 0, fields: {} });
    shapeDeclaredAct(declared, "propose-file", { on: null, fields: { base: "0".repeat(40), path, digest: digestBytes(bytes), size: bytes.length, content } });
    shapeDeclaredAct(declared, "merge", { on: null, fields: { manifest: 0, reports: [] } });
    const same = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b);
    const writtenSlot = (effect: EffectForm) => "party" in effect ? effect.party.slot : "ref" in effect ? effect.ref.slot
      : "value" in effect ? effect.value.slot : "attribute" in effect ? effect.attribute.slot : "redact" in effect ? effect.redact.slot : null;
    // Require one unconditional write from the needed source, without a
    // conflicting write to that slot. Unrelated metadata effects may remain.
    const requiredEffects = (actual: readonly EffectForm[], expected: readonly unknown[]) => expected.every((wanted) => {
      const slot = writtenSlot(wanted as EffectForm);
      const writers = actual.filter((effect) => (effect.of === undefined || effect.of === "on") && writtenSlot(effect) === slot);
      if (writers.length !== 1) return false;
      const { of: _primary, ...write } = writers[0]!;
      return same(write, wanted);
    });
    const fileEffects = [
      { party: { slot: "integrator", from: { signer: true } } },
      { party: { slot: "authors", from: [{ signer: true }] } },
      ...["base", "path", "digest", "size"].map((slot) => ({ value: { slot, from: { field: slot } } })),
      { value: { slot: "complete", from: { const: true } } },
    ];
    // The command reads these exact slots afterwards. Conditional effects or
    // another source for them do not establish its one-file manifest.
    if (!requiredEffects(propose.effects, fileEffects) || !requiredEffects(merge.effects, [
      { party: { slot: "merger", from: { signer: true } } },
      { ref: { slot: "manifest", from: { item: "also.manifest" } } },
    ])) return false;
    const rules = ask.sends.filter((send) => "tell" in send && send.tell.message === "rules-wanted");
    if (rules.length !== 1 || !("tell" in rules[0]!) || "if" in rules[0]!.tell
      || !same(rules[0]!.tell.to, { slot: "rulesScope", of: "on" })) return false;
    const reserves = merge.sends.filter((send) => "tell" in send && send.tell.message === "reserve");
    const sending = reserves[0];
    if (reserves.length !== 1 || !sending || !("tell" in sending) || "if" in sending.tell
      || !same(sending.tell.to, { slot: "destination", of: "also.proposal" })
      || !same(sending.tell.fields["operation"], "self") || !same(sending.tell.fields["manifest"], { item: "also.manifest" })
      || !same(sending.tell.fields["reports"], { field: "reports" })
      || !["jobs", "links", "verdicts"].every((field) => Object.hasOwn(sending.tell.fields, field))) return false;
    return true;
  } catch { return false; }
}

/**
 * `dap edit <path> --file <local file> [--title <text>]`: one file, proposed as a change and published by the room.
 *
 * 1. The file is read here, as UTF-8 text of at most 65,536 bytes; nothing is signed for a file that cannot be carried.
 * 2. The directory's `open-pr` opens a change lane under the change definition that the rules scope holds active, whose bytes go
 *    beside the act. The command waits for the lane.
 * 3. The lane's `ask-rules`, and the wait for the rules scope's answer: a merge is judged on the lane's copy of the rules.
 * 4. `propose-file`, on the destination's head: the path, the digest and size of the bytes, and the bytes.
 * 5. With `--closes <issue>`, the lane's `link-own` to that issue, as `dap merge --closes` signs it.
 * 6. `merge`, and the wait for the room's answer, as `dap merge` does.
 *
 * The command judges nothing: the lane, the rules and the destination do. A refusal is printed as it came, with what was written
 * before it, so that the change can be merged later.
 */
export function edit(ctx: Context, path: string, options: { file?: string; title?: string; closes?: string } = {}): Promise<Outcome> {
  return run(async () => {
    if (options.file === undefined) return usage("edit needs --file <local file>: the bytes to write at the path.");
    const config = await configOf(ctx);
    const destination = await destinationOf(ctx, config);
    const bytes = await fileOf(ctx, options.file);
    if (bytes.length > EDIT_BYTES) return usage(`${options.file} has ${bytes.length} bytes; a change carries at most ${EDIT_BYTES}.`);
    const content = textOf(bytes, options.file);
    const repository = config.repository ?? stopCommand(usage("No repository is known here. Run: dap create <name>, or dap join <link>."));
    const signer = await signerOf(ctx, config);
    const reader = await readerOf(ctx, config);
    // The issue that the change closes is found before anything is signed.
    const closes = options.closes === undefined ? null : await issueNamed(ctx, config, reader, options.closes);
    const change = await activeDefinition(ctx, config, reader, "change");
    if (change.declared.acts["propose-file"]?.on !== "source" && !supportsEdit(change.declared, path, content, bytes)) return failed(`Unsupported edit: the active change definition ${change.digest} does not support this command's ask-rules, one-file manifest and merge inputs and effects. No change was opened.`);
    if (supportsManifestListDestination(destination.summary.definition) && change.declared.acts["propose-file"]?.on === "source") {
      const base = destination.summary.items.find((item) => item.type === "branch")?.values["head"];
      if (typeof base !== "string") return failed("Cannot edit: no-published-head.");
      return proposingFiles(ctx, config, base, [{ path, bytes }], options.title ?? `Edit ${path}`, { edit: true, ...(closes ? { closes } : {}) });
    }
    if (! supportsOneFileDestination(destination.summary.definition)) return failed(`Unsupported edit: destination ${repository.destination} runs ${destination.summary.definition}; this command requires a supported one-file manifest protocol. No change was opened.`);

    // The change lane, opened by the directory.
    const { D, summary, target } = await openingDirectory(ctx, config, reader);
    const shape = (await definitionOf(D, summary)).shape;
    const fields = { definition: change.digest, title: options.title ?? `Edit ${path}`, draft: false };
    const signed = await signedIntent(signer, { to: target, kind: "open-pr", fields, expected: expectedOf(shape.acts["open-pr"]!, (await summaryOf(D)).items, null, fields) }, signing(ctx));
    const opened = accepted(await D.submit(signed, [], { values: [change.bytes] }), D.scope, "Opened").receipt.fact.seq;
    const lane = (await createdBy(D, opened)).find((made) => made.seed.kind === "lane")?.scope ?? stopCommand(failed(`Entry ${D.scope}:${opened} opens no lane.`));
    const L = await handleOf(ctx, config, lane, reader);
    await waitFor(ctx, () => [D.scope, lane], () => laneActive(L, `${D.scope}:${opened}`), `the change ${lane}`);
    const C = await laneOf(ctx, config, lane, reader, change.declared);

    // The lane's copy of the rules.
    const asked = await C.intent(signer, "ask-rules" as never, { on: 0, fields: {}, expected: expectedOf(change.declared.acts["ask-rules"] as unknown as ActShape, (await summaryOf(L)).items, 0, {}) } as never, signing(ctx));
    accepted(await C.submit(asked.signed, [], asked.beside), lane, "Asked");
    await waitFor(ctx, () => [lane, repository.rules], async () => ((await summaryOf(L)).items.some((item) => item.type === "rules" && typeof item.values["revision"] === "number") ? true : null), `the rules of ${lane}`);

    // The one version: the file on the published head. Lane/rules awaits
    // may advance it; the earlier protocol check is not a frozen head.
    const currentDestination = await destinationOf(ctx, config);
    if (! supportsOneFileDestination(currentDestination.summary.definition)) return failed(`The destination ${repository.destination} no longer serves the supported one-file protocol. The change ${lane} stays open; no file was proposed.`);
    const head = currentDestination.summary.items.find((item) => item.type === "branch")?.values["head"];
    if (typeof head !== "string") return failed(`The destination ${repository.destination} has no published head yet.`);
    const file = { base: head, path, digest: digestBytes(bytes), size: bytes.length, content };
    const proposed = await C.intent(signer, "propose-file" as never, { on: null, fields: file, expected: expectedOf(change.declared.acts["propose-file"] as unknown as ActShape, (await summaryOf(L)).items, null, file) } as never, signing(ctx));
    const version = (await C.submit(proposed.signed, [], proposed.beside));
    if (version.answer !== "accepted") return answered(lane, version, "Proposed");
    const lines = [`Proposed ${path} (${bytes.length} bytes) as change ${lane}, version ${version.receipt.fact.seq}.`];
    if (closes !== null) {
      const linked = await run(async () => {
        try { return await linking(ctx, config, lane, reader, change.declared, closes); }
        catch (error) {
          // A linking request/reply may be lost after the proposal was
          // admitted. Preserve that result without repeating raw errors or
          // suggesting that a freshly signed mutation is a safe recovery.
          if (error instanceof TransportError) return failed("Linking could not be confirmed: a required request or reply was unavailable.");
          throw error;
        }
      });
      if (linked.code !== 0) return { ...linked, lines: [...lines, ...linked.lines,
        `Inspect dap show ${lane}:${version.receipt.fact.seq} and dap log ${lane} before another edit, link or merge. The proposal is recorded; linking was not confirmed and no mutation was retried.`,
      ] };
      lines.push(...linked.lines);
    }
    const outcome = await run(() => merging(ctx, config, lane, reader, change.declared));
    return { ...outcome, lines: [...lines, ...outcome.lines] };
  });
}

/** Propose the supported changed UTF-8 files of a local branch. */
export function propose(ctx: Context, branch: string, options: { title?: string } = {}): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    const destination = await destinationOf(ctx, config);
    if (!ctx.git?.files) return failed("Cannot propose: git-unavailable.");
    if (!supportsManifestListDestination(destination.summary.definition)) return failed("Cannot propose: version-mismatch. This room has no manifest-list destination.");
    const base = destination.summary.items.find((item) => item.type === "branch")?.values["head"];
    if (typeof base !== "string") return failed("Cannot propose: no-published-head.");
    const captured = await ctx.git.files(base, branch);
    if (!captured.ok) return failed(`Cannot propose: ${captured.reason}.`);
    return proposingFiles(ctx, config, base, captured.files, options.title ?? `Propose ${branch}`);
  });
}

async function proposingFiles(ctx: Context, config: Config, base: string, files: readonly { path: string; bytes: Uint8Array }[], title: string, options: { edit?: boolean; closes?: Issue } = {}): Promise<Outcome> {
  const repository = config.repository!;
  const reader = await readerOf(ctx, config);
  const change = await activeDefinition(ctx, config, reader, "change");
  if (change.declared.acts["propose-file"]?.on !== "source" || change.declared.acts["propose-manifest"]?.fields["files"]?.type !== "list") return failed("Cannot propose: version-mismatch. Activate the manifest-list change definition for this room.");
  if (files.length === 0 || files.length > 64) return failed(`Cannot propose: ${files.length === 0 ? "no-changed-paths" : "too-many-paths"}.`);
  const contents = files.map((file) => ({ ...file, content: textOf(file.bytes, file.path) }));
  if (contents.some(file => file.bytes.length > EDIT_BYTES)) return failed("Cannot propose: file-too-large.");
  // Check this command's complete local input contract before creating work.
  // This reference is ONLY a syntax operand for future source fields. It is
  // never signed/submitted or treated as an admitted fact/authority proof.
  const syntaxOnlyRef = { at: repository.directory, seq: 0, hash: change.digest };
  try {
    const acts = change.declared.acts;
    if (acts["ask-rules"]?.step !== "transition" || acts["ask-rules"].on !== "proposal"
      || acts["propose-file"]?.step !== "open" || acts["propose-manifest"]?.step !== "open" || acts["propose-manifest"].on !== "manifest"
      || acts["merge"]?.step !== "open" || acts["merge"].on !== "merge") throw new ShapeError("workflow", "has incompatible act steps/items");
    shapeDeclaredAct(change.declared, "ask-rules", { on: 0, fields: {} });
    for (const file of contents) shapeDeclaredAct(change.declared, "propose-file", { on: null, fields: { base, path: file.path, digest: digestBytes(file.bytes), size: file.bytes.length, content: file.content } });
    shapeDeclaredAct(change.declared, "propose-manifest", { on: null, fields: { base, files: contents.map(file => ({ path: file.path, entry: syntaxOnlyRef, digest: digestBytes(file.bytes) })) } });
    shapeDeclaredAct(change.declared, "merge", { on: null, fields: { manifest: 0, reports: [] } });
    if (options.closes) shapeDeclaredAct(change.declared, "link-own", { on: null, fields: { issue: options.closes.ref, how: "keyword" } });
  } catch {
    return failed("Cannot propose: unsupported-workflow. This command's required act inputs do not fit the active definition; no change was opened.");
  }
  const signer = await signerOf(ctx, config);
  const { D, summary, target } = await openingDirectory(ctx, config, reader);
  const shape = (await definitionOf(D, summary)).shape;
  const fields = { definition: change.digest, title, draft: false };
  const signed = await signedIntent(signer, { to: target, kind: "open-pr", fields, expected: expectedOf(shape.acts["open-pr"]!, (await summaryOf(D)).items, null, fields) }, signing(ctx));
  const opening = accepted(await D.submit(signed, [], { values: [change.bytes] }), D.scope, "Opened").receipt.fact;
  const opened = opening.seq;
  let knownLane: ScopeId | null = null;
  const known: { label: string; fact: FactRef }[] = [{ label: "Opening", fact: opening }];
  let phase = "discovering the opened change lane";
  let currentRequest: { kind: string; digest: Digest; status: "outcome unknown" | "refused" | "mismatch" } | null = null;
  const partial = (outcome: Outcome): Outcome => outcome.code === 0 ? outcome : { ...outcome, lines: [...outcome.lines,
    ...known.map(({ label, fact }) => `Recorded ${label.toLowerCase()}: ${fact.at.scope}:${fact.seq}, hash ${fact.hash}.`),
    ...(knownLane ? [`Known change lane: ${knownLane}.`] : []),
    `Interrupted while ${phase}. ${currentRequest ? `${currentRequest.kind} request ${currentRequest.digest}: ${currentRequest.status}.` : "No current mutation request was submitted in this phase."}`,
    `Inspect dap show ${opening.at.scope}:${opening.seq}${knownLane ? ` and dap log ${knownLane}` : ` and dap log ${opening.at.scope}`} before another mutation. A fresh propose or edit opens another change lane and signs new requests. No mutation was retried; recovery requires any uncertain request's original signed envelope, which this command does not retain.`,
  ] };
  try {
    const lane = (await createdBy(D, opened)).find((made) => made.seed.kind === "lane")?.scope ?? stopCommand(failed("The directory opened no change lane."));
    knownLane = lane;
    const L = await handleOf(ctx, config, lane, reader);
    await waitFor(ctx, () => [D.scope, lane], () => laneActive(L, `${D.scope}:${opened}`), `the change ${lane}`);
    const C = await laneOf(ctx, config, lane, reader, change.declared);
    phase = "preparing the rules request";
    const ask = await C.intent(signer, "ask-rules" as never, { on: 0, fields: {}, expected: expectedOf(change.declared.acts["ask-rules"] as unknown as ActShape, (await summaryOf(L)).items, 0, {}) } as never, signing(ctx));
    currentRequest = { kind: "ask-rules", digest: intentDigest(ask.signed.intent), status: "outcome unknown" }; phase = "submitting the rules request";
    const askedRules = await C.submit(ask.signed, [], ask.beside);
    if (askedRules.answer === "refused" || askedRules.answer === "mismatch") currentRequest.status = askedRules.answer;
    known.push({ label: "Rules request", fact: accepted(askedRules, lane, "Asked").receipt.fact });
    currentRequest = null; phase = "reading the requested rules";
    await waitFor(ctx, () => [lane, repository.rules], async () => (await summaryOf(L)).items.some((item) => item.type === "rules" && typeof item.values["revision"] === "number") ? true : null, `the rules of ${lane}`);
    const sources: { path: string; entry: FactRef; digest: Digest }[] = [];
    for (const file of contents) {
      currentRequest = null; phase = `preparing source ${file.path}`;
      const fields = { base, path: file.path, digest: digestBytes(file.bytes), size: file.bytes.length, content: file.content };
      const made = await C.intent(signer, "propose-file" as never, { on: null, fields, expected: expectedOf(change.declared.acts["propose-file"] as unknown as ActShape, (await summaryOf(L)).items, null, fields) } as never, signing(ctx));
      currentRequest = { kind: "propose-file", digest: intentDigest(made.signed.intent), status: "outcome unknown" }; phase = `submitting source ${file.path}`;
      const answer = await C.submit(made.signed, [], made.beside);
      if (answer.answer === "refused" || answer.answer === "mismatch") currentRequest.status = answer.answer;
      if (answer.answer !== "accepted") return partial(answered(lane, answer, "Proposed"));
      sources.push({ path: file.path, entry: answer.receipt.fact, digest: fields.digest });
      known.push({ label: `Source ${file.path}`, fact: answer.receipt.fact }); currentRequest = null;
    }
    phase = "preparing the manifest";
    const manifest = { base, files: sources };
    const made = await C.intent(signer, "propose-manifest" as never, { on: null, fields: manifest, expected: expectedOf(change.declared.acts["propose-manifest"] as unknown as ActShape, (await summaryOf(L)).items, null, manifest) } as never, signing(ctx));
    currentRequest = { kind: "propose-manifest", digest: intentDigest(made.signed.intent), status: "outcome unknown" }; phase = "submitting the manifest";
    const answer = await C.submit(made.signed, [], made.beside);
    if (answer.answer === "refused" || answer.answer === "mismatch") currentRequest.status = answer.answer;
    if (answer.answer !== "accepted") return partial(answered(lane, answer, "Proposed"));
    known.push({ label: "Manifest", fact: answer.receipt.fact }); currentRequest = null;
    const proposal = options.edit ? `Proposed ${files[0]!.path} (${files[0]!.bytes.length} bytes) as change ${lane}, version ${answer.receipt.fact.seq}.` : `Proposed ${files.length} files as change ${lane}, version ${answer.receipt.fact.seq}.`;
    const lines = [proposal];
    if (options.closes) {
      const linked = await run(async () => {
        try { return await linking(ctx, config, lane, reader, change.declared, options.closes!); }
        catch (error) {
          if (error instanceof TransportError) return failed("Linking could not be confirmed: a required request or reply was unavailable.");
          throw error;
        }
      });
      if (linked.code !== 0) return { ...linked, lines: [...lines, ...linked.lines,
        `Inspect dap show ${lane}:${answer.receipt.fact.seq} and dap log ${lane} before another edit, link or merge. The proposal is recorded; linking was not confirmed and no mutation was retried.`,
      ] };
      lines.push(...linked.lines);
    }
    const outcome = await run(() => merging(ctx, config, lane, reader, change.declared));
    const page = options.edit && outcome.code === 0 && outcome.lines[0]?.startsWith("Published:") ? [`Page: ${config.service.replace(/\/+$/, "")}/site/${repository.directory.scope}/HEAD/${files[0]!.path.split("/").map(encodeURIComponent).join("/")}`] : [];
    return { ...outcome, lines: [...lines, ...outcome.lines, ...page] };
  } catch (error) {
    if (error instanceof Stop) return partial(error.outcome);
    if (error instanceof TransportError) return partial(failed("The current request or read could not be confirmed; known earlier work remains recorded."));
    if (error instanceof ShapeError) return partial(failed("The local workflow input could not be shaped; known earlier work remains recorded."));
    if (error instanceof SourceError) return partial(failed(`The recorded source could not be read${typeof error.reason === "string" && Object.hasOwn(READ_REFUSALS, error.reason) ? `: ${error.reason}` : ""}; known earlier work remains recorded.`));
    return partial(failed("The workflow could not continue locally; known earlier work remains recorded."));
  }
}

/**
 * `dap merge <change> [--closes <issue>]`: `merge` of the change's current version, and the wait for the room's answer. With
 * `--closes`, the lane's `link-own` to that issue first: the merge that publishes the change then closes the issue.
 */
export function merge(ctx: Context, named: string, options: { closes?: string } = {}): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    await destinationOf(ctx, config);
    const lane = scopeNamed(config, named);
    const reader = await readerOf(ctx, config);
    const read = await (await handleOf(ctx, config, lane, reader)).definition();
    if (!read.ok) return failed(`Cannot read the definition of ${lane}: ${read.reason}.`);
    if (read.value.name !== "change") return usage(`${lane} is no change: its definition is ${read.value.name}.`);
    if (options.closes === undefined) return merging(ctx, config, lane, reader, read.value);
    const linked = await linking(ctx, config, lane, reader, read.value, await issueNamed(ctx, config, reader, options.closes));
    if (linked.code !== 0) return linked;
    const outcome = await merging(ctx, config, lane, reader, read.value);
    return { ...outcome, lines: [...linked.lines, ...outcome.lines] };
  });
}

/**
 * Sign `merge` of the change's current version, naming the reports it selects, and wait until the merge is final. Published: the
 * commit, and the page's address for a one-file version. Refused, by the lane or by the destination: the reason, and how to go on.
 */
async function merging(ctx: Context, config: Config, lane: ScopeId, reader: string | null, declared: DeclaredDefinition): Promise<Outcome> {
  const repository = config.repository ?? stopCommand(usage("No repository is known here. Run: dap create <name>, or dap join <link>."));
  const signer = await signerOf(ctx, config);
  const L = await handleOf(ctx, config, lane, reader);
  const items = (await summaryOf(L)).items;
  const version = items.find((item) => item.type === "manifest" && item.state === "current") ?? stopCommand(failed(`The change ${lane} has no current version.`));
  const selected = (version.values["selected"] ?? []) as { report: unknown }[];
  const fields = { manifest: version.id, reports: selected.map((s) => s.report) } as Record<string, FieldValue>;
  const C = await laneOf(ctx, config, lane, reader, declared);
  const { signed, beside } = await C.intent(signer, "merge" as never, { on: null, fields, expected: expectedOf(declared.acts["merge"] as unknown as ActShape, items, null, fields) } as never, signing(ctx));
  const answer = await C.submit(signed, [], beside);
  const again = `When it may be merged, run: dap merge ${lane}`;
  if (answer.answer !== "accepted") {
    const result = answered(lane, answer, "Merged");
    return answer.answer === "refused" ? { ...result, lines: [...result.lines, `The change ${lane} waits, at version ${version.id}. ${again}`] } : result;
  }
  const seq = answer.receipt.fact.seq;
  let next = seq + 1;
  const unknown = (reason: string): Outcome => failed(
    `Accepted merge: ${lane}:${seq}, version ${version.id}, fact ${canonicalize(answer.receipt.fact)}.`,
    `Observation unknown: ${reason}. Inspect dap show ${lane}:${seq} and dap log ${lane} before requesting another merge; do not resubmit this merge to recover observation.`,
  );
  let ended: { state: string; effects: Effects; reservationTree?: string };
  try {
    const observed = await waitFor(ctx, () => [lane, repository.destination], async () => {
      const read = await L.entry(next);
      if (!read.ok) return read.reason === "not-found" ? null : { unknown: read.reason };
      next++;
      const state = stateOf(read.value.entry.effects, seq);
      if (state === "published" || state === "refused" || state === "aborted") return { state, effects: read.value.entry.effects };
      if (state === "committed" && declared.acts["propose-file"]?.on === "source") {
        const current = await summaryOf(L);
        const rules = current.items.find((item) => item.type === "rules");
        const checks = rules?.values["checks"] as { required: boolean }[] | undefined;
        if (checks?.some((check) => check.required)) {
          const tree = current.items.find(item => item.id === version.id)?.values["tree"];
          return typeof tree === "string" ? { state, effects: read.value.entry.effects, reservationTree: tree } : { unknown: "reservation-data-unavailable" };
        }
      }
      // An unrelated entry still consumes this pass. Retain next and yield
      // to the existing tries/pause policy instead of an unbounded scan.
      return null;
    }, `the room's answer to merge ${lane}:${seq}`);
    if ("unknown" in observed) return unknown(observed.unknown);
    ended = observed;
  } catch (error) {
    // Never print arbitrary exception messages: transports/sources may carry
    // private data. Show only trusted command outcomes and known read codes.
    if (error instanceof Stop) {
      if (error.kind === "wait-exhausted") return unknown("wait-exhausted");
      const stopped = unknown("read-stopped");
      return { ...stopped, lines: [stopped.lines[0]!, ...error.outcome.lines, stopped.lines[1]!] };
    }
    if (error instanceof TransportError) return unknown("transport-error");
    if (error instanceof SourceError) return unknown(typeof error.reason === "string" && Object.hasOwn(READ_REFUSALS, error.reason) ? `source-error:${error.reason}` : "source-error");
    return unknown("observation-error");
  }
  const reason = valueOf_(ended.effects, seq, "reason");
  if (ended.state === "committed") {
    return done(`Reserved: merge ${lane}:${seq}, tree ${ended.reservationTree}. Required checks must pass before publication.`);
  }
  if (ended.state !== "published") return failed(`Not published: the merge ${lane}:${seq} is ${ended.state}${typeof reason === "string" ? `, ${reason}` : ""}. The change ${lane} stays open at version ${version.id}. ${again}`);
  const commit = valueOf_(ended.effects, seq, "commit");
  const path = version.values["path"];
  return done(
    `Published: commit ${String(commit)}, by the merge ${lane}:${seq}.`,
    ...(typeof path === "string" ? [`Page: ${config.service.replace(/\/+$/, "")}/site/${repository.directory.scope}/HEAD/${path.split("/").map(encodeURIComponent).join("/")}`] : []),
  );
}
