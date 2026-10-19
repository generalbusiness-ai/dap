/** Actual native foreign uses/retention/SQLite. Grants, reviewed policy,
 * clock and setup reader are explicit TEST fixtures. This classifies
 * metadata only: no installed export, payload selection or replay verdict. */
import { expect, test } from "vitest";
import { env } from "cloudflare:test";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Input } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/artroom-bytes";
import { variant } from "@generalbusiness/dap-derive/testing";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { namespace } from "../src/namespace.ts";
import { ArchiveForeignMetadata } from "../src/archive-foreign.ts";
import { archivePrefixMetadata } from "../src/archive-prefix.ts";
import { archivePrivacyMetadata } from "../src/archive-privacy.ts";
import { FixtureArchiveSourcePins } from "../src/archive-source-pins.ts";
import type { ArchivePolicyRegistry, ReviewedArchivePolicy } from "../src/archive-inventory.ts";
import { definition, create, reader, rita } from "./support.ts";
import { wired } from "./outside.ts";
const variants = new Set<Input["type"]>(["genesis", "act", "delivery", "timed", "diagnosis", "outcome", "preparation", "checkpoint"]);
const receiver = variant(definition.declared, data => {
  // Same producer name, different exact pin: the name cannot choose policy.
  data.acts.remark.fields.text.max = 127;
  data.acts.remark.fields.proof.kind = ["assign", "found"];
});
const policy = (def: typeof definition, entryTypes = variants): ReviewedArchivePolicy => ({ review: "TEST reviewed inline classes; no production certificate",
  entryTypes, support: { named: def.digest, definition: def, owners: new Map(), records: new Map(), preparations: new Map() } });
async function fixture() {
  const producer = await create(), consumer = await create({}, {}, receiver);
  const commitment = await producer.commitment(), assigned = (await producer.sealed()).find(sealed => sealed.entry.seq > commitment && sealed.entry.input.type === "act" && sealed.entry.input.signed.intent.kind === "assign")!;
  expect(assigned).toBeDefined();
  // The simple create fixture normally has a SCRIPTED foreign resolver.
  // Select the real namespace resolver for these actual peer source reads.
  wired.set(consumer.name, () => ({ resolver: namespace(env.SCOPES).resolver }));
  try {
    await consumer.restart();
    await consumer.did(rita, "remark", { on: 0, fields: { text: "actual foreign assignment", proof: { at: producer.at, seq: assigned.entry.seq, hash: assigned.hash } } });
    await consumer.did(rita, "remark", { on: 0, fields: { text: "actual foreign genesis", proof: producer.genesis.fact } });
  } finally { wired.delete(consumer.name); }
  const birth = await producer.stub.entry(reader, 0); expect(birth.ok).toBe(true); if (!birth.ok) return expect.fail("native birth read required");
  const entries = await consumer.sealed(), uses = entries.flatMap(sealed => sealed.entry.uses);
  expect(uses).toHaveLength(2);
  const sources = new FixtureArchiveSourcePins([{ at: producer.at, birth: { bytes: canonicalize(birth.value.entry), hash: birth.value.hash }, declaration: canonicalize(definition.declared) }], PROPOSED_BOUNDS, new ArchiveBudget());
  const policies: ArchivePolicyRegistry = new Map([[receiver.digest, policy(receiver)], [definition.digest, policy(definition)]]);
  const through = await consumer.head();
  const scan = (pins = sources, reviewed = policies) => consumer.inside(state => {
    const forbidden: string[] = [], queries: string[] = [], budget = new ArchiveBudget();
    const sql = { exec(query: string, ...args: (string | number | null | ArrayBuffer)[]) {
      queries.push(query);
      if (/^SELECT (?:\*|bytes)(?:\s|,)/.test(query)) { forbidden.push(query); throw Error("body tripwire"); }
      return state.storage.sql.exec(query, ...args);
    } };
    let reason = "admitted", positions: number[] = [], basis: ReturnType<ArchiveForeignMetadata["basis"]> = [], copies: unknown[] = [];
    try {
      const foreign = new ArchiveForeignMetadata(sql, pins, reviewed, PROPOSED_BOUNDS, budget);
      const prefix = archivePrefixMetadata(sql, consumer.at, through, PROPOSED_BOUNDS, budget, new Set([receiver.digest]));
      positions = archivePrivacyMetadata(sql, prefix, policy(receiver).support, budget, foreign).positions.map(position => position.seq);
      basis = foreign.basis(); copies = uses.map(use => foreign.get(use.content));
    } catch (error) { reason = (error as { reason: string }).reason; }
    expect(forbidden).toEqual([]);
    return { reason, positions, basis, copies, queries, cost: budget.admitted() };
  });
  return { producer, consumer, birth: birth.value, uses, sources, policies, scan };
}

test("direct foreign copies classify their own full headers against fixture pins and separate reviewed policy before any payload body", async () => {
  const f = await fixture(), result = await f.scan();
  expect(result.reason).toBe("admitted"); expect(result.positions).toEqual([0, 1, 2]);
  expect(result.basis).toEqual([{ at: f.producer.at, pin: definition.digest }]);
  expect(result.copies).toEqual(f.uses.map(use => expect.objectContaining({ content: use.content, fact: use.fact, pin: definition.digest, under: definition.declared.name })));
  expect(result.queries.some(query => query.includes("json_each(entry.bytes, '$.uses')"))).toBe(true);
  expect(result.cost.attempts).toBeGreaterThan(0);
});

test("missing source or inline policy and a conflicting retained genesis pin refuse the whole prefix before payloads", async () => {
  const f = await fixture();
  const missing = await f.scan(new FixtureArchiveSourcePins([], PROPOSED_BOUNDS, new ArchiveBudget()));
  expect(missing.reason).toBe("foreign-source-unavailable"); expect(missing.positions).toEqual([]);
  const absentPolicy = await f.scan(f.sources, new Map([[receiver.digest, policy(receiver)]]));
  expect(absentPolicy.reason).toBe("unsupported-archive-cohort"); expect(absentPolicy.positions).toEqual([]);
  const incompletePolicy = await f.scan(f.sources, new Map([[receiver.digest, policy(receiver)], [definition.digest, policy(definition, new Set(["act"]))]]));
  expect(incompletePolicy.reason).toBe("unsupported-archive-cohort"); expect(incompletePolicy.positions).toEqual([]);
  const genesisUse = f.uses.find(use => use.fact.seq === 0)!;
  const damaged = structuredClone(f.birth.entry); if (damaged.input.type !== "genesis") return expect.fail("native genesis required");
  // Corrupt only the locally retained copy, never the producer/consumer journal.
  damaged.input.seed.definition = receiver.digest;
  await f.consumer.inside(state => { state.storage.sql.exec("UPDATE retained_input SET bytes = ? WHERE kind = 'entry' AND digest = ?", canonicalize(damaged), genesisUse.content); });
  const conflict = await f.scan();
  expect(conflict.reason).toBe("foreign-source-mismatch"); expect(conflict.positions).toEqual([]);
});
