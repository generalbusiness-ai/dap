/** G1 fixture: maintained local Core/SQLite and real MCP custody. Membership,
 * install lookup, read sessions and role lookup are explicit stand-ins. The
 * developer Room is a Directory root; native child ownership is tested in M2b.
 * No provider, device execution, hosted durability or enrollment is claimed. */
import type { Beside, Digest, FieldValue, SignedIntent } from "@generalbusiness/dap-contract";
import { DOMAINS } from "@generalbusiness/dap-contract";
import { canonicalize, parseStrict } from "@generalbusiness/artroom-bytes";
import { applicationProjectionQueryDigest, type AnyPackedApplication } from "@generalbusiness/artroom-bytes/application-v2";
import { secretSigner, signedIntent, type Fetch } from "@generalbusiness/artroom-client";
import type { ApplicationDevelopmentSession } from "../../../cli/src/application-scenarios.ts";
import { room } from "../../../../examples/grow/room.ts";
import { McpService, memoryStore } from "../../src/index.ts";
import { DeclaredViewSource } from "../../src/views/declared.ts";
import { SERVICE, StandIn } from "./standin.ts";

export function growOperator(packet: AnyPackedApplication, session: ApplicationDevelopmentSession) {
  const actor = session.actors.find(actor => actor.actions.includes("grow.heat"));
  if (!actor) throw Error("The maintained scene needs an explicit TEST heat operator.");
  const signer = secretSigner(Uint8Array.from(actor.seed.match(/../g)!, byte => Number.parseInt(byte, 16)));
  const stand = new StandIn(signer.key, "admin", actor.actions);
  stand.activate(room);
  const scope = session.scope.at, reads = session.scope.developmentReads();
  let now = Date.parse(session.time), held = [...actor.actions], signatures = 0;
  const submitted: SignedIntent[] = [];
  const json = (value: unknown) => ({ status: 200, body: new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode(JSON.stringify(value))); controller.close(); } }) });
  const fetch: Fetch = async (url, init) => {
    const path = new URL(url).pathname, prefix = `/v1/scopes/${scope.scope}`;
    if (path !== prefix && !path.startsWith(`${prefix}/`)) return stand.fetch(url, init);
    const route = path.slice(prefix.length).split("/").filter(Boolean);
    const body = init?.body ? parseStrict(init.body) as { signed: SignedIntent; beside?: Beside } : undefined;
    if (!route.length) return json(reads.summary(null));
    if (route[0] === "acts" && body) {
      submitted.push(parseStrict(canonicalize(body.signed)) as SignedIntent);
      return json(await session.scope.submit(body.signed, body.beside));
    }
    if (route[0] === "settle" && body) return json(session.scope.settle(body.signed));
    if (route[0] === "entries") return json(reads.entry(null, Number(route[1])));
    if (route[0] === "retained") return json(reads.retained(null, route[1] as "definition", route[2] as Digest));
    if (route[0] === "log") return json(reads.log(null));
    if (route[0] === "history") return json(reads.history(null));
    if (route[0] === "items") return json(reads.items(null, route[1]!));
    return json({ ok: false, reason: "not-found" });
  };
  const source = new DeclaredViewSource(packet.bytes, packet.ids.release, {
    installation: async () => ({ scope, directory: stand.directory, rules: stand.rules, membership: stand.membership, destination: stand.destination,
      item: 7, definition: packet.package.semantic.entry, ids: packet.ids }),
    actions: async () => held,
    projection: async query => ({ ok: true, query: applicationProjectionQueryDigest(query)!, value: session.scope.developmentProjection(query.projection, query.items) }),
  });
  const service = new McpService({ service: SERVICE, fetch, signer: { key: signer.key, sign: bytes => {
    if (new TextDecoder().decode(bytes).startsWith(`${DOMAINS.intent}\n`)) signatures++;
    return signer.sign(bytes);
  } },
    custody: memoryStore(), views: source, config: { read: async () => stand.config(), addRoot: async () => {} }, now: () => now, pause: async () => {} });
  return { service, stand, source, submitted, signatures: () => signatures,
    actions: (actions: string[]) => { held = [...actions]; },
    advance: async (time: string) => { await session.scope.advance(time); now = Date.parse(time); },
    /** Scenario-owner/sensor inputs remain separate from the UI operator's
     * custody and counters. These use the fixture's explicit public TEST keys. */
    nativeAct: async (name: string, kind: string, on: number | null, fields: Record<string, FieldValue>, subjects: Record<string, number>) => {
      const actor = session.actors.find(actor => actor.name === name);
      if (!actor) throw Error("Unknown public TEST actor.");
      const signer = secretSigner(Uint8Array.from(actor.seed.match(/../g)!, byte => Number.parseInt(byte, 16)));
      const expected = Object.fromEntries(Object.entries(subjects).map(([name, id]) => {
        const item = session.scope.state.item(id); if (!item) throw Error("No native expected subject.");
        return [name, item.revision];
      }));
      return session.scope.submit(await signedIntent(signer, { to: scope, kind, on, fields, expected }, { now }));
    } };
}
