import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertInventory, documentedInventory, servedInventory, sourceSeal, roomHttpEntry, sandboxInventory } from "./security-entry-points.mjs";

// Reviewed matcher/gate owners. These are change tripwires, not runtime proof.
const seals = {
  "packages/platform/src/versions.ts": "e6ad86db829a628d1bf3ad7505dba7e3f5dfb739a566048e884a00107ec1755e", // Closed native publication protocol policy; actual maintained parser output.
  "apps/room/worker.ts": "aba04e12dc206f0be6bda4a8edeac64569e0edd44b7a87772595d7db40bb8b67",
  "apps/room/fetch.ts": "c335dde72f4d4f2d6410e156a5c2c66c9a3ed54ee6bd788408cfd89e61602b7b", // R2 owning AST value adopted on the reviewed branch.
  "apps/room/demo-creation.ts": "d9850f4854182c0231a2ae9a985882343e7f3dfea67ea034cafe4fca4bb0d77f",
  "apps/room/page/route.ts": "62c8f69b9f516f1b5acdaef57d7aed25268d8cf03283bdffdd4b1b5f20bb6b3d",
  "apps/room/brand/route.ts": "71b45ff9b41b3bea31c775a16525349591e0d4f7dfdc65da79f095816b1c343c",
  "packages/scope/src/worker.ts": "4ddbc7494a00818b4e07313dcf20111f3c7baa25c9144f52840a6a23b8420af5", // R11 current deployment admission; actual maintained parser output.
  "packages/scope/src/scope-index.ts": "e5658b5fc39cc15bc08e7e71711a67c5859a0e0de94ede88ee5b8b5dbc3d7919", // New internal lookup/registration boundary.
  "packages/scope/src/creation-admission.ts": "0531cbd36d1ae4c0eadc9d836eb5eec13f896fc7c8b8faaaaf9c3c24e3759ccd", // Reviewed R1 ancestry owner; adopted AST value.
  "packages/scope/src/creation-lineage.ts": "3561f0b5b5d39c025db2c86f4386a1ccf6a8d18f05de26d79f6c5b68730f10b3", // Reviewed whole-lineage boundary; adopted AST value.
  "packages/scope/src/creation-versions.ts": "305d76f6e81ddba38e1ee009353060143857af393939f339f20e49ca874d8a8c", // Reviewed R6 creation-policy parser; actual maintained output.
  "packages/scope/src/creation-declaration.ts": "08344ce45c30fa0af5b5ab41a269f15119a96f822ddff7ae9aa94199c0166653", // Bounded immutable native Directory custody, not authority.
  "packages/scope/src/namespace.ts": "1f65de08e11d85c204b671b8605b132f506cf06f2e87843e90eb0d1884f428e3", // Reviewed internal declaration RPC; adopted AST value.
  "packages/scope/src/health.ts": "98a9538a31f927996d56470357a3a227f1935f21463c174329d8b7faac129528",
  "packages/scope/src/site/route.ts": "ab2fd36e5d4d57e854aa94e2738a82b454afd2f169ac324cb7fba237f67e2416",
  "packages/scope/src/site/host.ts": "913b5798103fb6472f4fc56f5613a517ed3f60df52b44a01930df47dcd2923a2", // Private Site token custody; actual maintained parser output.
  "packages/scope/src/site/token-reuse.ts": "6868a52935ee8c42e1d38a9216f62e768781c8d18c36f5f8705c2052fb12567d", // Private Site token custody; actual maintained parser output.
  "packages/scope/src/site/window.ts": "a5f64febfd69c17c682dc8bf1aa464378a3609d73d9ef0112c16fd79892aea54", // Bounded site-read window; actual maintained parser output.
  "packages/scope/src/applications/route.ts": "ad62679ad22021474b193d7e9b2f98d6146c85ebe9d223d66901c309b5b84abc", // Actual union parser value adopted by root.
  "packages/scope/src/item-query-wire.ts": "8206b9a6531ca30cae1bc49cc249eea08c70a658305f41b3ebea6eda042055a8",
  "packages/scope/src/applications/projection-wire.ts": "2e07df5447469dc09aff0d4017e010634150f49c92f614221402cf46a869c6d0",
  "packages/scope/src/object.ts": "b30582dff0dfbb9e8e505dbe1e4d3060d48fa6887fc0f2cb2496d7636885ab80", // R11 host admission wiring; actual maintained parser output.
  "packages/scope/src/core.ts": "c4947b598d30870139a4f59d7ed3d2535d75a884f570cb4b57be0543d69fd888", // Fresh acts and terminal/historical refusals; actual maintained parser output.
  "packages/scope/src/applications/act-admission.ts": "36049cc17487cc58f5d44099f55a225730079dd90006d0237ab9034181c42bd3", // Exact native provenance and current trust; actual maintained parser output.
  "packages/derive/src/genesis.ts": "df7722143f01c8084b8f045ef959b203ae1756c4dfde170d0454cfe0b0392843",
  "packages/derive/src/judge.ts": "65a10677dd4da355e9edac490979cacf6911cfa1aa37020c41516f5c53ad94fb",
  "packages/scope/src/sessions.ts": "636cf37fa756f7b8abe9d2f7bc36381fee78901f26a5b24fa9ce2096223e9c4d",
  "packages/scope/src/reads.ts": "7d66e866c46fc354286d6454e202402788881b062b87376d85ee35888f938b26",
  "packages/scope/src/signed-reads.ts": "6c4c4c81f44994c2ac9e4ca921c8f34184977a1256d6574e78514b814512eaf0", // R12 custody-only serving helper; native checks unchanged.
  "packages/scope/src/limits.ts": "6d4966a12e86067c39f61a243601d0d3a78a66850ee07f4ae80e97e22ab3639e", // R12 verified-key join failure window.
  "packages/scope/src/serving-limits.ts": "3a9f410f926f1e3711b78a750dd7dfb055f418fa9904be55ccb3f8cea869a987", // New bounded memory-only counter, no live eviction.
  "packages/scope/src/serving-admission.ts": "56196763d35e17e67df94862264b2b1af0f1e812d46cc5c50163a4c580cd06a2", // New bounded original-signature/counter ingress.
  "packages/bytes/src/records.ts": "57ca6402f59ec8b1cbe23ab7e5bf907765711112c391e73589b07808545f1245", // R11 named serving refusal; actual maintained parser output.
  "packages/scope/src/session-preparation.ts": "4b9699cb1ee06234162dc2088c5c37be1804e1e9f15985fa1f0dc3151170bd85",
  "packages/scope/src/item-queries.ts": "61ead9996d2c338a26331e04b8576c52425d8d2c88dc86173a7d79108c2ee418",
  "packages/scope/src/applications/projection.ts": "f7d3bb45d448ec654a89f875697f865e1e89baeb5d7529e0db0859bd855b009f",
  "packages/scope/src/destination-host.ts": "b0190439a9861b931c01cc35b283ed6a57aea11a0806e9de185fba5c5ea4e4b8",
  "packages/mcp/src/hosted.ts": "ebf77243d7987bf328a81c237865a3ba6b65a03f3327976cb37455a58a971a01",
  "packages/mcp/src/hosted-tools.ts": "5bb4dd74b12896bb8f5f5cb366f25bd31af849c2690d0e3ab5d81eb277f94a47", // Reviewed R5 admission owner; actual maintained parser output.
  "packages/mcp/src/service.ts": "9b1f9dcf838e65a49d4bcef13cdf1dfae020ed48e5fc899fde4a5156e2ddc293", // BR7 create-tool register example only; admission gates unchanged; actual maintained parser output.
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
  "packages/scope/src/archive-outcome-values.ts": "14e879e83a3437634a9e180bd438f41cc79be45a9a56cb5693922b48208bace2", // Certified rules evidence projection; actual maintained parser output.
  "packages/scope/src/archive-restart.ts": "1ef6109fa2fc54cc481e31d818ce739fa037594aeabe17f065208c22a2c425af", // Deployment directive parser; actual maintained output.
  "packages/scope/src/archive-operator.ts": "422376afb07d7345290d1e821eb6410bc834c55edd86540fa058b94c405d08c9", // Private observation owner; actual maintained parser output.
  // Publication and floor owners were reviewed before these values were
  // computed by the maintained parser on the integrated source.
  "packages/scope/src/archive-target.ts": "c34d8ddaf8a93ee0a845d8a02679f22a54431ab67d5234d53253e625f2570c89",
  "packages/scope/src/archive-source-window.ts": "4db3f5885e7541f713b9668d1cde655e42be1950dd6af77d5711a323b3582e1c",
  "packages/scope/src/archive-publication.ts": "d8c39d220bc7eea59301478aa553960267aac16f06502b4103a85647c71eb457",
  "packages/scope/src/archive-build.ts": "038fabbfd864ad30f623076b6aa107137075472445fe98eaf1e3d4cbc3a0bd2b", // Fixed-prefix inventory ownership reviewed; actual maintained parser output.
  "packages/scope/src/archive-driver.ts": "cd52e871a95ee7b485d2ef231f1c06c3ab1c203c127879d6566aa86893f59c8b", // Bounded capture and exact head identity; unchanged authority and retry decisions; actual maintained parser output.
  "packages/scope/src/archive-row.ts": "02f01270071d022253335b5d4b41c8574e75f0eb806e58f70afa60e4b8fbc613", // Paid prior-capacity scalar reviewed; actual maintained parser output.
  "packages/scope/src/floor-writer.ts": "fb8fd859844b8d10ba43b477bcaf07ab32fe1bfa1b6684ad9ae70b930d328a11",
  "packages/scope/src/object.ts": "b30582dff0dfbb9e8e505dbe1e4d3060d48fa6887fc0f2cb2496d7636885ab80", // Same R11 owner value as above.
  "apps/room/worker.grow.ts": "0cc4c1c63f79f8da8dad5e98b2ace5b69fcd818d41640ed4e316ee534adf749f",
  "apps/room/archive-policy.ts": "ed3b746b5a26c3e872e41b13ba133f43ade42b5612aa5028ba544fc013be5ce7",
  "apps/room/archive.ts": "fdd3889d0662acc3c1e9bdbc0d0776c1e69cfdf31237a433856080f259ba8f1b",
  "packages/scope/src/archive-host-item.ts": "44fd36bee675f5abc450ffb60b9858d820e20c88461589ecfeff61e36ef0e327",
  "packages/scope/src/archive-host.ts": "e376746b7a1001a47715f666c4777e135bf1c48a162bfffe9c80e0ec913f079f", // Staged input charges and bounded bootstrap reviewed; actual maintained parser output.
  "packages/scope/src/artifacts-host.ts": "df100e1d2d24bb859af31935b21598cd948e2dec0199d954c34742e33dc38f53",
  "packages/scope/src/artifacts-wiring.ts": "03616f13d672f8c5c1f2054ad2f8cfb9fb6468107f75b6153f38914d4f7f9bd6",
};
// Actual maintained parser outputs adopted by root; never infer hashes from intent.
const pendingR8Seals = {
  "packages/cli/src/commands.ts": "07f5ac89b739986f4489a93818109bd53617103908fb7c2c22102a8ae7a10ac3", // BR7 fresh-cohort guard and guidance; retained custody unchanged; actual maintained parser output.
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
