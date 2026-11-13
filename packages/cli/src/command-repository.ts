/** Recorded repository remotes and credential-bearing clones. */
import { archiveRemote, archiveValue } from "./archive-remote.ts";
import { outcomeFetch, outcomeWaitLines, pauseOutcome, waitOutcome } from "./clone-outcome.ts";
import { readTokenEntry, readTokenOpening, readTokenOutcome, readTokenReceipt } from "./clone-proof.ts";
import type { Context, Outcome } from "./command-context.ts";
import { knownPlatform } from "./command-install.ts";
import { accepted, configOf, done, failed, handleOf, readerOf, requiredReadsOf, run, signerOf, signing, Stop, stopCommand, usage } from "./command-support.ts";
import type { Config } from "./store.ts";
import { canonicalize, isReceipt, isSignedIntentShape, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { type Fetch, readCredential, ScopeHandle, signedIntent } from "@generalbusiness/dap-client";
import type { PlatformDefinition, Receipt, SignedIntent, Summary } from "@generalbusiness/dap-contract";
import { answersVersionQuestion, platform, READ_TOKEN_HOURS } from "@generalbusiness/dap-platform";

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
  if (read.value.scope.scope !== scope || !knownPlatform(read.value.definition, "platform:destination")) return stopCommand(failed(`${scope} is no supported destination.`));
  const branch = read.value.items.find((item) => item.type === "branch");
  const repository = branch?.values["repository"] as Recorded | undefined;
  if (read.complete && read.next === undefined && read.value.status === "active" && answersVersionQuestion(read.value.definition, "cliUnpublishedDestination") && branch?.state === "unpublished" && branch.values["repository"] == null && branch.values["head"] == null && branch.values["token"] == null) return { summary: read.value, reader, repository: null };
  if (!branch || !repository || typeof repository.host !== "string" || typeof repository.name !== "string" || typeof repository.namespace !== "string" || typeof repository.id !== "string") return stopCommand(failed(`The destination ${scope} records no repository.`));
  return { summary: read.value, reader, repository };
}

export async function destinationOf(ctx: Context, config: Config): Promise<{ summary: Summary; reader: string | null; repository: Recorded }> {
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
  return cloneUsing(ctx, directory, options);
}

/** Consume an already accepted read-token request without signing or submitting
 * another act. The caller owns an exclusive one-time consumption marker before
 * calling this function, including when a credential or Git reply is lost. */
export function cloneRetained(ctx: Context, directory: string | undefined, retained: { signed: SignedIntent; receipt: Receipt }, options: { hours?: number; archive?: boolean } = {}): Promise<Outcome> {
  if (!retained || !isSignedIntentShape(retained.signed) || !isReceipt(retained.receipt)) return Promise.resolve(failed("The retained read-token request or receipt is malformed. No credential was retrieved and nothing was cloned."));
  // Hold the caller's exact original across reads and asynchronous signing
  // ports; never replace its expected revision or deadline with fresh ones.
  const original = parseStrict(canonicalize({ signed: retained.signed, receipt: retained.receipt })) as { signed: SignedIntent; receipt: Receipt };
  return cloneUsing(ctx, directory, options, original);
}

function cloneUsing(ctx: Context, directory: string | undefined, options: { hours?: number; archive?: boolean }, retained?: { signed: SignedIntent; receipt: Receipt }): Promise<Outcome> {
  return run(async () => {
    if (options.archive && !directory) return usage("clone --archive needs an explicit directory.");

    const hours = options.hours ?? 1;
    if (!Number.isSafeInteger(hours) || hours < READ_TOKEN_HOURS.min || hours > READ_TOKEN_HOURS.max) return usage(`--hours is a whole number from ${READ_TOKEN_HOURS.min} to ${READ_TOKEN_HOURS.max}.`);
    const config = await configOf(ctx);
    const { summary, repository } = await destinationOf(ctx, config);
    const fixedLifetime = answersVersionQuestion(summary.definition, "cliFixedReadTokenLifetimeDestination");
    if (fixedLifetime && hours !== 1) return usage("This room issues one-hour read tokens; --hours must be 1.");
    const tokenFields = fixedLifetime ? {} : { hours };
    if (options.archive && !ctx.git?.archiveRun) return failed("Archive clone needs the hardened Git runner. No read token was requested.");
    const args = (url: string) => ["clone", "--", url, ...(directory === undefined ? [] : [directory])];
    if (!ctx.git || (await ctx.git.run(["--version"], {})) === null) {
      const url = remoteOf(config, repository) ?? `https://<service host>/git/${repository.namespace}/${repository.name}.git`;
      if (retained) return failed("git is not installed here. The retained read-token request remains accepted; no credential was retrieved and nothing was cloned.");
      return failed("git is not installed here, so nothing was signed. With git installed, run dap clone again; it runs:", `git -c http.extraHeader="Authorization: ${repository.host === "github.com" ? "Basic <x-access-token:read token, base64>" : "Bearer <read token>"}" ${args(url).join(" ")}`);
    }
    if (!platform(summary.definition as PlatformDefinition)?.data.acts["read-token"]) return failed(`The destination definition ${summary.definition} does not support read-token. An explicitly versioned destination and membership integration is required.`);
    // The act: `read-token` on the branch, at the revision the summary has now. The scope judges the grant and the field.
    const scope = summary.scope.scope;
    const signer = await signerOf(ctx, config);
    const branch = summary.items.find((item) => item.type === "branch")!;
    if (retained && (retained.signed.intent.actor !== signer.key || retained.signed.intent.on !== branch.id
      || canonicalize(retained.signed.intent.fields) !== canonicalize(tokenFields)
      || Object.keys(retained.signed.intent.expected).length !== 1 || !Object.hasOwn(retained.signed.intent.expected, "on")
      || !Number.isSafeInteger(retained.signed.intent.expected["on"]) || retained.signed.intent.expected["on"]! < 0)) return failed("The retained read-token request does not match this signer, branch and requested hours. No credential was retrieved and nothing was cloned.");
    const signed = retained?.signed ?? await signedIntent(signer, { to: summary.scope, kind: "read-token", on: branch.id, fields: tokenFields, expected: { on: branch.revision } }, signing(ctx));
    const receipt = retained?.receipt ?? accepted(await (await handleOf(ctx, config, scope, null)).submit(signed), scope, "Read token").receipt;
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
