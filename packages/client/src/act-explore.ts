/** Judge one act body under the caller's checked inputs. This authorizes no send. */
import type { DeclaredDefinition, KeyId } from "@generalbusiness/dap-contract";
import { canonicalize, REFUSAL_CLASSES, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { judgeActBody, type StateView, type Texts, type ValidDefinition } from "@generalbusiness/dap-derive";
import type { Kind } from "./declared.ts";
import { ShapeError, shapeFieldsOf } from "./declared.ts";
import type { Act, ActView, Exploration, PartialAct, Source } from "./act-types.ts";
import { actContext, type ExplorationContext } from "./act-context.ts";
import { bindActBasis } from "./act-basis.ts";
import { missingActInputs } from "./act-input.ts";
import { ActProjection, UnavailableEntryValue } from "./act-projection.ts";
import { copyActState } from "./act-state.ts";
import { lowerActBasis, lowerActNames, UnavailableActSource } from "./act-symbols.ts";
import { actVersion } from "./act-version.ts";

interface Frame { readonly projection: ActProjection; readonly actor: KeyId }
const frames = new WeakMap<object, Frame>();

export interface ExploreInput<D extends DeclaredDefinition, K extends Kind<D>> {
  readonly key: string;
  readonly act: PartialAct<D, K>;
  readonly context: ExplorationContext;
}

/** Added text bytes supplement the port. Other digests retain its readings;
 * the input act keeps its written text. */
function withTexts(context: ExplorationContext, values: readonly string[]): ExplorationContext {
  if (values.length === 0) return context;
  const sizes = new Map(values.map(value => [textDigest(value), utf8(value).length]));
  const texts: Texts = digest => sizes.get(digest) ?? context.texts?.(digest);
  if (context.texts?.redactedOver) texts.redactedOver = context.texts.redactedOver.bind(context.texts);
  return { ...context, texts };
}

/** A returned after view retains its private state. A supplied recorded view
 * is copied at this cut, so a later real submit cannot move that cut. */
export function actExplore<D extends DeclaredDefinition, K extends Kind<D>>(definition: ValidDefinition,
  view: StateView | ActView<D>, input: ExploreInput<D, K>): Exploration<D, K> {
  const { context } = input;
  if (context.owners === undefined) throw new TypeError("owners must be supplied explicitly; use null for checked absence");
  // The checked-context adapter associates D with this actual compiled
  // declaration. Keep its object and digest; do not clone or revalidate it.
  const data = definition.declared as D;
  const missing = missingActInputs(data, input.act);
  if (missing.length > 0 || input.act.kind === undefined) return { is: "incomplete", act: input.act, missing };
  // Presence is checked above. The shared shaper checks values before any
  // judgment; this bridge preserves the author's literal field types.
  const act = { kind: input.act.kind, on: input.act.on ?? null, fields: input.act.fields ?? {},
    ...(input.act.expected === undefined ? {} : { expected: input.act.expected }) } as Act<D, K>;
  const declared = Object.hasOwn(data.acts, act.kind) ? data.acts[act.kind] : undefined;
  if (!declared || act.kind === data.genesis) throw new ShapeError(act.kind, "is not an ordinary act kind");
  const prior = frames.get(view);
  let projection: ActProjection;
  if (prior) {
    if (prior.actor !== context.actor || prior.projection.definition.digest !== definition.digest) return {
      is: "unavailable", act, context: actContext(definition, prior.projection.raw, context, prior.projection.assumes, []), lacks: ["source"],
    };
    projection = prior.projection.forJudgment(definition);
  } else if ("all" in view) {
    const scope = view.scope();
    if (!scope || scope.at.scope !== context.scope.scope || scope.at.genesis !== context.scope.genesis) return {
      is: "unavailable", act, context: actContext(definition, view, context, [], []), lacks: ["source"],
    };
    const snapshot = copyActState(view, definition);
    projection = new ActProjection(definition, snapshot.view);
  } else return { is: "unavailable", act, context: actContext(definition, null, context, [], []), lacks: ["source"] };

  const reader = projection.reader(), scope = reader.scope();
  if (!scope || scope.at.scope !== context.scope.scope || scope.at.genesis !== context.scope.genesis) return {
    is: "unavailable", act, context: actContext(definition, reader, context, projection.assumes, []), lacks: ["source"],
  };
  const fieldSources = new Map<string, Source>();
  let stated = actContext(definition, reader, context, projection.assumes, []);
  try {
    // Opaque selector identities share the recorded resolver. They are not
    // private numeric aliases and never enter the public Act or its digest.
    const capture = lowerActNames(act, declared.fields, { item: name => {
      if (typeof name === "number") return name;
      projection.references.output(name.output);
      return projection.references.token(name.output);
    } }, (source, path) => { if (path !== "on") fieldSources.set(canonicalize(path), source); });
    const subjects = projection.references.captureSubjects(projection.raw.all().items);
    const capturedFields = projection.references.captureFields(capture.fields, fieldSources);
    const bound = bindActBasis(data, act, subjects, { on: capture.on, fields: capturedFields }, scope.at);
    const source: Source = { key: input.key, version: actVersion(bound.act) };
    if (projection.assumes.some(assumed => assumed.key === source.key && assumed.version === source.version)) {
      throw new TypeError("the exploration already assumes this source");
    }
    const names = lowerActNames(bound.act, declared.fields, projection.symbols());
    const shaped = shapeFieldsOf(declared.fields, names.fields);
    stated = actContext(definition, reader, context, projection.assumes, shaped.texts);
    if (stated.head === null) return { is: "unavailable", act: bound.act, context: stated, lacks: ["source"] };
    const expected = lowerActBasis(declared, subjects, capture.on, capturedFields, scope.at, bound.act.expected, projection.basisSymbols());
    const body = judgeActBody(reader, definition, { kind: act.kind, on: names.on, fields: shaped.fields, expected }, {
      ...withTexts(context, shaped.texts), provenance: projection.references.classifier({ source, on: bound.act.on,
        fields: fieldSources, expected: bound.act.expected }),
    });
    if (body.result === "refused") return { is: "refused", act: bound.act, context: stated, bound: bound.bound,
      reason: body.reason, class: REFUSAL_CLASSES[body.reason], ...(body.name === undefined ? {} : { name: body.name }) };
    if (body.result === "due") return { is: "unavailable", act: bound.act, context: stated, lacks: ["due"] };
    if (body.result === "unavailable") return { is: "unavailable", act: bound.act, context: stated,
      lacks: "lacks" in body ? body.lacks : [body.reason] };
    const result = projection.project<D>(source, body, context.owners);
    frames.set(result.after, { projection: result.projection, actor: context.actor });
    return { is: "admitted", source, act: bound.act, context: stated, bound: bound.bound, effects: result.effects,
      sends: body.draft.sends.length, opens: result.opens, judgesTime: body.draft.judgesTime, after: result.after };
  } catch (error) {
    if (error instanceof UnavailableActSource) return { is: "unavailable", act, context: stated, lacks: ["source"] };
    if (error instanceof UnavailableEntryValue) return { is: "unavailable", act, context: stated, lacks: ["entry"] };
    throw error;
  }
}
