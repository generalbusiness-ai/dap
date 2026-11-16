/**
 * A handle that is built from a declared definition (scope contract,
 * sections 6.2 and 6.4). A caller that holds a definition's value, such as
 * one of the two lane definitions, gets act kinds and fields that are typed
 * from that value's own data, and knows that the scope runs exactly that
 * definition.
 *
 * - `declaredHandle(scope, definition)` reads the digest of the definition
 *   that the scope publishes, and refuses unless it is the digest of the
 *   value given.
 * - `intent(signer, kind, asked)` builds and signs one intent. Before it
 *   signs, it checks the shape of each field against the type the act
 *   declares, and replaces each detached text by its digest. It returns the
 *   signed intent with what travels beside it: the texts, and the facts the
 *   act is presented.
 * - `submit(signed, grants, beside)` sends both.
 *
 * It names no lane and holds no rule. It checks no guard, no grant and no
 * state: whether the act takes effect is the scope's judgment, and the
 * answer says so. A shape that passes here may still be refused there: the
 * scope checks every field again, with its own bounds.
 */

import type { ReferenceValue,
  Answer, Beside, DeclaredDefinition, Digest, FactRef, FieldValue, Grant, Head, ItemQueryRead, MemberRef, PlatformDefinition, Read, ReadRefusal, ScopeRef, SignedIntent, Summary, Timestamp,
} from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import type { ScopeHandle } from "./handle.ts";
import { signedIntent, type Signer, type Signing } from "./intent.ts";
import { effectiveFields, expectedOf, finalStates, viaLeft } from "./expected.ts";
import { shapeDeclaredValues } from "./declared-shape.ts";

// ---------------------------------------------------------------- the types, from the definition's data

/** The value a caller gives for a field of that type. A detached text is given as the text: the handle signs its digest. */
export type ValueOf<T> =
  T extends { type: "text" } ? string
  : T extends { type: "int" } ? number
  : T extends { type: "bool" } ? boolean
  : T extends { type: "time" } ? Timestamp
  : T extends { type: "enum"; of: readonly (infer V)[] } ? V
  : T extends { type: "member" } ? MemberRef
  : T extends { type: "item" } ? number
  : T extends { type: "fact" } ? FactRef
  : T extends { type: "reference" } ? ReferenceValue
  : T extends { type: "scope" } ? ScopeRef
  : T extends { type: "digest" } ? Digest
  : T extends { type: "commit" | "tree" } ? string
  : T extends { type: "list"; of: infer E } ? readonly ValueOf<E>[]
  : T extends { type: "record"; of: infer M } ? Members<M>
  : FieldValue;

/** Named values: each that its declaration requires, and each other one when the caller gives it. */
export type Members<M> =
  { -readonly [N in keyof M as M[N] extends { required: true } ? N : never]: ValueOf<M[N]> }
  & { -readonly [N in keyof M as M[N] extends { required: true } ? never : N]?: ValueOf<M[N]> };

/** The act kinds of a definition that a handle signs: every act but the genesis act, which no intent to an existing scope names. */
export type Kind<D extends DeclaredDefinition> = string extends D["genesis"] ? keyof D["acts"] & string : Exclude<keyof D["acts"] & string, D["genesis"]>;

type Act<D extends DeclaredDefinition, K extends string> = D["acts"][K];
/** The item an act is on: none for an act that opens one, one for a transition, and as the act says for a comment. */
type On<S> = [S] extends ["open"] ? { on?: null } : [S] extends ["transition"] ? { on: number } : { on?: number | null };
type Given<F> = object extends Members<F> ? { fields?: Members<F> } : { fields: Members<F> };
type Shown<A> = A extends { presents: infer P } ? { presented?: { -readonly [N in keyof P]?: FactRef } } : { presented?: Record<string, FactRef> };

/** What a caller asks of one act kind: its item, the revision of each item it names, its fields, and the facts it is presented. */
export type AskedOf<D extends DeclaredDefinition, K extends string> =
  On<Act<D, K>["step"]> & Given<Act<D, K>["fields"]> & Shown<Act<D, K>> & { expected?: Record<string, number> };

/** A signed intent, with what travels beside it and is not signed: each detached text, and each presented fact. */
export interface Signed { signed: SignedIntent; beside: Beside }

/** A read used to derive revisions failed. Its original refusal stays available to the caller. */
export type FailedDeclaredRead = Extract<Read<Summary>, { ok: false }> | Extract<ItemQueryRead, { ok: false }>;
/** A signed packet or the read that stopped preparation before the signer ran. `at` names the summary used, not a promised submission head. */
export type DeclaredIntentResult =
  | ({ ok: true; at: Head } & Signed)
  | { ok: false; reason: "read"; read: FailedDeclaredRead }
  | { ok: false; reason: "definition-mismatch"; published: Digest | PlatformDefinition }
  | { ok: false; reason: "incomplete"; at: Head };
/** Every non-genesis declared act, independently of standing, state or guards. Each method signs; submit remains explicit. */
export type Intents<D extends DeclaredDefinition> = {
  readonly [K in Kind<D>]: (signer: Signer, asked: AskedOf<D, K>, signing?: Signing) => Promise<DeclaredIntentResult>;
};

export { ShapeError, FieldShapeError, shapeFieldsOf } from "./declared-shape.ts";
export type { ShapeFieldType, ShapeField, ShapeFaultCode, FieldShapeOptions } from "./declared-shape.ts";

/** Check one declared act's input without signing or reading a scope.
 * Uses the same item, field and presented-fact checks as the declared handle.
 * It checks no guard, grant or state. */
export function shapeDeclaredAct<D extends DeclaredDefinition, K extends Kind<D>>(definition: D, kind: K, asked: AskedOf<D, K>): { on: number | null; fields: Record<string, FieldValue>; beside: Beside } {
  const given = asked as { on?: number | null; expected?: Record<string, number>; fields?: Record<string, unknown>; presented?: Record<string, unknown> };
  return shapeDeclaredValues(definition, kind, given);
}

// ---------------------------------------------------------------- the handle

export class DeclaredHandle<D extends DeclaredDefinition> {
  readonly intents: Intents<D>;
  /**
   * `scope`: the handle whose published definition was checked. `at`: the
   * scope's reference, which every intent is addressed to. `definition`: the
   * value the caller holds, and `digest` its digest, which the scope pins.
   */
  constructor(readonly scope: ScopeHandle, readonly at: ScopeRef, readonly definition: D, readonly digest: Digest) {
    const methods: Record<string, (signer: Signer, asked: AskedOf<D, Kind<D>>, signing?: Signing) => Promise<DeclaredIntentResult>> = Object.create(null) as Record<string, (signer: Signer, asked: AskedOf<D, Kind<D>>, signing?: Signing) => Promise<DeclaredIntentResult>>;
    for (const kind of Object.keys(definition.acts)) {
      if (kind === definition.genesis) continue;
      Object.defineProperty(methods, kind, { enumerable: true, value: (signer: Signer, asked: AskedOf<D, Kind<D>>, signing: Signing = {}) => this.#fromSummary(signer, kind as Kind<D>, asked, signing) });
    }
    this.intents = methods as Intents<D>;
  }

  /** Derive revisions from one fresh summary, then shape and sign. A caller's captured revisions never refresh. This checks no grant, state or guard and sends nothing. */
  async #fromSummary<K extends Kind<D>>(signer: Signer, kind: K, asked: AskedOf<D, K>, signing: Signing): Promise<DeclaredIntentResult> {
    const definition = structuredClone(this.definition);
    const { on, fields, beside } = structuredClone(shapeDeclaredAct(definition, kind, asked));
    const given = asked as { expected?: Record<string, number> };
    const captured = given.expected === undefined ? undefined : structuredClone(given.expected);
    const controls = { ...signing };
    const summary = await this.scope.summary();
    if (!summary.ok) return { ok: false, reason: "read", read: summary };
    const published = summary.value.definition;
    let digest: Digest | null = null;
    try { digest = definitionDigest(definition); } catch { /* A value without canonical bytes cannot match. */ }
    if (digest !== this.digest || published !== this.digest) return { ok: false, reason: "definition-mismatch", published };
    if (!summary.complete) return { ok: false, reason: "incomplete", at: summary.at };
    let expected = captured;
    if (expected === undefined) {
      const act = definition.acts[kind]!;
      const effective = effectiveFields(act, fields, this.at);
      const items = [...summary.value.items];
      for (const { type, id } of viaLeft(act, items, on, effective)) {
        const states = finalStates(definition.items[type]);
        if (states.length === 0) continue;
        const read = await this.scope.queryItems({ v: 1, scope: this.at, type, states, ids: [id], limit: 1, cursor: null });
        if (!read.ok) return { ok: false, reason: "read", read };
        if (!read.complete) return { ok: false, reason: "incomplete", at: read.at };
        items.push(...read.value.items.filter((item) => item.id === id && item.type === type));
      }
      expected = expectedOf(act, items, on, effective);
    }
    const signed = await signedIntent(signer, { to: this.at, kind, on, expected, fields }, controls);
    return { ok: true, at: summary.at, signed, beside };
  }

  /**
   * One signed intent of that act kind. Each field is checked against its
   * declared type first, and a `ShapeError` is thrown before anything is
   * signed. A detached text is given as the text: the intent holds its
   * digest, and `beside.texts` the text. `beside.presented` holds the facts
   * the act is presented. No guard is checked.
   */
  async intent<K extends Kind<D>>(signer: Signer, kind: K, asked: AskedOf<D, K>, signing: Signing = {}): Promise<Signed> {
    const { on, fields, beside } = shapeDeclaredAct(this.definition, kind, asked);
    const given = asked as { expected?: Record<string, number> };
    const signed = await signedIntent(signer, { to: this.at, kind, on, expected: given.expected ?? {}, fields }, signing);
    return { signed, beside };
  }

  /** Submit a signed intent with the grants it is presented under and what travels beside it. A retry sends all three again, unchanged. */
  submit(signed: SignedIntent, grants: readonly Grant[] = [], beside: Beside = {}): Promise<Answer> {
    return this.scope.submit(signed, grants, beside);
  }
}

/**
 * How `declaredHandle` answers. `definition-mismatch`: the scope publishes
 * another definition than the value given; `published` is what it names.
 * Any other reason is the reason of the read that failed.
 */
export type Declared<D extends DeclaredDefinition> =
  | { ok: true; handle: DeclaredHandle<D> }
  | { ok: false; reason: ReadRefusal | "definition-mismatch"; published?: Digest | PlatformDefinition };

/**
 * A handle on `scope` that is typed from `definition`. It reads the scope's
 * summary, which names the definition the scope pins, and refuses unless
 * that is the digest of the value given. So a caller that holds a
 * definition's value knows that the scope runs exactly that definition. A
 * value that has no canonical bytes has no digest, and is refused as a
 * mismatch.
 */
export async function declaredHandle<const D extends DeclaredDefinition>(scope: ScopeHandle, definition: D): Promise<Declared<D>> {
  const summary = await scope.summary();
  if (!summary.ok) return { ok: false, reason: summary.reason };
  const published = summary.value.definition;
  let digest: Digest | null = null;
  try {
    digest = definitionDigest(definition);
  } catch { /* not canonical values */ }
  if (digest === null || published !== digest) return { ok: false, reason: "definition-mismatch", published };
  return { ok: true, handle: new DeclaredHandle(scope, summary.value.scope, definition, digest) };
}
