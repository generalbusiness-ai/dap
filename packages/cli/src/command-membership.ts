/** Membership invitations and retained enrollment custody. */
import { type DefinitionShape, expectedOf, type Link, LINK, linkOf } from "./browser-helpers.ts";
import type { Context, Outcome } from "./command-context.ts";
import { standing } from "./command-scope.ts";
import { accepted, active, configOf, done, failed, fresh, handleOf, run, signerOf, signing, stopCommand, summaryOf, transportOf, usage, validStep, waitFor } from "./command-support.ts";
import { definitionOf } from "./command-targets.ts";
import { enrolAgentKey, enrolCheckerKey, enrolDeviceKey } from "./invitations.ts";
import { newStoredSigner } from "./store-signer.ts";
import type { Config, PendingJoin } from "./store.ts";
import { b64url, canonicalize, factRefOf, intentDigest, isFactRef, scopeIdOf, textDigest, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { AGENT_KEY_LINK, CHECKER_KEY_LINK, DEVICE_KEY_LINK, type DeviceKeyInvitation, encodeDeviceKeyInvitation, invitationIssueFields, invitationRedemptionFields, isAgentKeyMembership, isDeviceKeyInvitation, isInvitationMembership, signedIntent, ScopeHandle, TransportError, wellFormedInvitation } from "@generalbusiness/dap-client";
import type { FactRef, Seed, SignedIntent } from "@generalbusiness/dap-contract";
import { platform, ROLE_LISTS } from "@generalbusiness/dap-platform";

/** What a stop says of a join's earlier send. The pointer is kept before any send. */
function joinSent(pending: PendingJoin): string {
  return `This run sent nothing, and an earlier send of this join ${pending.accepted ? "went ahead" : "has no known outcome"}.`;
}

/**
 * `dap invite <member> --role <role>`: membership's `invite-member`. The
 * invitation holds the digest of a new secret; the link holds the secret,
 * and is printed once, for the inviter to pass to the member.
 */
export function invite(ctx: Context, member: string, options: { role?: string; acts?: string; hours?: number } = {}): Promise<Outcome> {
  return run(async () => {
    if (options.acts !== undefined) {
      return usage("--acts is not supported: membership's invite-member has the fields handle, role, inviteHash and inviteEnds, and no list of acts for one member. A role's actions are the roster's, for every member of that role.");
    }
    if (!options.role || !(options.role in ROLE_LISTS)) return usage(`Name a role with --role: one of ${Object.keys(ROLE_LISTS).join(", ")}.`);
    const config = await configOf(ctx);
    const repository = config.repository ?? stopCommand(usage("No repository is known here. Run: dap create <name>."));
    const signer = await signerOf(ctx, config);
    const M = await handleOf(ctx, config, repository.membership.scope);
    const summary = await summaryOf(M);
    const shape = (await definitionOf(M, summary)).shape;
    const secret = b64url(fresh(32));
    const now = ctx.now?.() ?? Date.now();
    const fields = { handle: member, role: options.role, ...invitationIssueFields(summary.definition, secret), inviteEnds: timeOf(Math.floor(now / 1000) * 1000 + (options.hours ?? 24) * 3600_000) };
    const signed = await signedIntent(signer, { to: repository.membership, kind: "invite-member", fields, expected: expectedOf(shape.acts["invite-member"]!, summary.items, null, fields) }, signing(ctx));
    const invitation = accepted(await M.submit(signed), M.scope, "Invited").receipt.fact.seq;
    const { inbox: _inbox, ...shared } = repository;
    const link: Link = { v: 1, service: config.service, repository: shared, invitation, secret, handle: member, definition: summary.definition };
    return done(
      `Invited ${member} as ${options.role}: invitation ${repository.membership.scope}:${invitation}, until ${fields.inviteEnds}.`,
      `Link for ${member} only (it holds the invitation's secret): ${LINK}${b64url(utf8(JSON.stringify(link)))}`,
    );
  });
}

/**
 * `dap invite <@member> --device`: membership's `invite-key`, kind `device`, for an active member. The link holds the
 * invitation's private credential and is printed once. `dap join` or the page redeems it with a new key of that member.
 */
export function inviteDevice(ctx: Context, member: string, options: { hours?: number } = {}): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    const repository = config.repository ?? stopCommand(usage("No repository is known here. Run: dap create <name>."));
    const signer = await signerOf(ctx, config);
    const M = await handleOf(ctx, config, repository.membership.scope);
    const before = await summaryOf(M);
    const held = standing(before.items, signer.key);
    if (held && !held.actions.includes("membership.invite")) return failed(`Your role ${held.role} does not hold membership.invite, so nothing was signed. Ask an admin of this room to run: dap invite ${member} --device.`);
    const row = before.items.find((item) => item.type === "member" && item.state === "active" && item.values["handle"] === member);
    if (!row) return failed(`${member} is no active member of this room. Nothing was signed.`);
    const { inbox: _inbox, ...shared } = repository;
    const secret = b64url(fresh(32));
    const link = (invitation: DeviceKeyInvitation["invitation"], expected: DeviceKeyInvitation["expected"]): DeviceKeyInvitation => ({ v: 1, kind: "device-key", service: new URL(config.service).origin, repository: shared, definition: before.definition, handle: member, invitation, secret, expected });
    // A link that cannot be encoded must stop before the act: its secret is not kept, so the invitation could not be used.
    if (!isAgentKeyMembership(before.definition) || !isDeviceKeyInvitation(link({ at: repository.membership, seq: 1, hash: textDigest("") }, { on: 1, member: 1 }))) return failed(`This room's service and membership version ${before.definition} have no device link. Nothing was signed.`);
    const shape = (await definitionOf(M, before)).shape;
    const now = ctx.now?.() ?? Date.now();
    const fields = { member: row.id, kind: "device", ...invitationIssueFields(before.definition, secret), inviteEnds: timeOf(Math.floor(now / 1000) * 1000 + (options.hours ?? 24) * 3600_000) };
    const signed = await signedIntent(signer, { to: repository.membership, kind: "invite-key", fields, expected: expectedOf(shape.acts["invite-key"]!, before.items, null, fields) }, signing(ctx));
    const invitation = accepted(await M.submit(signed), M.scope, "Invited").receipt.fact;
    const after = await summaryOf(M);
    const roster = after.items.find((item) => item.type === "roster" && item.state === "open"), current = after.items.find((item) => item.type === "member" && item.id === row.id);
    if (!roster || !current) return failed(`The invitation ${M.scope}:${invitation.seq} took effect, and the roster could not be read after it. Make another device link.`);
    return done(
      `Invited a new device of ${member}: invitation ${M.scope}:${invitation.seq}, until ${fields.inviteEnds}.`,
      `Link for a new device of ${member} only (it holds the invitation's secret): ${encodeDeviceKeyInvitation(link(invitation, { on: roster.revision, member: current.revision }))}`,
    );
  });
}

/** `dap join <link>` resumes the exact enrollment kept before delivery. */
export function join(ctx: Context, text: string): Promise<Outcome> {
  if (text.startsWith(AGENT_KEY_LINK)) return enrolAgentKey(ctx, text);
  if (text.startsWith(CHECKER_KEY_LINK)) return enrolCheckerKey(ctx, text);
  if (text.startsWith(DEVICE_KEY_LINK)) return enrolDeviceKey(ctx, text);
  return run(async () => {
    const before = await ctx.store.config();
    const link = linkOf(text, before?.service) ?? stopCommand(usage("That is not an invitation link from dap invite, or it names another service."));
    if (!wellFormedInvitation(link)) return usage("That invitation link has invalid repository references.");
    if (before?.join?.kind === "enrol") return failed("An original agent enrollment is retained; a person invitation cannot replace it.");
    if (before?.join?.kind === "checker-enrol") return failed("An original checker enrollment is retained; a person invitation cannot replace it.");
    if (before?.join?.kind === "device-enrol") return failed("An original device enrollment is retained; a person invitation cannot replace it.");
    if (before?.repository) return usage(`This config directory has a repository already: directory ${before.repository.directory.scope}.`);
    if (before && !before.join) return usage("This config directory is set up already; use another config directory to join.");
    const linkDigest = textDigest(canonicalize(link));
    let pending: PendingJoin | undefined = before?.join;
    const shared = pending && (({ inbox: _inbox, ...repository }) => repository)(pending.repository);
    if (pending && (pending.link !== linkDigest || before!.service !== link.service || canonicalize(shared) !== canonicalize(link.repository) || pending.handle !== link.handle)) return failed(`The invitation link does not match the pending join. ${joinSent(pending)} Retry the original invitation link.`);
    const base: Config = before ? { v: 1, service: before.service, key: before.key } : { v: 1, service: link.service, key: "device" };
    const signer = pending ? await signerOf(ctx, base) : await newStoredSigner(ctx.store, base.key);
    let signed: SignedIntent;
    const keep = async (next: PendingJoin) => { await ctx.store.save({ ...base, join: next }); pending = next; };
    if (!pending) {
      // No pre-join membership reads are authorized. Its pinned definition
      // names the invitation by a mark, with no revision in expected.
      // Every person invitation names the exact supported Membership pin.
      const named = link.definition;
      const loaded = platform(named);
      if (!isInvitationMembership(named) || !loaded || loaded.data.name !== "platform:membership" || loaded.data.acts["join"] === undefined) return failed(`The invitation is in ${named}, which this command does not know as membership.`);
      const shape = loaded.data as unknown as DefinitionShape;
      const fields = invitationRedemptionFields(named, link.repository.membership, link.invitation, signer.key, link.secret);
      signed = await signedIntent(signer, { to: link.repository.membership, kind: "join", fields, expected: expectedOf(shape.acts["join"]!, [], null, fields) }, signing(ctx));
      const request = `join-${b64url(fresh(12)).toLowerCase().replace(/_/g, "a")}`;
      // The envelope includes the invitation secret. Publish it privately,
      // then its public pointer, before any mutation can leave this process.
      await ctx.store.keepPrivate(request, utf8(JSON.stringify(signed)));
      await keep({ request, intent: intentDigest(signed.intent), link: linkDigest, repository: link.repository, handle: link.handle });
    } else {
      const bytes = await ctx.store.private(pending.request);
      if (!bytes) return failed(`The exact private join request is missing. ${joinSent(pending)} Restore its private record before retrying.`);
      try { signed = JSON.parse(new TextDecoder().decode(bytes)) as SignedIntent; }
      catch { return failed(`The private join request cannot be read. ${joinSent(pending)} Restore its private record before retrying.`); }
    }
    const at = link.repository.membership;
    if (!validStep({ signed, ...(pending!.accepted ? { accepted: pending!.accepted } : {}) }, at, signer.key, "join")
      || intentDigest(signed.intent) !== pending!.intent || canonicalize(signed.intent.fields) !== canonicalize(invitationRedemptionFields(link.definition, at, link.invitation, signer.key, link.secret))) return failed(`The saved join does not match this invitation, membership and signing key. ${joinSent(pending!)}`);
    const config: Config = { ...base, repository: link.repository };
    // Submit/settle forward the retained signed envelope without read authority.
    const M = new ScopeHandle(transportOf(ctx, config.service), at.scope, null);
    const digest = intentDigest(signed.intent);
    let fact: FactRef;
    if (pending!.accepted) {
      const settled = await M.settle(signed);
      if (!settled.ok) return failed(`Cannot confirm the saved join: ${settled.reason}. The exact request remains pending. ${joinSent(pending!)}`);
      if (settled.value.intent !== digest || canonicalize(settled.value.fact) !== canonicalize(pending!.accepted)) return failed(`The saved accepted fact does not match this exact join. ${joinSent(pending!)}`);
      fact = pending!.accepted;
    } else {
      const receipt = accepted(await M.submit(signed), M.scope, "Joined").receipt;
      if (!isFactRef(receipt.fact) || canonicalize(receipt.fact.at) !== canonicalize(at) || receipt.intent !== digest) throw new TransportError("The accepted reply does not match this exact join; its saved request remains pending.");
      fact = receipt.fact;
      await keep({ ...pending!, accepted: fact });
    }
    // Construct the existing signed-read handle only after acceptance.
    const joined = await handleOf(ctx, config, at.scope, null);
    const entry = await joined.entry(fact.seq);
    if (!entry.ok) return failed(`Cannot read entry ${M.scope}:${fact.seq}: ${entry.reason}. The join remains pending; retry the original invitation link.`);
    if (canonicalize(factRefOf(entry.value.entry)) !== canonicalize(fact) || entry.value.hash !== fact.hash
      || entry.value.entry.input.type !== "act" || canonicalize(entry.value.entry.input.signed) !== canonicalize(signed)) return failed("The admitted entry does not match this exact join. The join request went ahead, and the join remains pending. Retry the original invitation link.");
    const inbox = entry.value.entry.sends.flatMap((send) => "creator" in send.to && send.to.kind === "inbox" ? [scopeIdOf(send.to as Seed)] : [])[0]
      ?? stopCommand(failed(`Joined, but entry ${M.scope}:${fact.seq} creates no inbox. The join remains pending.`));
    if (pending!.repository.inbox && pending!.repository.inbox !== inbox) return failed("The saved inbox does not match this join. The join request went ahead, and the join remains pending. Retry the original invitation link.");
    await keep({ ...pending!, repository: { ...link.repository, inbox } });
    const I = await handleOf(ctx, config, inbox, null);
    await waitFor(ctx, () => [M.scope, inbox], () => active(I), "your inbox", "retry the original dap join invitation link to continue this enrollment.");
    await ctx.store.save({ ...config, repository: { ...link.repository, inbox }, handle: link.handle });
    return done(`Joined as ${link.handle} on key ${signer.key}.`, `Your inbox: ${inbox}.`);
  });
}
