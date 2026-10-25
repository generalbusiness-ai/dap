import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertInventory, documentedInventory, servedInventory, sourceSeal, roomHttpEntry, sandboxInventory } from "./security-entry-points.mjs";

// Reviewed matcher/gate owners. These are change tripwires, not runtime proof.
const seals = {
  "apps/room/worker.ts": "aba04e12dc206f0be6bda4a8edeac64569e0edd44b7a87772595d7db40bb8b67",
  "apps/room/fetch.ts": "c335dde72f4d4f2d6410e156a5c2c66c9a3ed54ee6bd788408cfd89e61602b7b", // R2 owning AST value adopted on the reviewed branch.
  "apps/room/demo-creation.ts": "d9850f4854182c0231a2ae9a985882343e7f3dfea67ea034cafe4fca4bb0d77f",
  "apps/room/page/route.ts": "62c8f69b9f516f1b5acdaef57d7aed25268d8cf03283bdffdd4b1b5f20bb6b3d",
  "apps/room/brand/route.ts": "71b45ff9b41b3bea31c775a16525349591e0d4f7dfdc65da79f095816b1c343c",
  "packages/scope/src/worker.ts": "9a2b93e1b94aafabcb57e0c3b7e093c7a734792fb4b23ac385a95394716e8331", // Actual composed Worker seal from the maintained parser.
  "packages/scope/src/scope-index.ts": "e5658b5fc39cc15bc08e7e71711a67c5859a0e0de94ede88ee5b8b5dbc3d7919", // New internal lookup/registration boundary.
  "packages/scope/src/creation-admission.ts": "0531cbd36d1ae4c0eadc9d836eb5eec13f896fc7c8b8faaaaf9c3c24e3759ccd", // Reviewed R1 ancestry owner; adopted AST value.
  "packages/scope/src/creation-lineage.ts": "1c7566832d4b414926a9792c722d8132bbd06655c59cc28632577d2d9ec52d2c", // Reviewed whole-lineage boundary; adopted AST value.
  "packages/scope/src/creation-versions.ts": "305d76f6e81ddba38e1ee009353060143857af393939f339f20e49ca874d8a8c", // Reviewed R6 creation-policy parser; actual maintained output.
  "packages/scope/src/creation-declaration.ts": "a20baec07622561f51aee74880f58e2cc8d02cc0b98fcb4086fe49613c2ec2cf", // Bounded immutable native Directory custody, not authority.
  "packages/scope/src/namespace.ts": "1f65de08e11d85c204b671b8605b132f506cf06f2e87843e90eb0d1884f428e3", // Reviewed internal declaration RPC; adopted AST value.
  "packages/scope/src/health.ts": "98a9538a31f927996d56470357a3a227f1935f21463c174329d8b7faac129528",
  "packages/scope/src/site/route.ts": "c29a52aef9c532703b4aa41e9c61f54368a1c0116c9ab718309e4a2393bda716",
  "packages/scope/src/site/window.ts": "a5f64febfd69c17c682dc8bf1aa464378a3609d73d9ef0112c16fd79892aea54", // Bounded site-read window; actual maintained parser output.
  "packages/scope/src/applications/route.ts": "ad62679ad22021474b193d7e9b2f98d6146c85ebe9d223d66901c309b5b84abc", // Actual union parser value adopted by root.
  "packages/scope/src/item-query-wire.ts": "8206b9a6531ca30cae1bc49cc249eea08c70a658305f41b3ebea6eda042055a8",
  "packages/scope/src/applications/projection-wire.ts": "2e07df5447469dc09aff0d4017e010634150f49c92f614221402cf46a869c6d0",
  "packages/scope/src/object.ts": "091396e5ebe195252695a84287fc1edf2c1bb45fc2d1c65d14d679643694d9b1", // Actual composed storage owner seal from the maintained parser.
  "packages/scope/src/core.ts": "c7f2e49246b1e784981337ee13af53b17bab424a13112d5a40ff76b75fb7a128",
  "packages/derive/src/genesis.ts": "df7722143f01c8084b8f045ef959b203ae1756c4dfde170d0454cfe0b0392843",
  "packages/derive/src/judge.ts": "c0ed325bc2fa84693b40d3d53a9ad54a9a9786dab39dd3b9c6039ac553488f63",
  "packages/scope/src/sessions.ts": "636cf37fa756f7b8abe9d2f7bc36381fee78901f26a5b24fa9ce2096223e9c4d",
  "packages/scope/src/reads.ts": "c45892a2d04c1cd47817f57cdbf763995ce3fa323dbde56d1eb626499bb5813b",
  "packages/scope/src/signed-reads.ts": "6c4c4c81f44994c2ac9e4ca921c8f34184977a1256d6574e78514b814512eaf0", // R12 custody-only serving helper; native checks unchanged.
  "packages/scope/src/limits.ts": "6d4966a12e86067c39f61a243601d0d3a78a66850ee07f4ae80e97e22ab3639e", // R12 verified-key join failure window.
  "packages/scope/src/serving-limits.ts": "3a9f410f926f1e3711b78a750dd7dfb055f418fa9904be55ccb3f8cea869a987", // New bounded memory-only counter, no live eviction.
  "packages/scope/src/serving-admission.ts": "56196763d35e17e67df94862264b2b1af0f1e812d46cc5c50163a4c580cd06a2", // New bounded original-signature/counter ingress.
  "packages/bytes/src/records.ts": "bc4e65e75215c2d940b0884a6810d5d90969455ba956c1e9731a3ed0d3c1b6af", // Public typed read refusal vocabulary (kernel section 7).
  "packages/scope/src/session-preparation.ts": "4b9699cb1ee06234162dc2088c5c37be1804e1e9f15985fa1f0dc3151170bd85",
  "packages/scope/src/item-queries.ts": "61ead9996d2c338a26331e04b8576c52425d8d2c88dc86173a7d79108c2ee418",
  "packages/scope/src/applications/projection.ts": "f7d3bb45d448ec654a89f875697f865e1e89baeb5d7529e0db0859bd855b009f",
  "packages/scope/src/destination-host.ts": "1f85d5adf1ea030ee2cb1b29aa044d50cd6ea9b4798f3595858f2fe02d5846c9",
  "packages/mcp/src/hosted.ts": "ebf77243d7987bf328a81c237865a3ba6b65a03f3327976cb37455a58a971a01",
  "packages/mcp/src/hosted-tools.ts": "5bb4dd74b12896bb8f5f5cb366f25bd31af849c2690d0e3ab5d81eb277f94a47", // Reviewed R5 admission owner; actual maintained parser output.
  "packages/mcp/src/service.ts": "eb24dc018c81fb50a5e63ab4e5c9c47583dfe4a93df9b4c999a2bdf033d432bf", // Reviewed R5 admission owner; actual maintained parser output.
  "packages/mcp/src/catalogue.ts": "194dd82a6d3f188909485c4c1b9db33aee671b06fb46840e92fc0b8df2a79726", // Reviewed R5 admission owner; actual maintained parser output.
  "packages/mcp/src/inventory.ts": "74c5db16355c5badacf9dc6cc241d20d6400908a160324c07d88db9191b455f8", // Reviewed R5 admission owner; actual maintained parser output.
  "packages/mcp/src/http.ts": "757f8b3644c6afdf5d6c0399bd3865f879c8aa4841a7429aaa30c264ee9d76a6",
  "packages/client/src/application-trust.ts": "137391c8b1ed6f59f66e9368012c1355ed77325fdb16f67b73296be1ccc856b3", // Reviewed R10 trust-before-fetch owner; actual maintained parser output.
  "packages/client/src/application-install.ts": "4046c6792d4671cdb259691dcf2171a2c3144450664c696cb722db161790164b", // Reviewed R10 trust-before-fetch owner; actual maintained parser output.
  "packages/scope/src/applications/resolve.ts": "6338c9357780846b115999454239b68f34c5d6be3c090ca3f18b8f6e8771d0e2", // Reviewed R10 trust-before-fetch owner; actual maintained parser output.
  "examples/grow/simulator-worker.ts": "2d60dab3a9a5b204b69f15bc5ec3473fa48513888d7ffdb0c1fc179f6fe4883c",
  "examples/grow/simulator-host.ts": "26a8521b98737cae3d80a9fe3b9ac17fb10b11fcf2f8ce973251253bdbf2b7df"
};
// Integrated archive owners computed by the maintained owning parser.
// Root adopted the reviewed outputs; the historical map name is retained here.
const pendingArchiveSeals = {
  "packages/scope/src/archive-restart.ts": "1ef6109fa2fc54cc481e31d818ce739fa037594aeabe17f065208c22a2c425af", // Deployment directive parser; actual maintained output.
  "packages/scope/src/archive-operator.ts": "672ad996c5362209e809c5a921a8182ca8269a7a6d597db138da3c21dfc2e0aa", // Private observation owner; actual maintained parser output.
  // Publication and floor owners were reviewed before these values were
  // computed by the maintained parser on the integrated source.
  "packages/scope/src/archive-target.ts": "4044b6f04b736c653aac496479cbbd98c791f371f157801e7909bc67279488e9",
  "packages/scope/src/archive-source-window.ts": "4db3f5885e7541f713b9668d1cde655e42be1950dd6af77d5711a323b3582e1c",
  "packages/scope/src/archive-publication.ts": "d8c39d220bc7eea59301478aa553960267aac16f06502b4103a85647c71eb457",
  "packages/scope/src/archive-build.ts": "e1111bfef1fe94cc8436498679395ba1b9b8adba3db8651f4f24d87d68696853",
  "packages/scope/src/archive-driver.ts": "006e53f3ef1b7a3e97cd53df3c8f8aa964d089e0c53a5bbe06efe8794d5e091d", // Capacity deferral reviewed; actual maintained parser output.
  "packages/scope/src/archive-row.ts": "be48ef12598ad4f5d0084bd05e760a4537faf23a96f21dce8c9e8748c7eddfda",
  "packages/scope/src/floor-writer.ts": "fb8fd859844b8d10ba43b477bcaf07ab32fe1bfa1b6684ad9ae70b930d328a11",
  "packages/scope/src/object.ts": "091396e5ebe195252695a84287fc1edf2c1bb45fc2d1c65d14d679643694d9b1", // Must match the separately adopted original owner value above.
  "apps/room/worker.grow.ts": "0cc4c1c63f79f8da8dad5e98b2ace5b69fcd818d41640ed4e316ee534adf749f",
  "apps/room/archive-policy.ts": "ed3b746b5a26c3e872e41b13ba133f43ade42b5612aa5028ba544fc013be5ce7",
  "apps/room/archive.ts": "8252a0d142fcf7bac4c266980e0cbc4c592d1ad8783914b16d8f40ba6fb824f9",
  "packages/scope/src/archive-host-item.ts": "c2a8b08490e9f0590c456f12fd8e65a8b10cee8bc7cbda9d9c33f6ab366fb9d4",
  "packages/scope/src/archive-host.ts": "e376746b7a1001a47715f666c4777e135bf1c48a162bfffe9c80e0ec913f079f", // Staged input charges and bounded bootstrap reviewed; actual maintained parser output.
  "packages/scope/src/artifacts-host.ts": "63895c56490aeb1711834902012cec9277e11f35dd6881b99a6598032d1e1bc7",
  "packages/scope/src/artifacts-wiring.ts": "03616f13d672f8c5c1f2054ad2f8cfb9fb6468107f75b6153f38914d4f7f9bd6",
};
// Actual maintained parser outputs adopted by root; never infer hashes from intent.
const pendingR8Seals = {
  "packages/cli/src/commands.ts": "230a9fd9fede360b06af47da61901377834e47ba62a503533fb91a2caca25a27", // Actual integrated CLI parser value adopted by root.
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
  // The enabled table must not silently model a disabled deployment as
  // reachable. The real policy removes only its hosted dispatch rows.
  const disabled = await servedInventory({ hostedSettings: {} });
  for (const [worker, rows] of actual) {
    assert.deepEqual(disabled.get(worker), rows.filter(row => !/^[A-Z]+ \/mcp(?:\/|$)/.test(row.route)));
  }
  assert.throws(() => assertInventory(disabled, document()), { code: "ERR_ASSERTION", message: /route\/method\/gate bijection/ });
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
