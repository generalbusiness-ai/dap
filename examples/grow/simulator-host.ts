/** Separate scheduled Worker. All progress lives in the application's
 * journal. Environment bindings contain public references and two secrets. */
import type { Digest, KeyId, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { same, definitionDigest, entryHash, isMemberRef, isRecord, isScopeRef, parseStrict, timeOf, unb64url } from "@generalbusiness/dap-bytes";
import { httpTransport, newIdempotencyKey, requestSession, ScopeHandle, secretSigner, sessionRequest, type Fetch, type Signer, type Transport } from "@generalbusiness/dap-client";
import { demoDefinitions } from "./demo-definitions.ts";
import { simulatorRelease } from "./simulator-release.ts";
import { simulatorTick } from "./simulator-tick.ts";
import { tickBudget } from "./tick-budget.ts";
import { DEMO_RELEASE, DEMO_PUBLISHER } from "./demo-release.ts";

export interface SimulatorEnvironment {
  /** JSON: service origin, full Room ref and the three fixed principals. */
  GROW_BINDING: string;
  /** Unpadded base64url of each distinct 32-byte agent secret. */
  GROW_SENSORS_SECRET: string;
  GROW_CLIMATE_SECRET: string;
}
interface Binding { service: string; room: ScopeRef; members: { sensors: MemberRef; climate: MemberRef; operator: MemberRef } }
const exact = (value: unknown, keys: string): value is Record<string, unknown> => isRecord(value) && Object.keys(value).sort().join(",") === keys;
function binding(text: string): Binding {
  if (text.length > 8192) throw new Error("invalid-demo-binding");
  const value = parseStrict(text);
  if (!exact(value, "members,room,service") || typeof value["service"] !== "string" || !isScopeRef(value["room"]) || value["room"].kind !== "lane"
    || !exact(value["members"], "climate,operator,sensors")) throw new Error("invalid-demo-binding");
  const origin = new URL(value["service"]);
  if (origin.protocol !== "https:" || origin.pathname !== "/" || origin.username || origin.password || origin.search || origin.hash) throw new Error("invalid-demo-service");
  const members = value["members"];
  for (const name of ["sensors", "climate", "operator"] as const) if (!isMemberRef(members[name])) throw new Error("invalid-demo-member");
  const result = value as unknown as Binding;
  if (!same(result.members.sensors.membership, result.members.operator.membership) || !same(result.members.climate.membership, result.members.operator.membership)
    || same(result.members.sensors, result.members.climate) || same(result.members.sensors, result.members.operator) || same(result.members.climate, result.members.operator)) throw new Error("invalid-demo-principals");
  return result;
}

/** The entry module supplies the committed packet's exact bytes, release
 * and publisher. This sets no hosting trust and creates no hosted resource. */
export function simulatorHost(packetText: string, expectedRelease: Digest, expectedPublisher: KeyId) {
  const verified = simulatorRelease(new TextEncoder().encode(packetText), expectedRelease, expectedPublisher);
  // P1's current maintained declarations may have new package metadata.
  // The unchanged deployed release retains its exact signed declaration pins;
  // every other (including TEST) release keeps the current-source comparison.
  const definitions = demoDefinitions(), published = verified.packet.ids.release === DEMO_RELEASE
    && verified.packet.package.release.manifest.publisher === DEMO_PUBLISHER;
  const roomDefinition = published ? "sha256:b89e7f84740dfd8b24f78e8b52aff5aa8d4181750a7b5f385c1ef6f993846787" : definitionDigest(definitions.room);
  const siteDefinition = published ? "sha256:d2bc830e74caaabab32dbad17adae6812050fb4d36b67e97145d39c2a4cfe2ea" : definitionDigest(definitions.site);
  if (verified.packet.package.semantic.entry !== siteDefinition
    || !verified.packet.package.semantic.definitions.some(part => part.id === roomDefinition)
    || verified.schedule.cadenceMinutes !== 1) throw new Error("unexpected-demo-package");
  const commandDefinitions = verified.packet.package.semantic.definitions.filter(part => {
    const definition = parseStrict(part.bytes);
    return isRecord(definition) && Array.isArray(definition["capabilities"]) && definition["capabilities"].some(cap => isRecord(cap) && cap["name"] === "device-command" && cap["version"] === 1);
  }).map(part => part.id).sort();
  if (!commandDefinitions.includes(roomDefinition)) throw new Error("demo-command-support-unavailable");

  async function run(env: SimulatorEnvironment, now = Date.now(), send: Fetch = globalThis.fetch) {
    // No exception text is logged: transport replies and secret-bearing
    // configuration must never become diagnostics.
    let phase = "configuration", close: (() => void) | undefined;
    const secrets: Uint8Array[] = [];
    try {
      const config = binding(env.GROW_BINDING), membership = config.members.sensors.membership;
      const budget = tickBudget(config.service, [config.room.scope, membership.scope], send); close = budget.stop;
      const secret = (encoded: string) => {
        const bytes = encoded.length === 43 ? unb64url(encoded) : null;
        if (!bytes || bytes.length !== 32) throw new Error("invalid-demo-secret");
        secrets.push(bytes); return bytes;
      };
      const sensorsSecret = secret(env.GROW_SENSORS_SECRET), climateSecret = secret(env.GROW_CLIMATE_SECRET);
      const signers = { sensors: secretSigner(sensorsSecret), climate: secretSigner(climateSecret) };
      if (signers.sensors.key === signers.climate.key) throw new Error("distinct-demo-keys-required");
      const transport = httpTransport(config.service, { fetch: budget.fetch, seconds: 5 });
      phase = "sessions";
      async function memberSession(who: "sensors" | "climate", bytes: Uint8Array, signer: Signer) {
        const until = new Date(Math.floor(now / 1000) * 1000 + 120_000).toISOString().replace(".000Z", "Z");
        const answer = await requestSession(config.service, membership.scope, sessionRequest(membership, bytes, until, newIdempotencyKey()), { fetch: budget.fetch, seconds: 5 });
        if (!answer.ok || !same(answer.session.claims.membership, membership) || answer.session.claims.member !== config.members[who].member
          || answer.session.claims.key !== signer.key || answer.session.endedBy(timeOf(now))) throw new Error("demo-session-mismatch");
        return answer.session;
      }
      const sensorsSession = await memberSession("sensors", sensorsSecret, signers.sensors);
      await memberSession("climate", climateSecret, signers.climate);
      const reader = new ScopeHandle(transport, config.room.scope, sensorsSession.reader());
      phase = "installed-owner";
      const birth = await reader.entry(0);
      if (!birth.ok || !birth.complete || birth.next !== undefined || birth.value.entry.seq !== 0 || !same(birth.value.entry.at, config.room)
        || entryHash(birth.value.entry) !== birth.value.hash || birth.value.entry.input.type !== "genesis" || birth.value.entry.input.decision !== "applied") throw new Error("demo-birth-unavailable");
      const body = birth.value.entry.input.message?.body;
      // Compare the public retained native grant to the expected signed
      // graph. The native host still decides every request's authority.
      if (!isRecord(body) || !same(body["membership"], membership) || !same(body["creationContext"], { v: 2, delegate: false,
        deviceCommand: { capability: "device-command@1", owner: config.members.sensors, bounds: { kinds: ["fan", "heater", "vent"], owners: 1 },
          root: verified.packet.package.semantic.entry, definitions: commandDefinitions } })) throw new Error("demo-installed-owner-mismatch");
      phase = "tick";
      const result = await simulatorTick({ scope: config.room, definition: roomDefinition, members: config.members, signers, schedule: verified.schedule, now }, {
        reader, submit: signed => reader.submit(signed),
        answer: signed => ownerAnswer(transport, config.room, signed), stop: budget.stop,
      });
      return { ...result, costs: budget.costs() };
    } catch {
      close?.(); return { result: "stopped" as const, phase, reason: "demo-interface-unavailable" };
    } finally { for (const bytes of secrets) bytes.fill(0); }
  }
  return {
    run,
    async fetch(): Promise<Response> { return new Response("Scheduled Grow simulator. No public control endpoint.\n", { status: 404 }); },
    async scheduled(_event: { scheduledTime: number; cron: string }, env: SimulatorEnvironment): Promise<void> {
      const report = await run(env);
      console.log(JSON.stringify({ simulation: "grow", ...report }));
    },
  };
}
const ownerAnswer = (transport: Transport, room: ScopeRef, signed: import("@generalbusiness/dap-contract").SignedIntent) => transport.prepare(room.scope, signed, [], "device-command@1", "answer");
