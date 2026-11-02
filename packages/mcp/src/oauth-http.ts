/** Each OAuth grant owns its transport sessions and streams. Standing refresh
 * starts before the current lease ends. A slow read cannot extend that lease. */
import { McpHttp } from "./http.ts";
import { OAuthAccess, OAUTH_GRANTS_MOST, type OAuthAccessCandidate } from "./oauth-access.ts";

export interface OAuthHttpLayer {
  readonly candidate: OAuthAccessCandidate;
  deadline: number;
  http: McpHttp | null;
  opening: Promise<McpHttp> | null;
  closing: Promise<void> | null;
  stop: (() => void) | null;
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
    if (held && (held.candidate.row !== candidate.row || held.closing || this.ports.now() >= held.deadline)) {
      await this.#close(held);
      held = undefined;
    }
    const deadline = this.access.standingDeadline(candidate);
    if (deadline === null) return null;
    if (!held) {
      while (this.#layers.size >= OAUTH_GRANTS_MOST) await this.#close(this.#layers.values().next().value!);
      const layer: OAuthHttpLayer = { candidate, deadline, http: null, opening: null, closing: null, stop: null };
      this.#layers.set(candidate.id, layer);
      layer.opening = create(layer).catch(error => {
        if (this.#layers.get(candidate.id) === layer) this.#layers.delete(candidate.id);
        throw error;
      });
      held = layer;
    }
    const http = held.http ?? await held.opening!;
    if (held.closing || this.#layers.get(candidate.id) !== held || !this.access.current(candidate)) {
      await this.#close(held);
      return null;
    }
    held.http = http;
    held.deadline = Math.max(held.deadline, deadline);
    return http;
  }

  /** Call after dispatch: idle layers need no standing polling. McpHttp's own
   * lifetime timer also observes this layer's hard deadline. */
  watch(candidate: OAuthAccessCandidate): void {
    const held = this.#layers.get(candidate.id);
    if (!held || held.closing || !held.http) return;
    if (held.http.streams === 0) { held.stop?.(); held.stop = null; return; }
    if (held.stop) return;
    const remaining = held.deadline - this.ports.now();
    if (remaining <= 0) { void this.#close(held).catch(() => {}); return; }
    const accessEnd = Math.min(held.candidate.grant.accessExpires, held.candidate.grant.ends);
    const delay = held.deadline >= accessEnd ? remaining : Math.max(0, Math.min(30_000, remaining - 30_000));
    held.stop = this.#schedule(delay, async () => {
      held.stop = null;
      if (held.closing || this.#layers.get(candidate.id) !== held) return;
      if (!held.http || held.http.streams === 0) return;
      const remaining = held.deadline - this.ports.now();
      if (remaining <= 0) { await this.#close(held); return; }
      // Keep a separate deadline timer while the Native read awaits. A late
      // answer cannot keep a stream open beyond the previous successful read.
      const cancelDeadline = this.#schedule(remaining, () => this.#close(held));
      held.stop = cancelDeadline;
      const admitted = await this.access.standing(held.candidate, true);
      if (held.closing || this.#layers.get(candidate.id) !== held) return;
      cancelDeadline(); held.stop = null;
      const deadline = admitted ? this.access.standingDeadline(held.candidate) : null;
      if (deadline === null || this.ports.now() >= held.deadline) { await this.#close(held); return; }
      held.deadline = deadline;
      this.watch(held.candidate);
    });
  }

  #schedule(delay: number, run: () => Promise<void>): () => void {
    if (this.ports.schedule) return this.ports.schedule(delay, run);
    const timer = setTimeout(() => { void run().catch(() => {}); }, delay);
    return () => clearTimeout(timer);
  }

  #close(layer: OAuthHttpLayer): Promise<void> {
    if (layer.closing) return layer.closing;
    layer.stop?.(); layer.stop = null;
    layer.closing = (async () => {
      try { await (layer.http ?? await layer.opening)?.closeAll(); }
      finally { if (this.#layers.get(layer.candidate.id) === layer) this.#layers.delete(layer.candidate.id); }
    })();
    return layer.closing;
  }

  async closeAll(): Promise<void> { await Promise.all([...this.#layers.values()].map(layer => this.#close(layer))); }
  get streams(): number { return [...this.#layers.values()].reduce((n, layer) => n + (layer.http?.streams ?? 0), 0); }
  abrupt(): void {
    for (const layer of this.#layers.values()) {
      layer.stop?.(); layer.stop = null;
      layer.http?.abrupt();
      if (layer.opening) void layer.opening.then(http => http.abrupt(), () => {});
    }
    this.#layers.clear();
  }
}
