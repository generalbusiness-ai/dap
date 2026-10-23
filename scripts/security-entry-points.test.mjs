import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertInventory, documentedInventory, servedInventory, sourceSeal, roomHttpEntry, sandboxInventory } from "./security-entry-points.mjs";

// Reviewed matcher/gate owners. These are change tripwires, not runtime proof.
const seals = {
  "apps/room/worker.ts": "aba04e12dc206f0be6bda4a8edeac64569e0edd44b7a87772595d7db40bb8b67",
  "apps/room/fetch.ts": "5661bfc33c21e9c0390f9897edb6948d05c1de42e3df559a8e8d16d16e8c1089", // R2 owning AST value adopted on the reviewed branch.
  "apps/room/demo-creation.ts": "cbc8c23034bc6c83f45bd7664cb158c7f452d2eb4f9e6bf406ff36c003a6fff7",
  "apps/room/page/route.ts": "62c8f69b9f516f1b5acdaef57d7aed25268d8cf03283bdffdd4b1b5f20bb6b3d",
  "apps/room/brand/route.ts": "71b45ff9b41b3bea31c775a16525349591e0d4f7dfdc65da79f095816b1c343c",
  "packages/scope/src/worker.ts": "2e3546e4c7a70ce17ae42c8e1367287277b26a7a67fa6dfe4fa2d83c4b5eedca", // Actual union parser value adopted by root.
  "packages/scope/src/scope-index.ts": "98a91329fbe8926127aab2db555970278e898cec347fd4f20569b19f1f879d54", // New internal lookup/registration boundary.
  "packages/scope/src/creation-admission.ts": "5fe79f1b3a9f760c318cd5f9c66d768fe8a1815e47454e351826443b617ead58", // Reviewed R1 ancestry owner; adopted AST value.
  "packages/scope/src/creation-lineage.ts": "3786e04db4627fa7bfa07f8edefd3fd1125305da80b96b3d9132b671d9f21ef0", // Reviewed whole-lineage boundary; adopted AST value.
  "packages/scope/src/creation-declaration.ts": "ec719181ce0cff0048165e27bd108b8b728e9f78a858033155b670ab82e93c2b", // Bounded immutable native Directory custody, not authority.
  "packages/scope/src/namespace.ts": "1f65de08e11d85c204b671b8605b132f506cf06f2e87843e90eb0d1884f428e3", // Reviewed internal declaration RPC; adopted AST value.
  "packages/scope/src/health.ts": "b1c5240a6ca05b247ed54766ba25448d02057267d8342a4df6908969a57acb23",
  "packages/scope/src/site/route.ts": "f57a2415c997ce17fb6fcf254944b0237bae598adffca64eda123faf0fcc1084",
  "packages/scope/src/applications/route.ts": "2e75a4a1ed4edc78697f740da1c7957fe365e3c5c179a00dbbb5d2a933ddfb8a", // Actual union parser value adopted by root.
  "packages/scope/src/item-query-wire.ts": "8206b9a6531ca30cae1bc49cc249eea08c70a658305f41b3ebea6eda042055a8",
  "packages/scope/src/applications/projection-wire.ts": "2e07df5447469dc09aff0d4017e010634150f49c92f614221402cf46a869c6d0",
  "packages/scope/src/object.ts": "b403bba2d72425b252488d960a7cbb557d1bcc38fb9390760e39b49ac4299df4", // R2 target-owned genesis registration.
  "packages/scope/src/core.ts": "c7f2e49246b1e784981337ee13af53b17bab424a13112d5a40ff76b75fb7a128",
  "packages/derive/src/genesis.ts": "df7722143f01c8084b8f045ef959b203ae1756c4dfde170d0454cfe0b0392843",
  "packages/derive/src/judge.ts": "c0ed325bc2fa84693b40d3d53a9ad54a9a9786dab39dd3b9c6039ac553488f63",
  "packages/scope/src/sessions.ts": "7206983eedd0ff821afee7c6032f2a9b461c36e31b9ac186a4c2cc8b8a897de2",
  "packages/scope/src/reads.ts": "1d4bb75e2b71f10f140990b7537d626f93eb8c3679057ba700ddeda96faa5e1a",
  "packages/scope/src/signed-reads.ts": "6c4c4c81f44994c2ac9e4ca921c8f34184977a1256d6574e78514b814512eaf0", // R12 custody-only serving helper; native checks unchanged.
  "packages/scope/src/limits.ts": "6d4966a12e86067c39f61a243601d0d3a78a66850ee07f4ae80e97e22ab3639e", // R12 verified-key join failure window.
  "packages/scope/src/serving-limits.ts": "3a9f410f926f1e3711b78a750dd7dfb055f418fa9904be55ccb3f8cea869a987", // New bounded memory-only counter, no live eviction.
  "packages/scope/src/serving-admission.ts": "18a5d6991a769647cd14d3e8985585c6746f5df1c3d1d5c639f34d0eb6f4da5e", // New bounded original-signature/counter ingress.
  "packages/bytes/src/records.ts": "bc4e65e75215c2d940b0884a6810d5d90969455ba956c1e9731a3ed0d3c1b6af", // Public typed read refusal vocabulary (kernel section 7).
  "packages/scope/src/session-preparation.ts": "4b9699cb1ee06234162dc2088c5c37be1804e1e9f15985fa1f0dc3151170bd85",
  "packages/scope/src/item-queries.ts": "61ead9996d2c338a26331e04b8576c52425d8d2c88dc86173a7d79108c2ee418",
  "packages/scope/src/applications/projection.ts": "31a3db04f3912ee3fb5bbd4cc3c658344f265f30d224ac95be2ba3b17f8622bd",
  "packages/scope/src/destination-host.ts": "b86198499cadddaf47f439ed39f7e44f8da78fbed120e185b787b153f0dc66eb",
  "packages/mcp/src/hosted.ts": "337b73c8773a5ce3424fc67b5746710d800ca1e4d4074ba6819f94560817641d",
  "packages/mcp/src/http.ts": "9a1450bef9f94b55b4751a3368032dfc480555628b48ccfdd55fd43e9c853af8",
  "examples/grow/simulator-worker.ts": "2d60dab3a9a5b204b69f15bc5ec3473fa48513888d7ffdb0c1fc179f6fe4883c",
  "examples/grow/simulator-host.ts": "26a8521b98737cae3d80a9fe3b9ac17fb10b11fcf2f8ce973251253bdbf2b7df"
};
// Integrated archive owners computed by the maintained owning parser.
// Root adopted the reviewed outputs; the historical map name is retained here.
const pendingArchiveSeals = {
  // Publication and floor owners were reviewed before these values were
  // computed by the maintained parser on the integrated source.
  "packages/scope/src/archive-target.ts": "33826c2966d39df7f4d46aa74365f55b9e7e2a2317f26f9f98a735792ccb4a39",
  "packages/scope/src/archive-source-window.ts": "4db3f5885e7541f713b9668d1cde655e42be1950dd6af77d5711a323b3582e1c",
  "packages/scope/src/archive-publication.ts": "d8c39d220bc7eea59301478aa553960267aac16f06502b4103a85647c71eb457",
  "packages/scope/src/archive-build.ts": "e82bffde8d5e6ce26b1dbd80f0659ec15a48dd461f9e02f4a235c19fbc1a4201",
  "packages/scope/src/archive-driver.ts": "3dd46755edd501d2f4bb614648a3d0358fbe72635c4a734403da3f98317aceac", // Parent-read diagnostic reviewed; actual maintained parser output.
  "packages/scope/src/archive-row.ts": "b3b4f7fed29152a60ba76dc58a09529b18fc7b9ea737f986d7fc2803a42d8dab",
  "packages/scope/src/floor-writer.ts": "fb8fd859844b8d10ba43b477bcaf07ab32fe1bfa1b6684ad9ae70b930d328a11",
  "packages/scope/src/object.ts": "b403bba2d72425b252488d960a7cbb557d1bcc38fb9390760e39b49ac4299df4", // Must match the separately adopted original owner value above.
  "apps/room/worker.grow.ts": "791c2bfcb8b2a62d8f0d8afec627ac76b63be4b9f1ee5de27d3f6c081959bc01",
  "apps/room/archive-policy.ts": "07ea72db6bc58257d3f280ac1e1c7db9296868016493fa926e473ddeb9b6f486",
  "apps/room/archive.ts": "36b2250301a217b6e1c74cd1cea1a65a45390be3679e4a2fd2e809890eb6abf5",
  "packages/scope/src/archive-host-item.ts": "0f9eaddc4000574a1575466592f88c57beecc11efb93e402a568a84fab8ef903",
  "packages/scope/src/archive-host.ts": "8e573b3b8f5a5fdc6f677fdcc1a2e28fe4078f1f149083db568d950c4c2d2539", // Parent-read diagnostic reviewed; actual maintained parser output.
  "packages/scope/src/artifacts-host.ts": "378eca9b5c3c197f738cb88f59a5df51d83d52929f614735d0fdc3917df06ac0",
  "packages/scope/src/artifacts-wiring.ts": "937bedd41f5f21953c2fe659634ca732b44620cc98e33e5a43f7945601c58963",
};
// Actual maintained parser outputs adopted by root; never infer hashes from intent.
const pendingR8Seals = {
  "packages/cli/src/commands.ts": "7ccaa015aff104d009dc4fcd0fd37faf718fb822535f6a88764585c4ed69cb76", // Actual integrated CLI parser value adopted by root.
  "apps/sandbox/worker.ts": "d354c1740d51e2b83e0b93272384607c609c65386c3fc4b8d977edfb89b6636a",
  "packages/client/src/application-gateway.ts": "daa1d28c02085bd6be7a9698a7120cd106cc7233aad92565aaa05e67427878ef",
  "packages/client/src/application-route.ts": "dcb686835049af3043e1cb8c73a989545636ea5bac2d85aaee6be92b6cd3abcc",
  "packages/scope/src/applications/bindings.ts": "8212d318f058035a580c945f1140717fe31ea42638024e1099069cf654400888",
};
const document = () => documentedInventory(readFileSync(new URL("../docs/security/entry-points.md", import.meta.url), "utf8"));

test("every served Worker route/method has exactly its reviewed gate-class row", async () => {
  assertInventory(await servedInventory(), document());
  for (const [file, seal] of Object.entries(pendingArchiveSeals)) {
    assert.equal(typeof seal, "string", `Integrated AST seal is pending review: ${file}`);
    assert.equal(sourceSeal(file), seal, `Review changed archive authority owner: ${file}`);
  }
  for (const [file, seal] of Object.entries(seals)) {
    assert.equal(typeof seal, "string", `Integrated R8 AST seal is pending review: ${file}`);
    assert.equal(sourceSeal(file), seal, `Review changed matcher or gate owner: ${file}`);
  }
  for (const [file, seal] of Object.entries(pendingR8Seals)) {
    assert.equal(typeof seal, "string", `Integrated R8 AST seal is pending review: ${file}`);
    assert.equal(sourceSeal(file), seal, `Review sandbox owner: ${file}`);
  }
});

test("a real matcher change fails the inventory bijection with the page unchanged", async () => {
  const source = readFileSync(new URL("../packages/scope/src/worker.ts", import.meta.url), "utf8");
  const before = 'if (what === "requests") return read(await scopes.requests';
  assert.equal(source.split(before).length, 2, "The control must change exactly one dispatch branch");
  const changed = await servedInventory({ scopeSource: source.replace(before, 'if (what === "request-window") return read(await scopes.requests') });
  const routes = changed.get("artroom-scope").map(row => row.route);
  assert.ok(routes.includes("GET /v1/scopes/:scope/request-window"), "The new matcher must actually dispatch");
  assert.ok(!routes.includes("GET /v1/scopes/:scope/requests"), "The old matcher must no longer dispatch");
  assert.throws(() => assertInventory(changed, document()), { code: "ERR_ASSERTION", message: /route\/method\/gate bijection/ });
});

test("the bijection rejects a missing row, an extra row, and a changed gate", async () => {
  // These in-memory composition controls never import a Worker module.
  const grow = readFileSync(new URL("../apps/room/worker.grow.ts", import.meta.url), "utf8");
  const forward = 'export { default } from "./worker.ts";';
  assert.equal(grow.split(forward).length, 2);
  assert.equal(roomHttpEntry("apps/room/worker.grow.ts"), "apps/room/fetch.ts");
  const modeled = changed => roomHttpEntry("apps/room/worker.grow.ts", file =>
    file === "apps/room/worker.grow.ts" ? changed : readFileSync(new URL("../" + file, import.meta.url), "utf8"));
  for (const changed of [
    grow.replace(forward, 'export { default } from "./other.ts";'),
    grow.replace(forward, 'export { fetch as default } from "./worker.ts";'),
    grow.replace(forward, 'export default {};'),
  ]) assert.throws(() => modeled(changed), { code: "ERR_ASSERTION" });
  // Duplicate defaults are invalid module syntax. Either the parser or the
  // composition model must refuse; do not normalize production parse errors.
  assert.throws(() => modeled(grow + '\nexport { default } from "./worker.ts";'));
  assert.throws(() => roomHttpEntry("apps/room/unreviewed.ts"), { code: "ERR_ASSERTION" });
  const actual = await servedInventory();
  for (const fault of [rows => rows.slice(1), rows => [...rows, { route: "POST /unserved", gate: "none" }], rows => rows.map((row, i) => i === 0 ? { ...row, gate: "membership" } : row)]) {
    const docs = document(); docs.set("artroom-scope", fault(docs.get("artroom-scope")));
    assert.throws(() => assertInventory(actual, docs), { code: "ERR_ASSERTION", message: /route\/method\/gate bijection/ });
  }
});

// Controls alter actual matchers while keeping the documented inventory fixed.
test("R8 public and sandbox matcher changes fail their finite inventory", async () => {
  const source = readFileSync(new URL("../packages/scope/src/applications/route.ts", import.meta.url), "utf8");
  const start = source.indexOf("export async function applicationPage(");
  assert.ok(start > 0);
  const prefix = 'startsWith("/applications/")';
  const publicPart = source.slice(start);
  assert.equal(publicPart.split(prefix).length, 2);
  const changed = source.slice(0, start) + publicPart.replace(prefix, 'startsWith("/other-applications/")');
  const changedInventory = await servedInventory({ applicationSource: changed });
  assert.throws(() => assertInventory(changedInventory, document()), { code: "ERR_ASSERTION" });
  const gateway = readFileSync(new URL("../packages/client/src/application-gateway.ts", import.meta.url), "utf8");
  const before = '["acts", "settle", "sessions"]';
  assert.equal(gateway.split(before).length, 2);
  const baseline = await sandboxInventory();
  assert.ok(baseline.some(row => row.route === "POST /v1/scopes/:scope/acts"));
  const narrowed = await sandboxInventory({ gatewaySource: gateway.replace(before, '["settle", "sessions"]') });
  assert.ok(!narrowed.some(row => row.route === "POST /v1/scopes/:scope/acts"));
  assert.notDeepEqual(narrowed, baseline);
  const sandbox = readFileSync(new URL("../apps/sandbox/worker.ts", import.meta.url), "utf8");
  const metadataGate = 'request.method !== "GET" || !!url.search';
  assert.equal(sandbox.split(metadataGate).length, 2);
  const noMetadata = await sandboxInventory({ sandboxSource: sandbox.replace(metadataGate, 'request.method !== "POST" || !!url.search') });
  assert.ok(baseline.some(row => row.route === "GET /_application-host"));
  assert.ok(!noMetadata.some(row => row.route === "GET /_application-host"));
});
