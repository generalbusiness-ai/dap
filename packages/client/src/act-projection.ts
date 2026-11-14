/** Hypothetical state reuses the fold's bookkeeping without a fabricated entry. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, isEffect } from "@generalbusiness/dap-bytes";
import { fixedRowsOf, headsOf, indexRows, itemSettledBy, released, reserved,
  type Capabilities, type judgeActBody, type OwnRequest, type Owners, type StateView, type ValidDefinition } from "@generalbusiness/dap-derive";
import type { ActEffect, ActView, ItemName, Source } from "./act-types.ts";
import type { ActSymbols } from "./act-symbols.ts";
import { projectActItems, textSlot } from "./act-items.ts";
import { ActRecords, replaceMarked } from "./act-records.ts";
import { ActReferences, type SlotMark } from "./act-references.ts";
import { presentActRows, presentActValue } from "./act-rows.ts";
import { copyActState } from "./act-state.ts";
import { ActOpaque, markPendingRequest } from "./act-opaque.ts";

type BodyWrite = Extract<ReturnType<typeof judgeActBody>, { result: "write" }>;
type CaptureName = number | object;
type History = ReadonlyMap<string, ReadonlyMap<CaptureName, number>>;
const sourceKey = (source: Source): string => canonicalize([source.key, source.version]);

export class UnavailableEntryValue extends Error {
  override readonly name = "UnavailableEntryValue";
  readonly source: Source;
  constructor(source: Source) {
    super("the value needs its source's recorded entry");
    this.source = source;
  }
}

function pendingRequest(source: Source, request: Omit<OwnRequest, "hash">): OwnRequest {
  return markPendingRequest({ ...request, get hash(): never { throw new UnavailableEntryValue(source); } }, source);
}

/** Every frame retains its actual recorded cut and its own private writer. */
export class ActProjection {
  readonly references: ActReferences;
  readonly definition: ValidDefinition;
  readonly recorded: StateView;
  readonly raw: StateView;
  readonly history: History;
  readonly assumes: readonly Source[];
  readonly #records: ActRecords;
  constructor(definition: ValidDefinition, recorded: StateView,
    raw: StateView = recorded, records = new ActRecords(recorded.all().records ?? []),
    references = new ActReferences(raw, recorded.all().items), history: History = new Map(),
    assumes: readonly Source[] = []) {
    this.definition = definition;
    this.recorded = recorded;
    this.raw = raw;
    this.history = history;
    this.assumes = assumes;
    this.#records = records;
    this.references = references;
  }

  symbols(): ActSymbols {
    return {
      item: name => typeof name === "number" ? name : this.references.output(name.output).id,
      revision: (source, id) => {
        const item = this.raw.item(id);
        if (!item) return null;
        const name = this.references.captureName(this.references.row(item).name);
        return name === null ? null : this.history.get(sourceKey(source))?.get(name) ?? null;
      },
    };
  }

  basisSymbols(): { revision(source: Source, subject: CaptureName): number | null } {
    return { revision: (source, subject) => this.history.get(sourceKey(source))?.get(subject) ?? null };
  }

  /** A judgment interns its tokens in a new frame and retains the caller's
   * actual compiled definition, without changing an earlier after view. */
  forJudgment(definition: ValidDefinition): ActProjection {
    return new ActProjection(definition, this.recorded, this.raw, this.#records, this.references.fork(this.raw), this.history, this.assumes);
  }

  capabilities(capabilities: Capabilities | null | undefined): Capabilities | null | undefined {
    return capabilities ? this.opaque().capabilities(capabilities) : capabilities;
  }

  private opaque(): ActOpaque {
    return new ActOpaque(this, source => { throw new UnavailableEntryValue(source); });
  }

  reader(): StateView {
    const records = this.#records.reader(source => { throw new UnavailableEntryValue(source); });
    return new Proxy(this.raw, { get: (target, key) => {
      const owner = Object.hasOwn(records, key) ? records : target;
      const value: unknown = Reflect.get(owner, key, owner);
      return typeof value === "function" ? value.bind(owner) : value;
    } });
  }

  project<D extends DeclaredDefinition>(inputSource: Source, body: BodyWrite, owners: Owners | null): {
    projection: ActProjection; after: ActView<D>; effects: readonly ActEffect[]; opens: ItemName | null;
  } {
    const source = Object.freeze(structuredClone(inputSource));
    const scope = this.recorded.scope();
    if (!scope) throw new TypeError("a hypothetical projection needs a recorded scope");
    const alias = scope.head.seq + 2 + this.assumes.length;
    if (!Number.isSafeInteger(alias)) throw new TypeError("the private source address cannot be represented");
    const derived = body.draft.effects;
    if (!derived.every(isEffect)) throw new TypeError("an ordinary body returned an encoded genesis reference");
    const opened = derived.find(effect => effect.effect === "open");
    const current = this.references.token(source);
    const effects = derived.map((effect, index) => {
      const paths = body.outputRefs.filter(mark => mark.effect === index && mark.token === current).map(mark => mark.path);
      if (paths.length && !opened) throw new TypeError("a current output reference has no opening");
      return paths.length ? replaceMarked(effect, paths, alias) : effect;
    });
    const idOf = (id: number): number => opened && id === opened.item ? alias : id;
    const projected = projectActItems(this.raw, this.definition, effects, body.signer, source, body.selfRefs, opened ? alias : null);
    for (const effect of projected.remaining) if (effect.effect !== "record" && effect.effect !== "attention") {
      throw new TypeError(`ordinary exploration cannot project ${effect.effect}`);
    }
    const copy = copyActState(this.raw, this.definition), writer = copy.writer;
    for (const [id, item] of projected.items) {
      const before = this.raw.item(id);
      writer.putItem(item);
      if (before?.state !== item.state) {
        if (before) writer.addCount(before.type, before.state, -1);
        writer.addCount(item.type, item.state, 1);
      }
      if (!before) for (const row of indexRows(this.definition, item, scope.at)) writer.putIndexed(item.type, row.slot, row.key, id);
      for (const fixed of fixedRowsOf(this.definition, item, scope.at, seq => this.recorded.fixedHash(seq))) writer.putFixed(fixed.row, fixed.dependencies);
    }
    for (const effect of effects) if (effect.effect === "value" || effect.effect === "redact") {
      const texts = projected.texts.get(textSlot(idOf(effect.item), effect.slot));
      if (texts) writer.putTexts(idOf(effect.item), effect.slot, texts);
    }
    const records = this.#records.project(effects, body.recordRefs, source, alias);
    records.records.writeTo(writer);
    for (const [id, held] of body.drawn.holders) writer.putHolder(idOf(id), held);
    for (const account of body.drawn.accounts) writer.putAccount({ ...account, seq: alias, item: idOf(account.item) });
    for (const [id, duties] of body.itemDuties) writer.putItemDuties(idOf(id), duties.map(duty => ({ ...duty, item: idOf(duty.item) })));
    for (const send of body.draft.sends) if (send.message.class === "request") {
      const amount = body.requestReservations.get(send.n);
      writer.putRequest(pendingRequest(source, { seq: alias, n: send.n, type: send.message.type, to: send.to, result: null, diagnosis: null,
        ...(amount ? { reservation: amount } : {}) }));
    }
    const settlement = body.itemSettlement;
    for (const [id, item] of projected.items) {
      const before = this.raw.item(id);
      if (this.definition.declared.capacity?.name === "whole-scope" && before && writer.holder(id) !== null
        && this.definition.declared.items[item.type]?.states[item.state]?.final
        && settlement?.item === id && !("sets" in settlement.form) && itemSettledBy(settlement.form, before, item)) writer.settleHolder(id);
    }
    const touched = new Set([...body.drawn.holders.keys()].map(idOf));
    for (const [id, item] of projected.items) if (this.raw.item(id)?.state !== item.state) touched.add(id);
    for (const id of touched) writer.putHolder(id, released(copy.view, this.definition, id));
    for (const head of [body.authority[0]?.fresh, ...body.observed].flatMap(headsOf)) {
      if (head.seq > (writer.observed(head.of, head.subject) ?? -1)) writer.putObserved(head);
    }

    const references = this.references.fork(copy.view), revisions = new Map<CaptureName, number>();
    for (const [id, item] of projected.items) {
      const before = this.raw.item(id), previous = before ? this.references.row(before) : null;
      let marks: SlotMark[] = before ? [...this.references.marks(before)] : [];
      for (const [index, effect] of effects.entries()) {
        if ((effect.effect !== "ref" && effect.effect !== "value") || idOf(effect.item) !== id) continue;
        const space = effect.effect === "ref" ? "refs" : "values";
        marks = marks.filter(mark => mark.space !== space || mark.path[0] !== effect.slot);
        if (effect.effect === "ref" && body.selfRefs.includes(index)) {
          const type = this.definition.declared.items[item.type]?.refs[effect.slot]?.to;
          if (type?.type === "item") marks.push({ space, path: [effect.slot], reference: { output: source } });
          else if (type?.type === "fact") marks.push({ space, path: [effect.slot], reference: { entry: source } });
          else throw new TypeError("an emitted self reference has no item or fact slot");
        }
        for (const mark of body.outputRefs) if (mark.effect === index) {
          if (mark.path[0] !== (effect.effect === "ref" ? "to" : "value")) throw new TypeError("a copied reference names no effect value");
          marks.push({ space, path: [effect.slot, ...mark.path.slice(1)], reference: { output: this.references.source(mark.token) } });
        }
      }
      const name = previous?.name ?? { output: source };
      references.register(item, name, projected.revised.has(id) ? { after: source } : previous?.seen ?? item.revision, marks);
      if (projected.revised.has(id)) {
        const identity = references.captureName(name);
        if (identity === null) throw new TypeError("a revised row has no capture identity");
        revisions.set(identity, item.revision);
      }
    }
    const history = new Map(this.history);
    history.set(sourceKey(source), revisions);
    const next = new ActProjection(this.definition, this.recorded, copy.view, records.records, references, history, [...this.assumes, source]);
    const reader = next.reader();
    const rows = presentActRows(this.definition.declared as D, copy.view.all().items,
      item => {
        const ref = references.row(item);
        return { name: ref.name, seen: ref.seen, assumes: next.assumes };
      },
      item => typeof references.row(item).name === "number" ? this.recorded.item(item.id) : null,
      (item, space, path) => {
        const mark = references.leaf(item, space, path);
        return mark && "output" in mark ? mark : null;
      });
    const after: ActView<D> = { head: structuredClone(scope.head), assumes: [...next.assumes], ...rows,
      count: (type, state) => reader.count(type, state), recordCount: (capability, kind, state) => reader.recordCount(capability, kind, state),
      reservations: reserved(reader, this.definition, { type: "act" }, next.opaque().owners(owners)) };
    const exposed = records.effects.map((effect, index): ActEffect => {
      if (effect.effect === "relation") return effect;
      const item = "item" in effect ? writer.item(idOf(effect.item)) : null;
      if ("item" in effect && !item) throw new TypeError("a local effect has no projected item");
      const name = item ? references.row(item).name : null;
      const leaf = (path: readonly (string | number)[]): ItemName | null => {
        const mark = body.outputRefs.find(mark => mark.effect === index && canonicalize(mark.path) === canonicalize(path));
        return mark ? { output: references.source(mark.token) } : null;
      };
      if (effect.effect === "ref" && item && name !== null) {
        const type = this.definition.declared.items[item.type]?.refs[effect.slot]?.to;
        const to = body.selfRefs.includes(index) ? type?.type === "item" ? { output: source } : { entry: source }
          : effect.to !== null && type ? presentActValue(type, effect.to, path => leaf(["to", ...path])) : effect.to;
        return { ...effect, item: name, to };
      }
      if (effect.effect === "value" && item && name !== null) {
        const type = this.definition.declared.items[item.type]?.values[effect.slot]?.of;
        return { ...effect, item: name, value: effect.value !== null && type
          ? presentActValue(type, effect.value, path => leaf(["value", ...path])) : effect.value };
      }
      return "item" in effect && name !== null ? { ...effect, item: name } : effect;
    });
    return { projection: next, after, effects: exposed, opens: opened ? { output: source } : null };
  }
}
