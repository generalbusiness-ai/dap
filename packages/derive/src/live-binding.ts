import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";

/** Private ordinals for an opted-in live generation. Names remain public. */
export class LiveBindings {
  readonly #types = new Map<string, number>();
  readonly #names: { name: string; states: string[]; slots: string[]; stateIds: Map<string, number>; slotIds: Map<string, number> }[] = [];
  constructor(types: ReadonlyMap<string, { states: ReadonlyMap<string, boolean>; slots: ReadonlyMap<string, unknown> }>) {
    for (const [name, type] of types) {
      const states = [...type.states.keys()], slots = [...type.slots.keys()];
      this.#types.set(name, this.#names.length);
      this.#names.push({ name, states, slots, stateIds: new Map(states.map((s, i) => [s, i])), slotIds: new Map(slots.map((s, i) => [s, i])) });
    }
  }
  type(name: string): number | undefined { return this.#types.get(name); }
  state(type: string, name: string): number | undefined { const id = this.type(type); return id === undefined ? undefined : this.#names[id]!.stateIds.get(name); }
  slot(type: string, name: string): number | undefined { const id = this.type(type); return id === undefined ? undefined : this.#names[id]!.slotIds.get(name); }
  names(type: number, slot: number, state: number): { type: string; slot: string; state: string } {
    const row = this.#names[type], slotName = row?.slots[slot], stateName = row?.states[state];
    if (!row || slotName === undefined || stateName === undefined) throw new Error("invalid live index ordinal");
    return { type: row.name, slot: slotName, state: stateName };
  }
  typeState(type: number, state: number): [string, string] { const row = this.#names[type], name = row?.states[state]; if (!row || name === undefined) throw new Error("invalid live state ordinal"); return [row.name, name]; }
  /** Logical charge for the forward maps and reverse arrays, each paid once. */
  get logicalBytes(): number {
    const bytes = (value: unknown) => utf8(canonicalize(value)).length;
    let total = 0;
    for (const [id, row] of this.#names.entries()) {
      total += bytes(["type-forward", row.name, id]) + bytes(["type-reverse", id, row.name]);
      row.states.forEach((name, i) => { total += bytes(["state-forward", id, name, i]) + bytes(["state-reverse", id, i, name]); });
      row.slots.forEach((name, i) => { total += bytes(["slot-forward", id, name, i]) + bytes(["slot-reverse", id, i, name]); });
      if (!Number.isSafeInteger(total)) throw new RangeError("live binding exceeds safe arithmetic");
    }
    return total;
  }
}
