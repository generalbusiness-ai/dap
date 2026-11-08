import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertInventory, documentedInventory, servedInventory, sourceSeal, namedSourceSeals, roomHttpEntry, sandboxInventory, workerEntrypoints, scopeRows } from "./security-entry-points.mjs";

// Every runtime declaration is selected. $module retains ordered imports,
// exports, declaration identities, and module execution. Each expected hash has
// its own source-ordered line. Root adopts actual parser values after review.
const namedOwners = {
  "packages/scope/src/object.ts": {
    "packages/scope/src/object.ts:$module": "1fdab10d607e13009c34b387de859db08007f97feb549f48b1b8d85e1aaf3973", // Token refusal: the delivery's transaction keeps a key that a compromised notice named.
    "packages/scope/src/object.ts:ScopeObject": "ebb1140ed7ec9e1501217b95e493f623920e304fbe44ba4a3514b2e0dd3e90ed", // Token refusal: the delivery's transaction keeps a key that a compromised notice named, and the authority asks for it.
  },
  "packages/scope/src/worker.ts": {
    "packages/scope/src/worker.ts:$module": "41f2c0c505b5b75791c94504ca1a8ef654c85ba33f83dd575ba752a72266fd2d", // HTTP context forwarding and explicit disconnect close; route and authority gates stay fixed.
    "packages/scope/src/worker.ts:ScopeIndex": "db3c9e7383c242a7669551f1a1a8b33413129933ce32dc3e80faf0376ebf1719", // Reviewed empty Site wake deletion; route and authority gates unchanged.
    "packages/scope/src/worker.ts:MISSING": "e8958a6cf8d4cd2f412b30c76b38aca2f4523bc2b9df96606ac01059b6d4fb42",
    "packages/scope/src/worker.ts:api": "03bb00a1a523796ca66c26c23d91142ef46758ad62290fdc9a5cc74556e8c171",
    "packages/scope/src/worker.ts:BODY_BYTES": "158a6579a52843b40416a1f4d27e7bffb5e0f5df07105254bd3e87c3d3d203fd",
    "packages/scope/src/worker.ts:answered": "f1c36263f63cc8977a334b803d6c89c4863d2e078704d7cdffdce1c3dc2eaea0",
    "packages/scope/src/worker.ts:READ_STATUS": "8fcae05135649353af9322b5361f0b16e8a1d93c47583a3a18b80848f2990df7",
    "packages/scope/src/worker.ts:SESSION_STATUS": "99632b0bd230a76488353a2e1fce61925bbb595605a27d0f9e8c8e67f77a9587",
    "packages/scope/src/worker.ts:read": "4a083fdf987741284f15628b0c45881da42de526268465ee66f4c37422636dd9",
    "packages/scope/src/worker.ts:ORIGINAL_STATUS": "95b36ba73a5c328ed72c0c4f2427012dadcd1e29d84570ed380d70836892559b",
    "packages/scope/src/worker.ts:NO_STORE": "3c2d731f8eea8254d81b670ab342feba2ee0d809f59778a0b8e8760f0f31e082",
    "packages/scope/src/worker.ts:originalReply": "f2ab7919d41666a605dcd260843300ca0aa03de5c3dea95b8089661449cc5e31",
    "packages/scope/src/worker.ts:bodyText": "2837bd384fbfca821750f6f351cdd308d4b23bc264bbca872d1d48c632c27e53",
    "packages/scope/src/worker.ts:body": "9e8bc280d55ae2959d3b23a58747e78a5f199a5a0e1a3483278bdc3bcd89345c",
    "packages/scope/src/worker.ts:QUERY_STATUS": "cb170da8d7dca22a5dd36b21c59decce3a629ec5aff60745a39b350a1f2c9489",
    "packages/scope/src/worker.ts:queryResponse": "3ce5909b0b8713f13903dc84328673d0cfa85910dff434b928e22fd3e2fe11b9",
    "packages/scope/src/worker.ts:PROJECTION_STATUS": "437dc39bac447f6fc149e3db253a2b2c5fbca4ef30410c0d0f3b58d94d1ac5bb",
    "packages/scope/src/worker.ts:projectionResponse": "e17f1f4aa800bc06b4f8d065f77e8a594c2738c77873a52671fa7f1b22bf249b",
    "packages/scope/src/worker.ts:route": "97d61bda3cbfe7b427c932d6839a46e73cb5b9b6e75e575bf798329ebdc210ad", // Forward the HTTP request context for release work.
    "packages/scope/src/worker.ts:routedRequest": "3b0b751a7511500a15016f748d9a393ccaa3ad1860bfcdffe9008baadd7769be", // Same gates and stream bytes; retain the existing close on observed disconnect.
    "packages/scope/src/worker.ts:outsideOf": "20bfd9b97f309f4a8d89e8581ca7d0ec5667ecca69e0178b08424a1195847136",
    "packages/scope/src/worker.ts:sessionWiring": "cb8f4d0e2b06854a3fbf080e5b4ce72e4182060b60f27cc7fb7f5ed6ac8779c5",
    "packages/scope/src/worker.ts:snapshotReaderOf": "dac91fd4e800bdcd1a9f7e47bd077b6efd0acd4eb3c70bf63122a12bdb7446b5",
    "packages/scope/src/worker.ts:DeployedScope": "660756384c04ec84a02cd513cf7bc8e00a2542b596bf16a846afcc25bf04020d",
    "packages/scope/src/worker.ts:ApplicationStreamLifetime": "4c82d6b5ea8ae68089f2f80321e3361b6176c9725d0b46481b6f32b6d2093ba3",
    "packages/scope/src/worker.ts:ApplicationScreenService": "1d14294e957015e16bf05110852f1ab75efa3d1e4af34fa4417dbbd6cfc128a7", // Forward the existing context to the shared route; no new RPC method or authority.
    "packages/scope/src/worker.ts:mcpRoute": "2701c498525ca35cf414385a0274b127ca833fc16fa683e86e6b821e07770ad1",
    "packages/scope/src/worker.ts:boundedBytes": "6553fab5e2b9129266d64c02f7c3c9317095f1888fd12a10d12490d9f5d90f40",
    "packages/scope/src/worker.ts:observeThrough": "7e507f9bd9233223446711d089eb6d6b4236b69642eb9d39260e4712d81dab7a",
    "packages/scope/src/worker.ts:sqlOf": "5631baea8c5029d6ba93da6b3d199e63897c5f5ac05ae61e16b8d6f3e337f7fb",
    "packages/scope/src/worker.ts:McpRegistry": "720e5aa4e415319ebb3c4708bae78a3d14377ea6d46911b72ed12c626cb7429d",
    "packages/scope/src/worker.ts:McpAgent": "30f972eb4222c7a8a772faa118fbb5dcf225b573b03f4c23217a595e9621d717",
  },
  "packages/cli/src/commands.ts": {
    "packages/cli/src/commands.ts:$module": "a25a6f060d58ed0cc140e3501a3719a94baa80a5052657c2f39054bbd75f8c3f", // Reviewed room-proof import, both helper declarations, separate checker dispatch and retained-clone helpers; exit code 3 and the export of issueNamed for dap issue wait.
    "packages/cli/src/commands.ts:NEW_REGISTER": "f828e83eeb39a37566e323156efb63274fc43b1d6b9e95b38fbf0cdbba327fbf",
    "packages/cli/src/commands.ts:short": "62f9d565f48fc73fc6b282a941d6d37a48055c6c32f2ef88f21b22ead55f6e57",
    "packages/cli/src/commands.ts:scopeIndexAccess": "b54a6859075907491f4c19313b149572acd5b3bd94c492d61fb342601759c299",
    "packages/cli/src/commands.ts:directoryReader": "ebf7a12b7e199bfb0e7962191eae486cc1ca4ed04707f9dd73eacbc48b8e147c",
    "packages/cli/src/commands.ts:openingDirectory": "6d4a21e1c95322a35ff4b68ee9753efea36ba9013d100748587084babbd8f087",
    "packages/cli/src/commands.ts:scopeNamed": "d16130a225872b6e96da8b6375ff41dcec104f7772f1e6c527c92d03cfd382e4",
    "packages/cli/src/commands.ts:definitionOf": "138ced231e1b804af138be95c50fdd958e478c196d21b11cba3a431658bedf0b",
    "packages/cli/src/commands.ts:laneActive": "8797076412cc4a14365ca99fc4faed2de3f34e7d0b7b62fc6283a446615a8aee",
    "packages/cli/src/commands.ts:INSTALL_COHORTS": "2d6ae86c0970f68089fce6e6387b0c4da738de6a71df15cde1542babd257d63e",
    "packages/cli/src/commands.ts:CREATION_INSTALL_COHORTS": "0d7ce5d3e9756752ead7d5e4f644f07c29c1d955baee86ccbaf256973dc9ab9d",
    "packages/cli/src/commands.ts:selectedRegister": "0b4142d8bac4adda31b5069dd28803215169f33e4c16b1e1d73ff182c70cceac",
    "packages/cli/src/commands.ts:planSent": "9419fa14ca00c84bfbc468192900fd822717cb76e1ba8e178d616c009ae054a6",
    "packages/cli/src/commands.ts:joinSent": "b8a644d194680aeaccda9873f7eb9ee6f9e71110cdefe87b0af35d5ce946d692",
    "packages/cli/src/commands.ts:installSelection": "5b3583176b16d93a8029a40654ca79fd08487076838116b1dc95dd9cb014c6ce",
    "packages/cli/src/commands.ts:selectedPlan": "51a17a4e587f8994eb507cc70b4702969a997b57c86339a52f67c84e5117b7d8",
    "packages/cli/src/commands.ts:install": "0459a25a99cd5e54f3022e4074e722ca3823120075dcf3c6cea420889dd2ea7d",
    "packages/cli/src/commands.ts:installing": "848bc5a890238b9ee8e382ed5a958844ee8cd409e6e09236ff8c4fa3a10b72bd",
    "packages/cli/src/commands.ts:registerIdOf": "5db562b18c0929cea45b8322e913408ed5326b3b865aece7b884c284f137102d",
    "packages/cli/src/commands.ts:knownPlatform": "7b5bdce0c14e94a85bce0329ddaef5b6a5ba276b1c5ef4393155b1468aafa8a8",
    "packages/cli/src/commands.ts:installAttemptOf": "9a7a6449aee1060b49444f9bef0e3fe271e5279d29ddec38caa9fd6b3a1d95a2",
    "packages/cli/src/commands.ts:readBackCohortConfig": "440e708afd45bf7ca11a22d1c913ccd642a4aa58d7ac7d92b6d1da753dec980b",
    "packages/cli/src/commands.ts:saveCohortConfig": "1414316c62c3977bc1e64131e636a7821ed3dbe7389abc50d557ea7764d6bf44",
    "packages/cli/src/commands.ts:retainedCohortPlan": "b632965f5f5ab892a8da03a6f1adbf94b9a059fcae1d7eff431a076f461f1c38",
    "packages/cli/src/commands.ts:cohortPlan": "3f95f62cba4f87007316979754bfcaa9cfba81e0fa33b0b62cf29543d6185b6c",
    "packages/cli/src/commands.ts:plannedLines": "df7c3d59e0ea56d6a03a14c93367f8233354e841005fd9fbc8a332f6d21fdfd2",
    "packages/cli/src/commands.ts:planInstall": "614a251f08f95bdc42191d2c54fff570341aa10d76ba598d7d1c91e77cff55c2",
    "packages/cli/src/commands.ts:installPlanned": "746f81f7078018a4bdd15e21606c3ed37eff93b4be159129e41a774bcf8a46db",
    "packages/cli/src/commands.ts:executePlannedInstall": "821c27a12f4e8f5a94af83b8c1fe26d8a7d15954835ef77d5ebd92fe661fa926",
    "packages/cli/src/commands.ts:invite": "0f89f53e82d14214cc46d83bb6df8e11516e328c5b54eacced4dcc67ae1c2d5b",
    "packages/cli/src/commands.ts:inviteDevice": "58940c0af841e2c88452ef724a83725ccbe75a65dfce3dd1ed5c828f3a0b26c6",
    "packages/cli/src/commands.ts:join": "7ee9c782ae2dfb488ac3e463380d781c6b395345a48efa87167379232ad9d22d",
    "packages/cli/src/commands.ts:standing": "57372328838e0f9bcb936554f41738f9445ed53384112aae1cdad745a4dc1fce",
    "packages/cli/src/commands.ts:acts": "f4577a1dbe4bb307bf92057f101967b5fd2f9a11240342f4f3377e177a81fd53",
    "packages/cli/src/commands.ts:act": "d6e5b20c300da48234cb5c1471aafe9544e17d87e06dace4f4082d5965c42397",
    "packages/cli/src/commands.ts:apps": "02729fd520eb4ed349fad0e776f974929a3663d442a0588e9b95ee104ed9ed8c",
    "packages/cli/src/commands.ts:items": "035ef813ce6aea0c10a2215c856e5e8c30fed9e0db64dcd24eb43e98ee713baa",
    "packages/cli/src/commands.ts:entryLine": "61bf6dce3240a56b1a4d0286b713cb5cfce96d1f933c03b89182e71ff8cf7846",
    "packages/cli/src/commands.ts:log": "3ef9c27f7f2f22e7f2531f7e4d0cc859af988009fb92e3e79b13261a45943aeb",
    "packages/cli/src/commands.ts:show": "e5008fae01934cb48b95ed52c0f9108c9f2f8799ef8072e61b80f1abe2823fc9",
    "packages/cli/src/commands.ts:sessionDeniedDependency": "72ee1a12a97166f54168dc35ab2bbb59a0c51f172d1a3c7dbf7d4ef3f1d187b7", // Narrow final-summary input retains the exact permission evidence.
    "packages/cli/src/commands.ts:replaySource": "e2b4cc945442035616ec92e9ab07f44170a5f3014f3444feb49582e46d831064", // One authenticated source, with separate count and unique accounting paths.
    "packages/cli/src/commands.ts:otherRoomsOf": "7c301eee78006007a2f2a6cdfdfbfb73f7224782dd9b8fe3173303a1eec4ead7", // A reader's own directory, for the verifier's other-rooms rule. It widens no read.
    "packages/cli/src/commands.ts:replayOf": "e4f3f261612d3e755c94a4a19d8d54920d4f938c9e30cee8caafd59f12c3fdac", // Standalone traversal and its count budget remain isolated.
    "packages/cli/src/commands.ts:verificationContext": "bc38c07b7cbcbaa2118086aaf05068fc05d2cd90b1994edc81968e48788c41b6",
    "packages/cli/src/commands.ts:verifyScopeCommand": "4dd727df2ca467fbf11c1d3bd3219dc74ed2a0a12bdd1045f9e8879d0508b598",
    "packages/cli/src/commands.ts:roomScopes": "c128a0c451a22e0cee69335e6ca7d72a0417bfd0699bf5d22bb051edcc6b3fda", // Discovery validates actual entry identities without granting proof.
    "packages/cli/src/commands.ts:sharedProofLines": "e549a716ca1e5e2dce6deae3196eab99740493badc0e025f941292aa175ffb33", // One union disclosure, with prefix and checked-content provenance.
    "packages/cli/src/commands.ts:verifyAll": "abed4baea2213f8387369e5699bc114055b1a2ead05fa2f619a203240258065f", // Final summaries follow union validation; cleanup uses the checked target.
    "packages/cli/src/commands.ts:OWN_HOST": "d8049ba56c1494f7f9ab575b4ccdbe4ea8192229bb9d2a280bbb4528e1c5784a",
    "packages/cli/src/commands.ts:remoteOf": "57afba6cdd6f9169d7366eb5641f61a52a420f55ba723bff6922bfc6332496a9",
    "packages/cli/src/commands.ts:remoteLine": "1eb8d789b8f70e63d8b28176c5b5f923eeae5065c26a17487274295b2803d354",
    "packages/cli/src/commands.ts:destinationStateOf": "ea44f22a4668277001078259c3814f82962cee51a7a234220a911ea850be0ab8",
    "packages/cli/src/commands.ts:destinationOf": "12e9a159bbe98128f0e7f0bd184477a845e06ce0d1eede21b2dd9b498672da42",
    "packages/cli/src/commands.ts:remote": "fcb9d2f615c3de93ca2e366e3460fa2551da32424c482703795b5d053b905449",
    "packages/cli/src/commands.ts:authorization": "e4e08477eb4c8766ccbb228da6d28f0b0c98a11500d80fcbe92e686eabb654ec",
    "packages/cli/src/commands.ts:b64": "2ccaf086d7986f6c72fc6eb746042e77b2da0a99cba0d51e10a9aa87025e0c6d",
    "packages/cli/src/commands.ts:headerEnv": "2b29643df8f13576381b9be7133dd6f5dc668a80d10822ac7fbc0d3bcb1ee878",
    "packages/cli/src/commands.ts:clone": "1d8aa445d3c5ea84144059b895b8ed3626f3070475a09a051f56e0ed5f2e809e",
    "packages/cli/src/commands.ts:cloneRetained": "d26b7b7a58c7c6b0d1c1ca056beecf1de47b194c27d5420abdb457c5556f9ced",
    "packages/cli/src/commands.ts:cloneUsing": "758c5dfe4f9b1537989c9f9cba61721874cc2c794631262260de18adf98db6d9",
    "packages/cli/src/commands.ts:EDIT_BYTES": "9bbee0ea572e3aee4339d86e8e59defc86538133d2ad92449cdc827c7b86b2b5",
    "packages/cli/src/commands.ts:fileOf": "f2c2de1136cfd275c0b2003f3ae5abd2ff8d7ba508351a05dc8145664dada339",
    "packages/cli/src/commands.ts:textOf": "1ae1ce4970caf7b99eb7370475b4506f47b23c9f8b09fd93933a664f2406747a",
    "packages/cli/src/commands.ts:stateOf": "28ea558ff346032f886d018fa25925b7e0ed64fc914fb8b6a25fc08c6ab174a2",
    "packages/cli/src/commands.ts:valueOf_": "b5c04f914e3a5b9ddd741664cb83611b825719e519f3b4e423515279493bac44",
    "packages/cli/src/commands.ts:activeDefinition": "0d7eb32794c7dbaeb2ff7df1b4480dc96d71ef5c58061a3232f711eabfcd94c7",
    "packages/cli/src/commands.ts:laneOf": "628ff633a6ede2a3f75ae5b5f6e701f6692214a1902898b504ab33b96e658712",
    "packages/cli/src/commands.ts:supportsEdit": "8f0e9431ab92a0725c94389550908542074ee0065f4ef97575fb796aa429fcfc",
    "packages/cli/src/commands.ts:edit": "f40d95a0f633610c5348bc959476bf9b07dc795ae7f49e7d5fcf1db857028f6f",
    "packages/cli/src/commands.ts:propose": "cd58d412a613dbacbc96ae2e0222949f99377272c7f4089e78269009e3ff5142",
    "packages/cli/src/commands.ts:proposingFiles": "22a95036e1d4e2b2541a999f5ada1f69b83fec0fae29c0ce241319a211395daf",
    "packages/cli/src/commands.ts:merge": "fb866a06e19ec5713108a7f665cd9c6de0be1f986e0cec9f7c35b281bd1eb5ac",
    "packages/cli/src/commands.ts:merging": "05659e2afd0ed66897e18c2003d90ea697e0adc3d96e8c1a35a35a677d2ce2ce",
    "packages/cli/src/commands.ts:memberOf": "82b7786a17e358f6ae9e91da4bc64425092497ebd78da4369235ae1653e092e7",
    "packages/cli/src/commands.ts:issuesOf": "d24885bf29ab4542768b2b73e65c1e33ff4c8f4a01b3308391a96b468bf22b68",
    "packages/cli/src/commands.ts:issueNamed": "41f15c6fce12bc4ac95a9cd53a9a17872a1443ff2a7827b388b087dbf62a9c57",
    "packages/cli/src/commands.ts:issueAct": "86f0bead725ab55410f67d6bf62fa3f158e223d6e21576fe8ae41ecb8fecfeab",
    "packages/cli/src/commands.ts:issueOpen": "12c1b281cc703159eaa1eeb42cae6680ce19d2abff348757938e56d4c80d7d43",
    "packages/cli/src/commands.ts:issueComment": "01dd1d82b2df0d7afaf5f555deace4eedc6c54393e8002d3c79781bb8ea85867",
    "packages/cli/src/commands.ts:issueAssign": "ef0fbd113156b7e6ba241dc6933dadf26300e30f26436e161413c89b890847f2",
    "packages/cli/src/commands.ts:issueClose": "b3b3543b2a97faba39e1a2236792d92d1fb14159bdc25feefbe5f6383358026f",
    "packages/cli/src/commands.ts:issues": "cc896c23a5c618666a5408925e51f0629a50c810bb87eb9ea0ca16db4d494477",
    "packages/cli/src/commands.ts:linking": "e425a12db2c6e4da95f28b73f366215f4347592d6b868d3fd943fab497766280",
    "packages/cli/src/commands.ts:status": "f77f1396b4bed9f01c159ca07c991ef52da9cd9a50ea4e1aae3f5765d50504b4",
  },
  "packages/mcp/src/service.ts": {
    "packages/mcp/src/service.ts:$module": "74ec4d7db3094a129f77b6d1c249ebd204cb15e6ef1834eacf72ad4a68a0f1ca", // Reviewed exact-read context; fresh authority, target, custody and signing admission remain.
    "packages/mcp/src/service.ts:ListRestart": "83803f5cf365099c3ed7ad6d12153b68e7616977007feffed4ca4b01bd4ca95d",
    "packages/mcp/src/service.ts:SERVER_NAME": "1a22dd379fec10cbed8b5938dfd522ce9e8cffe176de5f4554e3cad8668764e2",
    "packages/mcp/src/service.ts:SERVER_VERSION": "93926c4b4205a41211c5dfd2e083d8a5d4eed978060ba4d0781fb54d9d3eb366",
    "packages/mcp/src/service.ts:INSTRUCTIONS": "676cfcb26d751a57b8b77762cd9344e6c7d6d5c7c3b02f8d568ed91103bb7bae",
    "packages/mcp/src/service.ts:LIST_PAGE_BYTES": "59dd525548661c8bb7618a95bd2fb0d6b1b2fd122a15ea45213a0ae0d26c949b",
    "packages/mcp/src/service.ts:WATCH_MS": "d28d2082347de271b370282a615fc2dc8e34a7d6962e08d76375d7292afaa0c8",
    "packages/mcp/src/service.ts:WAIT_MOST_SECONDS": "18c43e609ce676dbf274befbe7224acfae088c3435e31eaea0e3a549f780868f",
    "packages/mcp/src/service.ts:SEARCH_ENTRIES": "ebb27ed02343da3a66559ab18d5b621bbad76c5eb3fd905dddd0fa6224bfcfa3",
    "packages/mcp/src/service.ts:NAME_BYTES": "eb5d62e380f50f07aee001aec26c9231aa055d764899a3b6196b2802bbd82e9b",
    "packages/mcp/src/service.ts:SEARCH_PAGES": "298946253cdfd6df568a241f3bf5eddd96bf6b9134fb238032aa96340aa8177a",
    "packages/mcp/src/service.ts:SINGLETON_PLACES": "06cfb60b72e2756e46b5f51bebbf3ecfe905fe93f3f0d13f4aae3f4cb687a01f",
    "packages/mcp/src/service.ts:callResultText": "7a858143e1225b48031ff2a853d96ad2a6c0efcd1c101924bea6d04d6e183b67",
    "packages/mcp/src/service.ts:BOUNDS": "838a3fb5498e8b323318642271e728afe0e2409fb658f370ce9e7d7c2c6cbfbb",
    "packages/mcp/src/service.ts:PAGE_SPARE": "b56f933bf61a623da82d81f9c1b944072d6c71538bf56e6e622c3c2d24a7eb09",
    "packages/mcp/src/service.ts:pageOf": "e0aed29507d78dc28f1b498cf91a4d01bfa6e59aae798f1414fc909e071b6bb2",
    "packages/mcp/src/service.ts:ok": "0c1818e2749e7828fa629cfc35cc4d7203068f7243d3193907ac71a416fd13b0",
    "packages/mcp/src/service.ts:ERROR_BYTES": "3cf4f0d3c6271b3cef45b42e64e8d210f063b480addfd1f4f1d26d73c3e64d04",
    "packages/mcp/src/service.ts:failed": "2e15188162d10d67a65f897bd8d267b65ec2b10634216a828e1470b90714afd7",
    "packages/mcp/src/service.ts:projectAnswer": "ab287949458589079d41c6552bb2a306162fff4c3b30edb21ab83a74fed72cab",
    "packages/mcp/src/service.ts:configDigest": "db445c9209d8d937f49e2016f1a7ef2eb7ab57a189a05093d2ce8d61e49ff5db",
    "packages/mcp/src/service.ts:Stop": "be559905e3dbcdb763828b74b97ba6c27e00c98644ae913cb46daaa6b4a0ebe7",
    "packages/mcp/src/service.ts:stopCall": "f8d89a63e2e2336d69c4fe331483fc42f64ad5c183df574ae74e0f774223a007",
    "packages/mcp/src/service.ts:VIEW_DIFF_POLLS": "49f2a59ec14b31da35f8ef7c9715c2de7a158ec849702c175f51ef42dee7e7cc",
    "packages/mcp/src/service.ts:COMMIT_ID": "5d97f59cc4546e45416555cffd622add0da00d115a8b8f31ca2c3946ed311f7d",
    "packages/mcp/src/service.ts:DIFF_OUTPUT": "9333d83a48a94f5eb2cc23c2165fba345ef47e57f58a7dd26090082bed58e296",
    "packages/mcp/src/service.ts:READ": "c46ffafd29a0b32d79613c7d6b784a9d6cab99b90c99b98fe9246a8b6b6682eb",
    "packages/mcp/src/service.ts:WRITE": "5920731b91c504f8bfb945b3edbe132bea0167ec1c9a44579e3dd658e5e9cd91",
    "packages/mcp/src/service.ts:scopeArg": "36e8957cdbc823f8e1bf9ab903a7a353df3b10d1292ed7d378362aabc41f6ef4",
    "packages/mcp/src/service.ts:keyArg": "368a6f3d59380df455b92a9478dc8c993a5535b2d40e9046a4e71df139cc5149",
    "packages/mcp/src/service.ts:McpService": "41bf825d0c0e92d326fd596dccb61a20769e448b02464a4151e06be54339a76f", // Reviewed exact-read context; fresh authority, target, custody and signing admission remain.
    "packages/mcp/src/service.ts:commitIdFault": "3614f1add9efc0a6aa08e7afe8ec461e46d5728284a77e668fa67fb962614527",
    "packages/mcp/src/service.ts:lineOf": "b8fc3e8118f71914f365f08ff318da437f69ee1e5e693956e0e88101d5177e00",
    "packages/mcp/src/service.ts:creationName": "a7dd4dd268ace0088ef0be50510ccc654090f1ddcc09aa0a4271f161b05ca444",
    "packages/mcp/src/service.ts:valueDigest": "e745a5f9e668cd13e52b41194b57f43576380feabc7065d00146c76ce0910e73",
  },
  "packages/scope/src/core.ts": {
    "packages/scope/src/core.ts:$module": "75efd9edb075e1c99193c1113c0567161bdbfb6a37c0be3acf252e459d1858fa",
    "packages/scope/src/core.ts:receiptOf": "eec86b2750142cc246ff91fee8b690f33edcf38b4e23e92abbf70a1d8e9acb7d",
    "packages/scope/src/core.ts:snapshotsOf": "b7ecf53e025201a0a328b1d370656d801024c5671ff3af57f4aa2aa56678c7d7",
    "packages/scope/src/core.ts:ownOf": "8a7bfb5faab9e4721ba340f51484b2eef6cfa5b5836d49492c2722adfbec4be8",
    "packages/scope/src/core.ts:used": "277fcdbfc5dc4e1ea59971de284da29ea6ef90a7b3bac81293ee69d5b6633e4f",
    "packages/scope/src/core.ts:retainedFacts": "34d29abff776b476ee0ff545766856f5a85e38744a23ef2d3f12acc0d21eed1c",
    "packages/scope/src/core.ts:Received": "db4689920e8d485672b8b95e2cee94383e08d3b8cd8eb6da8142e84fbf4bd8b4",
    "packages/scope/src/core.ts:creationKind": "e2e00414a034ccf7aa3c35fe4bf942ba0a189501242e236748538df2d808a71e",
    "packages/scope/src/core.ts:besideOf": "cceb69d4007385f239803a343bdb869be34a51f8e4ff77747d0601971295a7e4",
    "packages/scope/src/core.ts:valuesBeside": "134877aaddc41a23dfb25403ff4c150f2afabc4172108636d898610471ec541d",
    "packages/scope/src/core.ts:valuesOf": "a2ac72acccf44690145f1e9211dae55da00bd6c402457f44afeb37a0549e97e9",
    "packages/scope/src/core.ts:NO_INCARNATION": "8cca846345560da60c7c99a48ff125a8ef1bf243dff712abb89530c9c56d9086",
    "packages/scope/src/core.ts:unavailable": "053e97cd7fbe3f33c5a57f9fc3b5bfc97844778ffa88b96c0e7b723e50bf6495",
    "packages/scope/src/core.ts:said": "c3358e3632f8c1c114c3a3e51687256d38bcfc7950aaf21af0b779c138e3e46a",
    "packages/scope/src/core.ts:heldBy": "a66b415809db685c99cc8961ba592bd8bdcb8bda8f2f4ea1e73fe71c4b052fd1",
    "packages/scope/src/core.ts:told": "bc25d088d5c51694f6e3a813f11f2875144c7a3bdfaa8d124063dc1f65e2fe67",
    "packages/scope/src/core.ts:Observes": "9a0e37bc23db915ebdfd3ec4eef21172918f50fc3e19de840d2b03746efc3710",
    "packages/scope/src/core.ts:Scope": "21beb2ace9f9eee5889cc06352e603eb8975f1957d76d1ac823de466f680d984", // Native initialization reads held hash metadata directly; a genesis fold builds its first rows.
  },
};

// Reviewed matcher/gate owners. These are change tripwires, not runtime proof.
const seals = {
  "packages/scope/src/http-stream.ts": "ac798ac542c6295bda6495ef9c3f46f2c78511bfb89b88ee4b2d4df7711e2168", // Retain the exact existing close capability on observed HTTP disconnect.
  "packages/bytes/src/session.ts": "71a16d6d2d02b2f424e711a80ca28fe8e10204d3daacc4d0cf23f85ebe80903e", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/mcp/src/oauth-parameters.ts": "b48c22470c29dfa7c11260fc874128859650791294ec93d8ae0007bdca95534c", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/mcp/src/oauth-clients.ts": "9b4471d0460979130cbd5e6f415b80f32f509e034d86be116e4d0b210949f66f", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/mcp/src/oauth-issuer.ts": "ca5b2fa28e52999fcff61c8de6a1518eb62ae7224b4b4a16600640342eaa6791", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/scope/src/oauth-routes.ts": "2e2ba7beb770f7743dee85224a3f7b1b4e7f3959dc6e4fdb70e28febd1f69bd1", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "apps/room/page/oauth-route.ts": "859183c042ec2708d4d357ec49fffe0aae4fb9f4c44ea3cff734e9b2c33cbf1e", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "apps/room/page/src/oauth-context.ts": "15e8f1a89a49d4e403801efa2f9caefd83d6c3327ac897bb3b0475d4dbc37ff3", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "apps/room/page/src/oauth-custody.ts": "cedf10f00ac0135438b5cfba43056a2b78f86760f1ea9d528f7a81e78e3693dd", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "apps/room/page/src/oauth-main.ts": "8a110a1da61e83ef46ec007c0544cdf6b2619bfc25eec8159cc9119b1dc48efd", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/platform/src/own-agent-membership.ts": "4155cefc45d92b7396511b6a7173b438b45ff203593ca328aa9d9f322f24804c", // O2 own-agent guard and exact opt-in cohort owner.
  "packages/platform/src/own-agent-cohort.ts": "5de494854f15f912b1ea19cbd556e3cb1d328050170aa497721918c70941ddc8", // O2 own-agent guard and exact opt-in cohort owner.
  "packages/platform/src/own-agent-cohort-data.ts": "5e018d8d4fa152ed3c827c64cbbf0587f5a7a2358b02e3e2cf90aec933fac502", // O2 own-agent guard and exact opt-in cohort owner.
  "packages/bytes/src/read-minimum.ts": "5ead3e9579b2805c525bae5d1ad3bd6883c0a18f0022a202c01eea91a181939c", // DX-A2 reviewed minimum admission and wait owner; actual maintained AST value.
  "packages/scope/src/read-wait.ts": "0bf31ae0c52975c9e91b22dfac278c03ab04c575b88941c3a6480433fd79e2cb", // DX-A2 reviewed minimum admission and wait owner; actual maintained AST value.
  "packages/scope/src/authority.ts": "793b80180b0f1d719e720ea781a3e6338e41ea9552a9a6bf3b7697954015281d", // Token refusal: the commit of read-token asks whether a compromised notice named the key; maintained whole-AST value.
  "packages/platform/src/reservation-v17.ts": "e00aa0f08f9b3b1f4aca5e794436367ab550dcd1966c5258f1e96e42ab97a856", // Reviewed retained-policy decoder; actual maintained parser output.
  "packages/platform/src/evidence.ts": "e3f0fa91c32d848b5bec7dc9ac047d4cc72815ddce70365ad8fade6884a7354b", // Reviewed platform binding codec under ruling 1bc4f7fd; actual maintained parser output.
  "packages/git/src/checkout-snapshot.ts": "82f53717d419b70fe208801b6d0bf2fc0c947ac2beffb27b2e2d01898f48ee25", // Detached object identity and closure bounds; imports do not seal this implementation.
  "packages/checkers/src/stage-origin.ts": "f8ca858b23eaf0441cad60ded741cc96cdf3b68ee01bd275f4ce525eba5cfa1e", // Actual Native admission and causal proof verifier.
  "packages/scope/src/stage-snapshot.ts": "6c0cd626b2b58bb578f58160264c25fbcd5f67c2ad0ba39aeab4725c5a55dff9", // Signed stage read and current Rules, key and work-source gates.
  "packages/bytes/src/address.ts": "d6d2fc3f86f50318c6a88b21649daef212f40c4d46b942033d27b3853902ccd2", // Canonical local full-address and routable /64 counter keys; actual maintained output.
  "packages/bytes/src/index.ts": "bb4abe5eadcce69b5979e8a02edd09e22bbd4f9eff0bfab550d15ef6aa5ab6b6", // Bind the shared address-key export to its reviewed owner.
  "apps/room/celld/worker.ts": "d1bc465525bd0af046fa0703464f14aeaaee8286b88415dfec3b9e03869fb644", // H1 reviewed production entry or public-origin gate owner.
  "packages/scope/src/public-origin.ts": "d6e867fc859db69b6fcf2d465d387a032966331cbae04310ea4c24cda3773269", // H1 reviewed production entry or public-origin gate owner.
  "packages/platform/src/versions.ts": "7a87b9322eae12c50cc95b43b6074029d3b9c13ed583584d62e1fd87329d561b", // Closed native publication protocol policy; actual maintained parser output.
  "apps/room/worker.ts": "aba04e12dc206f0be6bda4a8edeac64569e0edd44b7a87772595d7db40bb8b67",
  "apps/room/worker.commons.ts": "c525a1b0d13e6243099d03b80c5207b76f082c71432db2b8ecaf86ccf8cb1160", // Reviewed separate deployment entry; actual maintained parser output.
  "apps/room/fetch.ts": "83b2a56552c5f6874935d1491f487fd7d2b9e2651a9acceb87d731139897ad2c", // Forward the HTTP context to the existing scope route; dispatcher gates stay fixed.
  "apps/room/demo-creation.ts": "91d9ac8a8fa37e3c99c117be7d99dc2d9e370efeacd70f8f49a00a4062bcd67c",
  "packages/scope/src/demo-creation.ts": "140d7a2751ddbca8dda3d78161ab720a7b40c127107510a256f4529f84385eb9", // Reviewed current demo projection or ordinary GitHub authority owner.
  "packages/scope/src/github-wiring.ts": "6bccc5a379825c66d77723394fe7b37c2cfdfc722953e6cebca13ff1befaf66d", // Reviewed current demo projection or ordinary GitHub authority owner.
  "apps/room/page/route.ts": "8eccc79a8a3e3cd8b33c38c65374db5d01583b5e9afd76384fc2133bae4cb475",
  "apps/room/brand/route.ts": "71b45ff9b41b3bea31c775a16525349591e0d4f7dfdc65da79f095816b1c343c",
  "packages/scope/src/worker.ts": namedOwners["packages/scope/src/worker.ts"],
  "packages/scope/src/scope-index.ts": "69c37e61623d85db20567a30079a495b4d9012063b38196726dad2a209170a8f", // Exact indexed scope and kind gate before internal native birth discovery.
  "packages/scope/src/host-wiring.ts": "1fd252906b38aeaea52fcd04fe3a533aed0335147e4de678d7c49b7744e39f93", // Installed-register authority retains exact Native birth and host binding.
  "packages/scope/src/installed-registers.ts": "39618d91dba4884b866f1823d5bc2ee89e7ca0b78b47b884387e7bfeba2dee5e", // Installed-register authority retains exact Native birth and host binding.
  "packages/scope/src/register-setting.ts": "1ead9e620589e3707e2a6515951cc095b44308a34aee6855b3bb8da37bd230ca", // Shared exact Register selector; actual maintained parser output.
  "packages/scope/src/scope-index-census.ts": "1892fba9c476330693d9b8071bd7b2653d2261bef7e9487fd95018d74aba2769", // Address/key admission precedes owner proof; exact census authority and page guards retained, without duplicate owner charge.
  "packages/scope/src/creation-admission.ts": "e5b173474005b5c888e60e0f863311b952e75baf4e7ece8cb5f86d50f85da248", // Reviewed R1 ancestry owner; adopted AST value.
  "packages/scope/src/creation-lineage.ts": "eec45fe2cd38344a5be9992cb6ddde7b03adcfeda8e2c7511e07c2131903feb0", // Reviewed whole-lineage boundary; adopted AST value.
  "packages/scope/src/creation-versions.ts": "7a40c80e142a22f209ac3b69622b26f9dee359839403fa5b1519d636176ee358", // Reviewed R6 creation-policy parser; actual maintained output.
  "packages/scope/src/creation-declaration.ts": "6af7d5b4d521a907579215bf8a6e1f6c3382825989919e0d1b43362335188973", // Bounded immutable native Directory custody, not authority.
  "packages/scope/src/namespace.ts": "11ce9daffdb384151dbd1ca9e204e0d062c1d3ff113d482b9980760f8eaad7e7", // Reviewed internal declaration RPC; adopted AST value.
  "packages/scope/src/health.ts": "1fc701231daac790f66cc4df748495d69bb9b171be2b5ea75d2eb28d819b49bd",
  "packages/scope/src/site/route.ts": "f4bbcdd1f53220ccce1337ec011e0c662f199f979513ca38ea891bda7add6ee8",
  "packages/scope/src/site/host.ts": "f8c52335ebde07f1a937db357f9a534d29a68004101699e3333fd475acf4a5ad", // Private Site token custody; actual maintained parser output.
  "packages/scope/src/site/token-reuse.ts": "7df9e0eb8e1c5bbfc050f52729ffaed86f00ea6d56ed04ac1efdf9e6cbf51ab0", // Reviewed pre-mint generation cleanup rescheduling; custody checks unchanged.
  "packages/scope/src/site/window.ts": "a5f64febfd69c17c682dc8bf1aa464378a3609d73d9ef0112c16fd79892aea54", // Bounded site-read window; actual maintained parser output.
  "packages/scope/src/applications/route.ts": "be263fc237b3c3c0f8e57b6f528880f83482f75b52cd9cf9c29f936feceb8bd4", // Actual union parser value adopted by root.
  "packages/scope/src/item-query-wire.ts": "8206b9a6531ca30cae1bc49cc249eea08c70a658305f41b3ebea6eda042055a8",
  "packages/scope/src/applications/projection-wire.ts": "289a66b25bf2dc63e0e7d4b0726c1eda067d21e9238bbf29737b4d8d89c1fa00",
  "packages/scope/src/object.ts": namedOwners["packages/scope/src/object.ts"],
  "packages/scope/src/core.ts": namedOwners["packages/scope/src/core.ts"],
  "packages/scope/src/applications/act-admission.ts": "bec337cfdbc35247da587bf794715062537b89a1894c6c0829b7c5fa0c7b1884", // Exact native provenance and current trust; actual maintained parser output.
  "packages/derive/src/genesis.ts": "15a4adb0e86d62a5be70249c176a2677717a0616119eedcb7b7427a5291fbc2c",
  "packages/derive/src/judge.ts": "7bafa496e7f0d647ffb84a7fa1131fe682335bb293b1ceeb7bee5c9b50693560",
  "packages/scope/src/sessions.ts": "ee2afb1a928446d146b81a3adfd4794cbacac9322f9a9a5142658a7036005ebb",
  "packages/scope/src/originals.ts": "c8a5185ad8a57a851ecbe77d87649b0bbfd45bf9c93e685d7dc3a35982ef72cc", // Reviewed J1 owner: the member compare, the signature and actor check, and the caps.
  "packages/client/src/originals.ts": "4b77af1b7f1d97f573f072efbe278cd3fa38ee4809b031d648fa57c5d5d17cf4", // Reviewed J1 owner: the bytes that a second device verifies before it sends them again.
  "packages/scope/src/reads.ts": "1fbb2ae6de2566c33c5dc6e19bd8ef7660a30cab6707a12c02508d650085a2cb",
  "packages/scope/src/signed-reads.ts": "3204207ea73dc48cdc40727bbde7f8b734675975fd78694a501b0116cf0abfe2", // Census wire name; its separate fixed-index predicate grants no ordinary scope read.
  "packages/scope/src/limits.ts": "dfab21444a03339291f51f500941dc1b0d23926fa01fb173e7cd7cc91983f099", // R12 verified-key join failure window.
  "packages/scope/src/serving-limits.ts": "3a9f410f926f1e3711b78a750dd7dfb055f418fa9904be55ccb3f8cea869a987", // New bounded memory-only counter, no live eviction.
  "packages/scope/src/serving-admission.ts": "56196763d35e17e67df94862264b2b1af0f1e812d46cc5c50163a4c580cd06a2", // New bounded original-signature/counter ingress.
  "packages/bytes/src/records.ts": "c1de770ab85f6f328166076ae3829289cab8b43ff0e8686820d89afe3719d7b8", // R11 named serving refusal; actual maintained parser output.
  "packages/scope/src/session-preparation.ts": "34e29ea5d5e467400885fce77d80577d5bada13bc4300cdacdf49ea8e708f7a2",
  "packages/scope/src/item-queries.ts": "61ead9996d2c338a26331e04b8576c52425d8d2c88dc86173a7d79108c2ee418",
  "packages/scope/src/applications/projection-source.ts": "00edbc4215cbd8fc9bf35f5e001ad9e656cad5eee594546db2804a1cb84225ce", // Closed native room metadata with optional supported membership pin.
  "packages/scope/src/applications/projection.ts": "8576f78bb68850421ca7843e6fd0e4ecfb18f136009b82296097feca603f5484",
  "packages/scope/src/destination-host.ts": "e4f291079ed7a0ccd7fab4abd91489e55a8908bd4259c4520ba886966eec0e49", // Token refusal: a key that a compromised notice named takes no read token.
  "packages/scope/src/workspace-host.ts": "537ed96759a3889f59272b1a660a3cfd8ef8f46ec2aa15618c8b7c3568b57bfe", // Reviewed SQL custody, setup revocation and full refs for recorded branch names.
  "packages/scope/src/workspace-lineage.ts": "dbb0409a8ab6a8127d2734455cb3db867e46a96dfe0f2ccda0dcf998bd2aced9", // Reviewed bounded authenticated Register, Directory and Destination creation lineage.
  "packages/scope/src/native-birth.ts": "ab9ecd331850e5f183fafaee07145c64adadb3ad904ea95bcc4ddf569da6ad6f", // Reviewed bounded genesis decoding and exact indexed scope and kind discovery.
  "packages/mcp/src/oauth-resource.ts": "895d3a1b241e5fe0d5228febff46fe6c921899110fef99056dd1b53199d341ae", // O1 resource discovery and grant transport boundary.
  "packages/mcp/src/oauth-access.ts": "c9125c1cf737025ac1342e3219227b6f882d28a565978d9ca68300f7402ff2d6", // O1 resource discovery and grant transport boundary.
  "packages/mcp/src/oauth-http.ts": "6a2668b96a105b077cd07528897b0ed6f6d7aec8cec619a26a535bcb5adb6707", // O1 resource discovery and grant transport boundary.
  "packages/mcp/src/index.ts": "e8381ad33242af79c16cb57ddeff579a01d8a981f923e5aed549e6ab60c262fe", // O1 resource discovery and grant transport boundary.
  "packages/mcp/src/hosted.ts": "2d337cd0bf5263432433cd3f2a41d2e9c43105fd81c34ccaf473b1b7323d1082",
  "packages/mcp/src/views/remote-origins.ts": "81c7e7a044690df7c00a30691ddc5e0da11531fabad2a9143d2d389ff8c0a1b1", // Exact remote presentation URL policy; no authority selection.
  "packages/mcp/src/hosted-tools.ts": "bea3d3cea128bd76102e36d0876992c1b77a5bf2263f376082c1f329d2035a60", // Reviewed R5 admission owner; actual maintained parser output.
  "packages/mcp/src/service.ts": namedOwners["packages/mcp/src/service.ts"],
  "packages/mcp/src/catalogue.ts": "8d1af74b33b07b063a1dad51477b51d22ac9cb7bb08d79ad366a0a3b717c3e53", // Reviewed R5 admission owner; actual maintained parser output.
  "packages/mcp/src/inventory.ts": "0c14de294c6005379f9243d7283fc1dcaf2001fd009e0d361c06adf2b46871ea", // Reviewed parallel authority reads and target-only discovery; standing still reads fresh.
  "packages/mcp/src/http.ts": "c1280b58349e7137359b710f7021ce85882e0e9b6a16163f9f043f96bbe5554d", // Reviewed Mcp-Name binding for prompts/get.
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
  "packages/scope/src/archive-target.ts": "68012ccec4526fae304933e1a283cbb082521e713f5ea897f2f1fd768f709990", // Read ceilings settle only after bounded replies; authority checks unchanged.
  "packages/scope/src/archive-source-window.ts": "4db3f5885e7541f713b9668d1cde655e42be1950dd6af77d5711a323b3582e1c",
  "packages/scope/src/archive-publication.ts": "d8c39d220bc7eea59301478aa553960267aac16f06502b4103a85647c71eb457",
  "packages/scope/src/archive-build.ts": "b20a6d3c3572e702f92540021ff055c3126384fa17532bb16435ee5155b635fb", // Actual pin SQL payload settles; final identity fence unchanged.
  "packages/scope/src/archive-driver.ts": "7007cc64415ac5f0c7777e5dc017383b969f819fe1d80395f4bc67bc505479d7", // Pin read settlement and bounded scalar observation; authority/retry checks unchanged.
  "packages/scope/src/archive-row.ts": "02f01270071d022253335b5d4b41c8574e75f0eb806e58f70afa60e4b8fbc613", // Paid prior-capacity scalar reviewed; actual maintained parser output.
  "packages/scope/src/floor-writer.ts": "fb8fd859844b8d10ba43b477bcaf07ab32fe1bfa1b6684ad9ae70b930d328a11",
  "packages/scope/src/object.ts": namedOwners["packages/scope/src/object.ts"],
  "apps/room/worker.grow.ts": "0cc4c1c63f79f8da8dad5e98b2ace5b69fcd818d41640ed4e316ee534adf749f",
  "apps/room/archive-policy.ts": "ed3b746b5a26c3e872e41b13ba133f43ade42b5612aa5028ba544fc013be5ce7",
  "apps/room/archive.ts": "9547f8b9a4a1dd842b6151287a9b15efdf3abed011cb6b12bc191d5e04b78e4d", // Valid source proof settles; source policy and identity checks unchanged.
  "packages/scope/src/archive-host-item.ts": "0eb2a07702cbda350c4a884b3d32ca121aa13931ae51e1e70a8a6e76f4475a30",
  "packages/scope/src/archive-host.ts": "ad759aff6f090fab3401d2f75274af294269f7db488ae2d5c56954759cdf754a", // Migration collectors settle only checked POST byte receipts; decoder fees and authority fences unchanged.
  "packages/scope/src/artifacts-host.ts": "17169f775db94ec5544115119385ab979854b43679185f4360b07311e1a8a516", // Reviewed durable fork setup custody; the journal owns its later revocation.
  "packages/scope/src/artifacts-wiring.ts": "120d5f550dcb0188d5adc3b9a7f4299bb81d7a992754c7cb4c462d3baaf210c7",
};
// Actual maintained parser outputs adopted by root; never infer hashes from intent.
const pendingR8Seals = {
  "packages/cli/src/commands.ts": namedOwners["packages/cli/src/commands.ts"],
  "packages/cli/src/browser-helpers.ts": "7e5f139e800efad56f08799f4e34700f2fde7c76de33422a2eb69d03de4f03fa", // Moved description, expectation and value helpers; actual maintained parser output.
  "packages/cli/src/claim.ts": "e98347fb01d8107fd0a048c718fb8b65088f35242f6df4ca567e04fa6a378a41", // Reviewed Register 25 operator/founder selection; served routes and Native authority stay fixed.
  "packages/cli/src/command-support.ts": "9659bd3c68857485218d0ce7a3d2c8be37d08893c6feda55524886fe09044f5e", // Moved shared read, session and signing support; actual maintained parser output.
  "packages/cli/src/read-session-cache.ts": "12a5cf131a166001f66672bc3c4b6daf70070645255c61db7b93f18b6fbb83b7", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/verification.ts": "3fb0f354c0d00dd1d21cf293e11dfc81738b9de4e8f5eb43ac9fd918dc9db557", // Reviewed unique-entry ledger, source conflicts and owner retirement; actual maintained output.
  "packages/cli/src/files.ts": "7d0d64f352787e5d30ea03265fb5137a17a1eef61e97454e5408959297ca1d5c", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/store.ts": "9b185a206c417ebbcc738d86419b0af5a3d46159eb4914d485b6bb3e0e50e0fd", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/line.ts": "a7633c2619611fb93c4f76d4710a0b48ad29c6161eeb5f94825296e82790bfe3", // Reviewed CLI session or verification boundary; actual maintained parser output; dap issue wait signs no act.
  "packages/cli/src/invitations.ts": "a04361d412a202b8dc5eced17795ea96c3df63d40612f7389c57d710a61cdaa6", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/scope-index-applications-command.ts": "e72f729f4232f674d0e132c865e4d7c359ac567a21e97b4e7b905342379d33b7", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/scope-index-manifest.ts": "b4ed87bcb7aab9633d50b01106ff73da4412d2e65809a2b0e45f42ba27b3c1af", // Preserve trusted session refusal outcomes; actual maintained parser output.
  "packages/cli/src/status-report.ts": "200a440b06850a2d8773ae9c2ad82d6bf0b5864fbce92a714eafb622eba0484c", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/client/src/session.ts": "3e4dfcbab9c9ab8585929b4c75ba01ac86c4e9ea7978f70f6bf3681af15bddb6", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "apps/sandbox/worker.ts": "3208f16c0b3078736f7afe807340b17d0ca1c2966b7267eb90c36c6b4c6cef24", // Retain the existing Native lifetime close on an observed HTTP disconnect.
  "packages/client/src/application-gateway.ts": "daa1d28c02085bd6be7a9698a7120cd106cc7233aad92565aaa05e67427878ef",
  "packages/client/src/application-route.ts": "66c59740a8af2d1303eb610a0d6ded1a16a08ebfc1066ab210fde01e03989208",
  "packages/scope/src/applications/bindings.ts": "b89e8155ad5479d5b4f9175b2e941ef80b54c75dc9af4a993401c544e150cd78",
};
const sourceOf = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const selectedNames = (file, expected = namedOwners[file]) =>
  Object.keys(expected).map(key => key.slice(file.length + 1)).filter(name => name !== "$module");
function ownerRecords(file, expected = namedOwners[file], source = sourceOf(file)) {
  const actual = namedSourceSeals(file, selectedNames(file, expected), source);
  return Object.fromEntries(Object.entries(actual).map(([name, hash]) => [file + ":" + name, hash]));
}
function assertOwner(file, expected, source) {
  const actual = typeof expected === "string" ? { [file]: sourceSeal(file) } : ownerRecords(file, expected, source);
  const records = typeof expected === "string" ? { [file]: expected } : expected;
  assert.deepEqual(Object.keys(actual), Object.keys(records), `Review changed named-owner inventory: ${file}`);
  for (const [key, hash] of Object.entries(actual)) {
    const review = `${key} actual ${hash}; Review source before adopting a new seal.`;
    assert.match(records[key], /^[0-9a-f]{64}$/, review);
    assert.equal(hash, records[key], review);
  }
}

const document = () => documentedInventory(readFileSync(new URL("../docs/security/entry-points.md", import.meta.url), "utf8"));

test("production RPC export inventory rejects an additional entrypoint with documented routes unchanged", async () => {
  const source = readFileSync(new URL("../packages/scope/src/worker.ts", import.meta.url), "utf8");
  assert.deepEqual(workerEntrypoints(source), ["ApplicationScreenService"]);
  assertInventory(await servedInventory({ scopeSource: source }), document());
  // Source text only: neither this neutral class nor a Worker module runs.
  const changed = source + "\nexport class UnexpectedEntry extends WorkerEntrypoint {}\n";
  assert.deepEqual(workerEntrypoints(changed), ["ApplicationScreenService", "UnexpectedEntry"]);
  await assert.rejects(() => servedInventory({ scopeSource: changed }),
    { code: "ERR_ASSERTION", message: /Production WorkerEntrypoint exports/ });
});

test("every served Worker route/method has exactly its reviewed gate-class row", async () => {
  assertInventory(await servedInventory(), document());
  for (const owners of [pendingArchiveSeals, seals, pendingR8Seals]) {
    for (const [file, expected] of Object.entries(owners)) assertOwner(file, expected);
  }
});

test("snapshot body formats dispatch both actual membership-gated owners at the same route", async () => {
  // Structural object stand-ins exercise the real matcher, without asserting
  // a valid signature, Native admission, Rules authority or object closure.
  const dispatches = [];
  const routes = await scopeRows(sourceOf("packages/scope/src/worker.ts"), dispatches);
  const route = "POST /v1/scopes/:scope/reservation-snapshot";
  assert.deepEqual(dispatches, [
    { route, gate: "membership", operation: "reservationSnapshot", body: "{}" },
    { route, gate: "membership", operation: "stageSnapshot", body: '{"stage":true}' },
  ]);
  assert.deepEqual(routes.filter(row => row.route === route), [{ route, gate: "membership" }]);
});

test("OAuth routes retain public, credential and signed-control gate classes and reject an undocumented method change", async () => {
  // Actual matchers with object boundary stand-ins; this proves route and
  // gate classification, not possession of a code, verifier or Native key.
  const actual = await servedInventory(), routes = actual.get("artroom-scope");
  for (const [route, gate] of [
    ["GET /.well-known/oauth-authorization-server", "none"],
    ["GET /oauth/authorize", "none"], ["HEAD /oauth/authorize", "none"],
    ["GET /oauth/consent.js", "none"], ["HEAD /oauth/consent.js", "none"],
    ["GET /oauth/authorize/context", "none"], ["POST /oauth/register", "none"],
    ["POST /oauth/token", "oauth"], ["POST /oauth/revoke", "oauth"],
    ["POST /mcp/agents/grant", "control"], ["POST /mcp/agents/:agent/grant", "control"],
    ["POST /mcp/agents/connections", "control"], ["POST /mcp/agents/:agent/connections", "control"],
    ["POST /mcp/agents/:agent/revoke-grant", "control"],
  ]) assert.deepEqual(routes.find(row => row.route === route), { route, gate });
  assertInventory(actual, document());
  const source = sourceOf("packages/scope/src/oauth-routes.ts"), before = 'if (request.method !== "POST") return error';
  const changed = await servedInventory({ oauthSource: replaceOnce(source, before, 'if (request.method !== "PUT") return error') });
  assert.ok(changed.get("artroom-scope").some(row => row.route === "PUT /oauth/token" && row.gate === "oauth"));
  assert.ok(!changed.get("artroom-scope").some(row => row.route === "POST /oauth/token"));
  assert.throws(() => assertInventory(changed, document()), { code: "ERR_ASSERTION", message: /route\/method\/gate bijection/ });
});

test("a real matcher change fails the inventory bijection with the page unchanged", async () => {
  const source = readFileSync(new URL("../packages/scope/src/worker.ts", import.meta.url), "utf8");
  const baseline = await servedInventory({ scopeSource: source });
  assertInventory(baseline, document());
  assert.ok(baseline.get("artroom-scope").some(row => row.route === "GET /v1/scope-index/census" && row.gate === "self-signed"));
  assert.ok(!baseline.get("artroom-scope").some(row => row.route === "POST /v1/scope-index/census"), "The actual census helper remains GET-only");
  const before = 'if (what === "requests") return read(await scopes.requests';
  assert.equal(source.split(before).length, 2, "The control must change exactly one dispatch branch");
  const changed = await servedInventory({ scopeSource: source.replace(before, 'if (what === "request-window") return read(await scopes.requests') });
  const routes = changed.get("artroom-scope").map(row => row.route);
  assert.ok(routes.includes("GET /v1/scopes/:scope/request-window"), "The new matcher must actually dispatch");
  assert.ok(!routes.includes("GET /v1/scopes/:scope/requests"), "The old matcher must no longer dispatch");
  assert.throws(() => assertInventory(changed, document()), { code: "ERR_ASSERTION", message: /route\/method\/gate bijection/ });

  const census = 'url.pathname === "/v1/scope-index/census"';
  assert.equal(source.split(census).length, 2, "The census control must change exactly one real pathname matcher");
  const renamed = await servedInventory({ scopeSource: source.replace(census, 'url.pathname === "/v1/scope-index/renamed-census"') });
  const censusRoutes = renamed.get("artroom-scope").map(row => row.route);
  assert.ok(!censusRoutes.includes("GET /v1/scope-index/census"), "The documented census route no longer dispatches");
  assert.ok(!censusRoutes.includes("GET /v1/scope-index/renamed-census"), "The inner actual census guard still refuses the renamed outer route");
  assert.throws(() => assertInventory(renamed, document()), { code: "ERR_ASSERTION", message: /route\/method\/gate bijection/ });

  const forwarded = "scopeIndexCensusRoute(request, env, address)";
  assert.equal(source.split(forwarded).length, 2, "The forwarding control changes one real census helper call");
  const noAddress = await servedInventory({ scopeSource: source.replace(forwarded, "scopeIndexCensusRoute(request, env, null)") });
  assert.ok(!noAddress.get("artroom-scope").some(row => row.route === "GET /v1/scope-index/census"), "The actual helper cannot reach protected dispatch without forwarding the trusted address");
  assert.throws(() => assertInventory(noAddress, document()), { code: "ERR_ASSERTION", message: /route\/method\/gate bijection/ });
});

test("the bijection rejects a missing row, an extra row, and a changed gate", async () => {
  // These in-memory composition controls never import a Worker module.
  const grow = readFileSync(new URL("../apps/room/worker.grow.ts", import.meta.url), "utf8");
  const forward = 'export { default } from "./worker.ts";';
  assert.equal(grow.split(forward).length, 2);
  assert.equal(roomHttpEntry("apps/room/worker.grow.ts"), "apps/room/fetch.ts");
  assert.equal(roomHttpEntry("apps/room/worker.commons.ts"), "apps/room/fetch.ts");
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
  const registrationOff = await servedInventory({ hostedSettings: { MCP_ENABLED: "true" } });
  for (const [worker, rows] of actual) {
    assert.deepEqual(registrationOff.get(worker), rows.filter(row => row.route !== "POST /oauth/register"),
      "The enabled inventory covers the optional registration route; the default-off policy removes only that operation");
    assert.deepEqual(disabled.get(worker), rows.filter(row => !/^[A-Z]+ \/(?:mcp(?:\/|$)|oauth\/)/.test(row.route)
      && row.route !== "GET /.well-known/oauth-protected-resource/mcp" && row.route !== "GET /.well-known/oauth-authorization-server"));
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

function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length, 2, "The control must change exactly one current source occurrence");
  return source.replace(before, after);
}
function changedRecords(before, after) {
  assert.deepEqual(Object.keys(after), Object.keys(before), "A body control must retain the declaration inventory");
  return Object.keys(before).filter(key => before[key] !== after[key]);
}

test("named seals isolate real router, same-module helper, and display-body changes", () => {
  for (const [file, name, from, to] of [
    ["packages/scope/src/worker.ts", "routedRequest", 'if (what === "requests") return read(await scopes.requests', 'if (what === "request-window") return read(await scopes.requests'],
    ["packages/scope/src/worker.ts", "bodyText", 'const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false })', 'const decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: false })'],
    ["packages/cli/src/commands.ts", "entryLine", '`genesis ${input.kind}`', '`genesis-kind ${input.kind}`'],
  ]) {
    const source = sourceOf(file), baseline = ownerRecords(file);
    const changed = replaceOnce(source, from, to), actual = ownerRecords(file, namedOwners[file], changed);
    const key = file + ":" + name;
    assert.deepEqual(changedRecords(baseline, actual), [key], "Only the changed declaration may require a new hash");
    assertOwner(file, baseline, source);
    assert.throws(() => assertOwner(file, baseline, changed), error =>
      error.code === "ERR_ASSERTION" && error.message.startsWith(`${key} actual ${actual[key]}; Review source before adopting a new seal.`));
  }
});

test("module seals retain import wiring, executable initialization, and declaration kind", () => {
  const file = "packages/scope/src/worker.ts", source = sourceOf(file), baseline = ownerRecords(file);
  assertOwner(file, baseline, source);
  for (const changed of [
    replaceOnce(source, 'from "./deployment-setting.ts"', 'from "./other-deployment-setting.ts"'),
    replaceOnce(source, 'import { readDeployment }', 'import { readDeployment as changedReadDeployment }'),
    source + '\nimport "./other-side-effect.ts";\n',
    source + '\nvoid 0;\n',
  ]) {
    const actual = ownerRecords(file, namedOwners[file], changed);
    assert.deepEqual(changedRecords(baseline, actual), [file + ":$module"]);
    assert.throws(() => assertOwner(file, baseline, changed), { code: "ERR_ASSERTION", message: /worker\.ts:\$module actual [a-f0-9]{64}; Review source/ });
  }
  for (const replacement of ["const BODY_BYTES = 1024 * 1024 + 1;", "let BODY_BYTES = 1024 * 1024;", "var BODY_BYTES = 1024 * 1024;"]) {
    const changed = replaceOnce(source, "const BODY_BYTES = 1024 * 1024;", replacement);
    const actual = ownerRecords(file, namedOwners[file], changed);
    assert.deepEqual(changedRecords(baseline, actual), [file + ":$module", file + ":BODY_BYTES"], "Initializer and original const/let/var kind stay protected");
    assert.throws(() => assertOwner(file, baseline, changed), { code: "ERR_ASSERTION", message: /worker\.ts:\$module actual [a-f0-9]{64}; Review source/ });
  }
});

test("named selection refuses missing, duplicate, new, and unsupported runtime declarations", () => {
  const file = "packages/scope/src/worker.ts", source = sourceOf(file), names = selectedNames(file);
  assert.doesNotThrow(() => namedSourceSeals(file, names, source));
  const refusal = { message: /^Named source seals:/ };
  assert.throws(() => namedSourceSeals(file, names.slice(1), source), refusal);
  assert.throws(() => namedSourceSeals(file, [...names, "notADeclaration"], source), refusal);
  assert.throws(() => namedSourceSeals(file, [...names, names[0]], source), refusal);
  assert.throws(() => namedSourceSeals(file, [...names, "$module"], source), refusal);
  assert.throws(() => namedSourceSeals(file, names, source + '\nfunction unreviewedOwner() {}\n'), refusal);
  assert.throws(() => namedSourceSeals(file, names, source + '\nconst { extra } = {};\n'), refusal);
  // Var redeclaration is valid parser input; the seal selector must refuse it.
  const duplicate = replaceOnce(source, "const BODY_BYTES = 1024 * 1024;", "var BODY_BYTES = 1024 * 1024;") + '\nvar BODY_BYTES;\n';
  assert.throws(() => namedSourceSeals(file, names, duplicate), refusal);
  const commands = "packages/cli/src/commands.ts";
  assert.throws(() => namedSourceSeals(commands, selectedNames(commands),
    replaceOnce(sourceOf(commands), "function entryLine(", "function changedEntryLine(")), refusal);
});

test("the shared object seal protects its constructor, field, and private helper in both review categories", () => {
  const file = "packages/scope/src/object.ts", source = sourceOf(file), baseline = ownerRecords(file);
  assert.equal(seals[file], namedOwners[file]);
  assert.equal(pendingArchiveSeals[file], namedOwners[file]);
  for (const owners of [seals, pendingArchiveSeals]) assertOwner(file, owners[file], source);
  for (const [from, to] of [
    ["const name = ctx.id.name;", 'const name = ctx.id.name ?? "changed";'],
    ["#fresh = true;", "#fresh = false;"],
    ["this.#record.follow(this.#store);", "if (this.#fresh) this.#record.follow(this.#store);"],
  ]) {
    const changed = replaceOnce(source, from, to), actual = ownerRecords(file, namedOwners[file], changed);
    assert.deepEqual(changedRecords(baseline, actual), [file + ":ScopeObject"], "The whole class owns its fields, construction, and private method bodies");
    for (const owners of [seals, pendingArchiveSeals]) {
      assert.throws(() => assertOwner(file, owners[file], changed), { code: "ERR_ASSERTION", message: /object\.ts:ScopeObject actual [a-f0-9]{64}; Review source/ });
    }
  }
});
