/** OAuth chooses standing policy; its transport generation owns every disposal
 * and cancellation handle, including a factory that has not returned yet. */
import { HttpGeneration, type McpHttp } from "./http.ts";
import { OAuthAccess, OAUTH_GRANTS_MOST, type OAuthAccessCandidate } from "./oauth-access.ts";

export interface OAuthHttpLayer {
  readonly candidate: OAuthAccessCandidate;
  readonly generation: HttpGeneration;
  readonly deadline: number;
}
interface LayerPorts {
  now(): number;
  schedule?: (delayMs: number, run: () => Promise<void>) => () => void;
}
export class OAuthHttpLayers {
  readonly #layers = new Map<string, OAuthHttpLayer>();
  constructor(private readonly access: OAuthAccess, private readonly ports: LayerPorts) {}

  async open(candidate: OAuthAccessCandidate, create: (layer: OAuthHttpLayer) => Promise<McpHttp>): Promise<McpHttp | null> {
    let held = this.#layers.get(candidate.id);
    if (held && (held.candidate.row !== candidate.row || held.generation.closed || this.ports.now() >= held.deadline)) {
      await this.#close(held, held.generation.closed ? "existing" : "graceful");
      held = undefined;
    }
    const deadline = this.access.standingDeadline(candidate);
    if (deadline === null) return null;
    if (!held) {
      for (const layer of [...this.#layers.values()]) if (!this.access.current(layer.candidate)) await this.#close(layer);
      if (this.#layers.size >= OAUTH_GRANTS_MOST) return null;
      const generation = new HttpGeneration(deadline);
      const layer: OAuthHttpLayer = { candidate, generation, get deadline() { return generation.deadline; } };
      this.#layers.set(candidate.id, layer);
      held = layer;
    }
    const layer = held;
    let http: McpHttp;
    try { http = await layer.generation.open(() => create(layer)); }
    catch (error) {
      if (this.#layers.get(candidate.id) === layer) this.#layers.delete(candidate.id);
      throw error;
    }
    // The generation already applied its original disposal intent. Rejecting a
    // late result cannot turn a retaining discard into graceful row removal.
    if (layer.generation.closed) return null;
    if (this.#layers.get(candidate.id) !== layer || !this.access.current(candidate)) {
      await this.#close(layer);
      return null;
    }
    layer.generation.extendDeadline(deadline);
    return http;
  }

  /** Idle layers need no standing polling. A held standing read retains its
   * previous hard deadline, and the generation cancels both timers on disposal. */
  watch(candidate: OAuthAccessCandidate): void {
    const held = this.#layers.get(candidate.id);
    if (!held) return;
    const owner = held.generation, http = owner.http;
    if (owner.closed || !http) return;
    if (http.streams === 0) { owner.clearStanding(); return; }
    if (owner.standingScheduled) return;
    const remaining = held.deadline - this.ports.now();
    if (remaining <= 0) { void this.#close(held).catch(() => {}); return; }
    const accessEnd = Math.min(held.candidate.grant.accessExpires, held.candidate.grant.ends);
    const delay = held.deadline >= accessEnd ? remaining : Math.max(0, Math.min(30_000, remaining - 30_000));
    const schedule = (delay: number, run: () => Promise<void>) => this.#schedule(delay, run);
    owner.scheduleStanding(schedule, delay, async () => {
      if (owner.closed || this.#layers.get(candidate.id) !== held || http.streams === 0) return;
      const remaining = held.deadline - this.ports.now();
      if (remaining <= 0) { await this.#close(held); return; }
      const deadlineTimer = owner.scheduleStanding(schedule, remaining, () => this.#close(held));
      const admitted = await this.access.standing(held.candidate, true);
      if (owner.closed || this.#layers.get(candidate.id) !== held) return;
      if (deadlineTimer) owner.clearStanding(deadlineTimer);
      const deadline = admitted ? this.access.standingDeadline(held.candidate) : null;
      if (deadline === null || this.ports.now() >= held.deadline) { await this.#close(held); return; }
      owner.replaceDeadline(deadline);
      this.watch(held.candidate);
    });
  }

  #schedule(delay: number, run: () => Promise<void>): () => void {
    if (this.ports.schedule) return this.ports.schedule(delay, run);
    const timer = setTimeout(() => { void run().catch(() => {}); }, delay);
    return () => clearTimeout(timer);
  }
  #close(layer: OAuthHttpLayer, disposition: "graceful" | "detach" | "existing" = "graceful"): Promise<void> {
    const owner = layer.generation;
    const done = disposition === "detach" ? (owner.detach(), Promise.resolve())
      : disposition === "existing" ? owner.disposed() : owner.graceful();
    return done.finally(() => { if (this.#layers.get(layer.candidate.id) === layer) this.#layers.delete(layer.candidate.id); });
  }
  async closeGrant(id: string, retainSessions = false): Promise<void> {
    const layer = this.#layers.get(id);
    if (layer) await this.#close(layer, retainSessions ? "detach" : "graceful");
  }
  async closeAll(): Promise<void> { await Promise.all([...this.#layers.values()].map(layer => this.#close(layer))); }
  get streams(): number { return [...this.#layers.values()].reduce((n, layer) => n + layer.generation.streams, 0); }
  abrupt(): void {
    for (const layer of this.#layers.values()) layer.generation.abrupt();
    this.#layers.clear();
  }
}
