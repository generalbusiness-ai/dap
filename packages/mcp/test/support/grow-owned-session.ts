import { growLauncherDefinition } from "./definition-corpus-data.ts";
/** One Core/SQLite Site -> Room path. TEST grants, namespace routing,
 * installation lookup and sessions remain fixtures. Every birth and source
 * entry is native; no Lane reference or application state is manufactured. */
import type { DeclaredDefinition, ScopeId, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, factRefOf, isEntry, isScopeRef, isSeed, parseStrict, scopeIdOf } from "@generalbusiness/artroom-bytes";
import type { AnyPackedApplication } from "@generalbusiness/artroom-bytes/application-v2";
import { signedIntent } from "@generalbusiness/artroom-client";
import type { HistorySource } from "@generalbusiness/artroom-replay";
import type { Peer } from "@generalbusiness/artroom-scope/runtime";
import { LocalApplicationScope } from "../../../cli/src/application-local.ts";
import { openApplicationScenario } from "../../../cli/src/application-scenarios.ts";
import { scenarioSigner } from "../fixtures.ts";

export async function openOwnedGrowScenario(packet: AnyPackedApplication, value: unknown) {
  const scene = parseStrict(canonicalize(value)) as { actors: Record<string, { seed: string }>; founding: { actor: string } };
  const seed = scene.actors[scene.founding.actor]?.seed;
  if (!seed || !/^[0-9a-f]{64}$/.test(seed)) throw Error("The owned Grow fixture needs its public TEST founding actor.");
  const signer = scenarioSigner(seed);
  const scopes = new Map<ScopeId, LocalApplicationScope>(), peers = new Map<ScopeId, Peer>();
  let directory!: LocalApplicationScope, site!: LocalApplicationScope;
  let deliverNative!: (sender: LocalApplicationScope, seq: number, n: number) => Promise<LocalApplicationScope>;
  const close = () => { for (const scope of scopes.values()) scope.close(); };
  try {
    const session = await openApplicationScenario(packet, value, async (_packet, founding, actors, now, selected) => {
      const definitions = packet.package.semantic.definitions.map(part => parseStrict(part.bytes) as DeclaredDefinition);
      const history: HistorySource = {
        page: async (id, ...args) => scopes.get(id)?.source.page(id, ...args) ?? { ok: false, reason: "not-found" },
        retained: async (id, ...args) => scopes.get(id)?.source.retained(id, ...args) ?? { ok: false, reason: "not-found" },
      };
      const binding = { idFromName: (id: string) => id as ScopeId, get: (id: unknown) => peer(id as ScopeId) };
      const attach = (id: ScopeId, scope: LocalApplicationScope) => { scopes.set(id, scope); peers.set(id, scope.connect(binding, history)); return scope; };
      const peer = (id: ScopeId): Peer => {
        if (!peers.has(id)) attach(id, LocalApplicationScope.empty(id, packet, actors, now));
        return peers.get(id)!;
      };
      const deliver = async (sender: LocalApplicationScope, seq: number, n: number): Promise<LocalApplicationScope> => {
        const source = await peer(sender.at.scope).source(seq);
        const entry = source?.bytes ? parseStrict(source.bytes) : null;
        if (!isEntry(entry)) throw Error("The native source entry is unavailable.");
        const send = entry.sends.find(send => send.n === n);
        if (!send) throw Error("The native source holds no selected send.");
        const name = isSeed(send.to) ? scopeIdOf(send.to) : isScopeRef(send.to) ? send.to.scope : null;
        if (!name) throw Error("The native send has no scope address.");
        const target = peer(name), answer = await target.deliver({ ...send, from: factRefOf(entry) });
        if (answer.answer !== "recorded") throw Error(`Native fixture delivery ${answer.answer}.`);
        return scopes.get(name)!;
      };
      deliverNative = deliver;
      const launcher = growLauncherDefinition(packet.package.semantic.entry);
      directory = await LocalApplicationScope.directory(launcher, definitions, founding, actors, now);
      attach(directory.at.scope, directory);
      site = await deliver(directory, 0, 0); await deliver(site, 0, 0);
      await deliver(directory, directory.state.scope()!.head.seq, 0);
      const label = founding.intent.fields["label"];
      if (typeof label !== "string") throw Error("The maintained scene needs a label.");
      const opening = await site.submit(await signedIntent(signer, { to: site.at, kind: "create-room", on: null, expected: {}, fields: { label } }, { now: Date.parse(now) }));
      if (opening.answer !== "accepted") throw Error(`Native Site create-room ${opening.answer}: ${"reason" in opening ? opening.reason : "unknown"}.`);
      const room = await deliver(site, opening.receipt.fact.seq, 0); await deliver(room, 0, 0);
      await deliver(site, site.state.scope()!.head.seq, 0);
      if (room.at.kind !== "lane" || site.at.kind !== "lane" || room.definition !== selected) throw Error("The native path selected another application definition.");
      return room;
    });
    const reportSite = async (time: Timestamp = session.time) => {
      const sensor = session.actors.find(actor => actor.name === "sensors" && actor.actions.includes("grow.sense"));
      if (!sensor) throw Error("The owned scene needs its separate public TEST sensor.");
      const signer = scenarioSigner(sensor.seed);
      const alerts = session.scope.developmentProjection("grid").sources["alert"]?.filter(row => ["open", "held", "authorized"].includes(row.state)).length ?? 0;
      await site.advance(time);
      const answer = await session.scope.submit(await signedIntent(signer, { to: session.scope.at, kind: "report-site", on: 0,
        expected: { on: session.scope.state.item(0)!.revision }, fields: { openAlerts: alerts } }, { now: Date.parse(time) }));
      if (answer.answer !== "accepted") throw Error(`Native Room report-site ${answer.answer}: ${"reason" in answer ? answer.reason : "unknown"}.`);
      await deliverNative(session.scope, answer.receipt.fact.seq, 0);
      await deliverNative(site, site.state.scope()!.head.seq, 0);
    };
    await reportSite();
    const createRoom = async (label: string, time: Timestamp = session.time) => {
      await site.advance(time);
      const opening = await site.submit(await signedIntent(signer, { to: site.at, kind: "create-room", on: null, expected: {}, fields: { label } }, { now: Date.parse(time) }));
      if (opening.answer !== "accepted") throw Error(`Native Site create-room ${opening.answer}: ${"reason" in opening ? opening.reason : "unknown"}.`);
      const room = await deliverNative(site, opening.receipt.fact.seq, 0); await deliverNative(room, 0, 0);
      await deliverNative(site, site.state.scope()!.head.seq, 0);
      await deliverNative(site, site.state.scope()!.head.seq, 0);
      const item = site.state.page("room", ["pending", "active", "failed"], null, 3).items.find(item => canonicalize(item.refs["scope"]) === canonicalize(room.at));
      if (!item || item.state !== "active") throw Error("The native Site room relation is not active.");
      return { scope: room, item: item.id };
    };
    return { ...session, directory, site, scopes, close, reportSite, createRoom };
  } catch (error) { close(); throw error; }
}
