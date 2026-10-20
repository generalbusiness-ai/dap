/** Resolve one archive repository through existing bounded native reads.
 * Wiring and read authority are explicit fixture ports in this milestone. */
import { ITEM_QUERY_BOUNDS, type Item, type ItemQuery, type ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, encodeItemQueryParameter, isRecord, isScopeRef, isSeed, readItemQueryReply, scopeIdOf, utf8 } from "@generalbusiness/artroom-bytes";
import { isOf } from "@generalbusiness/dap-platform";
import type { ArchiveBudget } from "./archive-budget.ts";
import type { FixtureArchiveTarget } from "./archive-driver.ts";
import type { DestinationRepository } from "./destination-host.ts";
import type { NativeItemQuery } from "./item-queries.ts";
import { readNativeBirth, type NativeBirthSource } from "./native-birth.ts";
import { namespace, type Binding } from "./namespace.ts";
import { proofEntry } from "./proof-bytes.ts";

const BIRTH_BYTES = 256 * 1024, HOPS = 8;
const same = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b);
export interface FixtureArchiveTargetReads {
  readonly fixture: "archive-target-reads";
  readonly births: NativeBirthSource;
  query(at: ScopeRef, encoded: string): Promise<NativeItemQuery>;
}
function repository(value: unknown): DestinationRepository | null {
  return isRecord(value) && Object.keys(value).sort().join() === "host,id,name,namespace"
    && Object.values(value).every(field => typeof field === "string" && field.length > 0 && field.length <= 256 && !/[\u0000-\u001f\u007f]/.test(field)) ? value as unknown as DestinationRepository : null;
}
export function fixtureArchiveTarget(reads: FixtureArchiveTargetReads): FixtureArchiveTarget {
  if (reads.fixture !== "archive-target-reads") throw new Error("archive target fixture reads required");
  const birth = async (at: ScopeRef, budget: ArchiveBudget) => {
    budget.spend({ nodes: 1, calls: 1, metadata: BIRTH_BYTES, inputWork: BIRTH_BYTES * 8 });
    const found = readNativeBirth(await budget.wait(() => reads.births.read({ ...at }, Math.min(10_000, budget.remaining()), BIRTH_BYTES)), at, BIRTH_BYTES);
    if (!found) return null;
    const entry = proofEntry(found.proof, found.proof.fact, BIRTH_BYTES);
    return entry?.input.type === "genesis" && entry.input.decision === "applied" ? { entry, seed: entry.input.seed, named: found.named } : null;
  };
  const one = async (at: ScopeRef, type: string, states: readonly string[], budget: ArchiveBudget): Promise<Item | null> => {
    const query: ItemQuery = { v: 1, scope: { ...at }, type, states, ids: null, limit: 1, cursor: null };
    const encoded = encodeItemQueryParameter(query); if (!encoded) return null;
    budget.spend({ calls: 1, metadata: ITEM_QUERY_BOUNDS.payloadBytes, inputWork: ITEM_QUERY_BOUNDS.payloadBytes * 4 });
    const answer = await budget.wait(() => reads.query({ ...at }, encoded));
    if (!answer.ok || typeof answer.serialized !== "string" || answer.serialized.length > ITEM_QUERY_BOUNDS.payloadBytes) return null;
    const page = readItemQueryReply(utf8(answer.serialized), query);
    return page?.ok && page.complete && page.value.items.length === 1 ? page.value.items[0]! : null;
  };
  return { fixture: "archive-target", async resolve(at, seed, budget) {
    if (!isScopeRef(at) || !isSeed(seed) || scopeIdOf(seed) !== at.scope || seed.kind !== at.kind) return null;
    at = { ...at }; seed = { ...seed, creator: seed.creator ? { ...seed.creator } : null };
    const visited = new Set<string>();
    let found = await birth(at, budget);
    for (let hop = 0; hop < HOPS; hop++) {
      budget.check(); const key = canonicalize(at);
      if (visited.has(key)) return null; visited.add(key);
      if (!found || !same(found.seed, seed)) return null;
      if (at.kind === "directory") {
        if (!isOf(found.named, "platform:directory")) return null;
        const room = await one(at, "repository", ["open"], budget);
        if (room?.values["archive"] !== "journal") return null;
        const configured = repository(room?.values["repository"]), destination = room?.refs["destination"];
        if (!configured || !isScopeRef(destination) || destination.kind !== "destination") return null;
        const target = await birth(destination, budget);
        if (!target || !isOf(target.named, "platform:destination") || !same(target.seed.creator, at)) return null;
        const branch = await one(destination, "branch", ["empty", "ready"], budget);
        return branch && same(branch.refs["directory"], at) && same(repository(branch.values["repository"]), configured) ? { ...configured } : null;
      }
      if (!seed.creator) return null;
      if (hop === HOPS - 1) return null;
      at = { ...seed.creator };
      found = await birth(at, budget); if (!found) return null;
      // Continue with the checked creator seed. Reuse that checked birth on
      // the next hop instead of reading a changing or unrelated room.
      seed = found.seed;
    }
    return null;
  } };
}

/** Existing RPCs only; no new read bypass, environment key or public route.
 * The fixture must explicitly supply its reader for ordinary item queries. */
export function fixtureArchiveTargetIn(binding: Binding, reader: { fixture: "archive-target-reader"; value: unknown }): FixtureArchiveTarget {
  if (reader.fixture !== "archive-target-reader") throw new Error("archive fixture reader required");
  return fixtureArchiveTarget({ fixture: "archive-target-reads", births: namespace(binding).births,
    query: (at, encoded) => (binding.get(binding.idFromName(at.scope)) as { queryItems(encoded: string, reader: unknown): Promise<NativeItemQuery> }).queryItems(encoded, reader.value),
  });
}
