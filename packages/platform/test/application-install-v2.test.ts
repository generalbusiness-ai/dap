/** Real native v2 proof admission and fold in memory. Rulebook's registrar,
 * authority and declaration-text availability are labelled fixtures. No
 * object storage, network, driver, subordinate birth or browser runs here. */
import { expect, test } from "vitest";
import { canonicalize, definitionDigest, keyIdOfSecret, sign, textDigest, utf8 } from "@generalbusiness/artroom-bytes";
import { packApplication } from "@generalbusiness/artroom-bytes/application";
import { packApplication2, readApplicationProjection } from "@generalbusiness/artroom-bytes/application-v2";
import { keys, membership } from "@generalbusiness/dap-derive/testing";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { APPLICATION_RELEASE_VALUE2, APPLICATION_SEMANTIC_VALUE2, DECLARED_APPLICATION_RULES } from "../src/application-install-v2.ts";
import { APPLICATION_INSTALL_RULES } from "../src/application-install.ts";
import { Rulebook } from "./support-rules.ts";

test("new native pin retains exact v2 proof and projection while Rules5 refuses the new wire", async () => {
  const id = definitionDigest(countingCommitments), declaration = canonicalize(countingCommitments);
  const input = { name: "test.declared-install", version: "1", semantic: {
    v: 2 as const, entry: id, definitions: [{ id, bytes: declaration }],
    host: { execution: "recorded-do" as const, profiles: ["restricted@1"] }, capabilities: [], roles: { member: ["counting.fulfill"] }, predecessor: null,
    projections: { board: readApplicationProjection({ v: 1, definition: id, revision: "revision", sources: {
      board: { item: "board", read: "one", states: ["finished", "open", "paused"], limit: 1, fields: {
        lastNumber: { from: { kind: "value", name: "lastNumber" }, of: { type: "int", min: 0, max: 100 }, nullable: false },
      } },
    } }) },
  }, presentation: { v: 2 as const, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {}, views: {}, resources: {} } };
  const secret = new Uint8Array(32).fill(64), signer = { key: keyIdOfSecret(secret), sign: (bytes: Uint8Array) => sign(secret, bytes) };
  const packet = await packApplication2(input, signer);
  const { views: _views, resources: _resources, ...presentation } = input.presentation;
  const legacy = await packApplication({ ...input, semantic: { ...input.semantic, v: 1, projections: {} }, presentation: { ...presentation, v: 1 } }, signer);
  const fields = { definitionText0: textDigest(declaration), uri: `git+https://git.example/test.git/@${"a".repeat(40)}/application.dap.json`, release: packet.ids.release,
    semantic: packet.ids.semantic, roles: ["member"], values: '{"target":7}' };
  const values = [canonicalize(packet.package.semantic), canonicalize(packet.package.release)];
  const texts = (digest: string) => digest === textDigest(declaration) ? utf8(declaration).length : undefined;
  const next = new Rulebook(true, membership.scope, DECLARED_APPLICATION_RULES), old = new Rulebook(true, membership.scope, APPLICATION_INSTALL_RULES);
  expect(old.act(keys.rita, "install-application", { fields }, { values, texts }).result).not.toBe("write");
  expect(next.act(keys.rita, "install-application", { fields }, { values, texts: () => undefined }).result).not.toBe("write");
  const written = next.act(keys.rita, "install-application", { fields }, { values, texts });
  expect(written.result, JSON.stringify(written)).toBe("write");
  expect(next.item(next.head.seq)).toMatchObject({ state: "pending", values: { phase: "fetch", semantic: packet.ids.semantic } });
  expect(next.state.operation(`${next.head.seq}:0`)).toMatchObject({ owner: DECLARED_APPLICATION_RULES, kind: "fetch-application" });
  expect(written.result === "write" ? written.draft.values : []).toHaveLength(2);
  expect(written.result === "write" ? written.draft.values : []).toEqual(expect.arrayContaining([
    { domain: APPLICATION_SEMANTIC_VALUE2.domain, digest: packet.ids.semantic, bytes: values[0] },
    { domain: APPLICATION_RELEASE_VALUE2.domain, digest: packet.ids.release, bytes: values[1] },
  ]));
  expect(next.replay().snapshot()).toEqual(next.state.snapshot());
  const legacyFields = { ...fields, semantic: legacy.ids.semantic, release: legacy.ids.release };
  const legacyValues = [canonicalize(legacy.package.semantic), canonicalize(legacy.package.release)];
  expect(next.act(keys.rita, "install-application", { fields: legacyFields }, { values: legacyValues, texts }).result).not.toBe("write");
  expect(old.act(keys.rita, "install-application", { fields: legacyFields }, { values: legacyValues, texts }).result).toBe("write");
  // Portable closure/signatures cannot replace whole native admission.
  // This schema still binds the selected fields but names an unknown state.
  const unsupported = structuredClone(countingCommitments);
  unsupported.acts["establish"]!.guards = [{ state: ["not-a-native-state"] }];
  const unsupportedId = definitionDigest(unsupported), unsupportedText = canonicalize(unsupported);
  const unsupportedPacket = await packApplication2({ ...input, semantic: { ...input.semantic, entry: unsupportedId,
    definitions: [{ id: unsupportedId, bytes: unsupportedText }],
    projections: { board: readApplicationProjection({ ...input.semantic.projections.board, definition: unsupportedId }) },
  } }, signer);
  expect(next.act(keys.rita, "install-application", { fields: { ...fields, definitionText0: textDigest(unsupportedText),
    semantic: unsupportedPacket.ids.semantic, release: unsupportedPacket.ids.release } }, {
    values: [canonicalize(unsupportedPacket.package.semantic), canonicalize(unsupportedPacket.package.release)],
    texts: digest => digest === textDigest(unsupportedText) ? utf8(unsupportedText).length : undefined,
  }).result).toBe("refused");
});
