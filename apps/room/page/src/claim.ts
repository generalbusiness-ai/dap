/** Native creation through the existing CLI workflow, with private browser recovery.
 * A typed label is local intent, not the repository name selected by the host.
 * This module never installs a register or imports an operator key. */
import type { KeyId, PlatformDefinition, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isKeyId, isScopeRef, parseStrict, unb64url } from "@generalbusiness/dap-bytes";
import { ScopeHandle, httpTransport, signedReads, isCreationOffer, type Fetch } from "@generalbusiness/dap-client";
import { claim, checkClaim, type Config, type Context, type Outcome, type PendingClaim, type Repository, type Store } from "@generalbusiness/dap-cli";
import { DIRECTORY_OF } from "@generalbusiness/dap-platform";
import { sessionKey, sessionSigner, type Session } from "./data.ts";
import { pageKeyStore } from "./browser-key-store.ts";

export interface ClaimRegister { register: ScopeRef; definition: PlatformDefinition }
/** Private same-origin storage. Its values include recovery key material;
 * they must never be exported as public config or included in diagnostics. */
export interface ClaimStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
/** Exclusive across all callers/tabs sharing the private record. Production
 * uses Web Locks; a test supplies its explicitly labelled lock stand-in. */
export interface ClaimLocks { request<T>(name: string, run: () => Promise<T>): Promise<T> }
export interface ClaimOptions extends Pick<Context, "pause" | "tries" | "creationOffer"> {
  keys?: ReturnType<typeof pageKeyStore>;
  handle?: string;
  /** Only settle/follow the exact saved stages; never Continue or prepare. */
  readOnlyCheck?: boolean;
  /** Local custody callback after operation reservation, before native signing. */
  retainOperation?: (operation: string) => void;
  locks?: ClaimLocks;
  /** True only while the Page still selects the captured room, key and register.
   * Checked after waiting for the lock and immediately before mutation delivery.
   * A changed context never discards or replaces a saved original envelope. */
  current?: () => boolean;
  /** New explicitly opens a different operation after verified completion.
   * For new, operation is the expected active predecessor (absent: none).
   * For resume, it names the exact existing operation, including an archive. */
  mode: "new" | "resume";
  operation?: string;
}
export interface ClaimedRoom {
  outcome: Outcome;
  operation: string;
  /** The original local label, kept across a retry; never a native name claim. */
  label: string;
  repository: Repository | null;
  pending: boolean;
}
interface Kept { v: 1; binding: string; label: string; config: Config; recovery?: string; recoveryKey?: KeyId; completed?: PendingClaim }
interface Journal { v: 2; binding: string; active: string; claims: Record<string, string>; originalLegacy?: string }
export interface ClaimStatus { operation: string; label: string; state: "pending" | "complete" }
/** A client storage bound, not native creation permission or capacity. No
 * archived or unknown operation is evicted to admit another one. */
const MAX_CLAIMS = 64;
const operationId = (id: string): boolean => id === "legacy" || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);

type ClaimIdentity = { service: string; publicKey: KeyId };
function originOf(session: { service: string }): void {
  const url = new URL(session.service);
  const browser = globalThis as { location?: { origin: string } };
  if (url.origin !== session.service || !["https:", "http:"].includes(url.protocol) || browser.location && browser.location.origin !== session.service) throw new Error("Claiming requires the exact origin of the Worker serving this page.");
}

function bindingOf(session: Session | ClaimIdentity, configured: ClaimRegister): string {
  if (!isScopeRef(configured.register) || configured.register.kind !== "register" || !DIRECTORY_OF[configured.definition]) throw new Error("A valid key and an explicitly supported configured register are required.");
  // The browser caller passes location.origin; an arbitrary remote connection
  // is not selected from a saved setting, invitation, or claim record.
  originOf(session);
  return canonicalize([session.service, configured.register, configured.definition, "publicKey" in session ? session.publicKey : sessionKey(session)]);
}

function readKept(raw: string, binding: string, session: { service: string }, configured: ClaimRegister): Kept {
  let got: Kept | null;
  try { got = parseStrict(raw) as unknown as Kept | null; } catch { throw new Error("The private claim record cannot be read. It is kept; nothing was submitted."); }
  if (!got || got.v !== 1 || got.binding !== binding || typeof got.label !== "string" || !got.config || got.config.v !== 1
    || got.config.service !== session.service || got.config.key !== "browser" || canonicalize(got.config.register) !== canonicalize(configured.register)
    || got.config.plan !== undefined || got.config.join !== undefined
    || (got.recovery !== undefined && (unb64url(got.recovery)?.length !== 32 || got.recoveryKey !== undefined))
    || (got.recoveryKey !== undefined && !isKeyId(got.recoveryKey))) throw new Error("The private claim record does not match this Worker, register and key. It is kept; nothing was submitted.");
  return got;
}
function readJournal(session: Session | ClaimIdentity, configured: ClaimRegister, storage: ClaimStorage): { binding: string; storageKey: string; journal: Journal | null } {
  const binding = bindingOf(session, configured);
  const storageKey = `artroom-page-claim:${binding}`;
  const raw = storage.getItem(storageKey);
  if (raw === null) return { binding, storageKey, journal: null };
  let value: unknown;
  try { value = parseStrict(raw); } catch { throw new Error("The private claim journal cannot be read. It is kept; nothing was submitted."); }
  // Preserve every byte of the legacy record until a checked native workflow
  // updates that same operation. Migration never invents another found.
  if ((value as Kept | null)?.v === 1) {
    readKept(raw, binding, session, configured);
    return { binding, storageKey, journal: { v: 2, binding, active: "legacy", claims: { legacy: raw }, originalLegacy: raw } };
  }
  const got = value as Journal | null;
  if (!got || got.v !== 2 || got.binding !== binding || typeof got.active !== "string" || !operationId(got.active)
    || !got.claims || typeof got.claims !== "object" || Array.isArray(got.claims)
    || got.originalLegacy !== undefined && typeof got.originalLegacy !== "string"
    || Object.keys(got.claims).length > MAX_CLAIMS || !Object.hasOwn(got.claims, got.active)
    || Object.entries(got.claims).some(([id, bytes]) => !operationId(id) || typeof bytes !== "string")) throw new Error("The private claim journal does not match this context. It is kept; nothing was submitted.");
  return { binding, storageKey, journal: got };
}
/** A local descriptor only. It carries neither signing keys nor permission,
 * and a complete hint is revalidated natively before a new creation. */
export function claimStatus(session: Session | ClaimIdentity, configured: ClaimRegister, storage: ClaimStorage, selectedOperation?: string): ClaimStatus | null {
  const { binding, journal } = readJournal(session, configured, storage);
  if (!journal) return null;
  const operation = selectedOperation ?? journal.active;
  if (!Object.hasOwn(journal.claims, operation)) throw new Error("The exact original creation is missing from its private journal. Nothing was submitted.");
  const kept = readKept(journal.claims[operation]!, binding, session, configured);
  return { operation, label: kept.label, state: kept.completed ? "complete" : "pending" };
}

/** One journal write commits the operation ID and its complete private record
 * before a mutation can leave. Existing signing keys stay in Page settings;
 * each new operation generates and retains its own recovery key. */
/** Called under the original claim lock. Every archived operation and legacy
 * copy keeps its exact signed stages; only the independent recovery seed is
 * replaced after durable import of that same recovery identity. */
async function migrateClaimKeys(session: Session | ClaimIdentity, configured: ClaimRegister, storage: ClaimStorage, keys: ReturnType<typeof pageKeyStore>, current: () => void): Promise<void> {
  const loaded = readJournal(session, configured, storage);
  if (!loaded.journal) return;
  let journal = loaded.journal;
  for (const name of [...Object.keys(journal.claims), "originalLegacy"]) {
    const raw = name === "originalLegacy" ? journal.originalLegacy : journal.claims[name];
    if (!raw) continue;
    const record = readKept(raw, loaded.binding, session, configured);
    if (!record.recovery) continue;
    const before = storage.getItem(loaded.storageKey);
    await keys.migrate({ seed: record.recovery, current: () => { current(); return storage.getItem(loaded.storageKey) === before; }, removeSecret: recoveryKey => {
      current();
      if (storage.getItem(loaded.storageKey) !== before) throw new Error("The original recovery custody changed.");
      const { recovery: _seed, ...publicRecord } = record;
      const next = canonicalize({ ...publicRecord, recoveryKey });
      journal = name === "originalLegacy" ? { ...journal, originalLegacy: next } : { ...journal, claims: { ...journal.claims, [name]: next } };
      const bytes = canonicalize(journal);
      storage.setItem(loaded.storageKey, bytes);
      if (storage.getItem(loaded.storageKey) !== bytes) throw new Error("The recovery reference did not persist.");
    } });
  }
}
/** Migrate retained recovery custody without preparing, checking or sending
 * any native operation. Original operation/history bytes remain in the row. */
export async function migrateRecoveryCustody(session: Session, configured: ClaimRegister, storage: ClaimStorage, keys = pageKeyStore()): Promise<void> {
  const locks = (globalThis as { navigator?: { locks?: ClaimLocks } }).navigator?.locks;
  if (!locks) throw new Error("Private claim migration locking is unavailable.");
  await locks.request(`artroom-page-claim:${bindingOf(session, configured)}`, () => migrateClaimKeys(session, configured, storage, keys, () => {}));
}
/** Enumerate only this origin's bounded, explicitly tagged claim journals.
 * Their public binding is sufficient to move an existing recovery key; it
 * does not authorize any native read, signing operation or new enrollment. */
export async function migrateAllClaimCustody(origin: string, storage: ClaimStorage & { length: number; key(n: number): string | null }, keys = pageKeyStore()): Promise<void> {
  const locks = (globalThis as { navigator?: { locks?: ClaimLocks } }).navigator?.locks;
  const length = storage.length;
  if (!locks || !Number.isSafeInteger(length) || length < 0 || length > 1024) throw new Error("Private claim migration is unavailable or exceeds its storage bound.");
  const names: string[] = [];
  for (let n = 0; n < length; n++) { const name = storage.key(n); if (name?.startsWith("artroom-page-claim:")) names.push(name); }
  for (const name of names) {
    const binding = name.slice("artroom-page-claim:".length);
    if (binding.length > 4096) throw new Error("The original claim binding exceeds its bound.");
    const tuple: unknown = JSON.parse(binding);
    if (!Array.isArray(tuple) || tuple.length !== 4 || tuple[0] !== origin) continue;
    const [service, register, definition, publicKey] = tuple;
    if (!isScopeRef(register) || register.kind !== "register" || typeof definition !== "string" || !Object.hasOwn(DIRECTORY_OF, definition) || !isKeyId(publicKey)) throw new Error("The original claim binding is invalid.");
    const configured = { register, definition: definition as PlatformDefinition };
    const identity = { service: service as string, publicKey };
    if (bindingOf(identity, configured) !== binding) throw new Error("The original claim binding changed.");
    await locks.request(name, () => migrateClaimKeys(identity, configured, storage, keys, () => {}));
  }
}

function storeFor(session: Session, configured: ClaimRegister, storage: ClaimStorage, label: string, operation: string, fresh = false, keys = pageKeyStore()): { store: Store; kept(): Kept; retain(): void } {
  const read = readJournal(session, configured, storage);
  const { binding, storageKey } = read;
  let journal = read.journal ?? { v: 2 as const, binding, active: operation, claims: {} };
  if (!operationId(operation)) throw new Error("The creation operation ID is invalid. Nothing was submitted.");
  if (fresh && Object.keys(journal.claims).length >= MAX_CLAIMS) throw new Error("This browser's claim journal is full. Original proofs are kept; no new creation was submitted.");
  const raw = journal.claims[operation];
  if (fresh && raw !== undefined || !fresh && raw === undefined) throw new Error("The creation operation does not match the private journal. Nothing was submitted.");
  let record: Kept = raw !== undefined ? readKept(raw, binding, session, configured) : { v: 1, binding, label, config: { v: 1, service: session.service, key: "browser", register: configured.register } };
  const write = (next: Kept): void => {
    const nextJournal: Journal = { ...journal, ...(fresh ? { active: operation } : {}), claims: { ...journal.claims, [operation]: canonicalize(next) } };
    const bytes = canonicalize(nextJournal);
    storage.setItem(storageKey, bytes);
    // A storage adapter that silently drops the write must also stop before
    // sending. The complete old record survives an ordinary failed setItem.
    if (storage.getItem(storageKey) !== bytes) throw new Error("The browser could not retain the exact claim. Nothing further was submitted.");
    record = structuredClone(next);
    journal = nextJournal;
  };
  const store: Store = {
    signer: async name => name === "browser" ? sessionSigner(session) : name === "recovery" && record.recoveryKey ? keys.load(record.recoveryKey) : null,
    newSigner: async name => {
      if (name !== "recovery" || record.recoveryKey || record.recovery) throw new Error("An existing browser or recovery key is never replaced.");
      const signer = await keys.create();
      write({ ...record, recoveryKey: signer.key });
      return signer;
    },
    config: async () => {
      const config = structuredClone(record.config);
      if (!record.completed) return config;
      const { repository: _repository, handle: _handle, ...base } = config;
      return { ...base, claim: structuredClone(record.completed) };
    },
    save: async (config) => write({ ...record, config, ...(config.repository && record.config.claim ? { completed: structuredClone(record.config.claim) } : {}) }),
    secret: async () => { throw new Error("Browser signing keys cannot be exported."); },
    keep: async () => { throw new Error("Browser signing keys require durable private custody."); },
    private: async () => null,
    keepPrivate: async () => { throw new Error("Claiming does not create a private invitation record."); },
  };
  return { store, kept: () => structuredClone(record), retain: () => write(record) };
}

/** Authoritative offer check for an explicitly configured full register ref.
 * Reads through the caller's existing key; no register installation or newest
 * version guess is used. The register still judges the eventual signed act. */
export async function allowedClaim(session: Session, register: ScopeRef): Promise<ClaimRegister> {
  originOf(session);
  if (!isScopeRef(register) || register.kind !== "register") throw new Error("A valid browser key and full configured register reference are required.");
  const transport = signedReads(httpTransport(session.service, session.fetch ? { fetch: session.fetch } : {}), sessionSigner(session), session.now ? { now: session.now } : {});
  const read = await new ScopeHandle(transport, register.scope).summary();
  if (!read.ok) throw new Error(`The configured register cannot be read: ${read.reason}. Nothing was submitted.`);
  if (!read.complete || read.next !== undefined || canonicalize(read.value.scope) !== canonicalize(register) || !DIRECTORY_OF[read.value.definition]) throw new Error("The register read does not match the complete configured reference and a supported pinned version. Nothing was submitted.");
  const registers = read.value.items.filter((item) => item.type === "register" && item.state === "open");
  const policy = registers[0]?.values["policy"];
  const creators = registers[0]?.values["founders"];
  if (registers.length !== 1 || !(policy === "open" || policy === "keys" && Array.isArray(creators) && creators.includes(sessionKey(session)))) throw new Error("This browser key is not eligible under the configured register's creation policy. Nothing was submitted.");
  return { register, definition: read.value.definition as PlatformDefinition };
}

/** A saved pending envelope skips offer preflight so an aged accepted request
 * can be settled by the native workflow without refreshing its deadline. */
export async function claimRoom(session: Session, configured: ClaimRegister, storage: ClaimStorage, label: string, options: ClaimOptions): Promise<ClaimedRoom> {
  const binding = bindingOf(session, configured);
  const browser = globalThis as { navigator?: { locks?: ClaimLocks } };
  const locks = options.locks ?? browser.navigator?.locks;
  if (!locks) throw new Error("This browser cannot lock private claim recovery across tabs. Nothing was submitted.");
  return locks.request(`artroom-page-claim:${binding}`, async () => {
    const checkCurrent = (): void => {
      if (options.current?.() === false) throw new Error("The Page room, key or register changed. This continuation sends no new mutation. Any saved original claim is kept; its earlier outcome may be accepted or unknown.");
    };
    checkCurrent();
    if (!label.trim() || label.length > 256) throw new Error("Enter a local room label of at most 256 characters.");
    const { handle, readOnlyCheck, retainOperation, locks: _locks, current: _current, mode: _mode, operation: _operation, keys: suppliedKeys, ...waiting } = options;
    const keys = suppliedKeys ?? pageKeyStore();
    await migrateClaimKeys(session, configured, storage, keys, checkCurrent);
    if (readOnlyCheck && options.mode !== "resume") throw new Error("Check requires a retained original creation. Nothing was submitted.");
    let blocked = false;
    const send = session.fetch ?? (globalThis as { fetch?: Fetch }).fetch;
    const guardedFetch: Fetch = (url, init) => {
      const path = new URL(url).pathname;
      if (init?.method === "POST" && (path.endsWith("/acts") || path.endsWith("/preparations") || path === "/v1/scopes")) {
        try { checkCurrent(); } catch (error) { blocked = true; throw error; }
      }
      if (!send) throw new Error("This runtime has no fetch; nothing was sent.");
      return send(url, init);
    };
    async function runNative(privateStore: ReturnType<typeof storeFor>, localLabel: string): Promise<Outcome> {
      const context = { store: privateStore.store, fetch: guardedFetch, ...session.now ? { now: session.now } : {}, ...waiting };
      return readOnlyCheck ? checkClaim(context, localLabel) : claim(context, localLabel, handle !== undefined ? { handle } : {});
    }
    const loaded = readJournal(session, configured, storage);
    const active = loaded.journal?.active;
    let operation: string;
    let fresh = false;
    if (options.mode === "resume") {
      operation = options.operation ?? active ?? "";
      if (!operation) throw new Error("There is no saved creation to resume. Choose Create room explicitly.");
    } else {
      if (options.operation !== active) throw new Error("Another creation changed this browser's journal. Inspect the saved operation before creating another room.");
      if (loaded.journal && Object.keys(loaded.journal.claims).length >= MAX_CLAIMS) throw new Error("This browser's claim journal is full. Original proofs are kept; no new creation was submitted.");
      if (active) {
        const previous = storeFor(session, configured, storage, label.trim(), active, false, keys);
        const kept = previous.kept();
        if (!kept.completed) return { outcome: { code: 1, lines: ["A creation is already in progress. Resume that exact original operation before creating another room."] }, operation: active, label: kept.label, repository: null, pending: true };
        const verified = await runNative(previous, kept.label);
        if (verified.code !== 0) return { outcome: verified, operation: active, label: kept.label, repository: null, pending: true };
      }
      checkCurrent();
      const eligible = options.creationOffer ? await (async () => {
        const offer = await options.creationOffer!(configured.register);
        if (!isCreationOffer(offer, session.service, configured.register)) throw new Error("The creation offer does not match this exact origin and register. Nothing was submitted.");
        return { definition: offer.definition };
      })() : await allowedClaim(session, configured.register);
      if (eligible.definition !== configured.definition) throw new Error("The register read does not match the configured pinned version. Nothing was submitted.");
      checkCurrent();
      operation = crypto.randomUUID();
      fresh = true;
    }
    const privateStore = storeFor(session, configured, storage, label.trim(), operation, fresh, keys);
    const before = privateStore.kept();
    if (before.config.repository && !before.completed) throw new Error("The saved room has no exact native claim recovery proof. It is kept; nothing was submitted.");
    checkCurrent();
    if (fresh) privateStore.retain();
    if (!readOnlyCheck) retainOperation?.(operation);
    checkCurrent();
    const native = await runNative(privateStore, before.label);
    const outcome: Outcome = blocked ? { code: 1, lines: ["The Page room, key or register changed. This continuation sent no new mutation after the context changed. The exact saved original claim is kept; earlier steps may already be accepted or unknown. Inspect or resume only under its original context."] } : native;
    const after = privateStore.kept();
    return { outcome, operation, label: after.label, repository: outcome.code === 0 ? after.config.repository ?? null : null, pending: outcome.code !== 0 && (after.config.claim !== undefined || after.completed !== undefined) };
  });
}
