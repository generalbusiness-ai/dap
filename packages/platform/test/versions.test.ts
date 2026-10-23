import { expect, test } from "vitest";
import type { DeclaredDefinition, PlatformDefinition, Seed } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, parseStrict } from "@generalbusiness/dap-bytes";
import type { PlatformRule, RuleGiven } from "@generalbusiness/dap-derive";
import { d } from "@generalbusiness/dap-derive/testing";
import { TRUSTED_APPLICATION_COHORT, ARCHIVE_APPLICATION_COHORT, ARCHIVE_DECLARED_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT, INVITATION_KEY_COHORT, APPLICATION_COHORT, FILE_PUBLICATION_COHORT, PARTITION_COHORT, COUNTING_COHORT, DEMO_REGISTER, FIRST_ACTIONS_OF, NEWEST, ROLE_LISTS, ROLE_TABLE_OF, VERSIONS, WEB_DEMO_COHORT, WEB_DEMO_REGISTER, directorySeed, platform, versionOf, type Role, nativeDeclarationText, DEVICE_APPLICATION_COHORT } from "../src/index.ts";
import { NATIVE_DECLARATION_PINS, NATIVE_DECLARATION_TEXT } from "../src/native-declarations.generated.ts";
import { creationRita as rita } from "./fixtures-entry.ts";
import { DECLARED_APPLICATION_RULES } from "../src/application-install-v2.ts";
import { DECLARED_APPLICATION_COHORT } from "../src/application-install-v2-wire.ts";

// The planner's decision of 2026-10-07: a changed definition carries a new version; a scope pins its version at its genesis and is
// judged and replayed by it for as long as it exists. Supporting application cohort pins require explicit selection. Plain functions: the rules are called with what a judge would give them, and no scope is run.

/** The digest of each version's data, in the definition's own domain. Version 1 matches actual main1eed91aa, including gate1 definition-byte places. */
// D6/M5 digests were validated from the complete actual catalog at f1455d940.
// Evidence: /tmp/artroom-m1-f145-generation-execution/complete-catalog-validation.json
// SHA-256: 47545c46bbc0b5fd6c577aa8635d518b76a8416a020fe988d30755eb6a5a950c. Generation is not a test or gate pass.
// Rules4 was generated and validated from the actual catalog at 15a922de916a28c3062775acef4ba8673708f458; its tests remained held.
// Evidence: /tmp/artroom-rules4-generation-one/result.json
// SHA-256: 41f71c59e0b534042ccfc5b9bed61f4bb4cfc753809db6fabfec4acc4ebe3761.
// Demo register versions 7 and 8 and directory version 7 were generated and validated at a1153d28b3e8f5b73af0440b894b217f351709d0.
// Evidence: /tmp/artroom-cohort25-generation-one/result.json
// SHA-256: e2a2052d23705690ec4b884786f453718875f6505d515fdda88a20191eb64269.
const DIGESTS: Readonly<Record<string, string>> = {
  // Four combined Device/archive pins observed in the complete catalog; all58 earlier literals unchanged.
  "platform:register@17": "sha256:af4c384cebbf4e9b9526bf939dee17b7faa370dc3026b54ae7a7b57c2a254091",
  "platform:directory@16": "sha256:c8c40477f369a19213439eaa1a3263dad1ce16038e5df605b6f7322737380b55",
  "platform:rules@10": "sha256:e10d8861dd5a80168437187a84d5bb3efe70d73825faa0c61ecc368da359a854",
  "platform:destination@12": "sha256:f29353b2ca1f551ab6a7d622bbd57aa6dfc7fc3748358ce709ccee728e4c15df",

  // Nine archive pins observed and whole-catalog validated; all45 old literals unchanged.
  // /tmp/artroom-s2-archive-cohort-catalog-20261019.json SHA256 fea417f858d5ef4167a65de021091fc68763c67b1e637063ee20becdda428300.
  "platform:register@14": "sha256:af4c384cebbf4e9b9526bf939dee17b7faa370dc3026b54ae7a7b57c2a254091",
  "platform:register@15": "sha256:af4c384cebbf4e9b9526bf939dee17b7faa370dc3026b54ae7a7b57c2a254091",
  "platform:directory@13": "sha256:83fe45f71a8a012cc03a9f54d1c579df61fd40d647df08743b118742c279f9cc",
  "platform:directory@14": "sha256:83fe45f71a8a012cc03a9f54d1c579df61fd40d647df08743b118742c279f9cc",
  "platform:membership@8": "sha256:d4116e2df6279198064322d076f3c2b61766aacad9c9feb706fcc2d2e1dfb658",
  "platform:rules@7": "sha256:25c718dc481bfd2b686805b018ff796c47a25151819fb13e036177661d1b4ed6",
  "platform:rules@8": "sha256:6702df8e032add633aec871e999089dfe5fc9753c0fc282dc69c78287064c7ab",
  "platform:destination@9": "sha256:f29353b2ca1f551ab6a7d622bbd57aa6dfc7fc3748358ce709ccee728e4c15df",
  "platform:destination@10": "sha256:f29353b2ca1f551ab6a7d622bbd57aa6dfc7fc3748358ce709ccee728e4c15df",
  "platform:register@16": "sha256:4f85c4f4ad35ffc3580cba3fc3ec17f29b59cfc9ccb9eee84b7ad355125926d6",
  "platform:directory@15": "sha256:8d6ca8dadb088163720a190743d96aaba212e8aff7291ab6677777aecda20705",
  "platform:rules@9": "sha256:6c9ca1c653e92049a45d4b21a6875cbf73dad0c503871041f3ee80e3b1f57d09",
  "platform:destination@11": "sha256:f29353b2ca1f551ab6a7d622bbd57aa6dfc7fc3748358ce709ccee728e4c15df",
  // Complete45-entry generation: /tmp/artroom-m2a-cohort-catalog-validation-20261018.json
  // SHA-25690034cde46e86a1f; all42 previously recorded bodies unchanged.
  "platform:register@13": "sha256:4f85c4f4ad35ffc3580cba3fc3ec17f29b59cfc9ccb9eee84b7ad355125926d6",
  "platform:directory@12": "sha256:f64674c37dfb21f8ea227cd3a4a4fb405cf4d5924474d6e6cf6e4bf2dc90f012",
  "platform:destination@8": "sha256:f29353b2ca1f551ab6a7d622bbd57aa6dfc7fc3748358ce709ccee728e4c15df",
  // Generated from the actual complete catalog, all41 earlier bodies unchanged.
  // /tmp/artroom-m2a-first-catalog-validation-20261018.json (c01f0709dd38a0ce).
  "platform:rules@6": "sha256:121aafc3f0024a1e66437f021be2f227540c8ce8eb71f81dc2c295d9e60d97f8",
  // Observed and whole-catalog validated in the retained M1 install generation.
  // /tmp/artroom-m1-install-complete-catalog-validation-20261018.json
  "platform:destination@7": "sha256:f29353b2ca1f551ab6a7d622bbd57aa6dfc7fc3748358ce709ccee728e4c15df",
  "platform:register@12": "sha256:4f85c4f4ad35ffc3580cba3fc3ec17f29b59cfc9ccb9eee84b7ad355125926d6",
  "platform:directory@11": "sha256:f64674c37dfb21f8ea227cd3a4a4fb405cf4d5924474d6e6cf6e4bf2dc90f012",
  "platform:membership@7": "sha256:d4116e2df6279198064322d076f3c2b61766aacad9c9feb706fcc2d2e1dfb658",
  "platform:rules@5": "sha256:dea9ba41b154e86334b5770f83fee666b8b37d535cc3ca705adf66cca28ec954",
  // Observed from the exact complete catalog in the retained first focused
  // catalog run, not computed from the same values as the expected result.
  "platform:register@11": "sha256:4f85c4f4ad35ffc3580cba3fc3ec17f29b59cfc9ccb9eee84b7ad355125926d6",
  "platform:directory@10": "sha256:fbb04069f13dcf273ddc7aa68fdd0045a51f2389e25e4e080f3639ed4e596053",
  "platform:directory-partition@1": "sha256:0fd9e4fdce767a68e6cbe73c49bd0c38b735c3b684526b1180e4e8fea209336f",
  "platform:destination@6": "sha256:aed97f875f0331aeb249deff7a35b45378decfae43a3efedb5eac8ca43433f96",
  "platform:destination@5": "sha256:aed97f875f0331aeb249deff7a35b45378decfae43a3efedb5eac8ca43433f96",
  "platform:register@10": "sha256:4f85c4f4ad35ffc3580cba3fc3ec17f29b59cfc9ccb9eee84b7ad355125926d6",
  "platform:directory@9": "sha256:cc7e926210e93355ea5bb57143f9b0be63dac0bcfd25ebdc6010a750276155c6",
  "platform:membership@6": "sha256:1ee5b8983cb1f1d7ff7c6a4ad5744bfc06cc81ee1e608088973fe56695b51abc",
  "platform:destination@4": "sha256:f29353b2ca1f551ab6a7d622bbd57aa6dfc7fc3748358ce709ccee728e4c15df",
  "platform:register@9": "sha256:4f85c4f4ad35ffc3580cba3fc3ec17f29b59cfc9ccb9eee84b7ad355125926d6",
  "platform:directory@8": "sha256:db86423258d5de0df43956187460d5ade0d3e878371c24d89c33ecd51c2b1bd5",
  "platform:register@7": "sha256:1363aa547f314eb9c598c33415a1e9e3c90b4e5afce351233abf9b3f757069b5",
  "platform:register@8": "sha256:1363aa547f314eb9c598c33415a1e9e3c90b4e5afce351233abf9b3f757069b5",
  "platform:directory@7": "sha256:053ec528406d1de077992d80f405f846940fb3c2c44f9206263e18329e1d58f6",
  "platform:directory@6": "sha256:1490af0c962eb382a2befe76139b0f2387b16071c27288d65effc9fc7a037ca7",
  "platform:membership@5": "sha256:6a1ea346fa6ae237fe53f85551fe621b56d1a91be0117178c829958d0f5f0155",
  "platform:register@6": "sha256:4f85c4f4ad35ffc3580cba3fc3ec17f29b59cfc9ccb9eee84b7ad355125926d6",
  "platform:register@5": "sha256:4f85c4f4ad35ffc3580cba3fc3ec17f29b59cfc9ccb9eee84b7ad355125926d6",
  "platform:directory@5": "sha256:db86423258d5de0df43956187460d5ade0d3e878371c24d89c33ecd51c2b1bd5",
  "platform:membership@4": "sha256:78b3f59009f78030f88d3444187c0c7deb40c296b7f07b18d5e86a161222f831",
  "platform:rules@4": "sha256:e3fa2a716deb5580674095272973c2830d8259bf089390b5a753db6d29b65454",
  "platform:rules@3": "sha256:e9ed7ebe04bf66f1dd7c2b39a43d55b5e3b71317d5e3e3cf1a96dd16b2804ed5",
  "platform:inbox@1": "sha256:2d4fb56155ddc0cf02bfc75ac89a261c35aeb3069771e4a51429319ccd204748",
  "platform:register@1": "sha256:4f85c4f4ad35ffc3580cba3fc3ec17f29b59cfc9ccb9eee84b7ad355125926d6",
  "platform:register@2": "sha256:4f85c4f4ad35ffc3580cba3fc3ec17f29b59cfc9ccb9eee84b7ad355125926d6",
  "platform:register@3": "sha256:4f85c4f4ad35ffc3580cba3fc3ec17f29b59cfc9ccb9eee84b7ad355125926d6",
  "platform:directory@1": "sha256:5463d69af0b876502c25e643160ae71cbcbafa55608082486cd9893969d9197b",
  "platform:directory@2": "sha256:053ec528406d1de077992d80f405f846940fb3c2c44f9206263e18329e1d58f6",
  "platform:directory@3": "sha256:053ec528406d1de077992d80f405f846940fb3c2c44f9206263e18329e1d58f6",
  "platform:membership@1": "sha256:78b3f59009f78030f88d3444187c0c7deb40c296b7f07b18d5e86a161222f831",
  "platform:membership@2": "sha256:78b3f59009f78030f88d3444187c0c7deb40c296b7f07b18d5e86a161222f831",
  "platform:rules@1": "sha256:84f2d2e583932e1b8d3cf565216e6c4ea14b004b65e69077e84d7d24aa727471",
  "platform:rules@2": "sha256:84f2d2e583932e1b8d3cf565216e6c4ea14b004b65e69077e84d7d24aa727471",
  "platform:destination@1": "sha256:8876db18e301991a2d8d936191598998c9b1ec9aef5ed71e4e75d08651327743",
  "platform:destination@2": "sha256:2caf58557aaf561be0696ee232f4b333d0cfb68962caec710989bc0f3ddfacc1",
  "platform:destination@3": "sha256:f73f9a4177b8a5e129a0b0e57378f7f0cae3c1dbf5f26bd8761402208e110cf3",
};

test("every shipped version resolves to its own data, pinned by digest, and version 1 of each is the data that main shipped; no other version resolves; default founding keeps the existing cohort", () => {
  const digests = Object.fromEntries(Object.entries(VERSIONS).map(([named, supplied]) => [named, definitionDigest(supplied.data as unknown as DeclaredDefinition)]));
  expect(digests).toEqual(DIGESTS); // Every supported version has its exact observed golden literal.
  const next = platform("platform:rules@4")!;
  expect(next).toBe(VERSIONS["platform:rules@4"]);
  expect(next.data.items["rules"]!.values["ownerMayReview"]!.default).toBe(true);
  expect(next.rules).toBe(platform("platform:rules@3")!.rules);
  expect(digests["platform:rules@4"]).not.toBe(DIGESTS["platform:rules@3"]);
  expect(["platform:rules@1", "platform:rules@2", "platform:rules@3"].map(named => platform(named)!.data.items["rules"]!.values["ownerMayReview"]!.default)).toEqual([false, false, false]);
  for (const named of Object.keys(DIGESTS)) expect(platform(named)).toBe(VERSIONS[named]);
  expect(["platform:destination@13", "platform:destination@0", "platform:destination@02", "platform:destination", "platform:task@1", "toString"].map(platform)).toEqual(Array(6).fill(null));
  // Explicit application and demo pins do not replace the existing default cohort.
  const supporting = new Set<string>([...Object.values(TRUSTED_APPLICATION_COHORT).filter(pin => pin !== "platform:inbox@1"), PARTITION_COHORT.register, PARTITION_COHORT.directory, PARTITION_COHORT.partition, PARTITION_COHORT.destination, ...Object.values(INVITATION_KEY_COHORT).filter(pin => pin !== "platform:inbox@1" && pin !== "platform:destination@2"), FILE_PUBLICATION_COHORT.register, FILE_PUBLICATION_COHORT.directory, FILE_PUBLICATION_COHORT.destination, APPLICATION_COHORT.register, APPLICATION_COHORT.directory, APPLICATION_COHORT.membership, APPLICATION_COHORT.rules, COUNTING_COHORT.register, COUNTING_COHORT.directory, COUNTING_COHORT.membership, "platform:rules@4", "platform:destination@5", DEMO_REGISTER, WEB_DEMO_REGISTER, WEB_DEMO_COHORT.directory]);
  supporting.add(DECLARED_APPLICATION_RULES);
  for (const cohort of [ARCHIVE_APPLICATION_COHORT, ARCHIVE_DECLARED_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT]) for (const pin of Object.values(cohort)) if (pin !== "platform:inbox@1") supporting.add(pin);
  for (const pin of [...Object.values(DECLARED_APPLICATION_COHORT), ...Object.values(DEVICE_APPLICATION_COHORT)]) if (pin !== "platform:inbox@1") supporting.add(pin);
  const highest = Object.keys(VERSIONS).filter((named) => !supporting.has(named)).reduce<Record<string, number>>((most, named) => ({ ...most, [named.slice(0, named.lastIndexOf("@"))]: Math.max(most[named.slice(0, named.lastIndexOf("@"))] ?? 0, versionOf(named as PlatformDefinition)) }), {});
  expect(Object.fromEntries(Object.entries(NEWEST).map(([name, named]) => [name, versionOf(named)]))).toEqual(highest);
  // Version 2 adds the act `read-token` and its operation `mint-read` to the destination, and nothing to version 1.
  const [one, two] = [platform("platform:destination@1")!, platform("platform:destination@2")!];
  expect([Object.hasOwn(one.data.acts, "read-token"), Object.hasOwn(one.data.outcomes, "mint-read"), Object.hasOwn(one.rules, "mint-read"), Object.hasOwn(one.rules, "open-read-token")]).toEqual([false, false, false, false]);
  expect([Object.hasOwn(two.data.acts, "read-token"), Object.hasOwn(two.data.outcomes, "mint-read"), Object.hasOwn(two.rules, "mint-read"), Object.hasOwn(two.rules, "open-read-token")]).toEqual([true, true, true, true]);
});

/** What a rule is given in the genesis of a scope under that version, or in a later entry whose own entry 0 is that genesis. */
const genesisOf = (definition: PlatformDefinition): Seed => ({ v: 1, kind: "register", definition, creator: null, cause: d("c"), ordinal: 0 });
const inGenesis = (definition: PlatformDefinition): RuleGiven => ({ input: { type: "genesis", seed: genesisOf(definition) }, resolved: { self: 0 } } as unknown as RuleGiven);

test("a rule reads its own version from the scope's genesis: the register of each version seeds the directory of the same version, and membership of each version writes its own first lists, with destination.read-token only at version 2", () => {
  const signed = { intent: { v: 1, to: null, actor: rita.key, kind: "found", fields: {} } };
  const at = { kind: "register", scope: `sc_${"r".repeat(51)}a`, inc: `in_${"r".repeat(25)}a` };
  const create = (definition: PlatformDefinition) => ({ input: { type: "act", signed }, own: (seq: number) => (seq === 0 ? { entry: { input: { type: "genesis", seed: genesisOf(definition) } } } : null), resolved: { at } }) as unknown as RuleGiven;
  expect((["platform:register@1", "platform:register@2", "platform:register@3"] as const).map((named) => directorySeed(create(named)).definition)).toEqual(["platform:directory@1", "platform:directory@2", "platform:directory@3"]);
  expect(directorySeed(create(DEVICE_APPLICATION_COHORT.register)).definition).toBe(DEVICE_APPLICATION_COHORT.directory);
  expect(directorySeed(create(FILE_PUBLICATION_COHORT.register)).definition).toBe(FILE_PUBLICATION_COHORT.directory);
  expect(directorySeed(create(PARTITION_COHORT.register)).definition).toBe(PARTITION_COHORT.directory);
  expect([DEMO_REGISTER, WEB_DEMO_REGISTER].map(named => directorySeed(create(named)).definition)).toEqual(["platform:directory@3", WEB_DEMO_COHORT.directory]);

  const roleTable = (platform("platform:membership@1")!.rules["role-table"] as Extract<PlatformRule, { place: "effect" }>);
  const lists = (named: PlatformDefinition) => Object.fromEntries((roleTable.run(inGenesis(named)) as unknown as readonly { slot: string; value: string[] }[]).map((effect) => [effect.slot, effect.value]));
  const [one, two] = [lists("platform:membership@1"), lists("platform:membership@2")];
  expect(Object.values(one).some((list) => list.includes("destination.read-token"))).toBe(false);
  expect(Object.values(two).every((list) => list.at(-1) === "destination.read-token")).toBe(true);
  expect(Object.fromEntries(Object.entries(two).map(([slot, list]) => [slot, list.slice(0, -1)]))).toEqual(one);
  // Each version's first lists are its table, row for row (section 3.2, "The table, counted").
  for (const named of ["platform:membership@1", "platform:membership@2"]) {
    for (const role of Object.keys(ROLE_LISTS) as Role[]) {
      expect([...FIRST_ACTIONS_OF[named]![role]].sort()).toEqual(ROLE_TABLE_OF[named]!.flatMap(([actions, roles]) => (roles.includes(role) ? actions : [])).sort());
    }
  }
});


test("generated native bytes cover exactly the live catalog and independent digest goldens", () => {
  expect(NATIVE_DECLARATION_PINS).toEqual(DIGESTS);
  expect(Object.keys(NATIVE_DECLARATION_PINS).sort()).toEqual(Object.keys(VERSIONS).sort());
  expect(Object.keys(NATIVE_DECLARATION_TEXT).sort()).toEqual([...new Set(Object.values(DIGESTS))].sort());
  for (const [named, supplied] of Object.entries(VERSIONS)) {
    const projection = nativeDeclarationText(named);
    expect(projection).not.toBeNull();
    expect(projection!.digest).toBe(DIGESTS[named]);
    expect(projection!.text).toBe(canonicalize(supplied.data));
    expect(definitionDigest(parseStrict(projection!.text) as DeclaredDefinition)).toBe(DIGESTS[named]);
  }
  for (const named of ["toString", "__proto__", "platform:membership@999", "platform:membership@08"]) expect(nativeDeclarationText(named)).toBeNull();
});
