/**
 * The lending gateway: reads the lending scope, and signs, keeps and sends one
 * lending act at a time. It follows notes/2026-10-13-lending-library.md, section 4.1.
 *
 * An act is signed once and kept in `Custody` before anything is sent. After a
 * lost reply or a reload Check is read-only. Explicit Continue reuses that
 * original envelope. Nothing here signs a replacement.
 */
import type { ApplicationProjectionData, Receipt } from "@generalbusiness/dap-contract";
import type { ApplicationInstallation } from "@generalbusiness/dap-platform/application";
import { b64url, canonicalize, intentDigest, timeMs, timeOf } from "@generalbusiness/dap-bytes";
import { RETIRED_REQUEST, ScopeHandle, browserRequests, completeSummary, completeApplicationProjection, httpTransport, meaningOf, observeScope, openHttpHeadStream, requestKey, requestSession, shapeDeclaredAct, signedIntent, signerSessionRequest, unsentError,
  type ClientCustodyStore, type CompleteSnapshot, type CustodyRecord, type Envelope, type Fetch, type HeadStreamFetch, type KeptRequest, type Observation, type RequestSettled, type Session, type Signer } from "@generalbusiness/dap-client";
import { lending } from "../definition.ts";
import { LENDING_DEFINITION } from "../pin.ts";
import { LENDING_ACTS, lendingTarget, type CustodyLock, type LendingIdentity } from "./custody.ts";
import { lendingProjectionView, lendingProjectionActivity, membershipActions, propose, refusalWords, type LendingAct, type LendingView, type LendingActivityRow } from "./model.ts";
import { lendingStateProjection } from "./projection.ts";

/** How long after an intent's deadline a "not found" is taken as final. */
export const SETTLED_AFTER_MS = 120_000;

/** What the member is told about one lending act. `recorded` and `refused` are final; `unknown` keeps the original. */
export type ActOutcome =
  | { status: "recorded" }
  | { status: "refused"; reason: string }
  | { status: "unknown"; reason: string }
  | { status: "nothing-sent"; reason: string };
/** The original request that is kept, as the interface may show it. */
export interface Pending { kind: string; thing: number | null; name: string | null; notAfter: string; unsent: boolean }
export type LendingState =
  | { status: "loading" }
  | { status: "current"; view: LendingView; activity: readonly LendingActivityRow[]; /** Separately observed membership actions, or unknown after a failed read. */ actions: readonly string[] | null }
  | { status: "behind"; reason: string; view?: LendingView };

export interface LendingGateway {
  /** Follow one declared projection: retained items and bounded activity at one native head. */
  observe(emit: (state: LendingState) => void): Observation;
  /** One complete declared read without following the scope. */
  look(): Promise<LendingState>;
  /** Sign one act, keep it, then send it. Refused while another original is kept. */
  act(kind: LendingAct, input?: { thing?: number; name?: string; description?: string; reason?: string }): Promise<ActOutcome>;
  /** The kept original, or null. */
  pending(): Promise<Pending | null>;
  /** Check submits no new act. Its reads may first sign and send
   * read-session authentication. */
  check(): Promise<ActOutcome | null>;
  /** Resume an unsent original. Unknown delivery needs explicit continueOriginal. */
  resume(): Promise<ActOutcome | null>;
  /** Explicit Continue: resend the same kept envelope before its deadline. */
  continueOriginal(): Promise<ActOutcome | null>;
  /** Give up the kept original, only when a read shows it did not take effect and its deadline has passed. */
  abandon(): Promise<boolean>;
  /** The words for a request slot of the retired format, which the page removed; null when there was none. */
  retired(): Promise<string | null>;
  dispose(): void;
}

export function lendingGateway(configured: LendingIdentity, signer: Signer, options: {
  current(): boolean; lock: CustodyLock; custody: ClientCustodyStore;
  /** The page's own state of this identity's requests: the keys the person gave up, and the slot of the retired format. */
  requests: { givenUp(): Promise<string[]>; giveUp(key: string): Promise<void>; dropRetired(): Promise<boolean> };
  /** The clock for deadlines. Date.now by default. */ now?: () => number; fetch?: Fetch; headFetch?: HeadStreamFetch; /** The fetch of the one send. It defaults to `fetch`. */ actFetch?: Fetch;
  application?: Pick<ApplicationInstallation,"scope"|"directory"|"item"|"definition">;
}): LendingGateway {
  const identity = JSON.parse(JSON.stringify(configured)) as LendingIdentity;
  const application=options.application?JSON.parse(canonicalize(options.application)) as NonNullable<typeof options.application>:undefined;
  if(application&&(canonicalize(application.scope)!==canonicalize(identity.scope)||application.definition!==identity.definition))throw Error("The installed library does not match this device.");
  const origin = new URL(identity.origin);
  if (origin.origin !== identity.origin || !["https:", "http:"].includes(origin.protocol)) throw new Error("The configured service must be an exact origin.");
  if (identity.definition !== LENDING_DEFINITION || signer.key !== identity.publicKey) throw new Error("This device does not match the configured lending identity.");

  const now = options.now ?? (() => Date.now());
  const lifetime = new AbortController();
  let readVersion = 0;
  let alive = true, session: Session | null = null, observer: Observation | undefined, view: LendingView | undefined, fresh = false, currentActivity: readonly LendingActivityRow[] = [];
  let currentActions: readonly string[] | null = null;
  const usable = () => alive && options.current();
  const current = () => { if (!usable()) throw new Error("This device context is no longer current."); };
  const defaultFetch: Fetch = (url, init) => fetch(url, { ...init, redirect: "error", signal: init?.signal ? AbortSignal.any([init.signal, lifetime.signal]) : lifetime.signal });
  // ScopeHandle's internal fallback must check the context at its own request dispatch too.
  const readFetch: Fetch = (url, init) => { current(); return (options.fetch ?? defaultFetch)(url, init); };
  const transport = httpTransport(identity.origin, { fetch: readFetch });
  const handle = () => new ScopeHandle(transport, identity.scope.scope, session?.reader() ?? null);

  /** A read session from the room's membership, signed by this device. Null with the refusal's reason when there is none. */
  const signIn = async (): Promise<string | null> => {
    current();
    const signed = await signerSessionRequest(identity.membership, signer, timeOf(now() + 60_000), b64url(crypto.getRandomValues(new Uint8Array(16)))); current();
    const answer = await requestSession(identity.origin, identity.membership.scope, signed, { fetch: readFetch }); current();
    if (!answer.ok) return answer.reason;
    session = answer.session;
    return null;
  };
  /** The reads that settle a kept request need a session; a reloaded page has none yet. */
  const ready = async (): Promise<void> => { current(); if (!session) await signIn(); current(); };

  /** Existing authenticated membership summary route. A failed or incomplete read cannot retain old standing. */
  const readActions = async (): Promise<readonly string[] | null> => {
    try {
      const read = completeSummary(await new ScopeHandle(transport, identity.membership.scope, session?.reader() ?? null).summary()); current();
      return read.ok ? membershipActions(read.value.value, identity.member, signer.key) : null;
    } catch { return null; }
  };

  const readState=async()=>application?completeApplicationProjection(await handle().applicationProjection({v:1,scope:identity.scope,directory:application.directory,install:application.item,projection:"state",items:{}}),lendingStateProjection):{ok:false as const,reason:"unavailable" as const};

  const send: Fetch = (url, init) => { current(); return (options.actFetch ?? readFetch)(url, init); };
  const requests = browserRequests(options.custody, lendingTarget(identity), {
    current: usable,
    post: (envelope) => new ScopeHandle(httpTransport(identity.origin, { fetch: send as Fetch }), identity.scope.scope).submit(envelope.signed, [], envelope.beside),
    // An acceptance counts only when the scope's own record holds this exact signed request.
    recorded: async (receipt: Receipt, envelope: Envelope) => {
      current();
      if (receipt.definition !== identity.definition || receipt.intent !== intentDigest(envelope.signed.intent) || canonicalize(receipt.fact.at) !== canonicalize(identity.scope)) return false;
      await ready(); current();
      const followed = await handle().followReceipt(receipt); current();
      return followed.ok && followed.entry.input.type === "act" && canonicalize(followed.entry.input.signed) === canonicalize(envelope.signed);
    },
    settle: async (envelope) => { await ready(); current(); const answer = await handle().settle(envelope.signed); current(); return answer.ok ? answer.value : null; },
  }, now);
  /** A kept record is a lending act of this device to this scope; anything else is left as it is and never sent. */
  const lendingRecord = (record: CustodyRecord): boolean => {
    const intent = record.envelope.signed.intent;
    return (LENDING_ACTS as readonly string[]).includes(intent.kind) && intent.actor === identity.publicKey && canonicalize(intent.to) === canonicalize(identity.scope);
  };
  /** The newest unresolved request that the person did not give up. One request is kept at a time. */
  const kept = async (): Promise<KeptRequest | null> => {
    const given = new Set(await options.requests.givenUp()); current();
    const open = (await requests.unresolved()).filter((request) => !given.has(request.key)); current();
    return open.at(-1) ?? null;
  };
  /** Tell the member what a step settled. A final result needs no clearing: custody keeps it, and it is no longer pending. */
  const conclude = (record: CustodyRecord, settled: RequestSettled): ActOutcome => {
    if (settled.status === "unknown") return { status: "unknown", reason: "No answer came back that could be trusted. The original request is kept. Check it before doing anything else." };
    observer?.refresh();
    return settled.status === "recorded" ? { status: "recorded" } : { status: "refused", reason: refusalWords(record.envelope.signed.intent.kind as LendingAct, settled.reason) };
  };
  const unreadable = { status: "unknown" as const, reason: "The kept request cannot be read. It stays in this browser." };
  /** Send the kept record's own envelope again, or a `prepared` one for the first time. It signs nothing. */
  const resend = async (request: KeptRequest): Promise<ActOutcome> => {
    try { return conclude(request.record, await requests.send(request.key, request.record.meaning, async () => { throw new Error("A kept request is never signed again."); }, { notAfter: timeOf(now() + 60_000) })); }
    catch { return { status: "unknown", reason: "The original request is kept. Check it before doing anything else." }; }
  };

  return {
    observe(emit) {
      observer = observeScope<ApplicationProjectionData>({
        context: { origin: identity.origin, deployment: identity.deployment, scope: identity.scope, definition: identity.definition, membership: identity.membership, member: identity.member.member, key: identity.publicKey },
        current: usable,
        authenticate: async () => options.lock.run(async () => {
          current();
          const signed = await signerSessionRequest(identity.membership, signer, timeOf(now() + 60_000), b64url(crypto.getRandomValues(new Uint8Array(16)))); current();
          const answer = await requestSession(identity.origin, identity.membership.scope, signed, { fetch: readFetch }); current();
          if (answer.ok) session = answer.session;
          return answer.ok ? { ok: true, session: answer.session } : answer;
        }),
        snapshot: async (next) => { session = next; return readState(); },
        open: (next, signal) => openHttpHeadStream(identity.origin, identity.scope, next, signal, options.headFetch ? { fetch: options.headFetch } : {}),
        emit: (state) => {
          if (!usable()) return;
          if (state.status !== "current") { readVersion++; fresh = false; currentActions = null; emit(state.status === "connecting" ? { status: "loading" } : { status: "behind", reason: "reason" in state && typeof state.reason === "string" ? state.reason : state.status, ...(view ? { view } : {}) }); return; }
          const snapshot: CompleteSnapshot<ApplicationProjectionData> = state.snapshot;
          // Items and recent entry facts already share this native head.
          const version = ++readVersion;
          currentActions = null;
          emit({ status: "behind", reason: "Reading current membership actions.", ...(view ? { view } : {}) });
          void readActions().then(actions => {
            if (!usable() || version !== readVersion) return;
            const next = lendingProjectionView(snapshot.value),activity=lendingProjectionActivity(snapshot.value,next);
            if (view && next.record.seq < view.record.seq) return;
            view = next; fresh = !view.behind; currentActivity = activity; currentActions = actions;
            emit(view.behind ? { status: "behind", reason: "The projection is behind the list.", view } : { status: "current", view, activity, actions });
          }).catch((error: unknown) => { if (usable() && version === readVersion) { fresh = false; emit({ status: "behind", reason: error instanceof Error ? error.message : "The record could not be read.", ...(view ? { view } : {}) }); } });
        },
      });
      return observer;
    },
    async look() {
      const version = ++readVersion;
      currentActions = null;
      const superseded = (): LendingState => view && fresh ? { status: "current", view, activity: currentActivity, actions: currentActions } : { status: "behind", reason: "A newer read replaced this one.", ...(view ? { view } : {}) };
      try {
        current();
        const refusal = await signIn();
        if (version !== readVersion) return superseded();
        if (refusal !== null) { fresh = false; return { status: "behind", reason: `The room refused a read session: ${refusal}.`, ...(view ? { view } : {}) }; }
        const read = await readState(); current();
        if (version !== readVersion) return superseded();
        if (!read.ok) { fresh = false; return { status: "behind", reason: `The library could not be read: ${read.reason}.`, ...(view ? { view } : {}) }; }
        const actions = await readActions();
        if (version !== readVersion) return superseded();
        const next = lendingProjectionView(read.value.value),activity=lendingProjectionActivity(read.value.value,next);
        if (view && next.record.seq < view.record.seq) return superseded();
        view = next; fresh = !view.behind; currentActivity = activity; currentActions = actions;
        return view.behind ? { status: "behind", reason: "The projection is behind the list.", view } : { status: "current", view, activity, actions };
      } catch (error) { if (version !== readVersion) return superseded(); fresh = false; return { status: "behind", reason: error instanceof Error ? error.message : "The library could not be read.", ...(view ? { view } : {}) }; }
    },
    act(kind, input = {}) {
      return options.lock.run(async (): Promise<ActOutcome> => {
        current();
        if (await kept() !== null) return { status: "nothing-sent", reason: "An earlier request is kept. Check it first." };
        current();
        if (!view || !fresh) return { status: "nothing-sent", reason: "The list is not current yet. Nothing was sent." };
        const proposed = propose(view, kind, input, identity.member.member);
        if (!proposed.ok) return { status: "nothing-sent", reason: proposed.reason };
        const { on, expected, fields } = proposed.proposal;
        const key = requestKey(), meaning = meaningOf({ kind, on, expected, fields });
        const build = async () => {
          const shaped = shapeDeclaredAct(lending, kind, { on, fields } as never);
          const signed = await signedIntent(signer, { to: identity.scope, kind, on: shaped.on, fields: shaped.fields, expected }, { now: now(), idempotencyKey: key }); current();
          return { binding: { definition: "lending", kind, declaration: null, pinned: identity.definition }, envelope: { signed, beside: shaped.beside } };
        };
        try {
          const settled = await requests.send(key, meaning, build, { notAfter: timeOf(now() + 60_000) });
          const record = await requests.find(key); current();
          return record ? conclude(record, settled) : { status: "unknown", reason: "The original request is kept. Check it before doing anything else." };
        } catch (error) {
          // Custody keeps the envelope before anything is sent: an error before the send leaves nothing sent.
          if (unsentError(error) && !(await requests.find(key).catch(() => null))) return { status: "nothing-sent", reason: "The request could not be signed and kept. Nothing was sent." };
          return { status: "unknown", reason: "The original request is kept. Check it before doing anything else." };
        }
      });
    },
    async pending() {
      const request = await kept();
      if (!request) return null;
      if (!lendingRecord(request.record)) return { kind: "unknown", thing: null, name: null, notAfter: "", unsent: false };
      const { intent } = request.record.envelope.signed;
      return { kind: intent.kind, thing: intent.kind === "publish" && typeof intent.fields["thing"] === "number" ? intent.fields["thing"] : intent.on, name: typeof intent.fields["name"] === "string" ? intent.fields["name"] : null, notAfter: intent.notAfter, unsent: request.record.phase === "prepared" };
    },
    check() {
      return options.lock.run(async () => {
        current(); const request = await kept();
        if (!request) return null;
        if (!lendingRecord(request.record)) return unreadable;
        try { return conclude(request.record, (await requests.settle(request.key)) ?? { status: "unknown" }); }
        catch { return { status: "unknown" as const, reason: "The original request is kept. Check it before doing anything else." }; }
      });
    },
    resume() {
      return options.lock.run(async () => {
        current(); const request = await kept();
        if (!request) return null;
        if (!lendingRecord(request.record) || request.record.phase !== "prepared")
          return { status: "unknown" as const, reason: "This request may already have been sent. Check it; it will not be sent again." };
        return resend(request);
      });
    },
    continueOriginal() {
      return options.lock.run(async () => {
        current(); const request = await kept();
        if (!request) return null;
        if (!lendingRecord(request.record)) return unreadable;
        const deadline = timeMs(request.record.envelope.signed.intent.notAfter);
        if (deadline === null || now() > deadline) return { status: "unknown" as const, reason: "The original request's deadline has passed. Check it; nothing was sent." };
        return resend(request);
      });
    },
    abandon() {
      return options.lock.run(async () => {
        current(); const request = await kept();
        if (!request) return true;
        if (!lendingRecord(request.record)) return false;
        const deadline = timeMs(request.record.envelope.signed.intent.notAfter);
        if (deadline === null || now() < deadline + SETTLED_AFTER_MS) return false;
        await ready(); current();
        const answer = await handle().settle(request.record.envelope.signed); current();
        if (answer.ok || answer.reason !== "not-found") return false;
        // Custody keeps the record unresolved: a later read can still settle it. The page stops showing it.
        await options.requests.giveUp(request.key); current(); observer?.refresh();
        return true;
      });
    },
    async retired() { return (await options.requests.dropRetired()) ? RETIRED_REQUEST : null; },
    dispose() { alive = false; readVersion++; lifetime.abort(); observer?.cancel(); session = null; view = undefined; fresh = false; currentActions = null; },
  };
}
