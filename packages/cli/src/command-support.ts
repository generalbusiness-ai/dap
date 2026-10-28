/** Shared command outcomes and read/wait primitives. The stop has one identity. */
import type { Answer, Created, KeyId, ScopeId, ScopeRef, Seed, Summary } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, isFactRef, scopeIdOf, timeMs, timeOf, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { ScopeHandle, TransportError, httpTransport, signedReads, requestSession, signerSessionRequest, type OperationalApi, type ReadSigning, type Session, type Signer, type Signing, type Transport } from "@generalbusiness/dap-client";
import { SourceError } from "@generalbusiness/dap-replay";
import type { Context, Outcome } from "./commands.ts";
import type { ClaimStep, Config } from "./store.ts";
import { storedSigner } from "./store-signer.ts";
import { cachedReadSession, ReadSessionCacheError, type CachedReadSession } from "./read-session-cache.ts";


export const done = (...lines: string[]): Outcome => ({ code: 0, lines });
export const failed = (...lines: string[]): Outcome => ({ code: 1, lines });
export const usage = (...lines: string[]): Outcome => ({ code: 2, lines });

/** A command that cannot go on: it ends with this outcome. */
export class Stop extends Error {
  constructor(readonly outcome: Outcome) { super(outcome.lines.join(" ")); }
}
export const stopCommand = (outcome: Outcome): never => { throw new Stop(outcome); };

/**
 * Runs a command, and turns a stop, a lost reply and a history that cannot be read into its outcome. A lost reply says what the
 * transport says: whether anything may have been recorded. A history that cannot be read says why: "... cannot be read: <reason>".
 */
export async function run(command: () => Promise<Outcome>): Promise<Outcome> {
  try {
    return await command();
  } catch (error) {
    if (error instanceof Stop) return error.outcome;
    if (error instanceof TransportError) return failed(`No answer: ${error.message}`);
    if (error instanceof SourceError) return failed(error.message);
    throw error;
  }
}

// ---------------------------------------------------------------- what every command reads

export const fresh = (bytes: number): Uint8Array => crypto.getRandomValues(new Uint8Array(bytes));

export async function configOf(ctx: Context): Promise<Config> {
  const config = await ctx.store.config();
  return config ?? stopCommand(usage("No room is set up here. Run: dap install <base-url>, or dap join <link>."));
}

export async function signerOf(ctx: Context, config: Config): Promise<Signer> {
  return (await storedSigner(ctx.store, config.key)) ?? stopCommand(failed(`The key ${config.key} is missing from the config directory; nothing was signed.`));
}

export const signing = (ctx: Context): Signing => (ctx.now ? { now: ctx.now() } : {});
export const readSigning = (ctx: Context): ReadSigning => (ctx.now ? { now: ctx.now } : {});
export const transportOf = (ctx: Context, service: string): Transport => httpTransport(service, ctx.fetch ? { fetch: ctx.fetch } : {});

/** A known session needs no read signer; still require the configured key. */
export async function readTransportOf(ctx: Context, config: Config, reader?: string | null): Promise<Transport> {
  if (reader === undefined) return (await managedReadsOf(ctx, config)).transport;
  const transport = transportOf(ctx, config.service);
  if (typeof reader === "string") {
    // The session request already used the configured signing identity. Check
    // current custody without deriving a filesystem signer that is not used.
    // Capability stores own their namespace and must never fall back to seeds.
    if (ctx.store.signer) {
      if (await ctx.store.signer(config.key) == null) stopCommand(failed(`The key ${config.key} is missing from the config directory; nothing was signed.`));
    } else {
      const held = await ctx.store.secret(config.key);
      if (held === null) stopCommand(failed(`The key ${config.key} is missing from the config directory; nothing was signed.`));
      if (!(held instanceof Uint8Array) || held.length !== 32) throw new Error(`The key ${config.key} holds no 32-byte key.`);
    }
    const known = connections.get(ctx)?.get(connectionKey(config));
    if (known) {
      const manager = await known;
      const signer = await storedSigner(ctx.store, config.key);
      if (signer?.key === manager.key && manager.recognizes(reader)) return manager.transport;
    }
    return transport;
  }
  return signedReads(transport, await signerOf(ctx, config), readSigning(ctx));
}

export interface ManagedReads {
  readonly transport: Transport & OperationalApi;
  session(): Promise<Session | null>;
  read<T extends { ok: boolean; reason?: string }>(perform: (reader: string | null) => Promise<T>): Promise<T>;
}
interface Connection extends ManagedReads { readonly key: KeyId; recognizes(reader: string): boolean }
const connections = new WeakMap<Context, Map<string, Promise<Connection>>>();
const connectionKey = (config: Config): string => canonicalize([config.service, config.key, config.repository?.membership ?? null]);
class SessionRefused extends Error {
  constructor(readonly reason: string, readonly retryAfterSeconds?: number, readonly renewal = false) { super("Read-session request refused"); }
}
function sessionRefused(error: SessionRefused): never {
  const window = error.reason === "rate-limited" ? error.retryAfterSeconds === undefined
    ? " The service did not report its request window."
    : ` The service reports a request-window retry delay of ${error.retryAfterSeconds} seconds; this is not a retry grant.` : "";
  return stopCommand(failed(`Read session refused: ${error.reason}.${window}`));
}

/** Issue under this invocation's signer, fetch and clock. No Config is needed. */
async function issueReadSession(ctx: Context, service: string, membership: ScopeRef, signer: Signer, renewal: boolean): Promise<Session> {
  const now = () => ctx.now?.() ?? Date.now();
  const asked = await signerSessionRequest(membership, signer, timeOf(Math.floor(now() / 1000) * 1000 + 60_000), b64url(fresh(16)));
  const answer = await requestSession(service, membership.scope, asked, ctx.fetch ? { fetch: ctx.fetch } : {});
  if (!answer.ok) throw new SessionRefused(answer.reason, answer.retryAfterSeconds, renewal);
  if (timeMs(answer.session.claims.ends)! - now() <= 30_000)
    stopCommand(failed("The issued read session has no 30-second refresh margin on this clock. Check device/service clock alignment; server authority was not inferred."));
  return answer.session;
}

/** Required custody reads may use a retained signer outside Config. Cache only
 * its exact service/membership/key credential; never select Signed authority. */
export async function requiredSessionOf(ctx: Context, service: string, membership: ScopeRef, signer: Signer): Promise<Session> {
  try {
    const held = await cachedReadSession(ctx.store, { service, membership, key: signer.key }, () => ctx.now?.() ?? Date.now(),
      renewal => issueReadSession(ctx, service, membership, signer, renewal));
    return held?.session ?? stopCommand(failed("No required read session was issued."));
  } catch (error) {
    if (error instanceof SessionRefused) sessionRefused(error);
    if (error instanceof ReadSessionCacheError) stopCommand(failed(error.message));
    throw error;
  }
}

/** A connection belongs to this Context's fetch/clock. Only issuance, not
 * this connection or its budget, is coordinated across a shared Store. */
export async function managedReadsOf(ctx: Context, config: Config): Promise<ManagedReads> {
  const signer = await signerOf(ctx, config), key = connectionKey(config);
  let known = connections.get(ctx);
  if (!known) { known = new Map(); connections.set(ctx, known); }
  const prior = known.get(key);
  if (prior && (await prior).key === signer.key) return prior;
  const made = Promise.resolve(makeConnection(ctx, config, signer));
  known.set(key, made);
  return made;
}
function makeConnection(ctx: Context, config: Config, signer: Signer): Connection {
  const base = httpTransport(config.service, ctx.fetch ? { fetch: ctx.fetch } : {});
  const signed = signedReads(base, signer, readSigning(ctx));
  const membership = config.repository?.membership, readers = new Set<string>();
  const used = new WeakSet<CachedReadSession>();
  let selected: CachedReadSession | null | undefined;
  let hadSession = false;
  const now = () => ctx.now?.() ?? Date.now();
  const load = async (renewal = false): Promise<CachedReadSession | null> => {
    if (!membership) return null;
    if (selected === null && !renewal) return null;
    if (selected && timeMs(selected.session.claims.ends)! - now() > 30_000) return selected;
    if (renewal) hadSession = true;
    const pending = cachedReadSession(ctx.store, { service: config.service, membership, key: signer.key }, now, async cachedRenewal => {
      if (cachedRenewal) hadSession = true;
      return issueReadSession(ctx, config.service, membership, signer, hadSession);
    });
    try {
      selected = await pending;
      if (selected) { hadSession = true; readers.add(selected.session.reader()); }
      return selected;
    } catch (error) {
      if (error instanceof SessionRefused) {
        if (error.renewal) hadSession = true;
        if (hadSession || error.reason === "rate-limited") sessionRefused(error);
        // Established initial selection: no session can mean Signed reads.
        // A failed renewal never enters this bootstrap path.
        selected = null; return null;
      }
      if (error instanceof ReadSessionCacheError) stopCommand(failed(error.message));
      throw error;
    }
  };
  const read = async <T extends { ok: boolean; reason?: string }>(perform: (reader: string | null) => Promise<T>): Promise<T> => {
    const held = await load();
    const result = await perform(held?.session.reader() ?? null);
    if (result.ok) { if (held) used.add(held); return result; }
    if (result.reason !== "forbidden" || !held || !(held.reused || used.has(held)) || !membership) return result;
    // All issued roles can read their own membership summary. A valid token
    // denied another target must not mint a new session for every denial.
    const probe = await base.summary(membership.scope, held.session.reader());
    if (probe.ok) return result;
    if (probe.reason !== "forbidden") stopCommand(failed(`Read session check refused: ${probe.reason}.`));
    try { await held.discard(); } catch (error) {
      if (error instanceof ReadSessionCacheError) stopCommand(failed(error.message));
      throw error;
    }
    if (selected === held) selected = undefined;
    const next = await load(true) ?? stopCommand(failed("No renewed read session was issued."));
    // Exactly one retry; even another forbidden result is returned as-is.
    const retried = await perform(next.session.reader());
    if (retried.ok) used.add(next);
    return retried;
  };
  const dispatch = <T extends { ok: boolean; reason?: string }>(given: unknown, perform: (reader: unknown) => Promise<T>): Promise<T> =>
    given === undefined || typeof given === "string" && readers.has(given) ? read(perform) : perform(given);
  const transport: Transport & OperationalApi = {
    create: (...args) => base.create(...args), submit: (...args) => base.submit(...args),
    prepare: (...args) => base.prepare(...args), settle: (...args) => base.settle(...args),
    summary: (scope, given) => dispatch(given, reader => signed.summary(scope, reader)),
    items: (scope, given, type, cursor) => dispatch(given, reader => signed.items(scope, reader, type, cursor)),
    queryItems: (scope, given, query) => dispatch(given, reader => signed.queryItems(scope, reader, query)),
    applicationProjection: async (scope, given, query) => (await dispatch(given, async reader => {
      const value = await signed.applicationProjection(scope, reader, query);
      const result = JSON.parse(value) as { ok: boolean; reason?: string };
      return { ok: result.ok, ...(result.reason === undefined ? {} : { reason: result.reason }), value };
    })).value,
    history: (scope, given, cursor) => dispatch(given, reader => signed.history(scope, reader, cursor)),
    entry: (scope, given, seq) => dispatch(given, reader => signed.entry(scope, reader, seq)),
    outbox: (scope, given, cursor) => dispatch(given, reader => signed.outbox(scope, reader, cursor)),
    outboxItem: (scope, given, id) => dispatch(given, reader => signed.outboxItem(scope, reader, id)),
    log: (scope, given, cursor) => dispatch(given, reader => signed.log(scope, reader, cursor)),
    retained: (scope, given, kind, digest, domain) => dispatch(given, reader => signed.retained(scope, reader, kind, digest, domain)),
    incidents: (scope, given, cursor) => dispatch(given, reader => base.incidents(scope, reader, cursor)),
    waiting: (scope, given, list, cursor) => dispatch(given, reader => base.waiting(scope, reader, list, cursor)),
    requests: (scope, given, request, cursor) => dispatch(given, reader => base.requests(scope, reader, request, cursor)),
  };
  return { key: signer.key, recognizes: reader => readers.has(reader), transport, session: async () => (await load())?.session ?? null, read };
}

/** The existing public adapters keep tokens out of Config and output. */
export async function sessionOf(ctx: Context, config: Config): Promise<Session | null> {
  if (!config.repository?.membership) return null;
  return (await managedReadsOf(ctx, config)).session();
}
export async function readerOf(ctx: Context, config: Config): Promise<string | null> {
  return (await sessionOf(ctx, config))?.reader() ?? null;
}

/**
 * A handle on one scope. A read with no session is a signed read by the
 * caller's key: the scope answers it where that key signed an entry, or the
 * root of the scope's cause chain, within the window of an intent.
 */
export async function handleOf(ctx: Context, config: Config, scope: ScopeId, reader?: string | null): Promise<ScopeHandle> {
  const transport = await readTransportOf(ctx, config, reader);
  return new ScopeHandle(transport, scope, reader === undefined ? await readerOf(ctx, config) : reader);
}

export async function summaryOf(handle: ScopeHandle): Promise<Summary> {
  const read = await handle.summary();
  return read.ok ? read.value : stopCommand(failed(`Cannot read ${handle.scope}: ${read.reason}.`));
}

/** The answer to an act, in one or two lines. A refusal names its reason and, when the failed guard has one, its name. */
const inspectBeforeMutation = (scope: ScopeId | null): string => scope === null ? "the configured service's history" : `dap log ${scope}`;
export const unavailableAnswer = (reason: string, scope: ScopeId | null): Outcome => failed(`Unavailable: ${reason}. Outcome unknown; no acceptance is confirmed. Inspect ${inspectBeforeMutation(scope)} before another mutation. Recovery requires the same original signed envelope; repeating a generic command signs a new request.`);
export const archivedAnswer = (answer: Extract<Answer, { answer: "archived" }>): Outcome => failed(`Archived: original entry ${answer.fact.at.scope}:${answer.fact.seq}, hash ${answer.fact.hash}, incarnation ${answer.fact.at.inc}, is below journal floor ${answer.archived.floor}. Verify archive commit ${answer.archived.commit} against through entry ${answer.archived.through.seq}, hash ${answer.archived.through.hash}, before confirming the original result or another mutation. Recovery requires the same original signed envelope; do not sign a replacement request.`);
export const mismatchAnswer = (reason: string, scope: ScopeId | null): Outcome => failed(`Mismatch: ${reason}. The idempotency key names another recorded intent. Inspect ${inspectBeforeMutation(scope)} and the original request before another mutation.`);
export function answered(scope: ScopeId, answer: Answer, took: string): Outcome {
  switch (answer.answer) {
    case "archived": return archivedAnswer(answer);
    case "accepted": return done(`${took}: entry ${scope}:${answer.receipt.fact.seq}, hash ${answer.receipt.fact.hash.slice(0, 19)}.`);
    case "refused": return failed(`Refused: ${answer.reason}${"name" in answer && answer.name ? ` (${answer.name === "founding-policy" ? "creation-policy" : answer.name === "founding-key" ? "initial-key" : answer.name})` : ""}, judged at entry ${scope}:${answer.judgedAt.seq}. The request was refused.`);
    case "unavailable": return unavailableAnswer(answer.reason, scope);
    case "mismatch": return mismatchAnswer(answer.reason, scope);
  }
}

export function accepted(answer: Answer | Created, scope: ScopeId | null, took: string): Extract<Answer, { answer: "accepted" }> {
  if (answer.answer === "accepted") return answer;
  if (answer.answer === "archived") return stopCommand(archivedAnswer(answer));
  if (answer.answer === "unavailable") return stopCommand(unavailableAnswer(answer.reason, scope));
  if (answer.answer === "mismatch") return stopCommand(mismatchAnswer(answer.reason, scope));
  return stopCommand("judgedAt" in answer ? answered(scope!, answer, took) : failed(`Refused: ${answer.reason}. The request was refused.`));
}

// ---------------------------------------------------------------- waiting for scopes

/** Reads until `ready` holds, pausing between reads. `then`: what the person may do after the command gives up. */
export async function waitFor<T>(ctx: Context, waiting: () => readonly ScopeId[], read: () => Promise<T | null>, what: string, then = "run the command's reads again later."): Promise<T> {
  const tries = ctx.tries ?? 120;
  for (let n = 0; n < tries; n++) {
    const got = await read();
    if (got !== null) return got;
    await (ctx.pause ?? (() => new Promise<void>((resolve) => { setTimeout(resolve, 1000); })))(waiting());
  }
  return stopCommand(failed(`Gave up waiting for ${what} after ${tries} reads. What was asked may still take effect; ${then}`));
}

/** The scope's summary once it is `active`: created and confirmed. */
export const active = async (handle: ScopeHandle): Promise<Summary | null> => {
  const read = await handle.summary();
  return read.ok && read.value.status === "active" ? read.value : null;
};

/** The scopes that entry `seq` of a scope creates, by the seed of each send, with the send's number. */
export async function createdBy(handle: ScopeHandle, seq: number): Promise<{ n: number; seed: Seed; scope: ScopeId }[]> {
  const read = await handle.entry(seq);
  if (!read.ok) return stopCommand(failed(`Cannot read entry ${handle.scope}:${seq}: ${read.reason}.`));
  return read.value.entry.sends.flatMap((send) => ("creator" in send.to ? [{ n: send.n, seed: send.to as Seed, scope: scopeIdOf(send.to as Seed) }] : []));
}

export function validStep(step: ClaimStep, to: ScopeRef, key: KeyId, kind: string): boolean {
  try {
    return verifySignedIntent(step?.signed) && step.signed.intent.actor === key && step.signed.intent.kind === kind && canonicalize(step.signed.intent.to) === canonicalize(to)
      && (step.accepted === undefined || (isFactRef(step.accepted) && step.accepted.seq > 0 && canonicalize(step.accepted.at) === canonicalize(to)));
  } catch { return false; }
}
