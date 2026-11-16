/** Pure pieces of the one submit that a passed `now` drives. The member call owns the fence, the reads, the writes and the
 * order: these functions check presence and identity, compose the candidate act from the stored act and the passed `now`,
 * and build the one adoption value. They never take `Explore.result.act`, which can autofill an omitted key. */
import type { ActType, DeclaredDefinition } from "@generalbusiness/dap-contract";
import { same } from "@generalbusiness/dap-bytes";
import { expectedKeys } from "@generalbusiness/dap-derive";
import type { ActRef, ItemName, Revision } from "./act-types.ts";
import { ShapeError } from "./declared-shape.ts";
import { nowExpected, type DraftNow, type DraftNowView } from "./draft-now.ts";
import { refineDraft, type DraftBinding, type DraftCapture, type StoredDraft, type StoredDraftEntry } from "./draft-store.ts";

/** The one stop of this module. The member's `shape` stop, with the path and the reason. */
export interface DraftShapeStop { readonly ok: false; readonly stop: "shape"; readonly field: string; readonly what: string }
const stopped = (field: string, what: string): DraftShapeStop => ({ ok: false, stop: "shape", field, what });
/** A returned draft whose view cannot render a subject. `subject` names it, or is null when the view holds no cut at all. */
export interface DraftStateStop { readonly ok: false; readonly stop: "state"; readonly subject: string | null }

/** The act as the next step explores and signs it: the stored act and the expected of the passed `now`. */
export interface DraftCandidate {
  readonly kind: string;
  readonly on: ItemName | null;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly expected: Readonly<Record<string, Revision>>;
}

function declaredAct(definition: DeclaredDefinition, kind: string): ActType {
  const declared = Object.hasOwn(definition.acts, kind) ? definition.acts[kind] : undefined;
  if (!declared || kind === definition.genesis) throw new TypeError("invalid draft submit: draft kind is not declared");
  return declared;
}
const nonCodeNames = (declared: ActType): string[] =>
  Object.entries(declared.also).filter(([, rule]) => !("code" in rule)).map(([name]) => name);

/** The first fault that makes `now` another draft's or another act's value, or null. */
function identityFault(definition: DeclaredDefinition, stored: StoredDraft, now: DraftNow): DraftShapeStop | null {
  const declared = declaredAct(definition, stored.act.kind);
  if (now.key !== stored.key) return stopped("now.key", "is the now of another draft");
  if (now.kind !== stored.act.kind) return stopped("now.kind", "is the now of another act kind");
  if (!same(now.address, stored.slot)) return stopped("now.address", "is the now of another address");
  const names = expectedKeys(declared, nonCodeNames(declared)).sort();
  if (!same(names, Object.keys(now.subjects).sort())) return stopped("now.subjects", "does not name exactly the act's subjects");
  const needsOn = declared.step !== "open" && declared.on !== null;
  if (needsOn !== (now.primary !== null) || !same(now.primary?.name ?? null, stored.act.on)) {
    return stopped("now.primary", "does not name the draft's primary");
  }
  if (declared.step === "transition") {
    const on = now.subjects["on"];
    if (!now.primary || on?.is !== "present" || !same(on.ref, now.primary)) return stopped("now.subjects.on", "must be the primary");
  }
  return null;
}

/** Step 3 of the member call, after the raw batch is read and the key's priorities (`taken`, `state`) have passed.
 * `returned` is the call's own finding: the draft is a returned draft (form 1 marker or a kept refused request).
 * `view` is the call's own `draftNowOf` over the rows it holds at this call. A returned draft whose view cannot render
 * a subject stops with `state` before any check of `now`. Otherwise a returned draft takes exactly one `now`, and an
 * editing draft takes none. */
export function checkDraftNow(input: {
  readonly definition: DeclaredDefinition;
  readonly stored: StoredDraft;
  readonly returned: boolean;
  readonly view: DraftNowView;
  readonly now: DraftNow | null | undefined;
}): { readonly ok: true; readonly now: DraftNow | null } | DraftShapeStop | DraftStateStop {
  const { definition, stored, returned, view, now } = input;
  if (!returned) return now === undefined ? { ok: true, now: null } : stopped("now", "is not taken: this draft is editing");
  if (view.is !== "now") return { ok: false, stop: "state", subject: view.is === "lacks" ? view.subject : null };
  if (now === undefined || now === null) return stopped("now", "is required: pass the now that the returned draft showed");
  const fault = identityFault(definition, stored, now);
  return fault ?? { ok: true, now };
}

/** Step 4: the candidate and the one adoption value, from the stored act and `now`. Edit defaults and recapture do not run.
 * The adopted draft holds the passed refs as `expected`, `capture` and `namedRefs`, and has no return marker. */
export function composeDraftCandidate(input: {
  readonly definition: DeclaredDefinition;
  readonly stored: StoredDraft;
  readonly now: DraftNow;
}): { readonly ok: true; readonly candidate: DraftCandidate; readonly adopted: StoredDraft } | DraftShapeStop {
  const { definition, stored, now } = structuredClone(input);
  const declared = declaredAct(definition, stored.act.kind);
  const fault = identityFault(definition, stored, now);
  if (fault) return fault;
  // A subject the draft names by a supplied ref keeps its ref capture. It must still render.
  const supplied = new Map<string, string | null>();
  if (declared.step === "transition" && stored.namedRefs.on !== null) supplied.set("on", null);
  for (const [name, rule] of Object.entries(declared.also)) {
    if (!("code" in rule) && "by" in rule && Object.hasOwn(stored.namedRefs.fields, rule.by)) supplied.set(name, rule.by);
  }
  const capture: Record<string, DraftCapture> = {};
  const refs = new Map<string, ActRef>();
  for (const [name, selected] of Object.entries(now.subjects)) {
    const before = Object.hasOwn(stored.capture, name) ? stored.capture[name] : undefined;
    let held: DraftCapture;
    if (selected.is === "present") {
      refs.set(name, selected.ref);
      held = { is: supplied.has(name) ? "ref" : "derived", ref: selected.ref };
    } else if (supplied.has(name)) return stopped(`now.subjects.${name}`, "is absent for a subject that the draft names");
    else held = { is: before?.is === "undetermined" ? "undetermined" : "absent" };
    Object.defineProperty(capture, name, { value: held, enumerable: true, writable: true, configurable: true });
  }
  const fields: Record<string, ActRef> = {};
  for (const [field, previous] of Object.entries(stored.namedRefs.fields)) {
    const subject = [...supplied].find(([, by]) => by === field)?.[0]; // null (the primary) never equals a field name
    Object.defineProperty(fields, field, { value: (subject === undefined ? undefined : refs.get(subject)) ?? previous,
      enumerable: true, writable: true, configurable: true });
  }
  const expected = nowExpected(now);
  const { returned, ...kept } = stored;
  void returned;
  const next: StoredDraft = { ...kept, act: { ...stored.act, expected }, capture,
    namedRefs: { on: stored.namedRefs.on === null ? null : now.primary, fields } };
  try {
    // The stored row is its own binding here: the caller checked it against the client's binding before this step (DD-1).
    const binding: DraftBinding = { owner: stored.owner, scope: stored.scope, definition: stored.definition, descriptors: { [stored.act.kind]: stored.descriptor } };
    const adopted = refineDraft(next, binding, definition);
    return { ok: true, adopted, candidate: { kind: stored.act.kind, on: stored.act.on, fields: stored.act.fields, expected } };
  } catch (error) {
    if (error instanceof ShapeError) return stopped("now", "does not fit the draft's own refs");
    throw error;
  }
}

/** The one batch value for step 6: the whole stored batch with the adopted draft in its place. One write. */
export function adoptionBatch(batch: readonly StoredDraftEntry[], adopted: StoredDraft): readonly StoredDraftEntry[] {
  const at = batch.findIndex(entry => entry.key === adopted.key);
  const current = batch[at];
  if (current?.is !== "draft") throw new TypeError("invalid draft adoption: the batch holds no draft under this key");
  return structuredClone(batch.map((entry, index) => index === at ? adopted : entry));
}
