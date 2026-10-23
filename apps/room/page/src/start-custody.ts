/** Public key references for one explicit Start; private keys live in IDB. */
import type { KeyId } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, isKeyId, isRecord, isScopeRef, keyIdOfSecret, unb64url } from "@generalbusiness/dap-bytes";
import { isCreationOffer, isCurrentCreationOffer, type CreationOffer, type Fetch, type Signer } from "@generalbusiness/dap-client";
import { pageKeyStore } from "./browser-key-store.ts";
import { custodyKind } from "./custody.ts";
import { claimRoom, claimStatus, migrateRecoveryCustody, type ClaimOptions, type ClaimRegister, type ClaimStorage, type ClaimedRoom } from "./claim.ts";

interface KeptStart { v: 1 | 2; origin: string; secret?: string; publicKey?: KeyId; configured: ClaimRegister; label: string; handle: "@founder"; operation?: string; recoverySaved?: true }
export interface StartStatus { key: KeyId; configured: ClaimRegister; label: string; handle: "@founder"; state: "prepared" | "pending" | "complete"; operation?: string; recoverySaved?: true }
export interface StartOptions extends Pick<ClaimOptions, "locks" | "current" | "pause" | "tries" | "creationOffer" | "keys"> {
  mode: "new" | "continue" | "check";
  offer?: CreationOffer;
  label?: string;
  fetch?: Fetch;
  now?: () => number;
}
export interface StartedRoom extends ClaimedRoom { key: KeyId; configured: ClaimRegister; handle: "@founder"; signer?: Signer }
const unavailable = () => new Error("The original private Start key or claim is unavailable. Nothing was replaced or submitted.");
function decode(raw: string, origin: string): KeptStart {
  let secret: Uint8Array | null = null;
  try {
    const row: unknown = JSON.parse(raw);
    if (!isRecord(row) || !Object.keys(row).every(key => ["v", "origin", "secret", "publicKey", "configured", "label", "handle", "operation", "recoverySaved"].includes(key)) || ![1, 2].includes(Number(row["v"])) || row["origin"] !== origin || row["handle"] !== "@founder" || typeof row["label"] !== "string" || !row["label"].trim() || row["label"].length > 256) throw unavailable();
    if (row["operation"] !== undefined && (typeof row["operation"] !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row["operation"]))) throw unavailable();
    if (row["recoverySaved"] !== undefined && row["recoverySaved"] !== true) throw unavailable();
    const configured = row["configured"];
    if (!isRecord(configured) || Object.keys(configured).sort().join(",") !== "definition,register" || !["platform:register@7", "platform:register@8", "platform:register@17"].includes(configured["definition"] as string) || !isScopeRef(configured["register"]) || configured["register"].kind !== "register") throw unavailable();
    if (row["v"] === 1) {
      if (typeof row["secret"] !== "string" || row["publicKey"] !== undefined) throw unavailable();
      secret = unb64url(row["secret"]);
      if (!secret || secret.length !== 32 || b64url(secret) !== row["secret"]) throw unavailable();
    } else if (row["secret"] !== undefined || !isKeyId(row["publicKey"])) throw unavailable();
    return row as unknown as KeptStart;
  } catch { throw unavailable(); }
  finally { secret?.fill(0); }
}
function publicOf(row: KeptStart, storage: ClaimStorage): StartStatus {
  const secret = row.secret === undefined ? null : unb64url(row.secret)!;
  try {
    const key = row.publicKey ?? keyIdOfSecret(secret!);
    const status = claimStatus({ service: row.origin, publicKey: key }, row.configured, storage, row.operation);
    // Never infer never-dispatched from a missing or mismatched journal.
    // The descriptor binds the reserved operation before the CLI can sign.
    if (row.operation ? !status || status.operation !== row.operation : status !== null) throw unavailable();
    return { key, configured: structuredClone(row.configured), label: row.label, handle: row.handle, state: status?.state ?? "prepared", ...(status ? { operation: status.operation } : {}), ...(row.recoverySaved ? { recoverySaved: true } : {}) };
  } finally { secret?.fill(0); }
}
const custody = custodyKind<KeptStart, StartStatus>({
  kind: "start", prefix: "artroom-page-start", most: 4096, sameOrigin: true,
  unavailable, bindingOf: row => row.origin, decode, publicOf
});
const { read, write: save, current, originOf, keyOf } = custody;
export function originalStart(origin: string, storage: ClaimStorage): StartStatus | null { return custody.original(origin, storage); }
async function migrateStart(row: KeptStart, storage: ClaimStorage, options: StartOptions): Promise<KeptStart> {
  if (row.v === 2) return row;
  const expected = storage.getItem(keyOf(row.origin)); let saved: KeptStart | undefined;
  await (options.keys ?? pageKeyStore()).migrate({ seed: row.secret!, current: () => options.current?.() !== false && storage.getItem(keyOf(row.origin)) === expected, removeSecret: publicKey => {
    const { secret: _secret, ...rest } = row;
    saved = save({ ...rest, v: 2, publicKey }, storage, options);
  } });
  if (!saved) throw unavailable(); return saved;
}
/** First-load custody conversion only, without native status reads or acts. */
export async function migrateOriginalStart(origin: string, storage: ClaimStorage, keys = pageKeyStore()): Promise<void> {
  originOf(origin);
  const locks = (globalThis as { navigator?: { locks?: import("./claim.ts").ClaimLocks } }).navigator?.locks;
  if (!locks) throw unavailable();
  await locks.request(`artroom-page-start:${origin}`, async () => {
    const row = read(origin, storage); if (!row) return;
    const saved = await migrateStart(row, storage, { mode: "check", keys });
    const signer = await keys.load(publicOf(saved, storage).key);
    await migrateRecoveryCustody({ service: origin, signer }, saved.configured, storage, keys);
  });
}
export async function startRoom(origin: string, storage: ClaimStorage, options: StartOptions): Promise<StartedRoom> {
  originOf(origin);
  const browser = globalThis as { navigator?: { locks?: import("./claim.ts").ClaimLocks } };
  const locks = options.locks ?? browser.navigator?.locks;
  if (!locks) throw new Error("Private Start locking is unavailable. Nothing was submitted.");
  return locks.request(`artroom-page-start:${origin}`, async () => {
    current(options);
    let row = read(origin, storage);
    const keys = options.keys ?? pageKeyStore();
    if (row) row = await migrateStart(row, storage, options);
    if (options.mode === "new") {
      if (row) throw new Error("An original Start is already retained. Check status or explicitly Continue that original creation.");
      if (!options.offer || !isCurrentCreationOffer(options.offer, origin)) throw new Error("A current same-origin configured register17 creation offer is required. Nothing was submitted.");
      const label = options.label?.trim() ?? "";
      if (!label || label.length > 256) throw new Error("Enter a personal room label of at most 256 characters.");
      const signer = await keys.create(); current(options);
      row = save({ v: 2, origin, publicKey: signer.key, configured: { register: structuredClone(options.offer.register), definition: options.offer.definition }, label, handle: "@founder" }, storage, options);
    }
    if (!row) throw unavailable();
    let held = row;
    const signer = await keys.load(publicOf(held, storage).key);
    {
      const status = publicOf(held, storage);
      const stillCurrent = () => options.current?.() !== false && storage.getItem(keyOf(origin)) === canonicalize(held);
      if (!stillCurrent()) throw unavailable();
      if (options.mode === "check" && !status.operation) return { key: status.key, configured: status.configured, handle: held.handle, operation: "", label: held.label, repository: null, pending: true, outcome: { code: 1, lines: ["The Start key is retained, but no original claim has been prepared. Check sent nothing. Continue explicitly to prepare the first request."] } };
      const result = await claimRoom({ service: origin, signer, ...(options.fetch ? { fetch: options.fetch } : {}), ...(options.now ? { now: options.now } : {}) }, held.configured, storage, held.label, {
        keys,
        ...(options.pause ? { pause: options.pause } : {}), ...(options.tries !== undefined ? { tries: options.tries } : {}), ...(options.creationOffer ? { creationOffer: async (register: ClaimRegister["register"]) => {
          const offered = await options.creationOffer!(register);
          if (!isCreationOffer(offered, origin, held.configured.register) || offered.definition !== held.configured.definition) throw unavailable();
          return offered;
        } } : {}), mode: status.operation ? "resume" : "new", ...(status.operation ? { operation: status.operation } : {}),
        handle: held.handle, readOnlyCheck: options.mode === "check", locks,
        retainOperation: operation => {
          if (!stillCurrent() || held.operation && held.operation !== operation) throw unavailable();
          if (!held.operation) held = save({ ...held, operation }, storage, options);
        },
        current: stillCurrent
      });
      if (!stillCurrent()) throw unavailable();
      return { ...result, key: status.key, configured: status.configured, handle: held.handle, ...(result.repository ? { signer } : {}) };
    }
  });
}

/** This legacy action exported the browser key, not the separately enrolled
 * native recovery key. Nonextractable device keys have no download path. */
export async function recoveryKeyOnce(origin: string, storage: ClaimStorage, expected: { key: KeyId; operation: string }, options: Pick<StartOptions, "locks" | "current"> = {}): Promise<string> {
  void origin; void storage; void expected; void options;
  throw new Error("This browser signing key is nonextractable and cannot be downloaded. The separately enrolled recovery identity is unchanged.");
}
