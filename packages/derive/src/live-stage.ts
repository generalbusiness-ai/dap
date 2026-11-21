/** Experimental live-only overlay. The base is not changed until commit. */
export interface StageChange { readonly collection: string; readonly key: unknown; readonly before: unknown; readonly after: unknown; readonly hadBefore: boolean; readonly hasAfter: boolean }
type Op<K, V> = { key: K; present: true; value: V } | { key: K; present: false };

export class StageMap<K, V> extends Map<K, V> {
  #ops: Op<K, V>[] | null = null;
  #latest = new Map<K, Op<K, V>>();
  #reinserted = new Set<K>();
  begin(): void { if (this.#ops) throw new Error("nested live transaction"); this.#ops = []; }
  override has(key: K): boolean { const op = this.#latest.get(key); return op ? op.present : super.has(key); }
  override get(key: K): V | undefined { const op = this.#latest.get(key); return op ? op.present ? op.value : undefined : super.get(key); }
  override set(key: K, value: V): this {
    if (!this.#ops) return super.set(key, value);
    if (!this.has(key)) this.#reinserted.add(key);
    const op: Op<K, V> = { key, present: true, value }; this.#ops.push(op); this.#latest.set(key, op); return this;
  }
  override delete(key: K): boolean {
    if (!this.#ops) return super.delete(key);
    if (!this.has(key)) return false;
    const op: Op<K, V> = { key, present: false }; this.#ops.push(op); this.#latest.set(key, op); return true;
  }
  override *entries(): MapIterator<[K, V]> {
    for (const [key, value] of super.entries()) {
      if (this.#reinserted.has(key)) continue;
      const op = this.#latest.get(key);
      if (!op) yield [key, value]; else if (op.present) yield [key, op.value];
    }
    const inserted = new Map<K, true>();
    const presence = new Map<K, boolean>();
    for (const op of this.#ops ?? []) {
      const present = presence.get(op.key) ?? super.has(op.key);
      if (!op.present) { presence.set(op.key, false); inserted.delete(op.key); }
      else { if (!present) inserted.set(op.key, true); presence.set(op.key, true); }
    }
    for (const key of inserted.keys()) { const op = this.#latest.get(key); if (op?.present) yield [key, op.value]; }
  }
  override [Symbol.iterator](): MapIterator<[K, V]> { return this.entries(); }
  override *keys(): MapIterator<K> { for (const [key] of this.entries()) yield key; }
  override *values(): MapIterator<V> { for (const [, value] of this.entries()) yield value; }
  override get size(): number { if (!this.#ops) return super.size; let n = super.size; for (const [key, op] of this.#latest) n += Number(op.present) - Number(super.has(key)); return n; }
  changes(collection: string): StageChange[] { return [...this.#latest].map(([key, op]) => ({ collection, key, before: super.get(key), hadBefore: super.has(key), after: op.present ? op.value : undefined, hasAfter: op.present })); }
  commit(): void { const ops = this.#ops; this.#ops = null; this.#latest.clear(); this.#reinserted.clear(); for (const op of ops ?? []) { if (op.present) super.set(op.key, op.value); else super.delete(op.key); } }
  discard(): void { this.#ops = null; this.#latest.clear(); this.#reinserted.clear(); }
  get staged(): boolean { return this.#ops !== null; }
}

/** Set iteration uses the same ordered overlay as maps. */
export class StageSet<T> {
  readonly #map = new StageMap<T, true>();
  begin(): void { this.#map.begin(); }
  has(value: T): boolean { return this.#map.has(value); }
  add(value: T): this { this.#map.set(value, true); return this; }
  delete(value: T): boolean { return this.#map.delete(value); }
  get size(): number { return this.#map.size; }
  [Symbol.iterator](): IterableIterator<T> { return this.#map.keys(); }
  changes(collection: string): StageChange[] { return this.#map.changes(collection); }
  commit(): void { this.#map.commit(); }
  discard(): void { this.#map.discard(); }
}
