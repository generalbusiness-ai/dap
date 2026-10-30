/** Production workspace operations for the explicit hold@2 family. */
import type { FactRef, FieldValue, KeyId, ScopeId } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isFactRef, isLocalId, isOperationId, isRecord, same, timeMs } from "@generalbusiness/dap-bytes";
import { ANCESTRY_BOUNDS, ledgerOf, snapshotInput, stagedRefName, walk, type RecordState } from "@generalbusiness/dap-derive";
import { TokenDriver, branchRef, isObjectId, type LiveToken, type MintAsk, type RevokeAsk } from "@generalbusiness/dap-git";
import type { DestinationRepository, ReadCredential } from "./destination-host.ts";
import type { OutsideGiven } from "./given.ts";
import type { EffectAnswer, EffectRequest, Outside } from "./operations.ts";
import type { Sql } from "./sqlite.ts";
import { proofEntry, PROOF_BYTE_BOUNDS } from "./proof-bytes.ts";
import { ArtifactsProvider } from "./artifacts-host.ts";
import { workspaceRepository, type WorkspaceRepository, type WorkspaceSources } from "./workspace-lineage.ts";

const OWNER = "hold@2";
const kinds = new Set(["head", "fork", "stage", "check", "mint", "revoke", "delete", "deletion"]);
const answer = (basis: "read" | "own-answer", body: unknown, result: "confirmed" | "refused" = "confirmed"): EffectAnswer => ({ result, evidence: { basis, body: body as FieldValue } });
const SCHEMA = `CREATE TABLE IF NOT EXISTS private_workspace_token (
 scope TEXT NOT NULL, token INTEGER NOT NULL, id TEXT NOT NULL, ends TEXT NOT NULL,
 repository TEXT NOT NULL, plaintext TEXT, actor TEXT NOT NULL, mint TEXT NOT NULL,
 PRIMARY KEY(scope,token), UNIQUE(scope,id)
) WITHOUT ROWID;`;
interface Held { id: string; ends: string; repository: DestinationRepository; plaintext: string; actor: string; mint: string }

export class WorkspaceHost implements Outside {
  readonly #given: OutsideGiven;
  readonly #sql: Pick<Sql, "exec">;
  readonly #provider: ArtifactsProvider;
  readonly #sources: WorkspaceSources;
  readonly #register: ScopeId;
  readonly #namespace: string;
  readonly #tokens: TokenDriver;
  readonly #minting = new Map<number, { repository: DestinationRepository; actor: string; mint: string }>();
  constructor(given: OutsideGiven, sql: Pick<Sql, "exec">, provider: ArtifactsProvider, sources: WorkspaceSources, register: ScopeId, namespace: string) {
    this.#given = given; this.#sql = sql; this.#provider = provider; this.#sources = sources; this.#register = register; this.#namespace = namespace;
    sql.exec(SCHEMA).toArray();
    this.#tokens = new TokenDriver({ host: { mint: ask => this.#mint(ask), revoke: ask => this.#revoke(ask) }, custody: { take: token => this.#take(token) } });
  }
  accepts(owner: string, kind: string): boolean {
    return owner === OWNER && kinds.has(kind) && this.#given.scope()?.at.kind === "lane"
      && this.#given.definition?.()?.declared.capabilities?.some(capability => capability.name === "hold" && capability.version === 2) === true;
  }
  /** Target availability only, before the native driver's durable send mark. */
  ready(request: Omit<EffectRequest, "sentAt">): boolean {
    if (request.owner !== OWNER || request.kind !== "mint") return true;
    const minted = request.origin.entry.effects.find(effect => effect.effect === "record" && effect.capability === OWNER && effect.kind === "token" && effect.values["mint"] === request.operation);
    if (minted?.effect !== "record") return true;
    const root = isLocalId(minted.values["root"]) ? this.#record("root", minted.values["root"]) : null;
    if (minted.values["purpose"] === "staging" && root?.state === "retiring" && root.values["retirement"] === minted.values["operation"]) return true;
    const hold = isLocalId(minted.values["hold"]) ? minted.values["hold"] : root?.values["hold"];
    const instance = minted.values["instance"] ?? root?.values["instance"];
    return isLocalId(hold) && typeof instance === "string" && this.#held(hold, instance) !== null && this.#record("fork", hold)?.state === "selected";
  }
  late: NonNullable<Outside["late"]> = deliver => this.#tokens.late(deliver);
  judged: NonNullable<Outside["judged"]> = (at, sealed) => {
    this.#tokens.judged(at, sealed);
    if (same(at.scope, this.#given.scope()?.at)) this.#forgetMint(at.operation);
  };
  #forgetMint(operation: string): void {
    for (const [number, pending] of this.#minting) if (pending.mint === operation) this.#minting.delete(number);
  }
  #scope(): string { return canonicalize(this.#given.scope()!.at); }
  #forkName(hold: number, opening: number, attempt: number): string {
    const at = this.#given.scope()!.at;
    return `h-${at.scope.slice(3, 35)}-${at.inc.slice(3)}-${hold}-${opening}-${attempt}`;
  }
  #record(kind: string, key: number): RecordState | null { return this.#given.state.record(OWNER, kind, [key]); }
  #records(kind: string, member: string, value: FieldValue): readonly RecordState[] { return this.#given.state.records(OWNER, kind, { member, value }); }
  #held(hold: number, instance?: string): { ends: number | null } | null {
    const item = this.#given.state.item(hold), definition = this.#given.definition?.(), scope = this.#given.scope();
    const type = item && definition?.holdTypes.includes(item.type) ? definition.declared.items[item.type] : null;
    const now = timeMs(this.#given.clock.read()), previous = scope ? timeMs(scope.time) : null;
    if (!item || !type || item.state !== type.initial || item.values["epoch"] !== 1 || now === null || previous === null || now < previous) return null;
    const timer = Object.values(definition!.declared.timed).find(rule => rule.on === item.type && rule.effects.some(effect => "hold" in effect && effect.hold.do === "end"));
    const ends = timer ? timeMs(item.values[timer.deadline]) : null;
    if (timer && (ends === null || ends <= now)) return null;
    if (instance !== undefined && this.#given.state.record(OWNER, "instance", [hold, instance])?.state !== "current") return null;
    return { ends };
  }
  #selected(hold: number, base: DestinationRepository): DestinationRepository | null {
    const fork = this.#record("fork", hold);
    const name = fork?.values["name"], id = fork?.values["id"];
    return fork?.state === "selected" && typeof name === "string" && id === name && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(name)
      ? { ...base, name, id } : null;
  }
  #lineage(): Promise<WorkspaceRepository | null> { return workspaceRepository(this.#given, this.#sources, this.#register, "artifacts", this.#namespace); }
  #token(number: number): Held | null {
    const row = this.#sql.exec("SELECT id,ends,repository,plaintext,actor,mint FROM private_workspace_token WHERE scope=? AND token=?", this.#scope(), number).toArray()[0];
    if (!row || typeof row["id"] !== "string" || typeof row["ends"] !== "string" || typeof row["repository"] !== "string" || typeof row["plaintext"] !== "string" || typeof row["actor"] !== "string" || typeof row["mint"] !== "string") return null;
    const record = this.#record("token", number), now = timeMs(this.#given.clock.read()), ends = timeMs(row["ends"]);
    const previous = timeMs(this.#given.scope()!.time);
    if (record?.state !== "live" || record.values["id"] !== row["id"] || now === null || previous === null || now < previous || ends === null || ends <= now) return null;
    return { id: row["id"], ends: row["ends"], repository: JSON.parse(row["repository"]) as DestinationRepository, plaintext: row["plaintext"], actor: row["actor"], mint: row["mint"] };
  }
  #take(token: LiveToken): void {
    const mint = this.#minting.get(token.token); this.#minting.delete(token.token);
    if (token.owner !== OWNER || !mint || !same(token.scope, this.#given.scope()?.at)) return;
    this.#sql.exec("INSERT OR IGNORE INTO private_workspace_token(scope,token,id,ends,repository,plaintext,actor,mint) VALUES(?,?,?,?,?,?,?,?)", this.#scope(), token.token, token.id, token.ends, canonicalize(mint.repository), token.plaintext, mint.actor, mint.mint).toArray();
  }
  async #mint(ask: MintAsk) {
    if (ask.owner !== OWNER) return { minted: false } as const;
    const lineage = await this.#lineage(), record = this.#record("token", ask.token);
    if (!lineage || record?.state !== "minting" || record.values["mint"] !== ask.operation) return { minted: false } as const;
    const root = "root" in ask.for ? this.#record("root", ask.for.root) : null;
    const hold = "hold" in ask.for ? ask.for.hold : root?.values["hold"];
    const instance = "hold" in ask.for ? ask.for.instance : root?.values["instance"];
    if (!isLocalId(hold) || typeof instance !== "string") return { minted: false } as const;
    const cleanup = ask.purpose === "staging" && root?.state === "retiring" && "root" in ask.for && root.values["retirement"] === ask.for.operation;
    const live = this.#held(hold, instance), fork = this.#selected(hold, lineage.repository);
    if ((!cleanup && (!live || !fork)) || !["workspace", "fork-read", "staging"].includes(ask.purpose)) return { minted: false } as const;
    const repository = ask.purpose === "staging" ? lineage.repository : fork;
    if (!repository) return { minted: false } as const;
    const scope = ask.purpose === "fork-read" ? "read" : "write";
    const now = timeMs(this.#given.clock.read())!;
    const seconds = Math.min(ask.purpose === "workspace" ? 900 : 120, cleanup || live?.ends == null ? 900 : Math.floor((live.ends - now) / 1000));
    if (seconds < 1) return { minted: false } as const;
    const origin = this.#given.own(Number((root?.values["operation"] as string ?? ask.operation).split(":")[0]))?.entry.input;
    if (ask.purpose === "workspace" && origin?.type !== "preparation") return { minted: false } as const;
    const actor = origin?.type === "preparation" ? origin.signed.intent.actor : "";
    const allowed = () => cleanup ? this.#record("root", ask.for && "root" in ask.for ? ask.for.root : -1)?.state === "retiring"
      : this.#held(hold, instance) !== null && same(this.#selected(hold, lineage.repository), fork);
    const reply = await this.#provider.workspaceMint(repository, scope, seconds, allowed) as { minted: false } | { minted: true; id: string; ends: string; plaintext: string };
    if (reply.minted) this.#minting.set(ask.token, { repository, actor, mint: ask.operation });
    return reply;
  }
  async #revoke(ask: RevokeAsk) {
    const record = this.#record("token", ask.token), lineage = await this.#lineage();
    if (!lineage || record?.state !== "revoking" || record.values["id"] !== ask.id || record.values["revocation"] !== ask.operation) return { revoked: false } as const;
    if (record.values["purpose"] === "setup") {
      const hold = record.values["hold"], mint = record.values["mint"], attempt = record.values["attempt"];
      if (!isLocalId(hold) || !isOperationId(mint) || record.values["operation"] !== mint
        || !isLocalId(attempt) || attempt < 1) return { revoked: false } as const;
      const [seq, ordinal] = mint.split(":").map(Number);
      if (!isLocalId(seq) || !isLocalId(ordinal)) return { revoked: false } as const;
      const opening = this.#given.own(seq)?.entry;
      const fork = opening?.effects.find(effect => effect.effect === "operation" && effect.owner === OWNER && effect.kind === "fork" && effect.k === ordinal);
      if (fork?.effect !== "operation" || attempt > fork.attempts || ask.id !== `workspace:${this.#forkName(hold, seq, attempt)}`) return { revoked: false } as const;
      // Setup custody belongs to this immutable attempt, even after the
      // hold ends or another fork is selected. The journal owns all retries.
      const reply = await this.#provider.revokeCredential(ask.id) as { revoked: boolean; credential: string } | null;
      if (!reply) throw Error("workspace-setup-revoke-unavailable");
      return { revoked: reply.revoked };
    }
    const hold = isLocalId(record.values["hold"]) ? record.values["hold"] : this.#record("root", record.values["root"] as number)?.values["hold"];
    const fork = isLocalId(hold) ? this.#record("fork", hold) : null;
    const name = fork?.values["name"], id = fork?.values["id"];
    const repository = record.values["purpose"] === "staging" ? lineage.repository
      : typeof name === "string" && id === name ? { ...lineage.repository, name, id } : null;
    if (!repository) return { revoked: false } as const;
    const reply = await this.#provider.workspaceRevoke(repository, ask.id) as { revoked: boolean } | null;
    if (reply?.revoked) this.#sql.exec("UPDATE private_workspace_token SET plaintext=NULL WHERE scope=? AND token=? AND id=?", this.#scope(), ask.token, ask.id).toArray();
    if (!reply) throw Error("workspace-revoke-unavailable");
    return reply;
  }
  credential(handle: string, key: KeyId): ReadCredential | null {
    try {
      const rows = this.#given.state.records(OWNER, "token", { states: ["live"], member: "id", value: handle });
      const record = rows.length === 1 ? rows[0] : null, number = record?.key[0];
      if (!record || !isLocalId(number) || record.values["purpose"] !== "workspace" || !isLocalId(record.values["hold"]) || typeof record.values["instance"] !== "string") return null;
      const held = this.#token(number), fork = this.#record("fork", record.values["hold"]);
      if (!held || held.actor !== key || !this.#held(record.values["hold"], record.values["instance"]) || fork?.state !== "selected"
        || fork.values["id"] !== held.repository.id || fork.values["name"] !== held.repository.name) return null;
      const opening = this.#given.own(Number(held.mint.split(":")[0]))?.entry.input;
      const item = this.#given.state.item(record.values["hold"]);
      if (opening?.type !== "preparation" || opening.capability !== OWNER || opening.signed.intent.actor !== key
        || opening.authority.length !== 1 || opening.authority[0]?.key !== key || !same(opening.authority[0].subject, item?.parties["holder"])) return null;
      const remote = this.#provider.remote(held.repository);
      this.#sql.exec("UPDATE private_workspace_token SET plaintext=NULL WHERE scope=? AND token=? AND id=?", this.#scope(), number, handle).toArray();
      return { token: held.plaintext, ends: held.ends, remote };
    } catch { return null; }
  }
  async send(request: EffectRequest): Promise<EffectAnswer | null> {
    try {
      if (!this.accepts(request.owner, request.kind) || !same(request.scope, this.#given.scope()?.at)
        || request.origin.hash !== entryHash(request.origin.entry) || !same(request.origin.entry.at, request.scope)
        || request.operation !== `${request.origin.entry.seq}:${request.operation.split(":")[1]}`
        || !request.origin.entry.effects.some(effect => effect.effect === "operation" && effect.owner === OWNER && effect.kind === request.kind && `${request.origin.entry.seq}:${effect.k}` === request.operation)) return null;
      if (request.kind === "mint" || request.kind === "revoke") {
        const reply = await this.#tokens.send(request);
        if (request.kind === "mint" && reply?.result !== "confirmed") this.#forgetMint(request.operation);
        return reply;
      }
      const lineage = await this.#lineage(); if (!lineage) return null;
      if (request.kind === "deletion") return this.#deleteFork(request, lineage);
      const fork = this.#records("fork", "operation", request.operation)[0];
      if (request.kind === "head") {
        if (!fork || fork.state !== "creating" || !isLocalId(fork.key[0]) || !this.#held(fork.key[0])) return null;
        return answer("own-answer", { commit: await this.#provider.ref(lineage.repository, branchRef(`refs/heads/${lineage.branch}`, "workspace branch")) });
      }
      if (request.kind === "fork") {
        const seed = fork?.values["seed"];
        if (!fork || !isLocalId(fork.key[0]) || fork.state !== "creating" || !isRecord(seed) || !isObjectId(seed["commit"])) return null;
        // 97 bytes at the largest safe positions. The full incarnation keeps
        // two lives of one lane from sharing a provider-attempt name.
        const hold = fork.key[0], name = this.#forkName(hold, request.origin.entry.seq, request.attempt);
        const reply = await this.#provider.workspaceFork(lineage.repository, name, seed["commit"], lineage.branch, () => this.#held(hold) !== null);
        return isRecord(reply) && reply["created"] === false ? answer("own-answer", {}, "refused") : isRecord(reply) && typeof reply["id"] === "string" && typeof reply["name"] === "string" ? answer("own-answer", { id: reply["id"], name: reply["name"] }) : null;
      }
      return this.#rootOperation(request, lineage);
    } catch { return null; }
  }
  async #deleteFork(request: EffectRequest, _lineage: WorkspaceRepository): Promise<EffectAnswer | null> {
    const input = request.origin.entry.input;
    let id: unknown, name: unknown;
    if (input.type === "outcome" && input.owner === OWNER && input.kind === "fork" && input.result === "confirmed" && input.evidence.basis === "own-answer" && isRecord(input.evidence.body)
      && Object.keys(input.evidence.body).sort().join() === "id,name"
      && request.origin.entry.effects.some(effect => effect.effect === "attempt" && effect.operation === input.operation && effect.attempt === input.attempt && effect.selected === false)) {
      id = input.evidence.body["id"]; name = input.evidence.body["name"];
    } else {
      const fork = this.#records("fork", "deletion", request.operation)[0];
      if (fork?.state !== "deleting") return null;
      id = fork.values["id"]; name = fork.values["name"];
    }
    if (typeof id !== "string" || id !== name || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(id)) return null;
    const reply = await this.#provider.deleteRepository(id, id);
    return isRecord(reply) && reply["deleted"] === true && reply["id"] === id ? answer("own-answer", { id }) : null;
  }
  async #rootOperation(request: EffectRequest, lineage: WorkspaceRepository): Promise<EffectAnswer | null> {
    const member = request.kind === "check" ? "check" : request.kind === "delete" ? "retirement" : "operation";
    const roots = request.kind === "check" ? this.#given.state.records(OWNER, "pin", { member, value: request.operation }) : this.#records("root", member, request.operation);
    const root = request.kind === "check" && roots[0] ? this.#record("root", roots[0].values["root"] as number) : roots[0];
    if (!root || !isLocalId(root.key[0]) || !isObjectId(root.values["commit"])) return null;
    const commit = root.values["commit"], number = root.key[0], ref = stagedRefName(request.scope, commit, number);
    if (request.kind === "check") return this.#check(root, lineage);
    const tokens = this.#given.state.records(OWNER, "token", { states: ["live"], member: "operation", value: request.operation }).filter(token => token.values["attempt"] === request.attempt);
    const staging = tokens.find(token => token.values["purpose"] === "staging"), reading = tokens.find(token => token.values["purpose"] === "fork-read");
    const write = staging && isLocalId(staging.key[0]) ? this.#token(staging.key[0]) : null;
    if (!write || !same(write.repository, lineage.repository)) return null;
    const binding = { scope: request.scope, mint: write.mint as `${number}:${number}`, attempt: 1, write: request.operation, writeAttempt: request.attempt, ref };
    if (request.kind === "stage") {
      const read = reading && isLocalId(reading.key[0]) ? this.#token(reading.key[0]) : null;
      const hold = root.values["hold"], instance = root.values["instance"];
      if (!read || !isLocalId(hold) || typeof instance !== "string" || !same(read.repository, this.#selected(hold, lineage.repository))) return null;
      const allowed = () => this.#held(hold, instance) !== null && this.#token(staging!.key[0] as number) !== null;
      if (!allowed()) return null;
      const objects = await this.#provider.workspaceObjects(read.repository, commit, read.plaintext);
      if (!allowed()) return null;
      const sent = await this.#provider.send({ repository: lineage.repository, ref, old: null, commit, objects, requireParentless: false, token: write.plaintext, binding, allowed, ...(request.sentAt === undefined ? {} : { sentAt: request.sentAt }) });
      if (!isRecord(sent) || sent["send"] !== "accepted") return null;
      return await this.#provider.ref(lineage.repository, ref) === commit ? answer("read", { ref, commit }) : null;
    }
    if (request.kind === "delete") {
      const deleted = await this.#provider.deleteRef({ repository: lineage.repository, ref, old: commit, token: write.plaintext, binding, allowed: () => this.#record("root", number)?.state === "retiring" });
      return isRecord(deleted) && deleted["send"] === "accepted" && await this.#provider.ref(lineage.repository, ref) === null ? answer("read", { ref, absent: true }) : null;
    }
    return null;
  }
  async #check(root: RecordState, lineage: WorkspaceRepository): Promise<EffectAnswer | null> {
    // The provider supplies immutable commit objects and one exact ref snapshot.
    const commit = root.values["commit"] as string, number = root.key[0] as number;
    const head = await this.#provider.ref(lineage.repository, branchRef(`refs/heads/${lineage.branch}`, "workspace branch"));
    if (!head) return null;
    const minted = await this.#provider.workspaceMint(lineage.repository, "read", 120) as { minted: boolean; id: string; plaintext: string };
    if (!minted.minted) return null;
    try {
      const source = this.#provider.workspaceSource(lineage.repository, minted.plaintext);
      const refs = await source.refs("refs/artroom/staged/", 4096);
      const snapshot = refs.map(row => ({ ref: row.ref, target: row.target }));
      const retained = snapshotInput(snapshot); if (!retained) return null;
      const objects = [...await this.#provider.workspaceObjects(lineage.repository, commit, minted.plaintext), ...await this.#provider.workspaceObjects(lineage.repository, head, minted.plaintext)];
      const byId = new Map(objects.map(object => [object.id, object]));
      const at = this.#given.scope()!.at;
      const { roots, checks } = ledgerOf(this.#given.state, this.#given.own, at, root.values["under"], this.#given.scope()!.head.seq + 1, OWNER);
      const selected = this.#given.state.page("input", ["selected"], null, 32);
      if (selected.more) return null;
      const inputs: Array<{ commit: string; input: FactRef }> = [];
      for (const item of selected.items) {
        if (item.refs["for"] !== root.values["under"]) continue;
        const report = item.refs["report"], opening = this.#given.own(item.id);
        if (!isFactRef(report) || !opening || opening.hash !== item.opened) return null;
        const use = opening.entry.uses.find(use => same(use.fact, report));
        const retained = use ? this.#given.retained("entry", use.content) : null;
        const entry = retained && use ? proofEntry({ fact: report, bytes: retained.bytes }, report, PROOF_BYTE_BOUNDS.body, use.content) : null;
        if (!entry) return null;
        const commits = entry.effects.filter(effect => effect.effect === "value" && effect.item === report.seq && effect.slot === "commit");
        if (commits.length !== 1 || commits[0]?.effect !== "value" || !isObjectId(commits[0].value)) return null;
        inputs.push({ commit: commits[0].value, input: { at, seq: item.id, hash: opening.hash } });
      }
      const result = walk({ commit, head, snapshot, lane: this.#given.scope()!.at, root: number, roots, checks, inputs, bounds: ANCESTRY_BOUNDS, read: id => { const object = byId.get(id); return object ? { type: object.kind, body: object.body } : null; } });
      return result.result === "recorded" ? { ...answer("own-answer", { record: result.record }), retain: [retained] } : result.result === "too-large" ? answer("own-answer", { record: null }) : null;
    } finally { await this.#provider.workspaceRevoke(lineage.repository, minted.id); }
  }
}
