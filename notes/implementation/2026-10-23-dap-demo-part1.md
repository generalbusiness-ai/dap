# dap-demo: CLI and MCP creation

Source implementation for planner request `de76a01f4b6e65debb7985de2424a33717e72ec5`, promise `708c102c5f0328b5d0e62253ef5c64f009e4c7c2`. Basis: accepted Main `27abf6d90db7df1d459ff3da023e09324a89c53a`, including the landed archive advertisement request `489ad7c9`. The disjoint fast-forward preserved all twelve authored file identities and bytes; all other tracked paths equal accepted Main. The focused checks and controls below are complete. No hosted deployment or register installation is claimed. The ordinary gate result will accompany this exact candidate in Gitseq review evidence. The browser start page is Part 2 and is outside this head.

## Resulting behavior

`dap install --register-policy open` selects the explicit archive-device-application cohort, register@17/directory@16/membership@8/rules@10/destination@12/inbox@1. The policy is signed into the retained install intent. Direct and planned delivery use the same exact selected-plan custody. Explicit policy conflicts refuse without replacement; `--planned` with no policy flag reuses its original intent. Omission keeps keys and the existing default behavior. An explicit open install remains fixed to register@17 when R16 later changes ordinary defaults; no default-version table changes here.

The new `apps/room/wrangler.demo.jsonc` uses the generic room Worker, four local Durable Object classes, its own `dap-demo` Artifacts namespace and an enforced index. Its serving limits equal Grow's: 10 creations per key/hour, 30 per address/hour, 240 reads per key/minute and 600 per address/minute. There is no open parentless creation setting, register ID, credential, deployment secret, session secret or browser creation offer in the file. The planner supplies the actual Artifacts host and planned registerScope. Local class bindings without script_name create this Worker's own namespaces; no scope/index/registry/agent namespace is borrowed from artroom-scope or Grow.

Existing artroom-scope rooms remain available in register mode. Its legacy demo register@8 no longer meets deployed creation admission. The route refuses unqualified fresh Start discovery at the old public origin with its existing 404 response. Preserve live DEMO_START_CONFIG: GitHub destination authorization and exact retained Start references still depend on it. The existing Page handles the unavailable offer; no Page source or bundle changes are needed. No live setting or secret is removed. New CLI/MCP rooms use dap-demo.inguz.workers.dev; browser creation is not promised here.

## Planner runbook

Do not execute this sequence before the archive item and this exact reviewed head have landed. Retain the reviewed head/tree, configuration, original signed plan, deployment output, register acknowledgement, index inventory and visitor result privately. Do not put secrets in argv, shell history, console output or Git.

1. Use a new owner-only operator DAP_HOME. From the reviewed checkout, plan without sending:

   ```sh
   DAP_HOME=/private/operator/dap-demo node packages/cli/bin/dap.js install --plan https://dap-demo.inguz.workers.dev --register-policy open --cohort archive-device-application --host artifacts --namespace dap-demo
   ```

   Retain its exact Register17 ID and expiry. Do not replace a possibly sent plan. Prepare nonsecret ARTIFACTS_CONFIG with exactly registerScope (that ID), namespace `dap-demo`, the actual service hostname, maxBytes `10485760`, and credentialIdentity `adapter-attempt`. Provision the independent Artifacts namespace. No service hostname or scope ID is invented in Source.

2. Confirm that dap-demo is a new Worker name, not an existing service with unknown custody. Bootstrap its secrets before the first application deployment. DEPLOYMENT absence retains a local compatibility opening in creation admission, so deploying application code and adding the secret later is unsafe. From the existing scratch tool directory, use:

   ```sh
   npx --offline wrangler@4.147.0 secret put DEPLOYMENT --config "$REPO/apps/room/wrangler.demo.jsonc" < "$DEMO_DEPLOYMENT_FILE"
   npx --offline wrangler@4.147.0 secret put SESSION_SECRET --config "$REPO/apps/room/wrangler.demo.jsonc" < "$DEMO_SESSION_SECRET_FILE"
   npx --offline wrangler@4.147.0 secret list --config "$REPO/apps/room/wrangler.demo.jsonc"
   ```

   The first command's new-Worker confirmation creates only Wrangler's inert draft, not room application code. Require both secret uploads to succeed and verify the list contains DEPLOYMENT and SESSION_SECRET by name before continuing; never read their values back into logs. Retain the existing session-secret minimum of 32 cryptographically random bytes. Do not add either value to vars or argv. If the name already belongs to an unexpected Worker, or bootstrap fails, stop for planner reconciliation rather than deploying anyway. No package/tool installation into the checkout.

3. Deploy `apps/room/wrangler.demo.jsonc` with the prepared nonsecret ARTIFACTS_CONFIG:

   ```sh
   npx --offline wrangler@4.147.0 deploy --config "$REPO/apps/room/wrangler.demo.jsonc" --var "ARTIFACTS_CONFIG:$DEMO_ARTIFACTS_CONFIG"
   ```

   This is the first activation of room code. Require the two preexisting secret bindings to remain. Inspect the rendered configuration: name dap-demo; four local namespaces/migrations; Artifacts namespace dap-demo; index enforce; exact serving limits; no ALLOW_OPEN_CREATION or DEMO_START_CONFIG. Preserve deploy output/version. Do not weaken enforcement to found the register, and do not advertise traffic until the exact register is confirmed.

4. Before the original plan expires, using the same private DAP_HOME:

   ```sh
   DAP_HOME=/private/operator/dap-demo node packages/cli/bin/dap.js install --planned --register-policy open --cohort archive-device-application
   ```

   Confirm that its accepted register reference is the planned one, policy is open and cohort is17. Preserve the original acknowledgement and exact index registration. This register alone is the configured parentless install; a fresh arbitrary register install must remain refused.

5. Test an independent visitor, not the operator's founder key. Create a fresh private directory and generate a visitor key through the maintained filesystem store; copy only public service/register metadata. The following preparation runs locally and creates no scope. Set REPO to the reviewed checkout, OPERATOR_CONFIG to its confirmed operator config.json and VISITOR_HOME to a new private directory. Use the pinned Node runtime:

   ```sh
   node --input-type=module <<'NODE'
   import { readFileSync } from 'node:fs';
   import { pathToFileURL } from 'node:url';
   const root = process.env.REPO;
   const { fileStore } = await import(pathToFileURL(`${root}/packages/cli/src/files.ts`).href);
   const { newStoredSigner } = await import(pathToFileURL(`${root}/packages/cli/src/store-signer.ts`).href);
   const installed = JSON.parse(readFileSync(process.env.OPERATOR_CONFIG, 'utf8'));
   if (!installed.register || installed.service !== 'https://dap-demo.inguz.workers.dev') throw Error('Confirmed demo register required');
   const store = fileStore(process.env.VISITOR_HOME);
   if (await store.config() || await store.secret('visitor')) throw Error('Use empty visitor custody');
   const visitor = await newStoredSigner(store, 'visitor');
   if (visitor.key === installed.plan?.founding?.intent.actor) throw Error('Visitor must be outside founders');
   await store.save({ v: 1, service: installed.service, key: 'visitor', register: installed.register });
   NODE
   DAP_HOME=/private/visitor/dap-demo node packages/cli/bin/dap.js claim demo-visitor --handle @visitor
   ```

   Use the same VISITOR_HOME as DAP_HOME in the final command. Retain the actual directory/membership references and inspect their applied index rows and recorded Register17 creator lineage. The room must use directory16/membership8/rules10/destination12/inbox1. Exercise the hosted MCP endpoint with this visitor's ordinary enrolled authority; no founder key, bypass or public authority flag is supplied.

6. Generate a fresh valid scope ID locally, confirm it is absent from the saved index inventory, and GET `/v1/scopes/<id>` on dap-demo. Require HTTP404/not-found. Do not create it or grant it reachability. Preserve exact HTTP status/category without credentials or raw private bodies. Check that an existing artroom-scope room still opens.

7. Deploy the reviewed old-origin route refusal to artroom-scope. Preserve the exact live DEMO_START_CONFIG, ARTIFACTS_CONFIG, DEPLOYMENT, SESSION_SECRET, namespaces, SCOPE_INDEX_MODE register and every other setting. Save before/after setting inventories and the deployed version. Require the unqualified creation-offer endpoint to return 404; require a retained exact register/inc reference to remain available and an existing GitHub-backed room to retain read/write access. Do not delete configuration or replace vars wholesale. Link operators/users to the new CLI/MCP service; Part 2 owns the new browser offer.

If deployment or install fails, retain the original plan/acknowledgement and failed stage. Do not recreate a register under a different plan, clear the index, reset namespaces or switch enforcement off. Reverting traffic/configuration must preserve both Workers' storage and the new register history. The planner owns hosted execution under the existing authorization; this Source head supplies no deployment receipt.

## Focused verification

The initial Source commit is `35daa79130de96424e7b9e8802c6036da68a3037`. Commit `9a99e2cc3e42b7ea2236e456b89f4b686c6c301f` changes only two existing security-map values from actual maintained parser output: CLI commands `41adfb2b673df5ec2046fe401e65d97fab580c2c9e4331a18b1a6bf73d9b9bd5`, and the demo offer route `514b127aac2bc5bc2ec7b00341984b352a5801c7684fa5596cb3728d2bde5e1d`. This report update leaves all code, tests and those values unchanged.

Private dependencies were copied from the closed protocol candidate `5f685928`, after root and fourteen workspace manifests plus the lock matched. All 5,498 payload files were checked before the 65-byte lock stamp was copied last. The final namespace contains 6,072 rows: 5,499 independent regular files, 541 directories and 32 relative links that resolve within this checkout. The copied regular bytes total 551,414,057. This is adoption of an existing dependency view, including its partial hidden lock and caches, not a fresh install or a new compatibility result. Root session `40846` and both copy children exited zero; fixed inputs and final target identities remained exact.

The two-owner parser ran once in root session `80826`, with one Node child and natural zero. Its complete before/after Source, dependency, npm, tool, environment and ref vectors matched. Root adopted only the two map-value interiors above.

The owning baseline ran in root session `48889`: CLI and Scope test compiler roots, the complete four-case D1 Node file, and seven application cases. The CLI test compiler also includes its production Source. All five children exited zero. The CLI cohort/custody file has four cases and the configuration file one; the Native policy/lineage/index and demo offer files each have one. All seven passed, with seven ready/result/final callbacks and no gaps, skips or unhandled errors. The Native policy story uses real signed outsider intents and SQLite index registration with explicit Git provisioning and scheduler stand-ins. Its paired keys policy refuses the same outsider. These checks do not establish provider behavior, rate performance, retention or deployment acceptance.

Two separately bound controls then exercised distinct boundaries:

- The CLI control replaced only the selected policy expression with fixed `keys`, running the same whole four-case cohort file. Three historical cases passed; the new case failed at `install-cohort.test.ts:221:52`, with raw `AssertionError` showing expected `open` and received `keys`. Child `83320` exited one. The collector also exited one because it incorrectly required `keys` inside Vitest's abbreviated JSON failure message; the complete same-run stderr diff contains it. This collector failure remains recorded. Independent comparison of JSON, progress, stderr, mutation and restoration establishes the intended negative without a rerun. Later assertions in the failed case remain baseline-only evidence.
- The route control removed only the old-origin unqualified-discovery guard and ran the same whole Native offer file. Genuine counted namespace forwarding returned 200; the unchanged 404 assertion failed at `demo-creation.test.ts:69:33`. Child `91440` exited one and root session `24237` exited zero after collecting that expected negative. Later assertions in the case remain baseline-only evidence.

Both controls restored the exact original file bytes, modes and inodes, with complete fixed-input guards; only the allowed Vitest result cache changed. No compiler, D1, configuration or unrelated Native file was repeated in a control. The baseline and controls use the maintained configurations and deadlines. The original raw outcomes are retained at `/private/tmp/artroom-dap-demo-part1-{adoption,parser,baseline,cli-control,route-control}-20261023-v1`; this notation describes five explicit evidence directories, not an execution recipe.

Root outcomes in Gitseq: adoption `8f5e6fe8`, parser `c6199070`, baseline `3d9227aa`, CLI control with collector failure `97d354e5`, and route control `e449fb59`. Independent audits cover complete raw identities and guards. Wall/inclusive CPU seconds are respectively 4.7680/4.3766, 3.4113/3.0817, 17.7833/21.9920, 5.0576/5.5339 and 7.7435/8.9873. Each owner's inclusive cost overlaps its nested children; do not add those intervals. These are observations on a shared macOS host with inherited caches.

One ordinary `npm run gate` and independent exact-head review remain the landing requirements. Their original result and any callback gaps are recorded separately against the gated commit; this note supplies no prospective gate success.

Public rooms are not deleted, so storage grows. Serving limits bound floods, not accumulated storage. A retention policy is required before wide promotion and is not part of this head.

### First-publish tool Source basis

The local pinned Wrangler4.147.0 package was inspected as text only at `/Users/hughpyle/.npm/_npx/d77349f55c2be1c0/node_modules/wrangler`. Package SHA-256 is `75c3ccb272cabfbb1e1c555ddad7479d0b31a83a325b40859125941301d49865`; bundled cli.js is `f2ec95b41d7f7665a42b75fc9631100e95ea6c0dbabc09eb65ae7f772dbc2fed`. At cli.js305260–314, createDraftWorker uploads only `export default { fetch() {} }`, with no modules, migrations or bindings. Secret put reads stdin and, on WorkerNotFound, creates that draft then retries the secret (305393–461). Deploy175831–833 sets keepSecrets:true independently of absent config values. This supports the staged sequence at Source level; it does not attest an account, available name, uploaded secret, successful command or hosted response. No Wrangler import/probe/command ran.

The completed route and CLI controls are recorded above. Actual parser values were adopted for both owners before the healthy D1 and application baseline.
