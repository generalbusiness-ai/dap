/** Room creation and exact retained claim recovery, shared with the browser. */
import type { Digest, Entry, FactRef, Item, KeyId, PlatformDefinition, ScopeId, ScopeRef, Seed, Summary } from "@generalbusiness/dap-contract";
import { canonicalize, factRefOf, intentDigest, isDigest, isFactRef, isIncarnation, isScopeId, parseStrict, scopeIdOf, seedDigest } from "@generalbusiness/dap-bytes";
import { ScopeHandle, TransportError, creationOffer, isCreationOffer, isCurrentCreationOffer, signedIntent, signedReads, type CreationOffer } from "@generalbusiness/dap-client";
import { DIRECTORY_OF, SIBLINGS_OF, platform } from "@generalbusiness/dap-platform";
import type { Context, Outcome } from "./commands.ts";
import type { ClaimStep, PendingClaim, Repository } from "./store.ts";
import { expectedOf, type DefinitionShape } from "./browser-helpers.ts";
import { newStoredSigner } from "./store-signer.ts";
import { validStep, accepted, active, configOf, createdBy, done, failed, handleOf, readSigning, run, signerOf, signing, stopCommand, summaryOf, transportOf, usage, waitFor } from "./command-support.ts";


/** Saved envelopes are checked against their actual caller and destination,
 * never re-signed from metadata. An accepted marker belongs to that scope. */

function validRepository(repository: Repository, directory: Seed): boolean {
  try {
    const siblings = SIBLINGS_OF[directory.definition];
    if (!siblings) return false;
    const sibling = (kind: "membership" | "rules" | "destination", ordinal: number) => scopeIdOf({ v: 1, kind, definition: siblings[kind], creator: repository.directory, cause: seedDigest(directory), ordinal });
    // The pinned directory creates these three exact siblings in order. Both its exact
    // seed and full confirmed reference determine their IDs; the same creator
    // key/handle in another room cannot authorize a substituted cache.
    return repository.directory.scope === scopeIdOf(directory) && repository.directory.kind === "directory" && isIncarnation(repository.directory.inc)
      && isScopeId(repository.membership.scope) && repository.membership.kind === "membership" && isIncarnation(repository.membership.inc)
      && repository.membership.scope === sibling("membership", 0) && repository.rules === sibling("rules", 1) && repository.destination === sibling("destination", 2)
      && (repository.inbox === undefined || isScopeId(repository.inbox));
  } catch { return false; }
}
function creationMembership(summary: Summary, at: ScopeRef, key: KeyId, handle: string, definition: PlatformDefinition): boolean {
  const roster = summary.items.find((item) => item.type === "roster");
  return canonicalize(summary.scope) === canonicalize(at) && summary.definition === definition
    && roster?.values["foundingKey"] === key && roster.values["foundingHandle"] === handle;
}
async function recordedStep(handle: ScopeHandle, seq: number, at: ScopeRef, key: KeyId, kind: string): Promise<ClaimStep> {
  const got = await handle.entry(seq);
  if (!got.ok || got.value.entry.input.type !== "act") return stopCommand(failed(`Cannot recover the admitted ${kind} entry; the claim remains pending.`));
  const entry = got.value.entry;
  const step: ClaimStep = { signed: entry.input.type === "act" ? entry.input.signed : stopCommand(failed("The enrollment entry is not an act.")), accepted: factRefOf(entry) };
  if (!validStep(step, at, key, kind) || step.accepted!.seq !== seq || step.accepted!.hash !== got.value.hash) return stopCommand(failed(`The admitted ${kind} entry does not match this membership and signing key; nothing was submitted.`));
  return step;
}

/**
 * `dap create <name>`: the register's `found` act, signed by the creator
 * key. The register fixes the directory's seed, so its ID is known from the
 * signed intent; the directory, once it exists, creates membership, the
 * rules scope and the destination. Then the creator takes the seat and the
 * first key in membership, and so becomes its first admin.
 *
 * Every read here is a signed read by the creator key, which is the
 * operator key: the register's summary, where that key signed `install`;
 * then the directory that the claim caused, and the scopes that the
 * directory caused; then membership, where the key has signed `seat`.
 *
 * **Resume.** Keep the exact signed native `found`, `seat` and `first-key`
 * intents before sending each one, then keep its accepted fact. An uncertain delivery retries that same
 * envelope; an accepted step is skipped. Never refresh a saved deadline.
 * Learned child references are kept before enrollment. Only `--again` opens
 * another creation claim. An older digest-only record can continue from its actual
 * admitted directory and checked retained claim; absence or ambiguity never
 * invents its missing signature. No signing key is in config.
 */
export function claim(ctx: Context, name: string, options: { handle?: string; branch?: string; again?: boolean } = {}): Promise<Outcome> {
  return walkClaim(ctx, name, options, false);
}
/** Settle and follow only retained original stages. No new act is prepared or submitted. */
export function checkClaim(ctx: Context, name: string): Promise<Outcome> {
  return walkClaim(ctx, name, {}, true);
}
function walkClaim(ctx: Context, name: string, options: { handle?: string; branch?: string; again?: boolean }, readOnly: boolean): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    const register = config.register ?? stopCommand(usage("No register is known here. Run: dap install <base-url>."));
    if (config.repository) return usage(`A repository is claimed here already: directory ${config.repository.directory.scope}.`);
    if (readOnly && !config.claim) return failed("No original claim is retained. Check prepares and submits nothing.");
    // A status check reads once and invokes no injected scheduler/pause hook.
    const waiting = readOnly ? { ...ctx, tries: 1, pause: async () => {} } : ctx;
    const signer = await signerOf(ctx, config);
    const R = await handleOf(ctx, config, register.scope, null);
    // A resumed accepted envelope obtains its exact pin from checked
    // settlement, before any aged summary is needed for routing.
    let registerDefinition: Digest | PlatformDefinition | null = null;
    const { claim: _, ...base } = config;
    let pending: PendingClaim;
    if (config.claim && !options.again) {
      pending = config.claim;
      if (pending.register !== register.scope || !isDigest(pending.intent) || typeof pending.handle !== "string") return failed("The pending claim does not identify this register and a valid recorded intent; nothing was submitted.");
      if (pending["found"] && (!validStep(pending["found"], register, signer.key, "found") || intentDigest(pending["found"].signed.intent) !== pending.intent || pending["found"].signed.intent.fields["founderHandle"] !== pending.handle)) return failed("The pending claim does not match this register, signing key and recorded intent; nothing was submitted.");
    } else {
      let offered: CreationOffer | undefined;
      // The dedicated public service offers fresh Register17 selectors without
      // a member summary. Other origins retain their historical read path.
      const demoOrigin = "https://dap-demo.inguz.workers.dev";
      const publicDemo = config.service === demoOrigin || config.service === demoOrigin + "/";
      const offeredBy = ctx.creationOffer ?? (publicDemo ? async (at: ScopeRef) => creationOffer(demoOrigin, {
        register: at,
        ...(ctx.fetch ? { fetch: async (endpoint, init) => {
          const response = await ctx.fetch!(endpoint, init);
          // The ordinary injected transport has a narrower response type.
          // Require real fetch metadata rather than invent redirect success.
          if (!("url" in response) || typeof response.url !== "string" || !("redirected" in response) || typeof response.redirected !== "boolean") {
            try { await response.body?.getReader().cancel(); } catch { /* Preserve the fixed metadata refusal. */ }
            throw new TransportError("The public creation offer has no checked response URL.");
          }
          return { status: response.status, body: response.body, url: response.url, redirected: response.redirected };
        } } : {}),
      }).then(value => {
        if (!isCurrentCreationOffer(value, demoOrigin, at)) throw new TransportError("The dedicated demo requires its exact public Register17 offer.");
        return value;
      }) : undefined);
      if (offeredBy) {
        const value = await offeredBy(structuredClone(register));
        if (!isCreationOffer(value, config.service, register)) return failed("The demo offer does not match the configured origin, full register reference, pin and purpose. Nothing was prepared or submitted.");
        // Own the projection before asynchronous recovery-key preparation.
        offered = JSON.parse(canonicalize(value)) as CreationOffer;
        if (!DIRECTORY_OF[offered.definition] || !platform(offered.definition)) return failed("The demo register version is unsupported here. Nothing was prepared or submitted.");
      }
      const recovery = (await newStoredSigner(ctx.store, "recovery")).key;
      const handle = options.handle ?? "@founder";
      let definition: Digest | PlatformDefinition;
      let items: readonly Item[];
      if (offered) {
        definition = offered.definition;
        // Revision selector only: never present this projection as a Summary,
        // an authenticated roster or authority for the native `found` judgment.
        items = [{ id: offered.registerItem.id, revision: offered.registerItem.revision, type: "register", state: "open", opened: null, parties: {}, refs: {}, attributed: [], values: { host: offered.registerItem.host, namespace: offered.registerItem.namespace, policy: "open", ...(offered.v === 1 ? { purpose: "demo-start" } : {}) } }];
      } else {
        const registered = await summaryOf(R);
        if (canonicalize(registered.scope) !== canonicalize(register)) return failed("The register read does not match the saved register reference; nothing was submitted.");
        definition = registered.definition; items = registered.items;
      }
      if (!DIRECTORY_OF[definition]) return failed(`The register ${register.scope} is under ${definition}, which this command does not know.`);
      registerDefinition = definition;
      const shape = platform(definition)!.data as unknown as DefinitionShape;
      const fields = { branch: options.branch ?? "main", "founderHandle": handle, recoveryKey: recovery };
      const signed = await signedIntent(signer, { to: register, kind: "found", fields, expected: expectedOf(shape.acts["found"]!, items, null, fields) }, signing(ctx));
      pending = { register: register.scope, intent: intentDigest(signed.intent), handle, "found": { signed } };
      await ctx.store.save({ ...base, claim: pending });
    }
    const keep = async (next: PendingClaim) => { await ctx.store.save({ ...base, claim: next }); pending = next; };
    if (!pending["found"]) {
      // Legacy records did not preserve the envelope. A real admitted
      // directory retains the original claim, so recover that exact signature
      // as already accepted. Never submit a reconstructed or fresh claim.
      const registered = await R.summary();
      // Digest-only records from main used the exact native directory@1.
      // A readable exact register pin can identify a tagged successor;
      // an unreadable pin never guesses that successor from newest aliases.
      if (registered.ok && canonicalize(registered.value.scope) !== canonicalize(register)) return failed("The register read does not match the saved register reference; nothing was submitted.");
      const legacyDefinition = registered.ok ? DIRECTORY_OF[registered.value.definition] : "platform:directory@1";
      if (!legacyDefinition) return failed("The legacy claim's register definition is unknown; nothing was submitted.");
      const legacySeed: Seed = { v: 1, kind: "directory", definition: legacyDefinition, creator: register, cause: pending.intent, ordinal: 0 };
      const D = await handleOf(ctx, config, scopeIdOf(legacySeed), null);
      const genesis = await D.entry(0);
      let matched: ClaimStep | null = null;
      let unread = genesis.ok ? "no matching retained claim" : `directory genesis read: ${genesis.reason}`;
      if (genesis.ok && genesis.value.entry.input.type === "genesis" && canonicalize(genesis.value.entry.input.seed) === canonicalize(legacySeed)) {
        for (const use of genesis.value.entry.uses) {
          if (canonicalize(use.fact.at) !== canonicalize(register)) continue;
          const kept = await signedReads(transportOf(ctx, config.service), signer, readSigning(ctx)).retained(D.scope, null, "entry", use.content);
          if (!kept.ok) { unread = `retained claim read: ${kept.reason}`; continue; }
          try {
            const entry = parseStrict(kept.value.bytes) as unknown as Entry;
            if (entry.input.type !== "act" || canonicalize(factRefOf(entry)) !== canonicalize(use.fact)) continue;
            const candidate: ClaimStep = { signed: entry.input.signed, accepted: use.fact };
            if (validStep(candidate, register, signer.key, "found") && intentDigest(candidate.signed.intent) === pending.intent && candidate.signed.intent.fields["founderHandle"] === pending.handle) { matched = candidate; break; }
          } catch { /* Not a checked copy of this legacy claim. */ }
        }
      }
      if (!matched) return failed(`This pending claim has only a digest and no readable admitted directory with its exact creation signature (${unread}). Nothing was submitted. Retry the reads later, recover it manually, or use --again to sign a new claim, which may create another repository.`);
      await keep({ ...pending, "found": matched });
    }
    const submitted = async (step: ClaimStep, at: ScopeRef, handle: ScopeHandle, took: string): Promise<FactRef> => {
      const digest = intentDigest(step.signed.intent);
      if (readOnly) {
        const settled = await handle.settle(step.signed);
        if (!settled.ok) return stopCommand(failed(`The original ${step.signed.intent.kind === "found" ? "create" : step.signed.intent.kind} is not confirmed: ${settled.reason}. It remains pending; Check submitted nothing.`));
        const receipt = settled.value;
        if (!isFactRef(receipt.fact) || canonicalize(receipt.fact.at) !== canonicalize(at) || receipt.intent !== digest || step.accepted && canonicalize(receipt.fact) !== canonicalize(step.accepted)) return stopCommand(failed("The checked receipt does not match the exact original stage. It remains pending; nothing was submitted."));
        const followed = await handle.followReceipt(receipt);
        if (!followed.ok || followed.entry.input.type !== "act" || canonicalize(followed.entry.input.signed) !== canonicalize(step.signed)) return stopCommand(failed("The original accepted stage could not be followed exactly. It remains pending; nothing was submitted."));
        if (step.signed.intent.kind === "found" && canonicalize(at) === canonicalize(register)) registerDefinition = receipt.definition;
        return receipt.fact;
      }
      if (step.accepted) {
        // Settlement admits nothing and is bound to the exact envelope. A
        // saved marker alone cannot stand for some other accepted request.
        const settled = await handle.settle(step.signed);
        if (!settled.ok) return stopCommand(failed(`Cannot confirm the saved ${step.signed.intent.kind === "found" ? "create" : step.signed.intent.kind} step: ${settled.reason}. The exact request remains pending; nothing was submitted.`));
        if (settled.value.intent !== digest || canonicalize(settled.value.fact) !== canonicalize(step.accepted)) return stopCommand(failed("The saved accepted fact does not match this exact claim step; nothing was submitted."));
        if (step.signed.intent.kind === "found" && canonicalize(at) === canonicalize(register)) registerDefinition = settled.value.definition;
        return step.accepted;
      }
      const receipt = accepted(await handle.submit(step.signed), at.scope, took).receipt;
      if (!isFactRef(receipt.fact) || canonicalize(receipt.fact.at) !== canonicalize(at) || receipt.intent !== digest) throw new TransportError("The accepted reply does not match this exact claim step; its saved request remains pending.");
      if (step.signed.intent.kind === "found" && canonicalize(at) === canonicalize(register)) {
        if (registerDefinition !== null && receipt.definition !== registerDefinition) throw new TransportError("The accepted reply names another register definition; its exact saved request remains pending.");
        registerDefinition = receipt.definition;
      }
      return receipt.fact;
    };
    const creationFact = await submitted(pending["found"]!, register, R, "Created");
    if (!pending["found"]!.accepted) {
      // An unavailable answer also requires the same request on retry. Even
      // an expired/refused envelope remains saved: only --again replaces it.
      await keep({ ...pending, "found": { signed: pending["found"]!.signed, accepted: creationFact } });
    } else if (!pending.repository) {
      // Wake recorded creation after a settings restart. This read does not
      // settle the found or change its already accepted request bytes.
      await R.summary();
    }
    const resume = `run dap create ${name} again to go on waiting for this claim, or with --again to sign a new one, which creates a second repository.`;

    // The checked register receipt selects the exact directory/sibling tuple.
    const directoryDefinition = registerDefinition === null ? undefined : DIRECTORY_OF[registerDefinition];
    if (!directoryDefinition) return failed(`The accepted claim's register definition ${String(registerDefinition)} is unknown; the claim remains pending.`);
    const siblings = SIBLINGS_OF[directoryDefinition];
    if (!siblings) return failed(`The directory ${directoryDefinition} has no known sibling versions; the claim remains pending.`);
    // The register's rule fixes the directory's seed from the claim's own intent (`directorySeed`).
    const seed: Seed = { v: 1, kind: "directory", definition: directoryDefinition, creator: register, cause: pending.intent, ordinal: 0 };
    let repository = pending.repository;
    if (!repository) {
      const D = await handleOf(ctx, config, scopeIdOf(seed), null);
      const children: ScopeId[] = [];
      const directory = await waitFor(waiting, () => [register.scope, D.scope, ...children], () => active(D), "the directory", resume);
      const made = await createdBy(D, 0);
      const kind = (k: string) => made.find((m) => m.seed.kind === k)?.scope ?? stopCommand(failed(`The directory's genesis creates no ${k}.`));
      children.push(kind("membership"), kind("rules"), kind("destination"));
      const handles = await Promise.all(children.map((scope) => handleOf(ctx, config, scope, null)));
      const summaries = await waitFor(waiting, () => [register.scope, D.scope, ...children], async () => {
        const all = await Promise.all(handles.map(active));
        return all.every((s) => s !== null) ? (all as Summary[]) : null;
      }, "membership, the rules scope and the destination", resume);
      if (directory.scope.scope !== D.scope || directory.scope.kind !== "directory" || directory.definition !== directoryDefinition || summaries.some((summary, n) => summary.scope.scope !== children[n] || summary.scope.kind !== ["membership", "rules", "destination"][n] || summary.definition !== [siblings.membership, siblings.rules, siblings.destination][n])) return failed("A creation read names another scope; the claim remains pending.");
      repository = { directory: directory.scope, membership: summaries[0]!.scope, rules: children[1]!, destination: children[2]! };
      await keep({ ...pending, repository });
    }
    if (!validRepository(repository, seed)) return failed("The saved repository references do not match this claim; nothing was submitted.");
    const handle = pending.handle;

    // The creator's seat and first key (`founding-key`): the first admin of the repository.
    const enrollment = { ...base, repository };
    const M = await handleOf(ctx, enrollment, repository.membership.scope);
    const mShape = platform(siblings.membership)!.data as unknown as DefinitionShape;
    if (!pending.seat && readOnly) return failed("The creation and its children are confirmed, but no original seat request is retained. Use explicit Continue to prepare that next stage; Check submitted nothing.");
    if (!pending.seat) {
      const summary = await summaryOf(M);
      if (!creationMembership(summary, repository.membership, signer.key, pending.handle, siblings.membership)) return failed("Membership does not record this creation's initial key and handle; nothing was submitted.");
      const members = summary.items.filter((item) => item.type === "member");
      const own = members.filter((item) => item.values["handle"] === pending.handle);
      if (own.length === 1 && own[0]!.state === "active") await keep({ ...pending, seat: await recordedStep(M, own[0]!.id, repository.membership, signer.key, "seat") });
      else if (members.length !== 0) return failed("Existing membership makes the missing seat stage ambiguous; nothing was submitted.");
      else {
        const signed = await signedIntent(signer, { to: repository.membership, kind: "seat", expected: expectedOf(mShape.acts["seat"]!, summary.items, null, {}) }, signing(ctx));
        await keep({ ...pending, seat: { signed } });
      }
    }
    if (!validStep(pending.seat!, repository.membership, signer.key, "seat")) return failed("The saved seat does not match this membership and signing key; nothing was submitted.");
    const seat = await submitted(pending.seat!, repository.membership, M, "Seated");
    if (!pending.seat!.accepted) await keep({ ...pending, seat: { signed: pending.seat!.signed, accepted: seat } });
    const keyFields = { member: seat.seq };
    if (!pending.firstKey && readOnly) return failed("The original seat is confirmed, but no original first-key request is retained. Use explicit Continue to prepare that next stage; Check submitted nothing.");
    if (!pending.firstKey) {
      const summary = await summaryOf(M);
      if (!creationMembership(summary, repository.membership, signer.key, pending.handle, siblings.membership)) return failed("Membership does not record this creation's initial key and handle; nothing was submitted.");
      const keys = summary.items.filter((item) => item.type === "key");
      const own = keys.filter((item) => item.values["id"] === signer.key && item.refs["member"] === seat.seq);
      if (own.length === 1 && own[0]!.state === "active") await keep({ ...pending, firstKey: await recordedStep(M, own[0]!.id, repository.membership, signer.key, "first-key") });
      else if (keys.length !== 0) return failed("Existing membership makes the missing first-key stage ambiguous; nothing was submitted.");
      else {
        const signed = await signedIntent(signer, { to: repository.membership, kind: "first-key", fields: keyFields, expected: expectedOf(mShape.acts["first-key"]!, summary.items, null, keyFields) }, signing(ctx));
        await keep({ ...pending, firstKey: { signed } });
      }
    }
    if (!validStep(pending.firstKey!, repository.membership, signer.key, "first-key") || pending.firstKey!.signed.intent.fields["member"] !== seat.seq) return failed("The saved first key does not match this seat and signing key; nothing was submitted.");
    const firstKey = await submitted(pending.firstKey!, repository.membership, M, "First key");
    if (!pending.firstKey!.accepted) await keep({ ...pending, firstKey: { signed: pending.firstKey!.signed, accepted: firstKey } });
    const inbox = (await createdBy(M, seat.seq)).find((m) => m.seed.kind === "inbox")?.scope;
    if (inbox) {
      const I = await handleOf(ctx, enrollment, inbox);
      await waitFor(waiting, () => [M.scope, inbox], () => active(I), "your inbox");
      repository.inbox = inbox;
    }
    await ctx.store.save({ ...base, repository, handle });
    return done(
      `Created ${name}: directory ${repository.directory.scope}, membership ${repository.membership.scope}, rules ${repository.rules}, destination ${repository.destination}; each created and confirmed.`,
      `Definitions: ${directoryDefinition}, ${[siblings.membership, siblings.rules, siblings.destination].join(", ")}.`,
      `You are ${handle}, an admin, on key ${signer.key}${inbox ? `; your inbox is ${inbox}` : ""}.`,
    );
  });
}
