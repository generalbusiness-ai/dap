/** Opaque callbacks receive only complete answers, never private entry addresses. */
import type { FieldType } from "@generalbusiness/dap-contract";
import type { Capabilities, CapabilityGiven, Item, Owners, OwnRequest, StateSnapshot, StateView } from "@generalbusiness/dap-derive";
import type { ActProjection } from "./act-projection.ts";
import type { Source } from "./act-types.ts";
import { guardObject } from "./act-object.ts";

const requests = new WeakMap<OwnRequest, Source>();

/** Mark the actual request object at its write, before copying any later frame. */
export function markPendingRequest(request: OwnRequest, source: Source): OwnRequest {
  requests.set(request, source);
  return request;
}

export class ActOpaque {
  readonly projection: ActProjection;
  readonly missing: (source: Source) => never;
  constructor(projection: ActProjection, missing: (source: Source) => never) {
    this.projection = projection;
    this.missing = missing;
  }

  #stop(source = this.projection.assumes.at(-1)): never {
    if (!source) throw new TypeError("an incomplete hypothetical answer has no producing Source");
    return this.missing(source);
  }
  #pending(item: Item): boolean { return typeof this.projection.references.row(item).name !== "number"; }
  #item(id: number, view: StateView): void {
    // Core owns the current working phase, which has not been projected yet.
    view.item(id);
    if (!this.projection.recorded.item(id) && this.projection.raw.all().items.some(item => this.#pending(item))) this.#stop();
  }
  #ids(ids: readonly number[]): void {
    for (const id of ids) {
      const item = this.projection.raw.item(id);
      if (item && this.#pending(item)) this.#stop();
    }
  }
  #ownerItem(item: Item): Item {
    const identity = this.projection.references.row(item);
    const declaration = this.projection.definition.declared.items[item.type];
    const marks = this.projection.references.marks(item);
    const leaf = (value: unknown, type: FieldType | null, path: readonly (string | number)[], space: "refs" | "values"): unknown => {
      const mark = marks.find(mark => mark.space === space && JSON.stringify(mark.path) === JSON.stringify(path));
      if (mark) return this.#stop("entry" in mark.reference ? mark.reference.entry : mark.reference.output);
      if (type?.type === "item" && typeof value === "number" && !this.projection.recorded.item(value)
        && this.projection.raw.all().items.some(row => this.#pending(row))) return this.#stop();
      if (value === null || typeof value !== "object") return value;
      return guardObject(value, key => {
        const index = Array.isArray(value) && typeof key === "string" && /^\d+$/.test(key);
        const next = type?.type === "list" && index ? type.of : type?.type === "record" ? type.of[String(key)] ?? null : null;
        return leaf(Reflect.get(value, key), next, [...path, Array.isArray(value) && typeof key === "string" && /^\d+$/.test(key) ? Number(key) : String(key)], space);
      });
    };
    return guardObject(item, key => {
      if (key === "id" && typeof identity.name !== "number") return this.#stop(identity.name.output);
      if (key === "revision" && typeof identity.seen !== "number") return this.#stop(identity.seen.after);
      if (key === "opened" && typeof identity.name !== "number") return this.#stop(identity.name.output);
      if (key === "refs" || key === "values") return guardObject(item[key], name => {
        const type = key === "refs" ? declaration?.refs[String(name)]?.to : declaration?.values[String(name)]?.of;
        return leaf(Reflect.get(item[key], name), type ?? null, [String(name)], key);
      });
      return Reflect.get(item, key);
    });
  }
  #marked(type?: string, slot?: string, fixed = false): boolean {
    return this.projection.raw.all().items.some(item => {
      if (type !== undefined && item.type !== type) return false;
      const declaration = this.projection.definition.declared.items[item.type];
      return this.projection.references.marks(item).some(mark => {
        if (slot !== undefined && mark.path[0] !== slot) return false;
        return !fixed || (mark.space === "refs" ? declaration?.refs[String(mark.path[0])]?.fixed
          : declaration?.values[String(mark.path[0])]?.fixed) === true;
      });
    });
  }
  #unknownDependency(): boolean {
    return this.projection.raw.all().items.some(item => {
      const declaration = this.projection.definition.declared.items[item.type];
      return this.projection.references.marks(item).some(mark => "entry" in mark.reference
        && (mark.space === "refs" ? declaration?.refs[String(mark.path[0])]?.fixed
          : declaration?.values[String(mark.path[0])]?.fixed) === true);
    });
  }
  #newRequests(): readonly OwnRequest[] { return this.projection.raw.all().requests.filter(request => requests.has(request)); }
  #accountPending(account: { seq: number; n: number }): boolean {
    const request = this.projection.raw.request(account.seq, account.n);
    return request !== null && requests.has(request);
  }
  #cut(): number {
    const scope = this.projection.recorded.scope();
    if (!scope) throw new TypeError("an opaque hypothetical view has no recorded cut");
    return scope.head.seq;
  }

  view(view: StateView, owner = false): StateView {
    const raw = this.projection.raw;
    const snapshot = (): StateSnapshot => {
      const state = view.all();
      return guardObject(state, key => {
        if (key === "items") return owner ? raw.all().items.map(item => this.#ownerItem(item)) : state.items;
        if (key === "records" && Object.hasOwn(state, key)) {
          const groups = new Map<string, { capability: NonNullable<StateSnapshot["records"]>[number]["capability"]; kind: string }>();
          for (const row of raw.all().records ?? []) groups.set(JSON.stringify([row.capability, row.kind]), row);
          return [...groups.values()].flatMap(({ capability, kind }) => view.records(capability, kind));
        }
        if (key === "requests" && this.#newRequests().length) this.#stop();
        if (key === "holders") this.#ids((state.holders ?? []).map(holder => holder.item));
        if (key === "accounts") {
          if ((state.accounts ?? []).some(account => this.#accountPending(account))) this.#stop();
          this.#ids((state.accounts ?? []).map(account => account.item));
        }
        if (key === "itemDuties") this.#ids((state.itemDuties ?? []).map(duty => duty.item));
        if (key === "texts") this.#ids(state.texts.map(([item]) => item));
        if (key === "settledHolders") this.#ids(state.settledHolders ?? []);
        if (key === "accepted" && this.projection.assumes.length) this.#stop();
        return Reflect.get(state, key);
      });
    };
    const overrides: Partial<StateView> = {
      all: snapshot,
      ...(owner ? {
        item: (id: number) => {
          this.#item(id, view);
          const item = raw.item(id);
          return item ? this.#ownerItem(item) : null;
        },
        page: (type: string, states: readonly string[], after: number | null, limit: number) => {
          if (after !== null) this.#item(after, view);
          const page = raw.page(type, states, after, limit);
          return { ...page, items: page.items.map(item => this.#ownerItem(item)) };
        },
      } : {}),
      heldEntryCount: () => this.projection.assumes.length ? this.#stop() : view.heldEntryCount!(),
      fixedHash: seq => seq > this.#cut() && this.projection.assumes.length ? this.#stop() : view.fixedHash(seq),
      itemDuties: item => {
        if (item !== undefined) this.#item(item, view);
        const duties = view.itemDuties(item);
        this.#ids(duties.map(duty => duty.item));
        return duties;
      },
      holder: item => { this.#item(item, view); return view.holder(item); },
      holderSettled: item => { this.#item(item, view); return view.holderSettled(item); },
      texts: (item, slot) => { this.#item(item, view); return view.texts(item, slot); },
      operationsFor: item => { this.#item(item, view); return view.operationsFor(item); },
      relation: (owner, name, item) => { this.#item(item, view); return view.relation(owner, name, item); },
      holders: () => {
        const holders = view.holders();
        this.#ids(holders.map(holder => holder.item));
        return holders;
      },
      request: (seq, n) => {
        if (seq > this.#cut() && this.#newRequests().length) this.#stop();
        return view.request(seq, n);
      },
      account: (seq, n) => {
        if (seq > this.#cut() && (raw.all().accounts ?? []).some(account => this.#accountPending(account))) this.#stop();
        const item = view.account(seq, n);
        if (item !== null) this.#ids([item]);
        return item;
      },
      pendingRequests: () => {
        const pending = view.pendingRequests();
        if (pending.some(request => requests.has(request))) this.#stop();
        return pending;
      },
      accountsOf: item => {
        this.#item(item, view);
        const accounts = view.accountsOf(item);
        if (accounts.some(account => this.#accountPending(account))) this.#stop();
        this.#ids(accounts.map(account => account.item));
        return accounts;
      },
      accepted: (actor, key) => {
        const accepted = view.accepted(actor, key);
        return accepted === null && this.projection.assumes.length ? this.#stop() : accepted;
      },
      lookup: (type, slot, key, limit) => {
        if (this.projection.definition.keyed?.[type]?.includes(slot) && this.#marked(type, slot)) this.#stop();
        const ids = view.lookup(type, slot, key, limit);
        if (ids) this.#ids(ids);
        return ids;
      },
      fixedCount: (type, slot, key, states, mode) => {
        if (this.#marked(type, slot, true)) this.#stop();
        return view.fixedCount(type, slot, key, states, mode);
      },
      fixedAffected: (seq, hash) => {
        // An unknown dependency can hide membership, so guard BEFORE querying.
        if (this.#unknownDependency()) this.#stop();
        const rows = view.fixedAffected(seq, hash);
        this.#ids(rows.map(row => row.item));
        return rows;
      },
      fixedReady: (definition, at, head) => this.#marked(undefined, undefined, true) ? this.#stop() : view.fixedReady(definition, at, head),
    };
    if (!view.heldEntryCount) delete overrides.heldEntryCount;
    return guardObject(view, key => {
      const owner = Object.hasOwn(overrides, key) ? overrides : view;
      const value: unknown = Reflect.get(owner, key, owner);
      return typeof value === "function" ? value.bind(owner) : value;
    });
  }

  capabilities(capabilities: Capabilities): Capabilities {
    const given = (value: CapabilityGiven): CapabilityGiven => {
      let view: StateView | undefined;
      // Forward the completed public context. Constructing this facade reads
      // only own keys, never the intent descriptor or its lazy resolver.
      return guardObject(value, key => key === "view" ? (view ??= this.view(value.view)) : Reflect.get(value, key, value));
    };
    const overrides: Partial<Capabilities> = {
      guard: (capability, name, args, value) => capabilities.guard(capability, name, args, given(value)),
      effect: (capability, name, args, value) => capabilities.effect(capability, name, args, given(value)),
      ...(capabilities.deriveEffect ? { deriveEffect: (capability, name, args, value) => capabilities.deriveEffect!(capability, name, args, given(value)) } satisfies Pick<Capabilities, "deriveEffect"> : {}),
      ...(capabilities.workspace ? { workspace: (view, definition, self, k, holds, working) => capabilities.workspace!(this.view(view), definition, self, k, holds, working) } satisfies Pick<Capabilities, "workspace"> : {}),
    };
    return guardObject(capabilities, key => {
      const owner = Object.hasOwn(overrides, key) ? overrides : capabilities;
      const value: unknown = Reflect.get(owner, key, owner);
      return typeof value === "function" ? value.bind(owner) : value;
    });
  }

  owners(owners: Owners | null): Owners | null {
    if (owners === null) return null;
    const overrides: Partial<Owners> = {
      ...(owners.reserves ? { reserves: (view, definition) => owners.reserves!(this.view(view, true), definition) } satisfies Pick<Owners, "reserves"> : {}),
      ...(owners.reservations ? { reservations: (view, definition) => owners.reservations!(this.view(view, true), definition) } satisfies Pick<Owners, "reservations"> : {}),
    };
    return guardObject(owners, key => {
      const owner = Object.hasOwn(overrides, key) ? overrides : owners;
      const value: unknown = Reflect.get(owner, key, owner);
      return typeof value === "function" ? value.bind(owner) : value;
    });
  }
}
