/** Actual NET objects, SQLite, source births and journals. NET grants,
 * read access and transport are fixtures, not enrollment or a provider. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type RetainedInput } from "@generalbusiness/dap-contract";
import { canonicalBytes, canonicalize, digestBytes, entryHash } from "@generalbusiness/dap-bytes";
import { MemorySource, verify } from "@generalbusiness/dap-replay";
import { peerPinDefinitions } from "../../derive/test/fixtures-peer-pin.ts";
import { creation, Node, net, rita, settle } from "./net.ts";

test("native digest pin distinguishes equal names across eviction and actual journal replay", async () => {
  const { senderDefinition, alternateDefinition, receiverDefinition } = peerPinDefinitions();
  const previous = net.hold; net.hold = () => true;
  try {
    const found = async (definition: typeof senderDefinition) => {
      const { signed, name } = creation(definition, {}), node = new Node(name, definition.declared);
      expect(await node.stub.create(signed, definition.declared, [])).toMatchObject({ answer: "accepted" }); return node;
    };
    const receiver = await found(receiverDefinition), sender = await found(senderDefinition), other = await found(alternateDefinition);
    for (const peer of [sender, other]) await peer.did(rita, "emit", { on: 0, expected: { on: (await peer.item(0))!.revision }, fields: { to: await receiver.at(), first: 17, second: 18 } });
    await settle(receiver, sender, other);
    expect(await receiver.stub.deliver(await other.envelope(1, 0))).toMatchObject({ answer: "recorded" });
    const refused = (await receiver.entries()).at(-1)!;
    expect(refused.input).toMatchObject({ decision: "refused", reason: { code: "wrong-pin" } });
    expect(refused.effects).toEqual([]); expect(refused.sends).toHaveLength(1);
    expect(await other.stub.deliver(await receiver.envelope(refused.seq, 0))).toMatchObject({ answer: "recorded" });
    expect((await other.entries()).at(-1)!.input).toMatchObject({ clause: "refused" });
    const head = (await receiver.summary()).at;
    await receiver.restart();
    expect(await receiver.stub.deliver(await other.envelope(1, 0))).toMatchObject({ answer: "recorded" });
    expect((await receiver.summary()).at).toEqual(head);
    expect(await receiver.stub.deliver(await sender.envelope(1, 0))).toMatchObject({ answer: "recorded" });
    expect((await receiver.item(0))!.values["last"]).toBe(17);
    const nodes = [receiver, sender, other], definitions = [receiverDefinition, senderDefinition, alternateDefinition];
    const journals = await Promise.all(nodes.map(node => node.sealed()));
    const retained: RetainedInput[] = definitions.map(definition => ({ kind: "definition", digest: definition.digest, bytes: canonicalize(definition.declared) }));
    for (const [index, entries] of journals.entries()) for (const { entry } of entries) retained.push({ kind: "entry", digest: digestBytes(canonicalBytes(entry)), bytes: canonicalize(entry), under: definitions[index]!.declared.name });
    const rows = await Promise.all(nodes.map(async (node, index) => ({ scope: await node.at(), entries: journals[index]!.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })), retained })));
    const replay = await verify(new MemorySource(rows), { mode: "replay", scope: receiver.name, grants: "as-recorded", bounds: PROPOSED_BOUNDS });
    expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
    const tampered = structuredClone(journals[0]!.at(-1)!.entry);
    if (tampered.input.type !== "delivery" || !("decision" in tampered.input)) return expect.fail("expected the genuine applied delivery");
    tampered.input.decision = "refused"; tampered.input.reason = { code: "wrong-pin" }; tampered.effects = [];
    rows[0]!.entries[rows[0]!.entries.length - 1] = { seq: tampered.seq, hash: entryHash(tampered), bytes: canonicalize(tampered) };
    expect((await verify(new MemorySource(rows), { mode: "replay", scope: receiver.name, grants: "as-recorded", bounds: PROPOSED_BOUNDS })).report.result).toBe("mismatch");
  } finally { net.hold = previous; }
});
