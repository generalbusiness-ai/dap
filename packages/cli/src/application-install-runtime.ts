/** CLI entry to the client's native install request and installation read, under the persistent custody that MCP shares. */
import { isScopeRef, timeOf } from "@generalbusiness/dap-bytes";
import { Custody, CustodyError, Lost, Reads, TransportError, secretSigner, type CustodyStore } from "@generalbusiness/dap-client";
import { applicationInstallation, installApplication, upgradeApplication, type InstallationRefusal, type InstallHandle, type InstallOptions, type InstallRefusal, type PackageBytes, type UpgradeRefusal } from "@generalbusiness/dap-client/install";
import { ApplicationHttpError, applicationGitHttpSource, readApplicationGitBlob } from "@generalbusiness/dap-git/application";
import type { Context, Outcome } from "./commands.ts";

const KEEP = "Keep the original request key and arguments.";
const SETTLE = "The request is under custody. Repeat the same command to settle it.";
const NOTHING = "This command signed and sent nothing.";

export function applicationCommands(ctx: Context, custody: CustodyStore, applicationFetch?: (request: Request) => Promise<Response>, applicationTrust?: string): NonNullable<Context["applicationCommand"]> {
  return (name, args) => call(ctx, custody, applicationFetch, applicationTrust, name, args);
}

/** The exact Git blob of a package, read by the public HTTPS reader. */
async function packageBytes(address: Parameters<typeof applicationGitHttpSource>[0], limit: number, send?: (request: Request) => Promise<Response>): Promise<PackageBytes> {
  let source: ReturnType<typeof applicationGitHttpSource> | undefined;
  try {
    source = applicationGitHttpSource(address, { blobBytes: limit, ...(send ? { send } : {}) });
    return { ok: true, bytes: await readApplicationGitBlob(address, source.source, limit) };
  }
  catch (error) { return { ok: false, reason: error instanceof ApplicationHttpError && error.reason === "unsupported-object-format" ? "unsupported-object-format" : "unavailable" }; }
  finally { await source?.close(); }
}

async function call(ctx: Context, store: CustodyStore, applicationFetch: ((request: Request) => Promise<Response>) | undefined, applicationTrust: string | undefined, name: string, args: Record<string, unknown>): Promise<Outcome> {
  const config = await ctx.store.config();
  if (!config?.repository) return { code: 2, lines: ["Configure a trusted-application or declared-application room before installing a package."] };
  const secret = ctx.store.signer ? null : (await ctx.store.secret(config.key))?.slice() ?? null;
  const signer = ctx.store.signer ? await ctx.store.signer(config.key) : secret ? secretSigner(secret) : null;
  if (!signer) { secret?.fill(0); return { code: 1, lines: [`The configured signing key is unavailable. This call signed and sent nothing, and it did not read the record under this request key. ${KEEP}`] }; }
  try {
    const now = ctx.now ?? Date.now;
    const handle: InstallHandle = { service: config.service, signer, now, repository: config.repository, ...(applicationTrust === undefined ? {} : { applicationTrust }) };
    const reader = new Reads({ service: config.service, signer, now, ...(ctx.fetch ? { fetch: ctx.fetch } : {}) });
    const custody = new Custody(store, () => timeOf(now()));
    const requestOptions: InstallOptions = {
      reader,
      recoverAbsent: async identity => {
        // A lost reply may hide an accepted request. Ask for its Native settlement before trying absence.
        const target = identity.target;
        if (isScopeRef(target)) await custody.settle(identity, async envelope => {
          try {
            const read = await reader.transport.settle(target.scope, envelope.signed);
            return read.ok ? read.value : read.reason === "archived" ? read : null;
          } catch (error) { if (error instanceof TransportError) throw new Lost(); throw error; }
        });
        return reader.recoverAbsent(custody, identity);
      },
      send: (...sent) => custody.send(...sent), packageBytes: (address, limit) => packageBytes(address, limit, applicationFetch),
    };
    if (name === "upgrade_application") {
      const item = args["item"], upgraded = await upgradeApplication(handle, custody, { item, uri: args["uri"], release: args["release"], replace: args["replace"], roles: args["roles"], values: args["values"], idempotencyKey: args["idempotencyKey"] }, requestOptions);
      switch (upgraded.outcome) {
        case "refused": return { code: 1, lines: [
          ...(upgraded.refusal.refused === "recovery" && upgraded.refusal.state !== "absent"
            ? [installRefused({ refused: "lost", scope: config.repository.rules })] : []),
          upgradeRefused(upgraded.refusal, item),
          ...(early(upgraded.refusal) ? await earlier(store, config.service, signer.key, args["idempotencyKey"]) : []),
        ] };
        case "archived": return { code: 1, lines: ["Upgrade request: archived. The exact original is retained."] };
        case "answered": return { code: 1, lines: [`Upgrade request: ${upgraded.answer.answer}${"reason" in upgraded.answer ? ` (${upgraded.answer.reason}${"name" in upgraded.answer && upgraded.answer.name ? `: ${upgraded.answer.name}` : ""})` : ""}. The exact original is retained.`] };
        case "accepted": return { code: 0, lines: upgraded.form === "in-place"
          ? [`Upgrade request recorded: act ${upgraded.act} moves item ${upgraded.on} in place.`, `Read its result with: dap application ${upgraded.on}`,
            "Acceptance records the request. The native fetch may still be pending or refused."]
          : [`Upgrade request recorded: act ${upgraded.act} opens item ${upgraded.act} to replace item ${upgraded.on}.`, `Read its result with: dap application ${upgraded.act}`,
            `Acceptance records the request. Native fetch, admission, grants and creation may still be pending or refused. Item ${upgraded.on} stays active until item ${upgraded.act} is active.`] };
      }
    }
    if (name === "install_application") {
      const installed = await installApplication(handle, custody, { uri: args["uri"], release: args["release"], roles: args["roles"], values: args["values"], owner: args["owner"], idempotencyKey: args["idempotencyKey"] }, requestOptions);
      switch (installed.outcome) {
        case "refused": return { code: 1, lines: [
          ...(installed.refusal.refused === "recovery" && installed.refusal.state !== "absent"
            ? [installRefused({ refused: "lost", scope: config.repository.rules })] : []),
          installRefused(installed.refusal),
          ...(early(installed.refusal) ? await earlier(store, config.service, signer.key, args["idempotencyKey"]) : []),
        ] };
        case "archived": return { code: 1, lines: ["Install request: archived. The exact original is retained."] };
        case "answered": return { code: 1, lines: [`Install request: ${installed.answer.answer}${"reason" in installed.answer ? ` (${installed.answer.reason})` : ""}. The exact original is retained.`] };
        case "accepted": return { code: 0, lines: [`Install request recorded: item ${installed.item}.`, `Read its result with: dap application ${installed.item}`, "Acceptance records the request. Native fetch, admission, grants and creation may still be pending or refused."] };
      }
    }
    const read = await applicationInstallation(handle, args["item"], { reader });
    if (read.outcome === "refused") return { code: 1, lines: [installationRefused(read.refusal)] };
    const value = read.installation;
    return { code: value.state === "refused" ? 1 : 0, lines: [
      `Application install ${value.item}: ${value.state} (${String(value.phase)}).`,
      ...(typeof value.reason === "string" ? [`Reason: ${value.reason}. Earlier committed grants and activation remain in force.`] : []),
      ...(value.screen !== null ? [`Screen: ${value.screen}`] : []),
    ] };
  } catch (error) {
    if (error instanceof CustodyError) return { code: 1, lines: [custodyRefused(error)] };
    return { code: 1, lines: ["The application request could not be read or completed. Keep its original request key and arguments."] };
  }
  finally { secret?.fill(0); }
}

function roomRefused(refusal: Extract<InstallRefusal, { refused: "unconfigured" | "read" | "room-siblings" | "rules-sibling" | "commons-membership" }>): string {
  switch (refusal.refused) {
    case "unconfigured": return `Configure a trusted-application or declared-application room before installing a package. ${NOTHING}`;
    case "read": return `The read of ${refusal.scope} was refused (${refusal.reason}). ${NOTHING}`;
    case "room-siblings": return `The configured room does not match its native directory, rules and destination. ${NOTHING}`;
    case "rules-sibling": return `The room's rules scope does not support application installs. ${NOTHING}`;
    case "commons-membership": return `The Commons room does not hold its exact membership. ${NOTHING}`;
  }
}

/** A refusal before this command signed: an earlier request under the same key can still be open. */
function early(refusal: UpgradeRefusal): boolean {
  return !["stopped", "lost", "receipt", "accepted-unread", "entry-unread", "entry", "recovery", "unsent", "not-found"].includes(refusal.refused);
}

/** What request custody holds under this key for this key holder and service, read with no lock, as MCP states it. */
async function earlier(store: CustodyStore, service: string, signer: string, key: unknown): Promise<string[]> {
  if (typeof key !== "string") return [];
  try {
    for (const open of await store.unresolved()) {
      if (open.key !== key) continue;
      const record = await store.read(open.id);
      if (record && record.identity.service === service && record.identity.signer === signer && record.phase !== "prepared")
        return ["An earlier request under this key has no known outcome. Repeat the same command to settle it. Do not use a new key."];
    }
    return [];
  } catch { return ["Request custody cannot be read, so an earlier request under this key may have gone. Do not use a new key."]; }
}

function installRefused(refusal: InstallRefusal): string {
  switch (refusal.refused) {
    case "not-found": return "No install request is kept under this key. This command signed and submitted no ACT. Keep the original request key and arguments.";
    case "unsent": return "Custody keeps an absence proof for this expired install request. It retains the original envelope. This command signed and submitted no ACT. Do not resend the expired envelope. Use a new request key only for a new request.";
    case "recovery":
      if (refusal.state === "absent") return installRefused({ refused: "unsent" });
      if (refusal.state === "unproved" && refusal.why?.kind === "head-before-expiry")
        return `The verified scope journal has no entry at or past this install request's expiry. Custody keeps the original record and its capacity charge. This command signed and submitted no ACT. ${KEEP} Repeat the command after the scope records a later entry at or past the request's expiry.`;
      if (refusal.state === "present")
        return `The checked scope journal holds this actor and request key, but the scope supplied no settlement for the exact kept envelope. This command signed and submitted no ACT. ${KEEP} Repeat the command to ask for the original outcome.`;
      if (refusal.state === "unproved") {
        const why = refusal.why.kind === "read" ? `read: ${refusal.why.reason}` : refusal.why.kind;
        return `This command could not prove the expired install request absent (${why}). Custody keeps the original record and its capacity charge. This command signed and submitted no ACT. ${KEEP} Restore complete session-authorized journal reads, then repeat the command.`;
      }
      return `The custody record changed before absence recovery completed. This command signed and submitted no ACT and claims no new outcome. ${KEEP} Repeat the command to read the current record.`;
    case "unconfigured": case "read": case "room-siblings": case "rules-sibling": case "commons-membership": return roomRefused(refusal);
    case "key": return `The request key must be 1 to 128 bytes of UTF-8. ${NOTHING}`;
    case "unknown-tool": return `This room does not offer application installs to this key. ${NOTHING}`;
    case "installation": return `The install needs a Git URI at a full commit, the expected release, unique roles, bounded values, and a full owner for a device package. ${NOTHING}`;
    case "trust": return "APPLICATION_TRUST does not list this release and Git host. This command fetched, signed and sent nothing.";
    case "commons-missing": return `The package requires Commons, and this room has none. ${NOTHING}`;
    case "unprepared": return `${refusal.why === "unsupported-object-format" ? "The public HTTPS Git reader does not support SHA-256 repositories." : refusal.why === "package" ? "The package bytes do not match the expected signed release or the install bounds." : "The Git package could not be read."} ${NOTHING}`;
    case "stopped": return `The command stopped after the request went to ${refusal.scope}. ${SETTLE}`;
    case "lost": return `The reply from ${refusal.scope} was lost, so the outcome is unknown. ${SETTLE}`;
    case "receipt": return `The room's receipt does not match the kept request. Report this, and do not send a new request. ${KEEP}`;
    case "accepted-unread": return `The room accepted the request, and the reply to the read after it was lost. ${SETTLE}`;
    case "entry-unread": return `The room accepted the request, and the read of its entry gave nothing. ${SETTLE}`;
    case "entry": return `The room's entry does not hold the exact kept request. Report this, and do not send a new request. ${KEEP}`;
  }
}

/** One line for each reason an upgrade refused; the install's reasons keep the install's words. */
function upgradeRefused(refusal: UpgradeRefusal, item: unknown): string {
  switch (refusal.refused) {
    case "upgrade-unsupported": return `The room's rules scope has no upgrade act. A room of the upgrade cohort has one. ${NOTHING}`;
    case "installation": return `The upgrade needs an install item, a Git URI at a full commit and the expected release. The in-place form takes no --role or --values. ${NOTHING}`;
    case "installation-read": return `The installation read was refused (${refusal.reason}). ${NOTHING}`;
    case "installation-unavailable": return `Item ${String(item)} is not an installation in this room. ${NOTHING}`;
    case "installation-state": return `Item ${String(item)} is ${refusal.state}, not active, so it cannot be upgraded. ${NOTHING}`;
    case "upgrade-pending": return `Item ${String(item)} has an open upgrade (application-upgrade-pending). Read it with dap application ${String(item)}, and try again after it ends. ${NOTHING}`;
    case "semantic-changed": return `This release changes the semantic identifier of item ${String(item)}, so it cannot upgrade in place. Add --replace to open a successor installation. ${NOTHING}`;
    case "semantic-kept": return `This release keeps the semantic identifier of item ${String(item)}. Remove --replace to upgrade it in place. ${NOTHING}`;
    case "trust": return "APPLICATION_TRUST does not list this release and Git host. This command fetched, signed and sent nothing.";
    default: return installRefused(refusal);
  }
}

function installationRefused(refusal: InstallationRefusal): string {
  switch (refusal.refused) {
    case "item": return "The install item must be a nonnegative integer.";
    case "installation-read": return `The installation read was refused (${refusal.reason}).`;
    case "installation-unavailable": return "That installation is not in this room.";
    default: return roomRefused(refusal);
  }
}

function custodyRefused(error: CustodyError): string {
  switch (error.why.held) {
    case "conflicting": return `This request key holds a different request. Use a new key for a new request. ${NOTHING}`;
    case "full": return `Request custody is full. Settle the open requests first. ${NOTHING}`;
    case "locked": return "Another command holds this request key. Wait, then repeat the same command.";
    case "unkept": return `The request went, and custody could not keep its outcome. It may have taken effect. ${KEEP}`;
    case "too-large": return `The request is too large for custody. ${NOTHING}`;
    case "unreadable": return `The custody record of this request key cannot be read. ${KEEP}`;
  }
}
