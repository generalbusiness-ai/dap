import { describe, expectedOf, heldActs, LINK, linkOf, valueOf, type ActShape, type DefinitionShape, type Link, type Standing } from "./browser-helpers.ts";
export { describe, expectedOf, heldActs, LINK, linkOf, valueOf, type ActShape, type DefinitionShape, type Link, type Standing } from "./browser-helpers.ts";
export { claim, checkClaim } from "./claim.ts";
import { Stop, validStep, managedReadsOf, requiredReadsOf, sessionOf, accepted, active, answered, configOf, createdBy, done, failed, fresh, handleOf, readSigning, readTransportOf, readerOf, run, signerOf, signing, stopCommand, summaryOf, transportOf, usage, waitFor } from "./command-support.ts";
import { ARCHIVE_REPLAY_CODE, INVITATION_KEY_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT, ARCHIVE_DEVICE_PUBLICATION_COHORT, ARCHIVE_CERTIFIED_RULES_COHORT, HARDENED_CERTIFIED_RULES_COHORT } from "@generalbusiness/dap-platform";
import { invitationIssueFields, invitationRedemptionFields, isInvitationMembership } from "@generalbusiness/dap-client";
import { applicationList } from "./application-list.ts";
/**
 * The commands, as functions over a scope service's base URL and a signing
 * key. Each takes a `Context` and returns an `Outcome`: an exit code and
 * one or two plain lines. `main.ts` runs them under Node with the files of
 * `files.ts` and the runtime's `fetch`; a test runs the same functions
 * against the test Worker's routes, with a store in memory.
 *
 * The command judges nothing. Whether an act takes effect is the scope's
 * judgment, and its answer is printed as it came: a refusal writes nothing,
 * and its reason is the outcome. What the command reads to build an intent
 * (an item's revision, the caller's role) is a reading, and the scope
 * checks each part of the intent again.
 *
 * | Command | What it does |
 * |---|---|
 * | `install` | Creates the register by an `install` intent, signed by a new operator key that is also the one creator key. With `--plan`, it signs the intent and prints the register ID it will create, and creates nothing; `--planned` creates that plan. |
 * | `claim` | Signs the register's `found` act, then waits until the directory, membership, rules scope and destination are created and confirmed. Then it takes the creator's seat and first key in membership. A claim it gave up waiting on is kept as pending, and the next `claim` goes on from it; `--again` signs a new one. |
 * | `invite`, `join` | Membership's `invite-member` and `join`. The link carries the invitation's number and secret; the joining key is made and kept locally. |
 * | `acts` | The acts of a scope's definition, with the ones the caller's role holds. |
 * | `act` | One act of any kind, through the client's declared handle for a declared definition, or as a signed intent for a platform one. |
 * | `log`, `show` | The scope's history, and one entry, over the read routes. |
 * | `verify` | The replay verifier over the read routes: with the caller's session, and by signed reads where the session is refused. With `--all`, every scope of the room, one line each. |
 * | `remote` | The repository's host, namespace, name and remote URL, from the destination's branch item. |
 * | `clone` | Signs the destination's `read-token`, waits for its outcome, reads the read token once, and runs `git clone` with it in an `Authorization` header that git reads from its environment. The token is never an argument and never printed. |
 * | `edit` | Opens a change through the directory under the change definition that the rules scope holds active, proposes one file as its only version (`propose-file`), and merges it as `merge` does. The room, not the person, writes the repository. |
 * | `merge` | Signs `merge` of a change's current version, and waits until the room has published it or refused it. `edit` and `merge` take `--closes <issue>`: the lane's `link-own` first. |
 * | `issue`, `issues` | `open` is the directory's `open-issue`; `comment`, `assign` and `close` are the issue lane's own acts. `issues` lists each issue as its lane has it. |
 */

import { PROPOSED_BOUNDS, type DeclaredDefinition, type Digest, type EffectForm, type Entry, type FactRef, type FieldValue, type Item, type KeyId, type PlatformDefinition, type ScopeId, type ScopeRef, type Seed, type SignedIntent, type Summary } from "@generalbusiness/dap-contract";
import { READ_REFUSALS, readItemQuery, b64url, canonicalize, definitionDigest, digestBytes, factRefOf, intentDigest, isReceipt, isSignedIntentShape, isFactRef, isEntry, isScopeId, parseStrict, scopeIdOf, textDigest, timeMs, timeOf, utf8, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { ScopeHandle, ShapeError, TransportError, activeDirectory, partitionIndexes, wellFormedInvitation, readCredential, declaredHandle, create, shapeDeclaredAct, signedIntent, signedLogReader, type Fetch, type Session, type CreationOffer, type Signing, type Transport } from "@generalbusiness/dap-client";
import { CAPABILITY_CODE as REPLAY_CAPABILITY_CODE } from "@generalbusiness/dap-derive";
import { COMMONS_COHORT, UNPUBLISHED_COHORT, APPLICATION_COHORT, FILE_PUBLICATION_COHORT, COUNTING_COHORT, TRUSTED_APPLICATION_COHORT, DECLARED_APPLICATION_COHORT, ARCHIVE_APPLICATION_COHORT, ARCHIVE_DECLARED_APPLICATION_COHORT, READ_TOKEN_HOURS, NEWEST, ROLE_LISTS, platform, type Role, DEVICE_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import { SourceError, httpSource, render, roomVerification, verify as replay, type FinishedRoom, type HistorySource } from "@generalbusiness/dap-replay";
import { enrolAgentKey } from "./invitations.ts";
import { AGENT_KEY_LINK } from "@generalbusiness/dap-client";
const NEW_REGISTER = NEWEST["platform:register"]!;

import type { Config, PendingJoin, PlannedInstall, Store } from "./store.ts";
import { outcomeFetch, outcomeWaitLines, pauseOutcome, waitOutcome, type CloneWait } from "./clone-outcome.ts";
import { readTokenEntry, readTokenOpening, readTokenOutcome, readTokenReceipt } from "./clone-proof.ts";
import { observeCleanup } from "./verify-cleanup.ts";
import { supportsManifestListDestination, supportsOneFileDestination } from "./destination-protocol.ts";
import { statusReport } from "./status-report.ts";
import { archiveRemote, archiveValue } from "./archive-remote.ts";
import { storedSigner, newStoredSigner } from "./store-signer.ts";

import { Verification, type VerifyOptions } from "./verification.ts";
export { VERIFY_LIMITS, type VerifyLimits, type VerifyOptions } from "./verification.ts";

export interface Context {
  /** One verification command's total read work and incremental progress. */
  verify?: VerifyOptions;
  /** An explicit runtime port with persistent request custody. The browser
   * command surface has no MCP server or Node dependency. */
  applicationCommand?: (name: "install_application" | "application_installation", args: Record<string, unknown>) => Promise<Outcome>;
  store: Store;
  /** Replaces the runtime's `fetch`: a test passes the Worker's routes. */
  fetch?: Fetch;
  /** Internal configured-service trust for this exact injected creation
   * transport. It authenticates no independent remote history. */
  trustedCreationService?: { service: string; fetch: Fetch };
  /** Explicit fixed-origin demo projection for fresh claim preflight only.
   * It grants no authority and is never used to resume/check an original. */
  creationOffer?: (register: ScopeRef) => Promise<CreationOffer>;
  /** The clock that intents are signed by, in milliseconds. The default is the runtime's. */
  now?: () => number;
  /**
   * Called between two reads while a command waits for scopes to be created
   * and confirmed, with the scopes it waits on. The default waits one
   * second. A deployment's alarms do the work meanwhile; a test drives the
   * dispatchers here instead.
   */
  pause?: (waiting: readonly ScopeId[]) => Promise<void>;
  /** How many reads a wait makes before it gives up. The default is 120. */
  tries?: number;
  /** History pages per scope while discovering the room for `verify --all`. The default is 1,000. */
  historyPages?: number;
  /** The `git` program, for `clone`. `main.ts` gives Node's (`git.ts`); a test gives a stand-in. Absent: there is none. */
  git?: Git;
  /** Read-token outcome bounds and caller cancellation; never mint authority. */
  cloneWait?: CloneWait;
  /** A local file's bytes, for `edit --file` and `act --value`, or null when it cannot be read. `main.ts` gives Node's; a test gives its own. */
  read?: (path: string) => Promise<Uint8Array | null>;
}

/**
 * One run of `git`: its arguments, and the environment it adds. The answer is its exit code, or null when there is no `git` to
 * run. `env` is how a secret reaches git: as configuration that git reads from its environment, never as an argument.
 */
export interface Git {
  run(args: readonly string[], env: Readonly<Record<string, string>>): Promise<number | null>;
  /** Credential-bearing archive clone/fetch only: fresh environment, fixed config, no raw child output. */
  archiveRun?(args: readonly string[], env: Readonly<Record<string, string>>): Promise<number | null>;
  files?(base: string, branch: string): Promise<{ ok: true; tip: string; files: readonly { path: string; bytes: Uint8Array }[] } | { ok: false; reason: string }>;
}

/** What a command ends with: its exit code, and the lines it prints. 0: done. 1: refused, unavailable or not found. 2: not a command this can run. */
export interface Outcome { code: 0 | 1 | 2; lines: string[] }
const short = (text: string): string => (text.length > 16 ? `${text.slice(0, 12)}...` : text);

/** Node operator adapter. Constructing it reads local configuration only;
 * authentication starts lazily, after a manifest's local validation. */
export async function scopeIndexAccess(ctx: Context): Promise<{ service: string; root: ScopeRef; reads: import("./scope-index-manifest.ts").IndexReads }> {
  const config = await configOf(ctx);
  const root = config.repository?.directory;
  if (!root) throw Error("No configured room Directory for scope inventory");
  let transport: Promise<Transport> | undefined;
  const connection = () => transport ??= (async () => {
    const reader = await readerOf(ctx, config);
    const base = await readTransportOf(ctx, config, reader);
    // Preserve the existing session-first authorization. A session refusal
    // may be read again by this caller's key, never with elevated authority.
    const signed = await readTransportOf(ctx, config, null);
    return { ...base,
      entry: async (scope: ScopeId, _reader: unknown, seq: number) => {
        const got = await base.entry(scope, reader, seq);
        return !got.ok && got.reason === "forbidden" && reader !== null ? signed.entry(scope, null, seq) : got;
      },
      history: async (scope: ScopeId, _reader: unknown, cursor?: string) => {
        const got = await base.history(scope, reader, cursor);
        return !got.ok && got.reason === "forbidden" && reader !== null ? signed.history(scope, null, cursor) : got;
      },
    };
  })();
  return { service: config.service, root: { ...root }, reads: {
    entry: async (scope, seq) => (await connection()).entry(scope, null, seq),
    history: async (scope, cursor) => (await connection()).history(scope, null, cursor),
  } };
}

const directoryReader = (ctx: Context, config: Config, reader: string | null) => ({
  summary: async (scope: ScopeId) => (await handleOf(ctx, config, scope, reader)).summary(),
  query: async (scope: ScopeId, query: import("@generalbusiness/dap-contract").ItemQuery) => (await handleOf(ctx, config, scope, reader)).queryItems(query),
});
/** Read the opening target by its exact cohort pin. Recovery stays explicit:
 * this read signs no open-partition, seal or replacement lane request. */
async function openingDirectory(ctx: Context, config: Config, reader: string | null): Promise<{ D: ScopeHandle; summary: Summary; target: ScopeRef }> {
  const repository = config.repository!;
  let target = repository.directory;
  let D = await handleOf(ctx, config, repository.directory.scope, reader);
  let summary = await summaryOf(D);
  if (summary.definition === "platform:directory@10") {
    const selected = await activeDirectory(directoryReader(ctx, config, reader), repository.directory, repository.membership);
    if (!selected.ref) return stopCommand(failed(`Cannot open work: ${selected.reason}. Inspect the directory and its pending partition; no mutation was submitted.`));
    target = selected.ref;
    D = await handleOf(ctx, config, selected.ref.scope, reader);
    summary = await summaryOf(D);
    if (canonicalize(summary.scope) !== canonicalize(selected.ref) || summary.definition !== "platform:directory-partition@1") return stopCommand(failed("The opening partition changed. No mutation was submitted."));
  }
  return { D, summary, target };
}

/** A scope by the name `claim` or `join` gave it, or by its ID. */
function scopeNamed(config: Config, named: string | undefined): ScopeId {
  const r = config.repository;
  const names: Record<string, ScopeId | undefined> = {
    register: config.register?.scope, directory: r?.directory.scope, membership: r?.membership.scope, rules: r?.rules, destination: r?.destination, inbox: r?.inbox,
  };
  const name = named ?? "directory";
  if (/^sc_[a-z2-7]+$/.test(name)) return name as ScopeId;
  return names[name] ?? stopCommand(usage(`No scope named ${name} is known here. Name one of: ${Object.keys(names).filter((n) => names[n]).join(", ") || "none yet"}; or give a scope ID.`));
}

/** The definition a scope pins: a platform one from the platform package, a declared one as the scope retains it. */
async function definitionOf(handle: ScopeHandle, summary: Summary): Promise<{ shape: DefinitionShape; declared: DeclaredDefinition | null; named: Digest | PlatformDefinition }> {
  const named = summary.definition;
  const supplied = platform(named);
  if (supplied) return { shape: supplied.data as unknown as DefinitionShape, declared: null, named };
  const read = await handle.definition();
  if (!read.ok) return stopCommand(failed(`Cannot read the definition of ${handle.scope}: ${read.reason}.`));
  return { shape: read.value as unknown as DefinitionShape, declared: read.value, named };
}

/** A lane's summary once it is `active`; a stop once its genesis is refused, which no wait changes. */
const laneActive = async (handle: ScopeHandle, opened: string): Promise<Summary | null> => {
  const read = await handle.summary();
  if (read.ok && read.value.status === "refused") return stopCommand(failed(`The lane ${handle.scope} refused its creation by ${opened}; nothing else was written there.`));
  return read.ok && read.value.status === "active" ? read.value : null;
};

// ---------------------------------------------------------------- the commands

/** Named creation families; host none defaults to the unpublished family. */
export type InstallCohort = "commons" | "unpublished" | "file-publication" | "application" | "application-publication" | "trusted-application" | "declared-application" | "device-application" | "archive-application" | "archive-device-application" | "archive-device-publication" | "archive-certified-rules" | "hardened-certified-rules" | "archive-declared-application" | "invitation-key";
export type RegisterPolicy = "keys" | "open";
export interface InstallOptions { host?: string; namespace?: string; cohort?: InstallCohort; registerPolicy?: RegisterPolicy }
const INSTALL_COHORTS: Readonly<Record<InstallCohort, PlatformDefinition>> = {
  commons: COMMONS_COHORT.register,
  unpublished: UNPUBLISHED_COHORT.register,
  "invitation-key": INVITATION_KEY_COHORT.register,
  "file-publication": "platform:register@3",
  application: APPLICATION_COHORT.register,
  "application-publication": FILE_PUBLICATION_COHORT.register,
  "trusted-application": TRUSTED_APPLICATION_COHORT.register,
  "declared-application": DECLARED_APPLICATION_COHORT.register,
  "archive-application": ARCHIVE_APPLICATION_COHORT.register,
  "archive-declared-application": ARCHIVE_DECLARED_APPLICATION_COHORT.register,
  "archive-device-application": ARCHIVE_DEVICE_APPLICATION_COHORT.register,
  "archive-device-publication": ARCHIVE_DEVICE_PUBLICATION_COHORT.register,
  "archive-certified-rules": ARCHIVE_CERTIFIED_RULES_COHORT.register,
  "hardened-certified-rules": HARDENED_CERTIFIED_RULES_COHORT.register,
  "device-application": DEVICE_APPLICATION_COHORT.register,
};
/** New plans only. Historical selectors remain in INSTALL_COHORTS for retained custody.
 * The owning test pins these register versions to Scope's CREATION_COHORTS. */
export const CREATION_INSTALL_COHORTS = ["commons", "unpublished", "application", "archive-device-application", "archive-device-publication", "archive-certified-rules", "hardened-certified-rules"] as const satisfies readonly InstallCohort[];
function selectedRegister(cohort: unknown): PlatformDefinition | undefined {
  if (cohort === undefined) return undefined;
  if (cohort === "commons") return INSTALL_COHORTS.commons;
  if (cohort === "unpublished") return INSTALL_COHORTS.unpublished;
  if (cohort === "file-publication") return INSTALL_COHORTS["file-publication"];
  if (cohort === "invitation-key") return INSTALL_COHORTS["invitation-key"];
  if (cohort === "application-publication") return INSTALL_COHORTS["application-publication"];
  if (cohort === "application") return INSTALL_COHORTS.application;
  if (cohort === "trusted-application") return INSTALL_COHORTS["trusted-application"];
  if (cohort === "device-application") return INSTALL_COHORTS["device-application"];
  if (cohort === "declared-application") return INSTALL_COHORTS["declared-application"];
  if (cohort === "archive-application") return INSTALL_COHORTS["archive-application"];
  if (cohort === "archive-declared-application") return INSTALL_COHORTS["archive-declared-application"];
  if (cohort === "archive-device-application") return INSTALL_COHORTS["archive-device-application"];
  if (cohort === "archive-device-publication") return INSTALL_COHORTS["archive-device-publication"];
  if (cohort === "archive-certified-rules") return INSTALL_COHORTS["archive-certified-rules"];
  if (cohort === "hardened-certified-rules") return INSTALL_COHORTS["hardened-certified-rules"];
  return stopCommand(usage("--cohort needs one current creation family or the historical family of a retained plan; nothing was signed or sent."));
}
/** Public creation is an explicit fixed cohort, independent of future defaults. */
function installSelection(options: InstallOptions, retained = false): PlatformDefinition | undefined {
  if (!retained && options.host === undefined) return stopCommand(usage("--host is required: none, artifacts or github.com; nothing was signed or sent."));
  if (options.host !== undefined && !["none", "artifacts", "github.com"].includes(options.host)) return stopCommand(usage("Refused: host-unknown. Choose --host none, artifacts or github.com; nothing was signed or sent."));
  if (options.registerPolicy !== undefined && options.registerPolicy !== "keys" && options.registerPolicy !== "open") {
    return stopCommand(usage("--register-policy takes exactly keys or open; nothing was signed or sent."));
  }
  const selected = selectedRegister(options.cohort);
  if (options.host === "none") {
    if (selected !== undefined && selected !== UNPUBLISHED_COHORT.register && selected !== COMMONS_COHORT.register) return stopCommand(usage("--host none requires the unpublished or commons cohort; nothing was signed or sent."));
    return selected ?? UNPUBLISHED_COHORT.register;
  }
  if (options.registerPolicy !== "open" || selected === UNPUBLISHED_COHORT.register || selected === COMMONS_COHORT.register) return selected;
  if (selected !== undefined && selected !== ARCHIVE_DEVICE_APPLICATION_COHORT.register) {
    return stopCommand(usage("--register-policy open requires the archive-device-application cohort; nothing was signed or sent."));
  }
  return ARCHIVE_DEVICE_APPLICATION_COHORT.register;
}
const selectedPlan = (plan: PlannedInstall): boolean => {
  if (Object.hasOwn(plan, "selected") && plan.selected !== true) {
    return stopCommand(failed("Refused: plan-mismatch. The retained install selection marker is invalid. The original plan is kept; nothing was signed or sent."));
  }
  // Register3 also names old unselected plans; the local marker distinguishes
  // new explicit selection without changing the signed or attempted identity.
  return plan.selected === true || Object.entries(INSTALL_COHORTS).some(([name, pin]) => name !== "file-publication" && pin === plan.definition);
};

/** Ordinary installs keep their legacy path; selected installs use exact planned custody. */
export function install(ctx: Context, service: string, options: InstallOptions = {}): Promise<Outcome> {
  return run(async () => {
    const selected = installSelection(options);
    if (options.host === "none") options = { ...options, namespace: "" };
    const before = await ctx.store.config();
    if (before?.register) return usage(`This config directory has a register already: ${before.register.scope}.`);
    if (selected) {
      const plan = await cohortPlan(ctx, service, options, before, selected);
      return executePlannedInstall(ctx, options.cohort, plan, options.registerPolicy);
    }
    if (before?.plan && selectedPlan(before.plan)) return failed("Refused: install-pending. The retained selected plan must use its original cohort and request; run install --planned.");
    if (before?.plan?.attempted !== undefined) return failed("Refused: install-pending. Retry dap install --planned with the original plan; an attempted install cannot be replaced silently.");
    const { signed, key } = await installing(ctx, options, signing(ctx));
    const { answer } = await create(transportOf(ctx, service), signed, NEW_REGISTER);
    const receipt = accepted(answer, null, "Installed").receipt;
    await ctx.store.save({ v: 1, service, key: "operator", register: receipt.fact.at });
    return done(`Installed: register ${receipt.fact.at.scope}, under ${NEW_REGISTER}.`, `The operator key ${key} is kept in the config directory, readable only by you. It is the one creator key.`);
  });
}

/** The signed `install` intent, by the operator key, which is made and kept when it does not exist yet. */
async function installing(ctx: Context, options: Pick<InstallOptions, "host" | "namespace" | "registerPolicy">, at: Signing): Promise<{ signed: SignedIntent; key: KeyId }> {
  const signer = ctx.store.signer && !ctx.store.newSigner
    ? (await storedSigner(ctx.store, "operator")) ?? stopCommand(failed("The operator signing key is unavailable; nothing was signed or sent."))
    : await newStoredSigner(ctx.store, "operator");
  const fields = { host: options.host!, namespace: options.host === "none" ? "" : options.namespace ?? "artroom", policy: options.registerPolicy ?? "keys", "founders": [signer.key] };
  return { signed: await signedIntent(signer, { to: null, kind: "install", fields }, at), key: signer.key };
}

/**
 * The ID of the register that a creation by this intent, under this version, makes: a scope's ID is a function of its seed, and
 * a register's seed of the creation intent and the version alone (the scope's `create` method).
 */
const registerIdOf = (creation: SignedIntent, definition: PlatformDefinition): ScopeId =>
  scopeIdOf({ v: 1, kind: "register", definition, creator: null, cause: intentDigest(creation.intent), ordinal: 0 });

/** Exact closed catalog selection; no name-only or newest provenance fallback. */
function knownPlatform(named: unknown, name: string): ReturnType<typeof platform> {
  const supplied = typeof named === "string" ? platform(named) : null;
  return supplied?.data.name === name ? supplied : null;
}
/** Local recovery identity only. The signature and server decide authority. */
const installAttemptOf = (plan: PlannedInstall): Digest => textDigest(canonicalize({
  service: plan.service, operator: plan["founding"].intent.actor, "founding": plan["founding"], definition: plan.definition, register: plan.register,
}));

/** Verify exact selected custody without creating a second store or lock. */
async function readBackCohortConfig(ctx: Context, expected: Config | string): Promise<void> {
  let matches = false;
  try {
    const identity = typeof expected === "string" ? expected : canonicalize(expected);
    const saved = await ctx.store.config();
    matches = saved !== null && canonicalize(saved) === identity;
  } catch { /* no verified selected custody */ }
  if (!matches) stopCommand(failed("Held: storage of the exact selected install plan could not be verified. No request was sent by this run; keep the original request."));
}
async function saveCohortConfig(ctx: Context, config: Config): Promise<void> {
  const identity = canonicalize(config);
  const copy = parseStrict(identity) as Config;
  try { await ctx.store.save(copy); }
  catch { stopCommand(failed("Held: storage of the exact selected install plan failed. No request was sent by this run; keep the original request.")); }
  await readBackCohortConfig(ctx, identity);
}
function retainedCohortPlan(before: Config, service: string, options: InstallOptions, definition: PlatformDefinition): PlannedInstall {
  const plan = before.plan!;
  selectedPlan(plan); // Reject a malformed local marker before promotion.
  let compatible = false;
  try {
    compatible = plan.definition === definition && before.key === "operator"
      && plan.service === service && before.service === service
      && isSignedIntentShape(plan["founding"]) && verifySignedIntent(plan["founding"])
      && plan["founding"].intent.kind === "install" && plan["founding"].intent.to === null && plan["founding"].intent.on === null
      && Object.keys(plan["founding"].intent.expected).length === 0
      && typeof plan["founding"].intent.fields["host"] === "string" && typeof plan["founding"].intent.fields["namespace"] === "string"
      && (options.host === undefined || options.host === plan["founding"].intent.fields["host"])
      && (options.namespace === undefined || options.namespace === plan["founding"].intent.fields["namespace"])
      && (options.registerPolicy === undefined || options.registerPolicy === plan["founding"].intent.fields["policy"])
      && isScopeId(plan.register) && registerIdOf(plan["founding"], plan.definition) === plan.register;
  } catch { /* malformed retained plan cannot select a new request */ }
  if (!compatible) stopCommand(failed("Refused: plan-mismatch. The retained install's cohort, service, host, namespace or policy conflicts with this request. The original plan is kept; nothing was signed or sent."));
  return parseStrict(canonicalize(plan)) as PlannedInstall;
}
async function cohortPlan(ctx: Context, service: string, options: InstallOptions, before: Config | null, definition: PlatformDefinition): Promise<PlannedInstall> {
  if (!knownPlatform(definition, "platform:register")) stopCommand(failed("Unsupported selected cohort: the exact register pin is not installed. Nothing was signed or sent."));
  if (before?.plan) {
    const plan = retainedCohortPlan(before, service, options, definition);
    await readBackCohortConfig(ctx, before);
    if (plan.selected !== true) {
      const promoted: PlannedInstall = { ...plan, selected: true };
      await saveCohortConfig(ctx, { ...before, plan: promoted });
      return promoted;
    }
    return plan;
  }
  if (before && (before.key !== "operator" || before.repository || before.claim || before.join)) {
    stopCommand(usage("This config directory already holds another setup or pending request. Use a separate config directory for the selected install."));
  }
  if (!CREATION_INSTALL_COHORTS.some(name => INSTALL_COHORTS[name] === definition)) {
    stopCommand(usage(`This cohort is retained for historical install plans only. For a new plan, --cohort takes ${CREATION_INSTALL_COHORTS.join(", ")}. Nothing was signed or sent.`));
  }
  const { signed } = await installing(ctx, options, { ...signing(ctx), lifetimeSeconds: PROPOSED_BOUNDS.intentLifetimeSeconds - 60 });
  const plan: PlannedInstall = { service, definition, "founding": signed, register: registerIdOf(signed, definition), selected: true };
  await saveCohortConfig(ctx, { ...before, v: 1, service, key: "operator", plan });
  return plan;
}
function plannedLines(plan: PlannedInstall): Outcome {
  const { host, namespace } = plan["founding"].intent.fields;
  return done(
    `Planned: register ${plan.register}, under ${plan.definition}, on host ${String(host)}, namespace ${String(namespace)}. The seed's time is ${plan["founding"].intent.notAfter}.`,
    `Set REGISTER_SCOPE to ${plan.register} in the Worker's settings, then run dap install --planned before ${plan["founding"].intent.notAfter}.`,
    ...(host === "none" ? ["No publication or journal archive: entries stay in the service within its bounds. The operator must back up the service."] : []),
  );
}

/**
 * `dap install --plan <base-url>`: sign the `install` intent and print the ID of the register that it will create, and create
 * nothing. The intent lives as long as an intent may, so it can be created until its `notAfter`, the time printed. The plan is
 * kept in the config, so that the operator can pin that ID in the Worker's host setting before the register exists, and then
 * run `install --planned`. Only a definitely-unsent legacy plan may be replaced; a selected cohort plan stays exact.
 */
export function planInstall(ctx: Context, service: string, options: InstallOptions = {}): Promise<Outcome> {
  return run(async () => {
    const selected = installSelection(options);
    if (options.host === "none") options = { ...options, namespace: "" };
    const before = await ctx.store.config();
    if (before?.register) return usage(`This config directory has a register already: ${before.register.scope}.`);
    if (selected) return plannedLines(await cohortPlan(ctx, service, options, before, selected));
    if (before?.plan && selectedPlan(before.plan)) return failed("Refused: install-pending. The retained selected plan must use its original cohort and request; run install --planned.");
    if (before?.plan?.attempted !== undefined) return failed("Refused: install-pending. Retry dap install --planned with the original plan; an attempted install cannot be replaced silently.");
    const { signed } = await installing(ctx, options, { ...signing(ctx), lifetimeSeconds: PROPOSED_BOUNDS.intentLifetimeSeconds - 60 });
    const register = registerIdOf(signed, NEW_REGISTER);
    await ctx.store.save({ v: 1, service, key: "operator", plan: { service, definition: NEW_REGISTER, "founding": signed, register } });
    const { host, namespace } = signed.intent.fields as { host: string; namespace: string };
    return done(
      `Planned: register ${register}, under ${NEW_REGISTER}, on host ${host}, namespace ${namespace}. The seed's time is ${signed.intent.notAfter}.`,
      `Set REGISTER_SCOPE to ${register} in the Worker's settings, then run dap install --planned before ${signed.intent.notAfter}.`,
    );
  });
}

/**
 * `dap install --planned`: found the register that `install --plan` planned, with the intent it kept. Before anything is
 * sent, the plan is checked: the register ID that its intent and version make must be the one it printed, and the version must be
 * a supported exact pinned version. A durable attempted marker precedes any
 * submission. Exact attempted late recovery retains the original plan and
 * configured-service acknowledgement; it claims no independent history proof.
 */
export function installPlanned(ctx: Context, options: Pick<InstallOptions, "cohort" | "registerPolicy"> = {}): Promise<Outcome> {
  return run(() => executePlannedInstall(ctx, options.cohort, undefined, options.registerPolicy));
}
async function executePlannedInstall(ctx: Context, cohort?: InstallCohort, expected?: PlannedInstall, registerPolicy?: RegisterPolicy): Promise<Outcome> {
  let selected = installSelection({ ...(cohort === undefined ? {} : { cohort }), ...(registerPolicy === undefined ? {} : { registerPolicy }) }, true);
  const before = await ctx.store.config();
  if (before?.register) return usage(`This config directory has a register already: ${before.register.scope}.`);
  const kept = before?.plan ?? stopCommand(usage("No install is planned here. Run: dap install --plan <base-url>."));
  if (cohort === undefined && kept.definition === UNPUBLISHED_COHORT.register) selected = UNPUBLISHED_COHORT.register;
  if (kept.definition === COUNTING_COHORT.register) return failed("Refused: retired-cohort. Choose a currently admitted cohort for a new room. The old plan is kept; nothing was sent.");
  if (selected && kept.definition !== selected) return failed("Refused: plan-mismatch. The selected cohort conflicts with the original install plan. Nothing was sent; the plan is kept.");
  if (registerPolicy !== undefined && (!isSignedIntentShape(kept["founding"]) || kept["founding"].intent.fields["policy"] !== registerPolicy)) return failed("Refused: plan-mismatch. The register policy conflicts with the original install plan. Nothing was sent; the plan is kept.");
  if (expected && canonicalize(kept) !== canonicalize(expected)) return failed("Held: the selected install plan changed before delivery. Nothing was sent; restore the original request.");
  const strictCustody = selectedPlan(kept) || selected !== undefined;
  let plan = strictCustody ? parseStrict(canonicalize(kept)) as PlannedInstall : kept;
  const operator = await storedSigner(ctx.store, "operator");
  const now = ctx.now?.() ?? Date.now();
  if (!knownPlatform(plan.definition, "platform:register")) return failed("Unsupported install provenance: this command cannot serve the plan's exact pinned register version. The pending plan is kept; nothing was sent.");
  const valid = isSignedIntentShape(plan["founding"]) && verifySignedIntent(plan["founding"])
    && plan["founding"].intent.kind === "install" && plan["founding"].intent.to === null && plan["founding"].intent.on === null
    && Object.keys(plan["founding"].intent.expected).length === 0
    && before!.key === "operator" && operator !== null && plan["founding"].intent.actor === operator.key
    && typeof plan.service === "string" && plan.service === before!.service
    && isScopeId(plan.register) && registerIdOf(plan["founding"], plan.definition) === plan.register
    && timeMs(plan["founding"].intent.notAfter)! - now <= PROPOSED_BOUNDS.intentLifetimeSeconds * 1000;
  if (!valid) {
    return failed("Refused: plan-mismatch. The saved plan does not match this service, operator key and supported register version. Nothing was sent. Keep the original plan for recovery; do not silently replace it.");
  }
  const attempt = installAttemptOf(plan);
  if (plan.attempted !== undefined && plan.attempted !== attempt) return failed("Refused: plan-mismatch. The attempted marker belongs to another service, operator, envelope, version or register. The pending plan is kept; nothing was sent.");
  if (plan.attempted === undefined && now >= timeMs(plan["founding"].intent.notAfter)!) {
    const label = Object.entries(INSTALL_COHORTS).find(([, pin]) => pin === plan.definition)?.[0] ?? "trusted-application";
    return failed(`Refused: plan-expired. The planned install could be created until ${plan["founding"].intent.notAfter}. ${strictCustody
      ? `No request was sent by this run. Keep this original config directory unchanged. For a new plan${CREATION_INSTALL_COHORTS.some(name => name === label) ? ` on ${label}` : " on an admitted cohort"}, set DAP_HOME to a separate empty directory. If ARTROOM_HOME is set, unset it or set it to that same new directory; different directories refuse before configuration is read. Configure the host with that new plan's register ID before installing.`
      : "Nothing was sent. Plan again, and set the new register ID."}`);
  }
  const matches = (receipt: unknown): receipt is NonNullable<PlannedInstall["acknowledged"]>["receipt"] => isReceipt(receipt)
    && receipt.definition === plan.definition && receipt.intent === intentDigest(plan["founding"].intent)
    && receipt.fact.at.scope === plan.register && receipt.fact.at.kind === "register" && receipt.fact.seq === 0;
  const prior = plan.acknowledged;
  if (prior !== undefined && (!prior || prior.status !== "service-acknowledged" || prior.service !== plan.service || !matches(prior.receipt))) {
    return failed("Held: the retained install acknowledgement does not match the original plan. The plan is kept.");
  }
  if (ctx.fetch !== undefined && (ctx.trustedCreationService?.service !== plan.service || ctx.trustedCreationService.fetch !== ctx.fetch)) {
    return failed("Held: this injected transport has no configured-service acknowledgement trust. The plan is kept; no request was sent.");
  }
  if (selected && plan.selected !== true) {
    plan = { ...plan, selected: true };
    await saveCohortConfig(ctx, { ...before!, plan });
  }
  // The durable marker must precede the first possible request. An exact
  // attempted replay may recover an accepted genesis after expiry; the
  // server still refuses an expired creation that was never accepted.
  if (plan.attempted === undefined) {
    const pending: Config = { ...before!, plan: { ...plan, attempted: attempt } };
    if (strictCustody) await saveCohortConfig(ctx, pending);
    else await ctx.store.save(pending);
  } else if (strictCustody) await readBackCohortConfig(ctx, { ...before!, plan });
  const { answer } = await create(transportOf(ctx, plan.service), plan["founding"], plan.definition);
  const receipt = accepted(answer, null, "Installed").receipt;
  if (!matches(receipt)) {
    return failed("Held: the install acknowledgement does not match the planned register's exact identity. The plan is kept.");
  }
  if (prior !== undefined && canonicalize(prior.receipt.fact) !== canonicalize(receipt.fact)) {
    return failed("Held: the install acknowledgement conflicts with the retained accepted fact. The plan is kept.");
  }
  // Save acceptance evidence before the final installed config. A lost final
  // save can recover only the same fact; neither save erases the envelope.
  const acknowledged: PlannedInstall = { ...plan, attempted: attempt, acknowledged: { status: "service-acknowledged", service: plan.service, receipt } };
  await ctx.store.save({ ...before!, plan: acknowledged });
  await ctx.store.save({ ...before!, plan: acknowledged, register: receipt.fact.at });
  return done(`Installed: register ${receipt.fact.at.scope}, under ${plan.definition}, as planned.`, "Service-acknowledged identity recovery. The original plan and receipt are retained for later history verification.");
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

/** `dap join <link>` resumes the exact enrollment kept before delivery. */
export function join(ctx: Context, text: string): Promise<Outcome> {
  if (text.startsWith(AGENT_KEY_LINK)) return enrolAgentKey(ctx, text);
  return run(async () => {
    const link = linkOf(text) ?? stopCommand(usage("That is not an invitation link from dap invite."));
    if (!wellFormedInvitation(link)) return usage("That invitation link has invalid repository references.");
    const before = await ctx.store.config();
    if (before?.join?.kind === "enrol") return failed("An original agent enrollment is retained; a person invitation cannot replace it.");
    if (before?.repository) return usage(`This config directory has a repository already: directory ${before.repository.directory.scope}.`);
    if (before && !before.join) return usage("This config directory is set up already; use another config directory to join.");
    const linkDigest = textDigest(canonicalize(link));
    let pending: PendingJoin | undefined = before?.join;
    const shared = pending && (({ inbox: _inbox, ...repository }) => repository)(pending.repository);
    if (pending && (pending.link !== linkDigest || before!.service !== link.service || canonicalize(shared) !== canonicalize(link.repository) || pending.handle !== link.handle)) return failed("The invitation link does not match the pending join; nothing was submitted. Retry the original invitation link.");
    const base: Config = before ? { v: 1, service: before.service, key: before.key } : { v: 1, service: link.service, key: "device" };
    const signer = pending ? await signerOf(ctx, base) : await newStoredSigner(ctx.store, base.key);
    let signed: SignedIntent;
    const keep = async (next: PendingJoin) => { await ctx.store.save({ ...base, join: next }); pending = next; };
    if (!pending) {
      // No pre-join membership reads are authorized. Its pinned definition
      // names the invitation by a mark, with no revision in expected.
      // Main's untagged links named native membership@1. New links carry
      // their exact pin; missing tags never select the newest alias.
      const named = link.definition ?? "platform:membership@1";
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
      if (!bytes) return failed("The exact private join request is missing; nothing was submitted. Restore its private record before retrying.");
      try { signed = JSON.parse(new TextDecoder().decode(bytes)) as SignedIntent; }
      catch { return failed("The private join request cannot be read; nothing was submitted."); }
    }
    const at = link.repository.membership;
    if (!validStep({ signed, ...(pending!.accepted ? { accepted: pending!.accepted } : {}) }, at, signer.key, "join")
      || intentDigest(signed.intent) !== pending!.intent || canonicalize(signed.intent.fields) !== canonicalize(invitationRedemptionFields(link.definition ?? "platform:membership@1", at, link.invitation, signer.key, link.secret))) return failed("The saved join does not match this invitation, membership and signing key; nothing was submitted.");
    const config: Config = { ...base, repository: link.repository };
    const M = await handleOf(ctx, config, at.scope, null);
    const digest = intentDigest(signed.intent);
    let fact: FactRef;
    if (pending!.accepted) {
      const settled = await M.settle(signed);
      if (!settled.ok) return failed(`Cannot confirm the saved join: ${settled.reason}. The exact request remains pending; nothing was submitted.`);
      if (settled.value.intent !== digest || canonicalize(settled.value.fact) !== canonicalize(pending!.accepted)) return failed("The saved accepted fact does not match this exact join; nothing was submitted.");
      fact = pending!.accepted;
    } else {
      const receipt = accepted(await M.submit(signed), M.scope, "Joined").receipt;
      if (!isFactRef(receipt.fact) || canonicalize(receipt.fact.at) !== canonicalize(at) || receipt.intent !== digest) throw new TransportError("The accepted reply does not match this exact join; its saved request remains pending.");
      fact = receipt.fact;
      await keep({ ...pending!, accepted: fact });
    }
    const entry = await M.entry(fact.seq);
    if (!entry.ok) return failed(`Cannot read entry ${M.scope}:${fact.seq}: ${entry.reason}. The join remains pending; retry the original invitation link.`);
    if (canonicalize(factRefOf(entry.value.entry)) !== canonicalize(fact) || entry.value.hash !== fact.hash
      || entry.value.entry.input.type !== "act" || canonicalize(entry.value.entry.input.signed) !== canonicalize(signed)) return failed("The admitted entry does not match this exact join; nothing was submitted.");
    const inbox = entry.value.entry.sends.flatMap((send) => "creator" in send.to && send.to.kind === "inbox" ? [scopeIdOf(send.to as Seed)] : [])[0]
      ?? stopCommand(failed(`Joined, but entry ${M.scope}:${fact.seq} creates no inbox. The join remains pending.`));
    if (pending!.repository.inbox && pending!.repository.inbox !== inbox) return failed("The saved inbox does not match this join; nothing was submitted.");
    await keep({ ...pending!, repository: { ...link.repository, inbox } });
    const I = await handleOf(ctx, config, inbox, null);
    await waitFor(ctx, () => [M.scope, inbox], () => active(I), "your inbox", "retry the original dap join invitation link to continue this enrollment.");
    await ctx.store.save({ ...config, repository: { ...link.repository, inbox }, handle: link.handle });
    return done(`Joined as ${link.handle} on key ${signer.key}.`, `Your inbox: ${inbox}.`);
  });
}

/** The caller's role and the actions it holds, as membership's summary has them now; null when the key is no active member's. */
export function standing(items: readonly Item[], key: KeyId): Standing | null {
  const own = items.find((item) => item.type === "key" && item.state === "active" && item.values["id"] === key);
  const member = own && items.find((item) => item.type === "member" && item.id === own.refs["member"] && item.state === "active");
  const roster = items.find((item) => item.type === "roster");
  const role = member?.values["role"] as Role | undefined;
  if (!member || !roster || !role) return null;
  return { role, actions: (roster.values[ROLE_LISTS[role]] as readonly string[] | null) ?? [], handle: String(member.values["handle"]) };
}

/**
 * `dap acts [<scope>]`: the acts of the scope's definition that the
 * caller's role holds now, and those a rule decides, each with its fields.
 * What the scope will answer still depends on its guards and its state.
 */
export function acts(ctx: Context, named?: string): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    const scope = scopeNamed(config, named);
    const reader = await readerOf(ctx, config);
    const handle = await handleOf(ctx, config, scope, reader);
    const { shape, named: definition } = await definitionOf(handle, await summaryOf(handle));
    const key = (await signerOf(ctx, config)).key;
    const held = config.repository ? standing((await summaryOf(await handleOf(ctx, config, config.repository.membership.scope, reader))).items, key) : null;
    const { acts: listed, hidden } = heldActs(shape, held);
    const shown = listed.map(([kind, act]) => `  ${describe(kind, act)}`);
    const who = held ? `${held.handle} (${held.role})` : `key ${key}, which is no active member's`;
    return done(`Acts on ${scope} (${definition}) for ${who}:`, ...shown, ...(hidden > 0 ? [`Not shown: ${hidden} that need an action your role does not hold.`] : []));
  });
}

/**
 * `dap act <kind> --on <scope> [--target <item>] [--set name=value ...]`:
 * one act. A declared definition's act goes through the client's declared
 * handle, which checks each field's shape before it signs; a platform
 * definition's is signed as given. The scope judges both.
 */
export function act(ctx: Context, kind: string, options: { on?: string; target?: number; set?: readonly string[]; value?: readonly string[] } = {}): Promise<Outcome> {
  return run(async () => {
    if (options.target !== undefined && (!Number.isSafeInteger(options.target) || options.target < 0)) return usage("--target must be a nonnegative item number; a member handle is not accepted here. Nothing was signed or sent.");
    const config = await configOf(ctx);
    // A value beside the intent, for a field that names one by its digest, such as the bytes of a definition that `activate` or
    // `open-issue` names: each file's text, as it is. The scope reads it only at a place that its definition states.
    const values: string[] = [];
    for (const path of options.value ?? []) values.push(textOf(await fileOf(ctx, path), path));
    const scope = scopeNamed(config, options.on);
    const signer = await signerOf(ctx, config);
    const handle = await handleOf(ctx, config, scope);
    const summary = await summaryOf(handle);
    const { shape, declared } = await definitionOf(handle, summary);
    const declaration = shape.acts[kind];
    if (!declaration || kind === shape.genesis) return usage(`${kind} is not an act of ${shape.name}. Run: dap acts ${options.on ?? ""}`.trim());
    const fields: Record<string, FieldValue> = {};
    for (const pair of options.set ?? []) {
      const at = pair.indexOf("=");
      if (at < 1) return usage(`--set takes name=value, not ${pair}.`);
      const name = pair.slice(0, at);
      fields[name] = valueOf(config, declaration.fields[name], pair.slice(at + 1));
    }
    const target = options.target ?? null;
    const expected = expectedOf(declaration, summary.items, target, fields);
    if (declared) {
      const typed = await declaredHandle(handle, declared);
      if (!typed.ok) return failed(`Cannot act on ${scope}: ${typed.reason}.`);
      const { signed, beside } = await typed.handle.intent(signer, kind as never, { on: target, fields, expected } as never, signing(ctx));
      return answered(scope, await typed.handle.submit(signed, [], { ...beside, ...(values.length > 0 ? { values } : {}) }), "Took effect");
    }
    const signed = await signedIntent(signer, { to: summary.scope, kind, on: target, fields, expected }, signing(ctx));
    return answered(scope, await handle.submit(signed, [], values.length > 0 ? { values } : {}), "Took effect");
  });
}

/** One explicit bounded query page; no discovery scan or per-item detail reads. */
export function apps(ctx: Context, cursor: string | null = null): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    if (!config.repository) return usage("Select a room before listing its applications.");
    const reader = await readerOf(ctx, config);
    return applicationList(await readTransportOf(ctx, config, reader), reader, config.repository.directory, cursor);
  });
}

/** One explicit bounded query page; no discovery scan or per-item detail reads. */
export function items(ctx: Context, named: string, raw: string): Promise<Outcome> {
  return run(async () => {
    const query = readItemQuery(raw);
    if (!query) return usage("--query needs canonical item-query JSON (at most 8192 UTF-8 bytes).");
    const config = await configOf(ctx), scope = scopeNamed(config, named);
    if (query.scope.scope !== scope) return usage("The query must name the selected scope's full reference.");
    const reader = await readerOf(ctx, config), handle = await handleOf(ctx, config, scope, reader);
    const page = await handle.queryItems(query);
    if (!page.ok) return failed(`Item query refused: ${page.reason}. Coverage is incomplete.`);
    return done(`Items of ${scope} at ${page.at.seq} (${page.at.hash}); selected suffix ${page.complete ? "complete" : "incomplete"}.`,
      ...page.value.items.map(item => canonicalize(item)), ...(page.next === undefined ? [] : [`Next cursor: ${page.next}`]));
  });
}

/** One entry in one line: where, when, what and by which key. */
function entryLine(scope: ScopeId, entry: Entry): string {
  const input = entry.input;
  const what = input.type === "act" ? `act ${input.signed.intent.kind} by ${short(input.signed.intent.actor)}`
    : input.type === "genesis" ? `genesis ${input.kind}`
    : input.type === "delivery" ? `delivery ${"type" in input.message ? input.message.type : input.message.class} from ${input.from.at.kind}:${input.from.seq}`
    : input.type;
  return `${scope}:${entry.seq}  ${entry.time}  ${what}; ${entry.effects.length} effects, ${entry.sends.length} sends`;
}

/** `dap log <scope> [--limit n]`: the last entries of the scope's history, oldest first. */
export function log(ctx: Context, named: string | undefined, options: { limit?: number } = {}): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    const scope = scopeNamed(config, named);
    const handle = await handleOf(ctx, config, scope);
    const entries: Entry[] = [];
    for (let cursor: string | undefined, pages = 0; pages < 1000; pages++) {
      const page = await handle.history(cursor);
      if (!page.ok) return failed(`Cannot read the history of ${scope}: ${page.reason}.`);
      entries.push(...page.value.map((sealed) => sealed.entry));
      if (page.next === undefined) break;
      cursor = page.next;
    }
    const limit = options.limit ?? 20;
    return done(...entries.slice(-limit).map((entry) => entryLine(scope, entry)), `${entries.length} entries in all.`);
  });
}

/** `dap show <scope>:<seq>`: one entry, with its hash computed by the client from the entry's bytes. */
export function show(ctx: Context, named: string): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    const match = /^(.+):(\d+)$/.exec(named) ?? stopCommand(usage("Name an entry as <scope>:<seq>, as log prints it."));
    const scope = scopeNamed(config, match[1]);
    const handle = await handleOf(ctx, config, scope);
    const read = await handle.entry(Number(match[2]));
    if (!read.ok) return failed(`Cannot read entry ${named}: ${read.reason}.`);
    const { entry, hash } = read.value;
    const input = entry.input;
    const detail = input.type === "act" ? `Fields: ${JSON.stringify(input.signed.intent.fields)}. Grants recorded: ${input.authority.length}.` : `Effects: ${JSON.stringify(entry.effects)}.`;
    return done(`${entryLine(scope, entry)}; hash ${hash}.`, detail);
  });
}

/**
 * `dap verify <scope>`: the replay verifier over the read routes, with
 * the platform package's data and rules for a platform definition. It
 * prints the report: what it checked, and what it took on trust.
 */
/** The same capability instances and hold numbers as the serving runtime. */
export { REPLAY_CAPABILITY_CODE };

interface SessionDeniedDependency { neededFact: FactRef; at: FactRef; from: 0; through: 0; line: string }
/** A permission finding needs the verifier's exact missing fact, its actual
 * Register creation-result context and a final Session HTTP403 at that page.
 * Other absent/unavailable histories retain their original result labels.
 */
function sessionDeniedDependency(report: Pick<import("@generalbusiness/dap-contract").Report, "mode" | "result" | "at">, missing: readonly FactRef[], results: ReadonlyMap<string, FactRef>, denied: ReadonlySet<string>): SessionDeniedDependency | null {
  if (report.mode !== "replay" || report.result !== "missing-dependency" || !report.at || missing.length !== 1) return null;
  const neededFact = missing[0]!;
  if (neededFact.at.kind !== "directory" || neededFact.seq !== 0 || !denied.has(`${neededFact.at.scope}:0`)) return null;
  const named = results.get(canonicalize(report.at));
  if (!named || canonicalize(named) !== canonicalize(neededFact)) return null;
  return { neededFact, at: report.at, from: 0, through: 0, line: `not proven: needs ${neededFact.at.scope} entries 0 to 0, not readable by this session` };
}

/** One authenticated source owner: Session first, then the maintained Signed fallback. */
async function replaySource(ctx: Context, config: Config, budget: Verification, accounting: "count" | "unique") {
  const managed = await budget.wait(() => managedReadsOf(ctx, config));
  const signer = await budget.wait(() => signerOf(ctx, config));
  const options = ctx.fetch ? { fetch: ctx.fetch } : {};
  const signed = httpSource(config.service, { ...options, reader: signedLogReader(signer, readSigning(ctx)) });
  const sourceFor = (reader: string | null, observe?: (status: number) => void) => reader === null ? signed : httpSource(config.service, { ...options, reader, ...(observe ? { fetch: async (url: string, init?: Parameters<Fetch>[1]) => {
    const response = await (ctx.fetch ?? globalThis.fetch as unknown as Fetch)(url, init);
    observe(response.status); return response;
  } } : {}) });
  const denied = new Set<string>(), results = new Map<string, FactRef>();
  const source: HistorySource = {
    page: async (named, from, allow) => {
      budget.at("replay", named, from); budget.historyRead(accounting);
      let usedSession = false, sessionDenied = false;
      let got = await budget.wait(() => managed.read(async reader => {
        usedSession = reader !== null;
        let status = 0;
        const result = await sourceFor(reader, code => { status = code; }).page(named, from, allow);
        sessionDenied = reader?.startsWith("Session ") === true && status === 403 && !result.ok && result.reason === "forbidden";
        return result;
      }));
      if (sessionDenied && !got.ok && got.reason === "forbidden") denied.add(`${named}:${from}`);
      if (!got.ok && got.reason === "forbidden" && usedSession) got = await budget.wait(() => signed.page(named, from, allow));
      if (got.ok) {
        if (accounting === "unique") for (const stored of got.page.entries) budget.storedEntry(named, got.page.scope, stored);
        else budget.entries(got.page.entries.length);
        if (got.page.scope.kind === "register") for (const stored of got.page.entries) {
          budget.check();
          // Keep only result metadata from actual journal pages. Retained
          // copies never substitute for the missing admission-proof page.
          let entry: unknown;
          try { entry = parseStrict(stored.bytes); } catch { continue; }
          if (!isEntry(entry) || entry.at.scope !== named || entry.seq !== stored.seq) continue;
          const input = entry.input;
          if (input.type !== "delivery" || input.message.class !== "result" || input.message.outcome !== "applied"
            || input.from.at.kind !== "directory" || input.from.seq !== 0 || canonicalize(input.message.of.from.at) !== canonicalize(entry.at)) continue;
          const at = factRefOf(entry);
          if (at.hash === stored.hash) results.set(canonicalize(at), input.from);
        }
      }
      return got;
    },
    retained: async (named, kind, digest, allow, domain) => {
      budget.at("replay", named);
      let usedSession = false;
      let got = await budget.wait(() => managed.read(reader => { usedSession = reader !== null; return sourceFor(reader).retained(named, kind, digest, allow, domain); }));
      if (!got.ok && got.reason === "forbidden" && usedSession) got = await budget.wait(() => signed.retained(named, kind, digest, allow, domain));
      return got;
    },
  };
  return { source, results, denied };
}

/** Standalone verification keeps its isolated traversal and count budget. */
async function replayOf(ctx: Context, config: Config, scope: ScopeId, budget: Verification) {
  budget.at("replay", scope, 0); budget.historyRead();
  const { source, results, denied } = await replaySource(ctx, config, budget, "count");
  const verification = await budget.wait(() => replay(source, { mode: "replay", scope, limits: budget.remaining(), platform, sourceName: ARCHIVE_REPLAY_CODE.sourceName, receiverIdentity: ARCHIVE_REPLAY_CODE.receiverIdentity, grants: "proven", capabilities: REPLAY_CAPABILITY_CODE, owners: REPLAY_CAPABILITY_CODE }));
  return { ...verification, notProven: sessionDeniedDependency(verification.report, verification.report.dependencies.missing, results, denied) };
}

/** The derived context reaches session probes/retries as well as replay HTTP. */
function verificationContext(ctx: Context, budget: Verification): Context {
  const send = ctx.fetch ?? globalThis.fetch as unknown as Fetch;
  return { ...ctx, fetch: budget.fetch(send) };
}

export function verifyScopeCommand(ctx: Context, named: string | undefined, options: { all?: boolean } = {}): Promise<Outcome> {
  if (options.all) return named === undefined ? verifyAll(ctx) : Promise.resolve(usage("verify --all takes no scope: it verifies every scope of the room."));
  return run(async () => {
    const budget = new Verification(ctx.verify);
    try {
      const reading = verificationContext(ctx, budget);
      const config = await budget.wait(() => configOf(reading));
      const scope = scopeNamed(config, named);
      budget.at("replay", scope); budget.progress();
      const { report, why, notProven } = await replayOf(reading, config, scope, budget);
      budget.check();
      const lines = render(report, notProven ? `Register creation result ${notProven.at.at.scope}:${notProven.at.seq}.` : why).split("\n").filter((line) => line.length > 0);
      if (notProven) lines[0] = `Result: ${notProven.line}.`;
      return report.result === "consistent" ? done(...lines) : failed(...lines);
    } finally { budget.close(); }
  });
}

/**
 * The scopes of the room: the register, the directory, and every scope that the directory created and each of those created, in
 * the order of their histories. A scope is found by the creation that its creator's entry sends; the register's other creations
 * are other rooms', and are not followed.
 */
async function roomScopes(ctx: Context, config: Config, budget: Verification): Promise<{ kind: string; scope: ScopeId }[]> {
  const pageLimit = ctx.historyPages ?? 1000;
  if (!Number.isSafeInteger(pageLimit) || pageLimit < 1) return stopCommand(usage("The room history page limit must be a positive integer."));
  const directory = config.repository!.directory.scope;
  budget.at("discovery", directory); budget.progress();
  const D = await budget.wait(() => handleOf(ctx, config, directory));
  const register = ((await budget.wait(() => summaryOf(D))).items.find((item) => item.type === "repository")?.refs["register"] as ScopeRef | undefined)?.scope;
  const matched = [...(register ? [{ kind: "register", scope: register }] : []), { kind: "directory", scope: directory }];
  const seen = new Set(matched.map(row => row.scope));
  // From the directory on: each scope found is read in turn, and what its history creates is added at the end.
  for (let i = matched.length - 1; i < matched.length; i++) {
    budget.at("discovery", matched[i]!.scope); budget.progress();
    const handle = await budget.wait(() => handleOf(ctx, config, matched[i]!.scope));
    for (let cursor: string | undefined, pages = 0; pages < pageLimit; pages++) {
      budget.at("discovery", handle.scope, cursor ?? null); budget.historyRead("unique");
      const page = await budget.wait(() => handle.history(cursor));
      if (!page.ok) return stopCommand(failed(`Cannot read the history of ${handle.scope}: ${page.reason}.`));
      for (const sealed of page.value) budget.sealedEntry(handle.scope, sealed);
      for (const { entry } of page.value) {
        for (const send of entry.sends) {
          if (!("creator" in send.to)) continue;
          const seed = send.to as Seed;
          const scope = scopeIdOf(seed);
          if (!seen.has(scope)) { seen.add(scope); matched.push({ kind: seed.kind, scope }); }
        }
      }
      if (page.next === undefined) break;
      if (pages + 1 === pageLimit) return stopCommand(failed(`Incomplete: room discovery for ${handle.scope} reached ${pageLimit} history pages; next cursor ${JSON.stringify(page.next)}. The whole room was not verified.`));
      cursor = page.next;
    }
  }
  return matched;
}

/** Disclose the shared proof once, including the actual root of each prefix. */
function sharedProofLines(proof: FinishedRoom): string[] {
  const lines = [`Shared room proof: ${proof.roots.length} roots; ${proof.dependencies.verified} verified dependencies; ${proof.dependencies.anchored} anchored dependencies; ${proof.dependencies.missing.length} missing dependencies.`];
  for (const row of proof.coverage) lines.push(`Shared coverage: ${row.scope.scope}, incarnation ${row.scope.inc}, kind ${row.scope.kind}, entries ${row.from} to ${row.through}; proving root ${row.root}.`);
  for (const row of proof.texts) lines.push(`Shared checked text: ${row.digest}; source ${row.source.scope}, incarnation ${row.source.inc}, kind ${row.source.kind}; proving root ${row.root}; consumers ${row.consumers.join(", ") || "none"}.`);
  for (const trust of proof.trusts) lines.push(`Shared trust: ${trust}.`);
  for (const fact of proof.anchors) lines.push(`Shared anchor: ${canonicalize(fact)}.`);
  for (const fact of proof.dependencies.missing) lines.push(`Shared missing dependency: ${canonicalize(fact)}.`);
  for (const row of proof.redacted) lines.push(`Shared redacted text: tombstone ${canonicalize(row.tombstone)}, item ${row.item}, slot ${JSON.stringify(row.slot)}.`);
  for (const row of proof.omittedTexts ?? []) lines.push(`Shared omitted text: ${row.digest}, ${row.bytes} bytes, first use ${canonicalize(row.first)}.`);
  for (const row of proof.incompleteBytes ?? []) lines.push(`Shared incomplete byte checks: ${canonicalize(row.scope)}, entries ${row.from} to ${row.through}: ${row.reason}.`);
  return lines;
}

/** The shared room proof, then the usual per-scope summaries and first finding. */
function verifyAll(ctx: Context): Promise<Outcome> {
  return run(async () => {
    const budget = new Verification(ctx.verify);
    let room: ReturnType<typeof roomVerification> | undefined;
    try {
      const reading = verificationContext(ctx, budget);
      const config = await budget.wait(() => configOf(reading));
      if (!config.repository) return usage("No repository is known here. Run: dap create <name>, or dap join <link>.");
      budget.at("session", config.repository.membership.scope); budget.progress();
      await budget.wait(async () => { await (await managedReadsOf(reading, config)).session(); });
      const lines: string[] = [];
      let first: string | null = null;
      const scopes = await roomScopes(reading, config, budget);
      const { source, results, denied } = await replaySource(reading, config, budget, "unique");
      // These are cumulative engine ceilings, fixed once. The outer owner
      // also charges discovery, authentication and every actual wire read.
      const owner = room = roomVerification(source, { mode: "replay", limits: { bytes: budget.limits.bytes, entries: budget.limits.entries, scopes: budget.limits.requests },
        platform, sourceName: ARCHIVE_REPLAY_CODE.sourceName, receiverIdentity: ARCHIVE_REPLAY_CODE.receiverIdentity, grants: "proven", capabilities: REPLAY_CAPABILITY_CODE, owners: REPLAY_CAPABILITY_CODE });
      for (const { scope } of scopes) {
        budget.at("replay", scope); budget.progress();
        await budget.wait(() => owner.checkTarget({ scope }));
      }
      const finished = await budget.wait(() => owner.finish());
      if (finished.roots.length !== scopes.length) return failed("The room proof omitted a requested scope. The whole room was not verified.");
      for (const line of sharedProofLines(finished)) lines.push(line);
      for (const [index, { kind, scope }] of scopes.entries()) {
        const report = finished.roots[index]!;
        if (report.requested !== scope) return failed("The room proof returned another requested scope. The whole room was not verified.");
        budget.at("replay", scope); budget.progress(true);
        if (report.result === "not-read") {
          lines.push(`${kind} ${scope}: not read.`);
          first ??= `First finding: ${kind} ${scope}: ${report.why}.`;
          continue;
        }
        const { why } = report;
        const notProven = sessionDeniedDependency(report, report.missing, results, denied);
        lines.push(`${kind} ${scope}, entry ${report.target.seq}: ${notProven?.line ?? report.result}.`);
        if (notProven) lines.push(`Proof dependency: Register creation result ${notProven.at.at.scope}:${notProven.at.seq}.`);
        if (report.result !== "consistent") first ??= notProven ? `First finding: ${kind} ${scope}: ${notProven.line}.` : `First finding: ${kind} ${scope} is ${report.result}${why ? `: ${why}` : ""}.`;
        if (kind === "destination" && report.result === "consistent") {
          try {
            budget.at("cleanup", scope); budget.progress();
            const handle = await budget.wait(() => handleOf(reading, config, scope));
            const cleanup = await budget.wait(() => observeCleanup(handle, report.target, ctx.historyPages ?? 1000));
            lines.push(...cleanup.lines);
            first ??= cleanup.finding;
          } catch (error) {
            if (!(error instanceof SourceError) && !(error instanceof TransportError)) throw error;
            const finding = `Cleanup status not read: destination ${scope}: ${error.message}.`;
            lines.push(finding); first ??= finding;
          }
        } else if (kind === "destination") {
          lines.push(`Cleanup status not read: destination ${scope}: ${notProven?.line ?? `historical replay is ${report.result}`}; no verified cleanup snapshot.`);
        }
      }
      budget.check();
      lines.push(first ?? `All consistent: ${scopes.length} scopes.`);
      return { code: first === null ? 0 : 1, lines };
    } finally { room?.close(); budget.close(); }
  });
}

// ---------------------------------------------------------------- the repository's remote, and a clone

/** The repository record of the destination's branch item: `{ host, namespace, name, id }`. */
interface Recorded { host: string; namespace: string; name: string; id: string }

/** The host of Cloudflare Artifacts, as a register records it. */
const OWN_HOST = "artifacts";

/**
 * The remote URL of a recorded repository, in its host's form, or null where the room's record does not give it. GitHub's is
 * whole. Artifacts names its hostname in the Worker's setting, which no scope records: a clone learns it
 * from the credential's answer, and the config keeps it.
 */
function remoteOf(config: Config, repository: Recorded): string | null {
  if (repository.host === "github.com") return `https://github.com/${repository.namespace}/${repository.name}.git`;
  const path = `/git/${repository.namespace}/${repository.name}.git`;
  return repository.host === OWN_HOST && config.remote?.endsWith(path) ? config.remote : null;
}
/** The remote URL as the person is told it: whole, or in its host's form with the part the room does not record marked. */
const remoteLine = (config: Config, repository: Recorded): string =>
  remoteOf(config, repository) ?? (repository.host === OWN_HOST ? `https://<service host>/git/${repository.namespace}/${repository.name}.git (the service host is the deployment's setting; dap clone prints it whole)` : `not known for the host ${repository.host}`);

/**
 * The destination's summary. The caller's session is presented first; the destination accepts a session of the membership its
 * genesis names. A caller with no session, or one that is refused, reads again by a signed read of the caller's key, which the
 * destination answers where the key's claim caused it, within the intent window.
 */
async function destinationStateOf(ctx: Context, config: Config): Promise<{ summary: Summary; reader: string | null; repository: Recorded | null }> {
  const scope = config.repository?.destination ?? stopCommand(usage("No repository is known here. Run: dap create <name>, or dap join <link>."));
  const reader = await readerOf(ctx, config);
  let read = await (await handleOf(ctx, config, scope, reader)).summary();
  if (!read.ok && read.reason === "forbidden" && reader !== null) read = await (await handleOf(ctx, config, scope, null)).summary();
  if (!read.ok) return stopCommand(failed(`Cannot read ${scope}: ${read.reason}.`));
  if (read.value.scope.scope !== scope || read.value.scope.kind !== "destination" || !knownPlatform(read.value.definition, "platform:destination")) return stopCommand(failed(`${scope} is no supported destination.`));
  const branch = read.value.items.find((item) => item.type === "branch");
  const repository = branch?.values["repository"] as Recorded | undefined;
  if (read.complete && read.next === undefined && read.value.status === "active" && read.value.definition === UNPUBLISHED_COHORT.destination && branch?.state === "unpublished" && branch.values["repository"] == null && branch.values["head"] == null && branch.values["token"] == null) return { summary: read.value, reader, repository: null };
  if (!branch || !repository || typeof repository.host !== "string" || typeof repository.name !== "string" || typeof repository.namespace !== "string" || typeof repository.id !== "string") return stopCommand(failed(`The destination ${scope} records no repository.`));
  return { summary: read.value, reader, repository };
}

async function destinationOf(ctx: Context, config: Config): Promise<{ summary: Summary; reader: string | null; repository: Recorded }> {
  const state = await destinationStateOf(ctx, config);
  if (state.repository === null) return stopCommand(failed("Refused: no-repository. This room is unpublished."));
  return { ...state, repository: state.repository };
}

/** `dap remote`: the repository's host, namespace, name and remote URL, as the destination's branch item records them. */
export function remote(ctx: Context): Promise<Outcome> {
  return run(async () => {
    const config = await configOf(ctx);
    const { repository } = await destinationStateOf(ctx, config);
    if (repository === null) return done("Mode: unpublished", "no-repository: this room has no publication.");
    return done(`Host: ${repository.host}`, `Namespace: ${repository.namespace}`, `Name: ${repository.name}`, `Remote URL: ${remoteLine(config, repository)}`);
  });
}

/** The value of the `Authorization` header that git sends with a read token: a bearer token, and GitHub's documented form for an installation token. */
const authorization = (repository: Recorded, token: string): string =>
  repository.host === "github.com" ? `Basic ${b64(`x-access-token:${token}`)}` : `Bearer ${token}`;
const b64 = (text: string): string => btoa(String.fromCharCode(...utf8(text)));
/** The configuration that carries the header, as git reads it from its environment: the same as `-c http.extraHeader=...`, but in no argument. */
const headerEnv = (value: string): Record<string, string> => ({ GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "http.extraHeader", GIT_CONFIG_VALUE_0: `Authorization: ${value}` });

/**
 * `dap clone [directory] [--hours n]`: a clone of the room's repository, with a read token of its own.
 *
 * 1. Without `git` here, it signs nothing: it prints the clone command, with the token's place marked.
 * 2. It signs the destination's `read-token` for `hours` (default 1, from 1 to 24), and waits for the outcome of its `mint-read`.
 * 3. It reads the token once, with the caller's session, from the destination's credential route.
 * 4. It runs `git clone -- <remote> [directory]`, with the header in git's environment configuration. The token is in no
 *    argument, command-printed line or command-written file. Ambient Git
 *    configuration and Git's own output remain trusted.
 * 5. With --archive and an explicit directory, fetch exactly the journal
 *    namespace into that clone with the same token, still only in memory.
 */
export function clone(ctx: Context, directory: string | undefined, options: { hours?: number; archive?: boolean } = {}): Promise<Outcome> {
  return run(async () => {
    if (options.archive && !directory) return usage("clone --archive needs an explicit directory.");

    const hours = options.hours ?? 1;
    if (!Number.isSafeInteger(hours) || hours < READ_TOKEN_HOURS.min || hours > READ_TOKEN_HOURS.max) return usage(`--hours is a whole number from ${READ_TOKEN_HOURS.min} to ${READ_TOKEN_HOURS.max}.`);
    const config = await configOf(ctx);
    const { summary, repository } = await destinationOf(ctx, config);
    if (options.archive && !ctx.git?.archiveRun) return failed("Archive clone needs the hardened Git runner. No read token was requested.");
    const args = (url: string) => ["clone", "--", url, ...(directory === undefined ? [] : [directory])];
    if (!ctx.git || (await ctx.git.run(["--version"], {})) === null) {
      const url = remoteOf(config, repository) ?? `https://<service host>/git/${repository.namespace}/${repository.name}.git`;
      return failed("git is not installed here, so nothing was signed. With git installed, run dap clone again; it runs:", `git -c http.extraHeader="Authorization: ${repository.host === "github.com" ? "Basic <x-access-token:read token, base64>" : "Bearer <read token>"}" ${args(url).join(" ")}`);
    }
    if (!platform(summary.definition as PlatformDefinition)?.data.acts["read-token"]) return failed(`The destination definition ${summary.definition} does not support read-token. An explicitly versioned destination and membership integration is required.`);
    // The act: `read-token` on the branch, at the revision the summary has now. The scope judges the grant and the field.
    const scope = summary.scope.scope;
    const signer = await signerOf(ctx, config);
    const branch = summary.items.find((item) => item.type === "branch")!;
    const signed = await signedIntent(signer, { to: summary.scope, kind: "read-token", on: branch.id, fields: { hours }, expected: { on: branch.revision } }, signing(ctx));
    const receipt = accepted(await (await handleOf(ctx, config, scope, null)).submit(signed), scope, "Read token").receipt;
    const proof = readTokenReceipt(receipt, summary, signed);
    if (!proof) return failed(`The accepted reply does not match this destination, definition and exact read-token request. It may still have been recorded at ${scope}; inspect dap log destination. No credential was retrieved and nothing was cloned.`);
    const seq = proof.receipt.fact.seq;
    // The outcome of its `mint-read`, which the host's answer writes: read with the caller's session, which the destination now accepts.
    const operation = proof.operation;
    const observe = async <T>(work: () => Promise<T>): Promise<T> => {
      try { return await work(); } catch (error) {
        if (error instanceof Stop) return stopCommand(failed(`Accepted read-token: ${scope}:${seq} (${operation}).`, ...error.outcome.lines,
          `Inspect dap show ${scope}:${seq} and dap log destination before another read-token request. No credential was retrieved and nothing was cloned; no automatic mint retry was made.`));
        throw error;
      }
    };
    const send = ctx.fetch ?? (globalThis as { fetch?: Fetch }).fetch!;
    let D: ScopeHandle | null = null;
    let openingChecked = false;
    const waited = await observe(() => waitOutcome(operation, seq + 1, async (next, signal) => {
      if (!D) {
        const reading = { ...ctx, fetch: outcomeFetch(send, signal) };
        const reads = requiredReadsOf(reading, config.service, config.repository!.membership, await signerOf(reading, config), () => !signal.aborted);
        D = new ScopeHandle(reads.transport, scope);
      }
      if (!openingChecked) {
        const opening = await D.entry(seq);
        if (!opening.ok || !readTokenOpening(opening.value, proof)) return stopCommand(failed(`Cannot confirm the exact accepted read-token act and its mint-read opening at ${scope}:${seq}; inspect dap show ${scope}:${seq} and dap log destination. No credential was retrieved and nothing was cloned.`));
        openingChecked = true;
      }
      const got = await D.entry(next);
      if (got.ok && (!readTokenEntry(got.value, proof.to, next) || (got.value.entry.input.type === "outcome" && got.value.entry.input.operation === operation && !readTokenOutcome(got.value, next, proof)))) return stopCommand(failed(`The entry at ${scope}:${next} does not match this destination's recorded mint-read (${operation}); inspect dap log destination. No credential was retrieved and nothing was cloned.`));
      return got;
    }, (signal) => ctx.pause ? ctx.pause([scope]) : pauseOutcome(signal), ctx.tries ?? 120, ctx.cloneWait, (error) => error instanceof Stop));
    if (!waited.ok) return failed(...outcomeWaitLines(scope, seq, operation, waited));
    const outcome = waited.outcome;
    const next = waited.next;
    if (outcome.result === "unknown") return failed(`The read-token mint at ${scope}:${seq} is unknown (outcome ${scope}:${next - 1}). The host may have minted a token; no automatic mint retry was made. Inspect dap show ${scope}:${seq} and dap log destination. No credential was retrieved and nothing was cloned.`);
    if (outcome.result === "refused") return failed(`The host refused the read-token mint at ${scope}:${seq} (outcome ${scope}:${next - 1}). No credential was retrieved and nothing was cloned.`);
    const handle = (outcome.evidence.body as { token?: unknown }).token;
    if (typeof handle !== "string") return failed(`The outcome at ${scope}:${next - 1} names no token.`);
    // The observation owner ends with the wait. Check a fresh owner's session
    // through a repeatable membership read before the one-time credential GET.
    const reader = await observe(async () => {
      const credentialReads = requiredReadsOf(ctx, config.service, config.repository!.membership, await signerOf(ctx, config));
      const membership = await new ScopeHandle(credentialReads.transport, config.repository!.membership.scope).summary();
      if (!membership.ok) return stopCommand(failed(`Cannot check the read session before retrieving the token: ${membership.reason}.`));
      return (await credentialReads.session()).reader();
    });
    // Never retry this GET: even a lost reply may have consumed the token.
    const answer = await readCredential(config.service, scope, reader, handle, ctx.fetch ? { fetch: ctx.fetch } : {});
    if (!answer.ok) return failed(`Cannot read the read token ${handle}: ${answer.reason}.`);
    const value = answer.value;
    const header = authorization(repository, value.token);
    const payload = header.slice(header.indexOf(" ") + 1);
    if (options.archive && (!archiveRemote(value.remote) || !archiveValue(value.remote, [value.token, payload]))) return failed("The archive credential named an unsafe remote. The one-time credential may have been consumed; no remote was saved or printed and no Git command was started.");
    if (value.remote !== config.remote) await ctx.store.save({ ...config, remote: value.remote });
    const environment = headerEnv(header);
    const runGit = options.archive ? ctx.git.archiveRun!.bind(ctx.git) : ctx.git.run.bind(ctx.git);
    const code = await runGit(args(value.remote), environment);
    const lines = [`Read token: ${scope}:${seq}, until ${value.ends}.`, `Remote URL: ${value.remote}`];
    if (code === 0) {
      if (options.archive) {
        // Same one-shot credential, still only in child environment. No
        // ambient fetch refspec or credential file is needed for journals.
        const fetched = await runGit(["-C", directory!, "fetch", "--no-tags", "--", "origin", "+refs/artroom/journal/*:refs/artroom/journal/*"], environment);
        if (fetched !== 0) return failed(...lines, "The working clone exists, but fetching archive journal refs failed. No replay was attempted; the read token is not kept.");
      }
      return done(...lines, `Cloned into ${directory ?? value.remote.replace(/\.git$/, "").split("/").at(-1)}.`, ...(options.archive ? ["Fetched refs/artroom/journal/* with the same read token. Verify the expected journal set offline before accepting the archive."] : []));
    }
    return failed(...lines, code === null ? "git could not be run; the token was read and is not kept." : `git clone exited with ${code}; the token was read and is not kept.`);
  });
}

// ---------------------------------------------------------------- a one-file change: edit, and merge

/** The most bytes of a file that `edit` proposes: the bound of the field `content` of the change lane's `propose-file`, a text. */
export const EDIT_BYTES = 65536;

/** A local file's bytes, or a stop: the command cannot run without them. */
async function fileOf(ctx: Context, path: string): Promise<Uint8Array> {
  const bytes = ctx.read ? await ctx.read(path) : null;
  return bytes ?? stopCommand(usage(`Cannot read the file ${path}.`));
}

/** The text that is exactly these bytes, as UTF-8 with any byte order mark kept, or a stop: a change carries a file as a text. */
function textOf(bytes: Uint8Array, path: string): string {
  let text: string | null = null;
  try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); } catch { /* not UTF-8 */ }
  if (text === null || utf8(text).length !== bytes.length) return stopCommand(usage(`${path} is not UTF-8 text: a change carries a file as a text.`));
  return text;
}

/** One entry's effect on one item, of one kind, from a sealed entry. */
type Effects = Entry["effects"];
const stateOf = (effects: Effects, item: number): string | null => { const matched = effects.find((e) => e.effect === "state" && e.item === item); return matched?.effect === "state" ? matched.state : null; };
const valueOf_ = (effects: Effects, item: number, slot: string): unknown => { const matched = effects.find((e) => e.effect === "value" && e.item === item && e.slot === slot); return matched?.effect === "value" ? matched.value : undefined; };

/** The lane definition of that name that the rules scope holds active, and its canonical bytes, which the rules scope retains. The latest activation wins. */
async function activeDefinition(ctx: Context, config: Config, reader: string | null, name: "change" | "issue"): Promise<{ digest: Digest; bytes: string; declared: DeclaredDefinition }> {
  const repository = config.repository!;
  const R = await handleOf(ctx, config, repository.rules, reader);
  const active = (await summaryOf(R)).items.filter((item) => item.type === "definition" && item.state === "active" && item.values["name"] === name).sort((a, b) => b.id - a.id)[0];
  const digest = active?.values["digest"] as Digest | undefined;
  if (!digest) return stopCommand(failed(`The rules scope ${repository.rules} holds no ${name} definition active. An admin activates one: dap act activate --on rules --set digest=<digest> --set name=${name} --value <definition file>.`));
  const transport = await readTransportOf(ctx, config, reader);
  // A value in the domain of a definition is kept as a definition (`core.ts`), and read by that kind.
  const kept = await transport.retained(repository.rules, reader, "definition", digest);
  if (!kept.ok) return stopCommand(failed(`Cannot read the ${name} definition ${digest} from the rules scope: ${kept.reason}.`));
  try {
    const declared = parseStrict(kept.value.bytes) as DeclaredDefinition;
    if (definitionDigest(declared) === digest) return { digest, bytes: kept.value.bytes, declared };
  } catch { /* not a definition */ }
  return stopCommand(failed(`The rules scope's bytes for ${digest} are not that definition.`));
}

/** A declared handle on a lane: the lane must run exactly the definition given. */
async function laneOf(ctx: Context, config: Config, lane: ScopeId, reader: string | null, declared: DeclaredDefinition) {
  const typed = await declaredHandle(await handleOf(ctx, config, lane, reader), declared);
  return typed.ok ? typed.handle : stopCommand(failed(`Cannot act on ${lane}: ${typed.reason}.`));
}

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

// ---------------------------------------------------------------- issues, and the link that closes one

/** An issue of the room, as its own lane has it now. The directory's row gives its lane and its number. */
interface Issue { lane: ScopeId; ref: ScopeRef; number: number | null; title: string; state: string; reason: string | null; opener: string | null; assignees: string[] }

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
async function issueNamed(ctx: Context, config: Config, reader: string | null, named: string): Promise<Issue> {
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
async function linking(ctx: Context, config: Config, lane: ScopeId, reader: string | null, declared: DeclaredDefinition, issue: Issue): Promise<Outcome> {
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

/** Current operational observations through the caller's session. */
export function status(ctx: Context, named?: string, request?: string): Promise<Outcome> {
  return run(async () => {
    if (request !== undefined && !/^[0-9a-f]{16}$/.test(request)) return usage("--request needs exactly 16 lowercase hexadecimal characters.");
    const config = await configOf(ctx);
    if (!config.repository) return usage("No room is known here. Run dap create or dap join first.");
    let session: Session | null;
    try { session = await sessionOf(ctx, config); }
    catch (error) { if (error instanceof Stop) throw error; return failed("Status unknown: no session answer."); }
    if (!session) return failed("Status unknown: a current room session is unavailable.");
    const repository = config.repository;
    const scopes = named === undefined ? [
      ...(config.register ? [{ kind: "register", scope: config.register.scope }] : []),
      { kind: "directory", scope: repository.directory.scope }, { kind: "membership", scope: repository.membership.scope },
      { kind: "rules", scope: repository.rules }, { kind: "destination", scope: repository.destination },
      ...(repository.inbox ? [{ kind: "inbox", scope: repository.inbox }] : []),
    ] : [{ kind: named, scope: scopeNamed(config, named) }];
    const admin = session.claims.reads.includes("incidents") && session.claims.reads.includes("waiting");
    return done(...await statusReport((await managedReadsOf(ctx, config)).transport, session.reader(), scopes, admin, request, named === undefined));
  });
}

export { verifyScopeCommand as verify };
