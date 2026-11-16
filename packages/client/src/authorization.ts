/** Retained gestures and pre-sign permissions. No method here sends an envelope. */
import type { Beside, DeclaredDefinition, Digest, FieldValue, Item, KeyId, ScopeRef, SignedIntent, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, digestBytes, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import type { ItemName, Revision, Source } from "./act-types.ts";
import { actVersion } from "./act-version.ts";
import { lowerActBasis, lowerActNames } from "./act-symbols.ts";
import { shapeFieldsOf } from "./declared.ts";
import type { AuthorizationPort } from "./authorization-store.ts";
import { DEFAULT_LIFETIME_SECONDS } from "./intent.ts";

export interface AuthorizationIdentity { readonly key: string; readonly owner: KeyId; readonly scope: ScopeRef }
export interface AuthorizationPosition { readonly identity: AuthorizationIdentity; readonly position: number }
export interface AuthorizationInput { readonly key: string; readonly act: AuthorizedAct }
export interface AuthorizedAct {
  readonly kind: string;
  readonly on: ItemName | null;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly expected: Readonly<Record<string, Revision>>;
}
export interface MaterializedAct {
  readonly kind: string;
  readonly on: number | null;
  readonly fields: Readonly<Record<string, FieldValue>>;
  readonly expected: Readonly<Record<string, number>>;
  readonly beside: Beside;
}
export interface AuthorizationSubject { readonly name: string; readonly item: ItemName }
export interface AuthorizationVersion {
  readonly id: Digest;
  readonly act: AuthorizedAct;
  readonly after: readonly Source[];
  readonly at: Timestamp;
  readonly deadline: Timestamp;
  /** Selection evidence captured by the environment's declared-subject resolver. */
  readonly subjects: readonly AuthorizationSubject[];
}
export interface AuthorizationMaterialization {
  readonly position: number;
  readonly act: MaterializedAct;
  readonly sources: readonly AuthorizationSource[];
}
/** A permission precedes signing. Its presence never claims that a signature or custody write succeeded. */
export interface AuthorizationPermission { readonly position: number; readonly at: Timestamp; readonly materialized: MaterializedAct }
export interface Authorization extends AuthorizationIdentity {
  readonly definition: Digest;
  readonly descriptor: Digest;
  readonly versions: readonly AuthorizationVersion[];
  readonly materializations: readonly AuthorizationMaterialization[];
  readonly permissions: readonly AuthorizationPermission[];
  readonly cancelledAt?: Timestamp;
  /** The fence order disambiguates cancellation and a permission with equal clocks. */
  readonly cancelledAfterPermissions?: number;
}
export interface SigningAuthorization {
  readonly identity: AuthorizationIdentity;
  readonly position: number;
  readonly permission: number;
}
export type AuthorizationStop = "owner" | "descriptor-mismatch" | "definition-mismatch" | "cancelled"
  | "version" | "deadline" | "busy" | "source" | "authorization-used" | "versions-full";
/** Ruling 52b638a9: unsigned and failed positions count; this bound is separate from custody SIGNINGS_MOST. */
export const AUTHORIZATION_VERSIONS_MOST = 64;
export class AuthorizationError extends Error {
  override readonly name = "AuthorizationError";
  constructor(readonly reason: AuthorizationStop) { super(`authorization: ${reason}`); }
}
function stop(reason: AuthorizationStop): never { throw new AuthorizationError(reason); }
const equal = (a: unknown, b: unknown): boolean => canonicalize(a) === canonicalize(b);
const sameScope = (a: ScopeRef, b: ScopeRef): boolean => a.scope === b.scope && a.genesis === b.genesis;
const meaning = (act: Pick<MaterializedAct, "kind" | "on" | "fields">): Digest =>
  digestBytes(utf8(canonicalize({ kind: act.kind, on: act.on, fields: act.fields })));

/** The entry/revisions come from the checked journal port, not from a guessed item or current row. */
export interface AuthorizationSource {
  readonly source: Source;
  readonly position: number;
  readonly entry: { readonly actor: KeyId; readonly key: string; readonly meaning: Digest;
    readonly fact: { readonly at: ScopeRef; readonly seq: number; readonly hash: Digest }; readonly opened: number | null };
  readonly revisions: Readonly<Record<number, number>>;
}
/** Positive evidence only; the instance supplies its checked replica, never an adapter's proof object. */
export interface AuthorizationEvidence {
  authorizationSource(owner: KeyId, key: string): { entry: AuthorizationSource["entry"]; revisions: Readonly<Record<number, number>> } | null;
}
export interface RetainAuthorization {
  readonly key: string;
  readonly act: AuthorizedAct;
  readonly sources: readonly Source[];
  readonly subjects: readonly AuthorizationSubject[];
}
export interface AuthorizationNamespace {
  readonly owner: KeyId;
  readonly scope: ScopeRef;
  readonly definition: Digest;
  /** The digest of each act of the definition, by kind. A row holds the digest of its own act. */
  readonly descriptors: Readonly<Record<string, Digest>>;
}

/** Every call runs under the coordinating store fence; this class never reacquires it. */
export class AuthorizationTransaction {
  #rows: readonly Authorization[] | null = null;
  #dirty = false;
  #committed = false;
  readonly namespace: AuthorizationNamespace;
  constructor(readonly port: AuthorizationPort, namespace: AuthorizationNamespace, readonly evidence?: AuthorizationEvidence) { this.namespace = structuredClone(namespace); }

  async records(): Promise<readonly Authorization[]> {
    if (this.#rows) return structuredClone(this.#rows);
    const rows = await this.port.read(this.namespace.owner, this.namespace.scope);
    const keys = new Set<string>();
    for (const row of rows) {
      if (row.owner !== this.namespace.owner || !sameScope(row.scope, this.namespace.scope) || keys.has(row.key)
        || row.versions.length === 0 || row.versions.some(version => version.id !== actVersion(version.act))) stop("version");
      keys.add(row.key);
    }
    this.#rows = structuredClone(rows);
    return structuredClone(this.#rows);
  }

  /** Commit the whole candidate once, after pre-mark stops have all passed. */
  async commit(): Promise<void> {
    if (this.#committed) throw new Error("the authorization transaction already committed");
    this.#committed = true;
    if (this.#dirty) await this.port.write(this.namespace.owner, this.namespace.scope, this.#rows!);
  }

  #stage(rows: readonly Authorization[]): void {
    if (this.#committed) throw new Error("the authorization transaction is closed");
    this.#rows = structuredClone(rows); this.#dirty = true;
  }

  async find(identity: AuthorizationIdentity): Promise<Authorization | null> {
    const captured = structuredClone(identity);
    if (captured.owner !== this.namespace.owner || !sameScope(captured.scope, this.namespace.scope)) stop("owner");
    return (await this.records()).find(row => row.key === captured.key) ?? null;
  }

  #descriptor(kind: string): Digest | undefined {
    return Object.hasOwn(this.namespace.descriptors, kind) ? this.namespace.descriptors[kind] : undefined;
  }

  #matching(row: Authorization): void {
    if (row.definition !== this.namespace.definition) stop("definition-mismatch");
    if (row.descriptor !== this.#descriptor(row.versions[0]!.act.kind)) stop("descriptor-mismatch");
    if (row.cancelledAt !== undefined) stop("cancelled");
  }

  /** All candidates pass before the sole batch write. pending is read under this same fence. */
  async retain(steps: readonly RetainAuthorization[], at: number, lifetimeSeconds: number,
    pending: (row: Authorization) => Promise<boolean>): Promise<readonly { identity: AuthorizationIdentity; position: number }[]> {
    const captured = structuredClone(steps);
    if (!(lifetimeSeconds > 0 && lifetimeSeconds <= DEFAULT_LIFETIME_SECONDS)) stop("deadline");
    const rows = [...await this.records()], result: { identity: AuthorizationIdentity; position: number }[] = [];
    const keys = new Set<string>();
    for (const step of captured) {
      if (keys.has(step.key)) stop("version");
      keys.add(step.key);
      const existing = rows.find(row => row.key === step.key);
      // One key holds versions of one kind. This check runs before any digest is compared.
      if (existing && existing.versions[0]!.act.kind !== step.act.kind) stop("version");
      if (existing) this.#matching(existing);
      if (existing && existing.versions.length >= AUTHORIZATION_VERSIONS_MOST) stop("versions-full");
      const after = new Map(step.sources.map(source => [canonicalize(source), source]));
      for (const previous of rows) {
        if (previous.key === step.key || previous.cancelledAt !== undefined || !await pending(structuredClone(previous))) continue;
        const version = previous.versions.at(-1)!;
        const source = { key: previous.key, version: version.id };
        for (const subject of step.subjects) {
          const item = await this.item(subject.item);
          let same = false;
          for (const other of version.subjects) if (equal(await this.item(other.item), item)) { same = true; break; }
          if (!same) continue;
          const basis = step.act.expected[subject.name];
          if (basis !== undefined && (typeof basis === "number" || !equal(basis.after, source))) stop("busy");
          after.set(canonicalize(source), source);
        }
      }
      const version: AuthorizationVersion = { id: actVersion(step.act), act: structuredClone(step.act),
        after: [...after.values()], at: timeOf(at), deadline: timeOf(Math.floor((at + lifetimeSeconds * 1000) / 1000) * 1000),
        subjects: structuredClone(step.subjects) };
      const descriptor = this.#descriptor(step.act.kind);
      if (!existing && descriptor === undefined) stop("version");
      const row: Authorization = existing ? { ...existing, versions: [...existing.versions, version] }
        : { key: step.key, owner: this.namespace.owner, scope: this.namespace.scope, definition: this.namespace.definition,
          descriptor: descriptor!, versions: [version], materializations: [], permissions: [] };
      const index = rows.findIndex(held => held.key === row.key);
      if (index < 0) rows.push(row); else rows[index] = row;
      result.push({ identity: { key: row.key, owner: row.owner, scope: row.scope }, position: row.versions.length - 1 });
    }
    this.#stage(rows);
    return result;
  }

  async cancel(identity: AuthorizationIdentity, at: number): Promise<void> {
    const row = await this.find(identity);
    if (!row || row.cancelledAt !== undefined) return;
    await this.#replace({ ...row, cancelledAt: timeOf(at), cancelledAfterPermissions: row.permissions.length });
  }

  /** Resolve a positive source from the actual replica and matching retained content. */
  async source(source: Source): Promise<AuthorizationSource> {
    const captured = structuredClone(source);
    const identity = { key: captured.key, owner: this.namespace.owner, scope: this.namespace.scope };
    const row = await this.find(identity), checked = this.evidence?.authorizationSource(identity.owner, identity.key);
    if (!row || row.cancelledAt !== undefined || row.versions.at(-1)?.id !== captured.version || !checked
      || checked.entry.actor !== row.owner || checked.entry.key !== row.key || !sameScope(checked.entry.fact.at, row.scope)) return stop("source");
    // A Source names content. Equal-content gesture occurrences can both explain the same first sealed bytes.
    const materialized = row.materializations.find(held => row.versions[held.position]?.id === captured.version
      && checked.entry.meaning === meaning(held.act));
    if (!materialized) return stop("source");
    return structuredClone({ source: captured, position: materialized.position, entry: checked.entry, revisions: checked.revisions });
  }

  async item(name: ItemName): Promise<ItemName> {
    const captured = structuredClone(name);
    if (typeof captured === "number") return captured;
    try { const found = await this.source(captured.output); return found.entry.opened ?? captured; }
    catch (error) { if (error instanceof AuthorizationError && error.reason === "source") return captured; throw error; }
  }

  /** Lower the retained authored value with the shared shaper/resolver, never an adapter callback. */
  async fill(identity: AuthorizationIdentity, position: number, definition: DeclaredDefinition,
    items: readonly Item[], beside: Beside = {}): Promise<MaterializedAct> {
    identity = structuredClone(identity); definition = structuredClone(definition); items = structuredClone(items); beside = structuredClone(beside);
    const row = await this.find(identity); if (!row) stop("version");
    this.#matching(row);
    if (position !== row.versions.length - 1) stop("version");
    if (definitionDigest(definition) !== row.definition) stop("definition-mismatch");
    const old = row.materializations.find(held => held.position === position);
    if (old) return old.act;
    const version = row.versions[position]!;
    const proofs: AuthorizationSource[] = [];
    for (const source of version.after) proofs.push(await this.source(source));
    const declared = definition.acts[version.act.kind];
    if (!declared) stop("version");
    const proof = (source: Source): AuthorizationSource => {
      const found = proofs.find(candidate => equal(candidate.source, source));
      if (!found) return stop("source");
      return found;
    };
    const lowered = lowerActNames(version.act, declared.fields, { item: name =>
      typeof name === "number" ? name : proof(name.output).entry.opened });
    if (lowered.on !== null && typeof lowered.on !== "number") stop("source");
    const shaped = shapeFieldsOf(declared.fields, lowered.fields);
    const expected = lowerActBasis(declared, items, lowered.on, shaped.fields, row.scope, version.act.expected,
      { revision: (source, item) => proof(source).revisions[item] ?? null });
    const act: MaterializedAct = { kind: version.act.kind, on: lowered.on, fields: shaped.fields, expected,
      beside: { ...structuredClone(beside), ...(shaped.texts.length ? { texts: shaped.texts } : {}) } };
    await this.#replace({ ...row, materializations: [...row.materializations, { position, act, sources: proofs }] });
    return act;
  }

  async permit(identity: AuthorizationIdentity, position: number, at: number): Promise<{
    authorization: SigningAuthorization; materialized: MaterializedAct; deadline: Timestamp;
  }> {
    identity = structuredClone(identity);
    const row = await this.find(identity); if (!row) stop("version");
    this.#matching(row);
    if (position !== row.versions.length - 1) stop("version");
    const version = row.versions[position]!, materialized = row.materializations.find(held => held.position === position)?.act;
    if (!materialized) stop("source");
    if (at < Date.parse(version.at) || at >= Date.parse(version.deadline)) stop("deadline");
    if (row.permissions.some(permission => permission.position === position)) stop("authorization-used");
    for (const source of version.after) await this.source(source);
    const permission = row.permissions.length;
    await this.#replace({ ...row, permissions: [...row.permissions, { position, at: timeOf(at), materialized }] });
    return { authorization: { identity, position, permission }, materialized, deadline: version.deadline };
  }

  /** Descriptor changes cannot sign, but do not revoke exact kept live bytes. */
  async canCopy(reference: SigningAuthorization, signed: SignedIntent, at: number): Promise<boolean> {
    reference = structuredClone(reference); signed = structuredClone(signed);
    const row = await this.find(reference.identity);
    if (!row || row.cancelledAt !== undefined || reference.position !== row.versions.length - 1 || at >= Date.parse(signed.intent.notAfter)) return false;
    return signingPermitted(row, reference, signed);
  }

  async #replace(row: Authorization): Promise<void> {
    const rows = [...await this.records()], index = rows.findIndex(held => held.key === row.key);
    if (index < 0) stop("version");
    rows[index] = row;
    this.#stage(rows);
  }
}

/** Historical permission remains true after later cancellation or another gesture. */
export function signingPermitted(row: Authorization, reference: SigningAuthorization, signed: Pick<SignedIntent, "intent">): boolean {
  const version = row.versions[reference.position], permission = row.permissions[reference.permission];
  if (!version || !permission || permission.position !== reference.position || !equal(reference.identity, { key: row.key, owner: row.owner, scope: row.scope })
    || signed.intent.actor !== row.owner || signed.intent.idempotencyKey !== row.key || !equal(signed.intent.to, row.scope)
    || signed.intent.notAfter !== version.deadline || Date.parse(permission.at) < Date.parse(version.at) || Date.parse(permission.at) >= Date.parse(version.deadline)
    || row.cancelledAt !== undefined && (row.cancelledAfterPermissions === undefined || reference.permission >= row.cancelledAfterPermissions)) return false;
  const { beside: _beside, ...act } = permission.materialized;
  return equal({ kind: signed.intent.kind, on: signed.intent.on, fields: signed.intent.fields, expected: signed.intent.expected }, act);
}
