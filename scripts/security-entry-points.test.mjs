import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkSecurityWitnesses, readSecurityWitnesses } from "./security-witnesses.mjs";
import { assertInventory, documentedInventory, servedInventory, sourceSeal, namedSourceSeals, roomHttpEntry, sandboxInventory, workerEntrypoints, scopeRows } from "./security-entry-points.mjs";

// Every runtime declaration is selected. $module retains ordered imports,
// exports, declaration identities, and module execution. Each expected hash has
// its own source-ordered line. Root adopts actual parser values after review.
const namedOwners = {
  "packages/scope/src/object.ts": {
    "packages/scope/src/object.ts:$module": "6316c9c49d3379a9d4d7b45233119cd8e102d09beed207051c10ed617d25d912",
    "packages/scope/src/object.ts:ScopeObject": "5cac901a7ab4d7c00983aeeae397fb4e6393d788194808d59ee6ffc68ae0001b"
  },
  "packages/scope/src/object-archive.ts": {
    "packages/scope/src/object-archive.ts:$module": "7d7c0da57c8b69bc953c19a59e3bd6af25a5f02863bac10ef6fd839fc9dd5adc",
    "packages/scope/src/object-archive.ts:configuredArchive": "f87b94060681ad7de5afa06eff80baf1f67bbc803cb1f5f41185b5bf35a3e11c",
    "packages/scope/src/object-archive.ts:archiveDriver": "d7d94f8700e5c3fc868896b85272d2ca555dfaef9b7a5f7abab38d86be0fdf67",
    "packages/scope/src/object-archive.ts:floorOffer": "439eeffe0d220f86b4f704be80668afe8d9e0f8e3926dcb8f949e2b06274e519"
  },
  "packages/scope/src/worker.ts": {
    "packages/scope/src/worker.ts:$module": "9eb628cccc575d48d5e96ef22785ecbc03ea629c71557ca8fadace0d44e3f6e7",
    "packages/scope/src/worker.ts:ScopeIndex": "b4c4e5bee990564e602083d69157ed24a9e8022adf2649227d337b8dd58dd86a",
    "packages/scope/src/worker.ts:MISSING": "e8958a6cf8d4cd2f412b30c76b38aca2f4523bc2b9df96606ac01059b6d4fb42",
    "packages/scope/src/worker.ts:RETIRED_HTTP": "5445b5b53d5b6b1f2b8c456b224b37e4f2ea525c5b412d8ffec299108e9d6d1d",
    "packages/scope/src/worker.ts:ROOM_RPC_METHODS": "f3d87e46eba68eacb7f390d1d2a221127794af44f017f976b0c8636fae5a54ba",
    "packages/scope/src/worker.ts:retiredRoomAnswer": "8fe669ecc7f0f242aa4d01b2fece28c68ccb5e6c1bc878609b07dc63372a5ae2",
    "packages/scope/src/worker.ts:api": "1a91c1253cbff547b01353c554e2ea425cbcb432e9f7e2a545f96d490082eff6",
    "packages/scope/src/worker.ts:roomApi": "42bb380c60e0b3822c5566f19e7c677f2c993009fc064db98d49c678dd20a6a4",
    "packages/scope/src/worker.ts:BODY_BYTES": "158a6579a52843b40416a1f4d27e7bffb5e0f5df07105254bd3e87c3d3d203fd",
    "packages/scope/src/worker.ts:answered": "f1c36263f63cc8977a334b803d6c89c4863d2e078704d7cdffdce1c3dc2eaea0",
    "packages/scope/src/worker.ts:READ_STATUS": "d8b56891bb8825791d082b46be7845faa2cb7094dee8f758a0ed59ba51e2c51b",
    "packages/scope/src/worker.ts:SESSION_STATUS": "99632b0bd230a76488353a2e1fce61925bbb595605a27d0f9e8c8e67f77a9587",
    "packages/scope/src/worker.ts:read": "4a083fdf987741284f15628b0c45881da42de526268465ee66f4c37422636dd9",
    "packages/scope/src/worker.ts:ORIGINAL_STATUS": "95b36ba73a5c328ed72c0c4f2427012dadcd1e29d84570ed380d70836892559b",
    "packages/scope/src/worker.ts:NO_STORE": "3c2d731f8eea8254d81b670ab342feba2ee0d809f59778a0b8e8760f0f31e082",
    "packages/scope/src/worker.ts:originalReply": "f2ab7919d41666a605dcd260843300ca0aa03de5c3dea95b8089661449cc5e31",
    "packages/scope/src/worker.ts:bodyText": "2837bd384fbfca821750f6f351cdd308d4b23bc264bbca872d1d48c632c27e53",
    "packages/scope/src/worker.ts:body": "9e8bc280d55ae2959d3b23a58747e78a5f199a5a0e1a3483278bdc3bcd89345c",
    "packages/scope/src/worker.ts:QUERY_STATUS": "cb170da8d7dca22a5dd36b21c59decce3a629ec5aff60745a39b350a1f2c9489",
    "packages/scope/src/worker.ts:queryResponse": "3ce5909b0b8713f13903dc84328673d0cfa85910dff434b928e22fd3e2fe11b9",
    "packages/scope/src/worker.ts:PROJECTION_STATUS": "a4e03bbeb2eacbb5e02d3228366fea9c7ffc218d5f814f72f4a1b3b291760742",
    "packages/scope/src/worker.ts:projectionResponse": "e17f1f4aa800bc06b4f8d065f77e8a594c2738c77873a52671fa7f1b22bf249b",
    "packages/scope/src/worker.ts:route": "631ced1082eca113b04fd2e53f96c8ccd02a9bcebb7c7e9ee8fb8b74230774c4",
    "packages/scope/src/worker.ts:routedRequest": "73baacbcfccec81a0cf945ee85bb1eccd8d28362a9c85156c93d0514d2e00044",
    "packages/scope/src/worker.ts:outsideOf": "81fd747eaf5d1d22d8a445fa3348d87ddf9079699e75a59b329022bcd6985b9e",
    "packages/scope/src/worker.ts:sessionWiring": "efbb51a65f5a24f3d1bfc006206deaf61d3e35f55e6ff611dd710e466db787eb",
    "packages/scope/src/worker.ts:snapshotReaderOf": "24485585bf55db1edb79dbde6d2617c6606541a245dd24a778b8e269d6b19669",
    "packages/scope/src/worker.ts:DeployedScope": "f1b5027752d8eeaba3d3ef14ba0534df71af9b87f3bb640023025e34a5219d2e",
    "packages/scope/src/worker.ts:ApplicationStreamLifetime": "4c82d6b5ea8ae68089f2f80321e3361b6176c9725d0b46481b6f32b6d2093ba3",
    "packages/scope/src/worker.ts:ApplicationScreenService": "c21c6c69f6b8f28aa64abfd9ca8e11a94a104f560d6430018f8ff9a68d52e5b8"
  },
  "packages/scope/src/worker-mcp.ts": {
    "packages/scope/src/worker-mcp.ts:$module": "e0e50567d6e936b2129d0aa4b2796b158f06f78da4afc9eb8cee7699838ba860",
    "packages/scope/src/worker-mcp.ts:mcpRoute": "d78965e7b5b9edc1e302355f7a5fe67af0ea2601b53f00a96f52695e863b879c",
    "packages/scope/src/worker-mcp.ts:boundedBytes": "6553fab5e2b9129266d64c02f7c3c9317095f1888fd12a10d12490d9f5d90f40",
    "packages/scope/src/worker-mcp.ts:membershipControl": "867e9def1d3f51581446670f4cf4058d8c57f0b7006219c645ec2a8fdf55e768",
    "packages/scope/src/worker-mcp.ts:observeThrough": "99d333760ec391012765a022413291f479c18fbe58cc767d1c183550bee06c53",
    "packages/scope/src/worker-mcp.ts:roleStandingThrough": "515916248af74961f2c5e9afe48ff68b241fd42159bbb1f51982eabf09c35008",
    "packages/scope/src/worker-mcp.ts:sqlOf": "5631baea8c5029d6ba93da6b3d199e63897c5f5ac05ae61e16b8d6f3e337f7fb",
    "packages/scope/src/worker-mcp.ts:McpRegistry": "def8feecb9bef8cd77e5528198eee7288c56c230e89da259887810e9442d096a",
    "packages/scope/src/worker-mcp.ts:McpAgent": "e9afaac830cf756c4d6744d673f48ce243b683cef75b3cb5211c22b5e3f8c41d"
  },
  "packages/cli/src/commands.ts": {
    "packages/cli/src/commands.ts:$module": "cf535c54f06e618911ca355e9488750eafafbe1b18d4358e596bf66dd6fc6f04"
  },
  "packages/cli/src/command-context.ts": {
    "packages/cli/src/command-context.ts:$module": "4bb5035a42a4df7fa7f0e3773bd0b6f74c2f5551d9fad86e6b473538cde52edd"
  },
  "packages/cli/src/command-targets.ts": {
    "packages/cli/src/command-targets.ts:$module": "336b7e259caf4957e5bc4f2079ca7dc0dfba585b981b7958c140a5991aa9c27a",
    "packages/cli/src/command-targets.ts:short": "62f9d565f48fc73fc6b282a941d6d37a48055c6c32f2ef88f21b22ead55f6e57",
    "packages/cli/src/command-targets.ts:directoryReader": "ebf7a12b7e199bfb0e7962191eae486cc1ca4ed04707f9dd73eacbc48b8e147c",
    "packages/cli/src/command-targets.ts:openingDirectory": "119dcc96ed0030341b0bd64460503a7b6112f31a370e59fd1f3100428f91cf58",
    "packages/cli/src/command-targets.ts:scopeNamed": "d16130a225872b6e96da8b6375ff41dcec104f7772f1e6c527c92d03cfd382e4",
    "packages/cli/src/command-targets.ts:definitionOf": "138ced231e1b804af138be95c50fdd958e478c196d21b11cba3a431658bedf0b",
    "packages/cli/src/command-targets.ts:laneActive": "8797076412cc4a14365ca99fc4faed2de3f34e7d0b7b62fc6283a446615a8aee",
    "packages/cli/src/command-targets.ts:fileOf": "f2c2de1136cfd275c0b2003f3ae5abd2ff8d7ba508351a05dc8145664dada339",
    "packages/cli/src/command-targets.ts:textOf": "1ae1ce4970caf7b99eb7370475b4506f47b23c9f8b09fd93933a664f2406747a",
    "packages/cli/src/command-targets.ts:activeDefinition": "0d7eb32794c7dbaeb2ff7df1b4480dc96d71ef5c58061a3232f711eabfcd94c7",
    "packages/cli/src/command-targets.ts:laneOf": "628ff633a6ede2a3f75ae5b5f6e701f6692214a1902898b504ab33b96e658712"
  },
  "packages/cli/src/command-install.ts": {
    "packages/cli/src/command-install.ts:$module": "2f2e4690fc429f57d7a47795b986f3d1ca335775f6c43aa946982a4a6c7808dd",
    "packages/cli/src/command-install.ts:NEW_REGISTER": "f828e83eeb39a37566e323156efb63274fc43b1d6b9e95b38fbf0cdbba327fbf",
    "packages/cli/src/command-install.ts:INSTALL_COHORTS": "2fa587b0df6d9e471ce031fd5d3d1f7553d5673650ae2f271281ae6e774c4d69",
    "packages/cli/src/command-install.ts:CREATION_INSTALL_COHORTS": "c007f288c599052489abdd8f0e301920e5752b39104bb2e22f2b79cf9bf8da9e",
    "packages/cli/src/command-install.ts:selectedRegister": "41e1ec4c908a3cec8ea0a0c03081215dfb5adf7b9879134ac14e95e1d0e39635",
    "packages/cli/src/command-install.ts:planSent": "9419fa14ca00c84bfbc468192900fd822717cb76e1ba8e178d616c009ae054a6",
    "packages/cli/src/command-install.ts:installSelection": "6e2ddb787b5d2d20db0c1dedebeea9bfe8a5a12ed5ab2130b8d646256ade6e46",
    "packages/cli/src/command-install.ts:selectedPlan": "d7365c8ecdaf43a83329a680e7073716936bea43f1f53e9e52cdbff91c6d083a",
    "packages/cli/src/command-install.ts:install": "22c4db3fd2f818c9077367d7c8afb7f6c548e170f5cde4055c9fec90dccef02a",
    "packages/cli/src/command-install.ts:installing": "848bc5a890238b9ee8e382ed5a958844ee8cd409e6e09236ff8c4fa3a10b72bd",
    "packages/cli/src/command-install.ts:registerIdOf": "5db562b18c0929cea45b8322e913408ed5326b3b865aece7b884c284f137102d",
    "packages/cli/src/command-install.ts:knownPlatform": "7b5bdce0c14e94a85bce0329ddaef5b6a5ba276b1c5ef4393155b1468aafa8a8",
    "packages/cli/src/command-install.ts:installAttemptOf": "9a7a6449aee1060b49444f9bef0e3fe271e5279d29ddec38caa9fd6b3a1d95a2",
    "packages/cli/src/command-install.ts:readBackCohortConfig": "440e708afd45bf7ca11a22d1c913ccd642a4aa58d7ac7d92b6d1da753dec980b",
    "packages/cli/src/command-install.ts:saveCohortConfig": "1414316c62c3977bc1e64131e636a7821ed3dbe7389abc50d557ea7764d6bf44",
    "packages/cli/src/command-install.ts:retainedCohortPlan": "b632965f5f5ab892a8da03a6f1adbf94b9a059fcae1d7eff431a076f461f1c38",
    "packages/cli/src/command-install.ts:cohortPlan": "892bf505fd5d30904ed58904cff14473328274587ab979a645108f738fcdf5f5",
    "packages/cli/src/command-install.ts:plannedLines": "df7c3d59e0ea56d6a03a14c93367f8233354e841005fd9fbc8a332f6d21fdfd2",
    "packages/cli/src/command-install.ts:planInstall": "987c4910430e6d463e9bb78477fb43ba3b6c81cb481936f17d080706d594462d",
    "packages/cli/src/command-install.ts:installPlanned": "746f81f7078018a4bdd15e21606c3ed37eff93b4be159129e41a774bcf8a46db",
    "packages/cli/src/command-install.ts:executePlannedInstall": "dfcce34c8c8bb18ce50515d1ba17e0fc72ab922c88b5fcb7fb0f6ea2caf92a18"
  },
  "packages/cli/src/command-membership.ts": {
    "packages/cli/src/command-membership.ts:$module": "20074581249db667d185ed1d12a815e30b4ebfd1a72e03c6f848d3ed8dd66f40",
    "packages/cli/src/command-membership.ts:joinSent": "b8a644d194680aeaccda9873f7eb9ee6f9e71110cdefe87b0af35d5ce946d692",
    "packages/cli/src/command-membership.ts:invite": "0f89f53e82d14214cc46d83bb6df8e11516e328c5b54eacced4dcc67ae1c2d5b",
    "packages/cli/src/command-membership.ts:inviteDevice": "58940c0af841e2c88452ef724a83725ccbe75a65dfce3dd1ed5c828f3a0b26c6",
    "packages/cli/src/command-membership.ts:join": "9ce6dba25ee527f1ab574633d3621d892e931be8866a7c165eeaf370fff1d483"
  },
  "packages/cli/src/command-scope.ts": {
    "packages/cli/src/command-scope.ts:$module": "c5d62d2a95b310c978fc985455da12c1e0c50f6e59577af34a37921fd63d1366",
    "packages/cli/src/command-scope.ts:scopeIndexAccess": "b54a6859075907491f4c19313b149572acd5b3bd94c492d61fb342601759c299",
    "packages/cli/src/command-scope.ts:standing": "57372328838e0f9bcb936554f41738f9445ed53384112aae1cdad745a4dc1fce",
    "packages/cli/src/command-scope.ts:acts": "f4577a1dbe4bb307bf92057f101967b5fd2f9a11240342f4f3377e177a81fd53",
    "packages/cli/src/command-scope.ts:act": "9dba33bc8a44de2133077ca6fcd7c68f8839284ca97f84f80c1ee9e702957137",
    "packages/cli/src/command-scope.ts:apps": "02729fd520eb4ed349fad0e776f974929a3663d442a0588e9b95ee104ed9ed8c",
    "packages/cli/src/command-scope.ts:items": "035ef813ce6aea0c10a2215c856e5e8c30fed9e0db64dcd24eb43e98ee713baa",
    "packages/cli/src/command-scope.ts:entryLine": "b33d37dabac548663d32587fba50c36f20cb002801fd297222f5669af8bc05c4",
    "packages/cli/src/command-scope.ts:log": "3ef9c27f7f2f22e7f2531f7e4d0cc859af988009fb92e3e79b13261a45943aeb",
    "packages/cli/src/command-scope.ts:show": "e5008fae01934cb48b95ed52c0f9108c9f2f8799ef8072e61b80f1abe2823fc9",
    "packages/cli/src/command-scope.ts:status": "f77f1396b4bed9f01c159ca07c991ef52da9cd9a50ea4e1aae3f5765d50504b4"
  },
  "packages/cli/src/command-verify.ts": {
    "packages/cli/src/command-verify.ts:$module": "08579a0e3076df46c748b6f5d572b382858bcd5b3ec828f1abc965755e09b527",
    "packages/cli/src/command-verify.ts:sessionDeniedDependency": "8d700dc0b3ba4755d46999cbbb2e901240ac3f21e103303e20f0ec96d8aea28b",
    "packages/cli/src/command-verify.ts:replaySource": "efa791c6df8f2f42406d5cb98ed0047603c28ed8acf2a314831e6534eb902f69",
    "packages/cli/src/command-verify.ts:otherRoomsOf": "7c301eee78006007a2f2a6cdfdfbfb73f7224782dd9b8fe3173303a1eec4ead7",
    "packages/cli/src/command-verify.ts:replayOf": "e4f3f261612d3e755c94a4a19d8d54920d4f938c9e30cee8caafd59f12c3fdac",
    "packages/cli/src/command-verify.ts:verificationContext": "bc38c07b7cbcbaa2118086aaf05068fc05d2cd90b1994edc81968e48788c41b6",
    "packages/cli/src/command-verify.ts:verifyScopeCommand": "4dd727df2ca467fbf11c1d3bd3219dc74ed2a0a12bdd1045f9e8879d0508b598",
    "packages/cli/src/command-verify.ts:roomScopes": "c128a0c451a22e0cee69335e6ca7d72a0417bfd0699bf5d22bb051edcc6b3fda",
    "packages/cli/src/command-verify.ts:sharedProofLines": "34b301124799ac47eb5f3950fe49edaefef4b543bd09ffbec47a5689d12f81c0",
    "packages/cli/src/command-verify.ts:verifyAll": "abed4baea2213f8387369e5699bc114055b1a2ead05fa2f619a203240258065f"
  },
  "packages/cli/src/command-repository.ts": {
    "packages/cli/src/command-repository.ts:$module": "f1bd9853416b1a5e966ccb641769880b6ac43e6a62512261a38d604b995e45f6",
    "packages/cli/src/command-repository.ts:OWN_HOST": "d8049ba56c1494f7f9ab575b4ccdbe4ea8192229bb9d2a280bbb4528e1c5784a",
    "packages/cli/src/command-repository.ts:remoteOf": "57afba6cdd6f9169d7366eb5641f61a52a420f55ba723bff6922bfc6332496a9",
    "packages/cli/src/command-repository.ts:remoteLine": "1eb8d789b8f70e63d8b28176c5b5f923eeae5065c26a17487274295b2803d354",
    "packages/cli/src/command-repository.ts:destinationStateOf": "a0daccc378fcd22def9c7033c553d70f7fef2085553e4a562f0b660d39290f07",
    "packages/cli/src/command-repository.ts:destinationOf": "12e9a159bbe98128f0e7f0bd184477a845e06ce0d1eede21b2dd9b498672da42",
    "packages/cli/src/command-repository.ts:remote": "fcb9d2f615c3de93ca2e366e3460fa2551da32424c482703795b5d053b905449",
    "packages/cli/src/command-repository.ts:authorization": "e4e08477eb4c8766ccbb228da6d28f0b0c98a11500d80fcbe92e686eabb654ec",
    "packages/cli/src/command-repository.ts:b64": "2ccaf086d7986f6c72fc6eb746042e77b2da0a99cba0d51e10a9aa87025e0c6d",
    "packages/cli/src/command-repository.ts:headerEnv": "2b29643df8f13576381b9be7133dd6f5dc668a80d10822ac7fbc0d3bcb1ee878",
    "packages/cli/src/command-repository.ts:clone": "1d8aa445d3c5ea84144059b895b8ed3626f3070475a09a051f56e0ed5f2e809e",
    "packages/cli/src/command-repository.ts:cloneRetained": "d26b7b7a58c7c6b0d1c1ca056beecf1de47b194c27d5420abdb457c5556f9ced",
    "packages/cli/src/command-repository.ts:cloneUsing": "c04711c76ed8f47a4c3e0e9863a387c7a0a27e745c6a7b2c70fa4b73332ef8bb"
  },
  "packages/cli/src/command-change.ts": {
    "packages/cli/src/command-change.ts:$module": "dfccef191b30592cf4f58e78784a29eaa20b754dd91813b0dcbcf162553cf7e8",
    "packages/cli/src/command-change.ts:EDIT_BYTES": "9bbee0ea572e3aee4339d86e8e59defc86538133d2ad92449cdc827c7b86b2b5",
    "packages/cli/src/command-change.ts:stateOf": "28ea558ff346032f886d018fa25925b7e0ed64fc914fb8b6a25fc08c6ab174a2",
    "packages/cli/src/command-change.ts:valueOf_": "b5c04f914e3a5b9ddd741664cb83611b825719e519f3b4e423515279493bac44",
    "packages/cli/src/command-change.ts:supportsEdit": "faf1b5d8e650f0cb9fc716abd69872b227a64477bdbb93f798128f077730f6a8",
    "packages/cli/src/command-change.ts:edit": "f40d95a0f633610c5348bc959476bf9b07dc795ae7f49e7d5fcf1db857028f6f",
    "packages/cli/src/command-change.ts:propose": "cd58d412a613dbacbc96ae2e0222949f99377272c7f4089e78269009e3ff5142",
    "packages/cli/src/command-change.ts:proposingFiles": "22a95036e1d4e2b2541a999f5ada1f69b83fec0fae29c0ce241319a211395daf",
    "packages/cli/src/command-change.ts:merge": "fb866a06e19ec5713108a7f665cd9c6de0be1f986e0cec9f7c35b281bd1eb5ac",
    "packages/cli/src/command-change.ts:merging": "05659e2afd0ed66897e18c2003d90ea697e0adc3d96e8c1a35a35a677d2ce2ce"
  },
  "packages/cli/src/command-issues.ts": {
    "packages/cli/src/command-issues.ts:$module": "e9888f337bf55f1cd0f41e99a6e3e8610d8bf4e8c97ca7cf5cde66864dbc4b65",
    "packages/cli/src/command-issues.ts:memberOf": "82b7786a17e358f6ae9e91da4bc64425092497ebd78da4369235ae1653e092e7",
    "packages/cli/src/command-issues.ts:issuesOf": "266659f8def056a545e1ce8c2aef565858de27c65e9eb9c3b4b4576f1dbb90b8",
    "packages/cli/src/command-issues.ts:issueNamed": "41f15c6fce12bc4ac95a9cd53a9a17872a1443ff2a7827b388b087dbf62a9c57",
    "packages/cli/src/command-issues.ts:issueAct": "86f0bead725ab55410f67d6bf62fa3f158e223d6e21576fe8ae41ecb8fecfeab",
    "packages/cli/src/command-issues.ts:issueOpen": "12c1b281cc703159eaa1eeb42cae6680ce19d2abff348757938e56d4c80d7d43",
    "packages/cli/src/command-issues.ts:issueComment": "01dd1d82b2df0d7afaf5f555deace4eedc6c54393e8002d3c79781bb8ea85867",
    "packages/cli/src/command-issues.ts:issueAssign": "ef0fbd113156b7e6ba241dc6933dadf26300e30f26436e161413c89b890847f2",
    "packages/cli/src/command-issues.ts:issueClose": "b3b3543b2a97faba39e1a2236792d92d1fb14159bdc25feefbe5f6383358026f",
    "packages/cli/src/command-issues.ts:issues": "cc896c23a5c618666a5408925e51f0629a50c810bb87eb9ea0ca16db4d494477",
    "packages/cli/src/command-issues.ts:linking": "e425a12db2c6e4da95f28b73f366215f4347592d6b868d3fd943fab497766280"
  },
  "packages/mcp/src/service.ts": {
    "packages/mcp/src/service.ts:$module": "cbd7d615614dc643187a36ce6e1f5702b2a195d2111dc4d9f4a991e49dbee8ae", // Reviewed exact-read context; NF-4 install request in the client; admission stays here.
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
    "packages/mcp/src/service.ts:callResultText": "fc1a482401a1ae3bf6c51184e6d005acf1436dddf513eb69161a2439b596a7ad",
    "packages/mcp/src/service.ts:BOUNDS": "838a3fb5498e8b323318642271e728afe0e2409fb658f370ce9e7d7c2c6cbfbb",
    "packages/mcp/src/service.ts:PAGE_SPARE": "b56f933bf61a623da82d81f9c1b944072d6c71538bf56e6e622c3c2d24a7eb09",
    "packages/mcp/src/service.ts:pageOf": "e0aed29507d78dc28f1b498cf91a4d01bfa6e59aae798f1414fc909e071b6bb2",
    "packages/mcp/src/service.ts:ok": "d01886e75962cf47a06a28e6b04a6effed273dc3ca1e9f7e3bbb2867a3e22fda",
    "packages/mcp/src/service.ts:ERROR_BYTES": "3cf4f0d3c6271b3cef45b42e64e8d210f063b480addfd1f4f1d26d73c3e64d04",
    "packages/mcp/src/service.ts:failed": "077c51d8c07a4c662635309cdfcd35ff6ebad85e8d8d1ba725ab23253a8cb483",
    "packages/mcp/src/service.ts:configDigest": "db445c9209d8d937f49e2016f1a7ef2eb7ab57a189a05093d2ce8d61e49ff5db",
    "packages/mcp/src/service.ts:Stop": "3840d5e60335bd1fb067b0b5e9df4b8ed78ff61b739729ba2cc69672c97f1cc7",
    "packages/mcp/src/service.ts:applicationPackageBytes": "505ea3aede390299e67669f8d600f2b33e6866a7c498858b47c91edf3a5dfc5d", // NF-4: the public HTTPS Git read of exact package bytes.
    "packages/mcp/src/service.ts:stopCall": "f8d89a63e2e2336d69c4fe331483fc42f64ad5c183df574ae74e0f774223a007",
    "packages/mcp/src/service.ts:VIEW_DIFF_POLLS": "49f2a59ec14b31da35f8ef7c9715c2de7a158ec849702c175f51ef42dee7e7cc",
    "packages/mcp/src/service.ts:COMMIT_ID": "5d97f59cc4546e45416555cffd622add0da00d115a8b8f31ca2c3946ed311f7d",
    "packages/mcp/src/service.ts:DIFF_OUTPUT": "9333d83a48a94f5eb2cc23c2165fba345ef47e57f58a7dd26090082bed58e296",
    "packages/mcp/src/service.ts:READ": "c46ffafd29a0b32d79613c7d6b784a9d6cab99b90c99b98fe9246a8b6b6682eb",
    "packages/mcp/src/service.ts:WRITE": "5920731b91c504f8bfb945b3edbe132bea0167ec1c9a44579e3dd658e5e9cd91",
    "packages/mcp/src/service.ts:scopeArg": "36e8957cdbc823f8e1bf9ab903a7a353df3b10d1292ed7d378362aabc41f6ef4",
    "packages/mcp/src/service.ts:scopeRefArg": "54eb8fcb90bd3e5dbacec1eb71f853e5a3b578aae10d11a24d3c0ee0d69a88b3",
    "packages/mcp/src/service.ts:memberRefArg": "80b4a7634bee92e5b6d8b03dea6102cbf701fcab94198e54de219783961ee281",
    "packages/mcp/src/service.ts:keyArg": "368a6f3d59380df455b92a9478dc8c993a5535b2d40e9046a4e71df139cc5149",
    "packages/mcp/src/service.ts:McpService": "9bf30f83a4e5263ba0e384402500980050b2850a97fc2af85c93cd28288b0813", // Reviewed exact-read context; NF-4 maps client install refusals; admission stays here.
    "packages/mcp/src/service.ts:commitIdFault": "36b75703f0eb36b5abca60906629f23df18a233d26c395f0b61c792eddabe405",
    "packages/mcp/src/service.ts:lineOf": "b8fc3e8118f71914f365f08ff318da437f69ee1e5e693956e0e88101d5177e00",
    "packages/mcp/src/service.ts:creationName": "a7dd4dd268ace0088ef0be50510ccc654090f1ddcc09aa0a4271f161b05ca444",
    "packages/mcp/src/service.ts:valueDigest": "e745a5f9e668cd13e52b41194b57f43576380feabc7065d00146c76ce0910e73"
  },
  "packages/scope/src/core.ts": {
    "packages/scope/src/core.ts:$module": "98b4181ddc94969b5ccca22c9f3219f2be69608bbb420be4fd4348337ee5c566",
    "packages/scope/src/core.ts:receiptOf": "882323565d2d715e74148cce168c83851e5e916222a67494b13f2230468ccd60",
    "packages/scope/src/core.ts:snapshotsOf": "b7ecf53e025201a0a328b1d370656d801024c5671ff3af57f4aa2aa56678c7d7",
    "packages/scope/src/core.ts:ownOf": "c1beba742f13528a1355408d0634168a67cad08a6b753faa4476f7f4819e9f59",
    "packages/scope/src/core.ts:used": "7e576fcca780441ea900ef6480e0fc2b2ba39c6244bd48d725653dba3c1f919a",
    "packages/scope/src/core.ts:bornOf": "672162a527b22445e5612e9234fcdd6ab8a8857e1316c5e04f5f72cd5482fc53",
    "packages/scope/src/core.ts:retainedUsesOf": "57dfcff7d57f4ed56f2fa09d1de95cb19fc4e65daaf0c70f9d54330b4549ee94",
    "packages/scope/src/core.ts:genuineRetained": "f64152033e44e4f623a636ed54ed69b26d133293983bf0caa087a3e2e8fab63f",
    "packages/scope/src/core.ts:retainedOperands": "33c83854ec9772b9540aaebedc4d3153d103c41109066fec0fc0ef3693b746d6",
    "packages/scope/src/core.ts:Received": "db4689920e8d485672b8b95e2cee94383e08d3b8cd8eb6da8142e84fbf4bd8b4",
    "packages/scope/src/core.ts:creationKind": "e2e00414a034ccf7aa3c35fe4bf942ba0a189501242e236748538df2d808a71e",
    "packages/scope/src/core.ts:besideOf": "cceb69d4007385f239803a343bdb869be34a51f8e4ff77747d0601971295a7e4",
    "packages/scope/src/core.ts:valuesBeside": "134877aaddc41a23dfb25403ff4c150f2afabc4172108636d898610471ec541d",
    "packages/scope/src/core.ts:valuesOf": "a2ac72acccf44690145f1e9211dae55da00bd6c402457f44afeb37a0549e97e9",
    "packages/scope/src/core.ts:NO_GENESIS_NONCE": "2ce6ab73608a4bbafc4b02ed896ef3146de74cd7d19ca9efa69cc5eac6506266",
    "packages/scope/src/core.ts:unavailable": "053e97cd7fbe3f33c5a57f9fc3b5bfc97844778ffa88b96c0e7b723e50bf6495",
    "packages/scope/src/core.ts:said": "c3358e3632f8c1c114c3a3e51687256d38bcfc7950aaf21af0b779c138e3e46a",
    "packages/scope/src/core.ts:heldBy": "a66b415809db685c99cc8961ba592bd8bdcb8bda8f2f4ea1e73fe71c4b052fd1",
    "packages/scope/src/core.ts:told": "bc25d088d5c51694f6e3a813f11f2875144c7a3bdfaa8d124063dc1f65e2fe67",
    "packages/scope/src/core.ts:Observes": "9a0e37bc23db915ebdfd3ec4eef21172918f50fc3e19de840d2b03746efc3710",
    "packages/scope/src/core.ts:Scope": "731b5a55a1b6cac490f61d20559600cc63b39a73d09976c6e190871c582fe2e5" // Native initialization reads held hash metadata directly; a genesis fold builds its first rows.
  }
};

// Reviewed matcher/gate owners. These are change tripwires, not runtime proof.
const seals = {
  "packages/derive/src/validate/index.ts": "d6b90a6b4e6e8319cb0a73e50d2864751cab6fb1974bc578d5937d9ee99f1efa", // F canonical identity/retained-origin boundary; actual maintained parser output.
  "packages/derive/src/validate/spelling.ts": "1c53e1ec4503e15be23d409b4862162a52f24f9e7e504a96922db90845a31a11", // F canonical identity/retained-origin boundary; actual maintained parser output.
  "packages/platform/src/evidence-incident-origin-v17.ts": "6d6e6af6897688829bd9710e0e3c736dce0028e56218970f5bce3efd5e266cf4", // F canonical identity/retained-origin boundary; actual maintained parser output.
  "packages/contract/src/catalog-vocabulary.ts": "458e087b56935e8c198016c476d11aff10ca24e9ab131d90d31fe282a6b731f1", // BR13 exact native question/relation owner; CF-1 adds the five new family pins to its questions; actual maintained parser output.
  "packages/platform/src/version-questions.ts": "069eaf4cc12c5e65caff4936d3deb088e19a5d173882131885ff1596b71fdef8", // BR13 exact native question/relation owner; CF-1 adds the five new family pins and scopePublicationPrefixesDestination; actual maintained parser output.
  "packages/platform/src/version-relations.ts": "1eb52555e06569c8f76d9de97a03717828996f2de7500c6c17e66413eef25f0a", // BR13 exact native question/relation owner; CF-1 adds the base cohort and the Membership 14 and Register 28 relations; actual maintained parser output.
  "packages/scope/src/http-stream.ts": "ac798ac542c6295bda6495ef9c3f46f2c78511bfb89b88ee4b2d4df7711e2168", // Retain the exact existing close capability on observed HTTP disconnect.
  "packages/bytes/src/session.ts": "71a16d6d2d02b2f424e711a80ca28fe8e10204d3daacc4d0cf23f85ebe80903e", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/mcp/src/oauth-parameters.ts": "b48c22470c29dfa7c11260fc874128859650791294ec93d8ae0007bdca95534c", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/mcp/src/oauth-clients.ts": "6a9a783055313436b3d4746df9cbf38817dc4cb03477fab607980eb98a60f55a", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/mcp/src/oauth-issuer.ts": "abfa05c1826d3d856a3e7bc2be7d265370e70171f6e7ee84cfc4dbd96379e32b", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/scope/src/oauth-routes.ts": "941be3f30ad7c19c4126d5077e19a3b474e454f6c404f82f99f4b99e50392862", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "apps/room/page/oauth-route.ts": "859183c042ec2708d4d357ec49fffe0aae4fb9f4c44ea3cff734e9b2c33cbf1e", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "apps/room/page/src/oauth-context.ts": "ebf66f2c85ebbb8e564dc519bc76a6b936491dda217283bcd76b49edbf79497b", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "apps/room/page/src/oauth-custody.ts": "4ccc5fa0e3c1740f389b8c5a8649b601fffd809ddd63447b7194108fc28bc874", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "apps/room/page/src/oauth-main.ts": "8a110a1da61e83ef46ec007c0544cdf6b2619bfc25eec8159cc9119b1dc48efd", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/platform/src/own-agent-membership.ts": "4155cefc45d92b7396511b6a7173b438b45ff203593ca328aa9d9f322f24804c", // O2 own-agent guard and exact opt-in cohort owner.
  "packages/platform/src/own-agent-cohort.ts": "5de494854f15f912b1ea19cbd556e3cb1d328050170aa497721918c70941ddc8", // O2 own-agent guard and exact opt-in cohort owner.
  "packages/platform/src/own-agent-cohort-data.ts": "71f7fb488af03dd08d0832a943cdb0e74f5cd11c05550bccb0e1d7cc12b8ee00", // O2 own-agent guard and exact opt-in cohort owner.
  "packages/bytes/src/read-minimum.ts": "13e8cbbcaf4c8beb43dc426db85050a006395b88dbcb058cd693b9240da91133", // DX-A2 reviewed minimum admission and wait owner; actual maintained AST value.
  "packages/scope/src/read-wait.ts": "d1f3f58f089f89164b270bac3263172c8d9bc0ece2cb3a375ca7b000b6507573", // DX-A2 reviewed minimum admission and wait owner; actual maintained AST value.
  "packages/scope/src/authority.ts": "8072e369fa879a6072fb0d546598962696d05df11f4b38fcf83469addbd0d5f9", // Token refusal: the commit of read-token asks whether a compromised notice named the key; maintained whole-AST value.
  "packages/scope/src/observation-cache.ts": "d43f96c5f634d188e1c989d39b75669c89fdf8a062ab2450b0f9b6621b227186", // Bounded reusable observation payload and FIFO owner; actual maintained parser output.
  "packages/scope/src/turn.ts": "10286cfbc947638bb19ce35e6fad8281139da7f6efb14d79740c30bae6540a3e", // CDF-1 total retained bytes and fits settlement exemptions; queue and timed drain unchanged.
  "packages/platform/src/reservation-v17.ts": "ab6816b23c9e4edfd034b24d481e6a14b9baf065808b3cc26496bcd531b0cafc", // Reviewed retained-policy decoder; actual maintained parser output.
  "packages/platform/src/evidence.ts": "77da4fdc1cf2601ee64849d2051ecdba0e8391d6b93b6ce74d7e59df90033897", // Reviewed platform binding codec under ruling 1bc4f7fd; actual maintained parser output.
  "packages/git/src/checkout-snapshot.ts": "82f53717d419b70fe208801b6d0bf2fc0c947ac2beffb27b2e2d01898f48ee25", // Detached object identity and closure bounds; imports do not seal this implementation.
  "packages/checkers/src/stage-origin.ts": "73ef787bb9dbbafca6c31c6f3231b8fd62ac0c5cbc955ee4acd68e45af483385", // Actual Native admission and causal proof verifier.
  "packages/scope/src/stage-snapshot.ts": "6f6538d1da1d49ab0741e3a36450d7821bee63933c3c71c582654522b80605aa", // Signed stage read and current Rules, key and work-source gates.
  "packages/bytes/src/address.ts": "d6d2fc3f86f50318c6a88b21649daef212f40c4d46b942033d27b3853902ccd2", // Canonical local full-address and routable /64 counter keys; actual maintained output.
  "packages/bytes/src/index.ts": "7a8a620d0a932d6dfc8b5179ce6b4e4303203035e9412d6e0de407b2cf350230", // Bind the shared address-key and citation parser exports to their reviewed owner.
  "apps/room/celld/worker.ts": "d1bc465525bd0af046fa0703464f14aeaaee8286b88415dfec3b9e03869fb644", // H1 reviewed production entry or public-origin gate owner.
  "packages/scope/src/public-origin.ts": "d6e867fc859db69b6fcf2d465d387a032966331cbae04310ea4c24cda3773269", // H1 reviewed production entry or public-origin gate owner.
  "packages/platform/src/versions.ts": "6b9b184d22fbffaa617049e1b6ec01bc64fd6039b068ac534d0adaf443868962", // Closed native publication protocol policy; actual maintained parser output.
  "apps/room/worker.ts": "aba04e12dc206f0be6bda4a8edeac64569e0edd44b7a87772595d7db40bb8b67",
  "apps/room/worker.commons.ts": "c525a1b0d13e6243099d03b80c5207b76f082c71432db2b8ecaf86ccf8cb1160", // Reviewed separate deployment entry; actual maintained parser output.
  "apps/room/fetch.ts": "83b2a56552c5f6874935d1491f487fd7d2b9e2651a9acceb87d731139897ad2c", // Forward the HTTP context to the existing scope route; dispatcher gates stay fixed.
  "apps/room/demo-creation.ts": "18124da145e98edf887394d92a1d3e37f2e350127c4e268e16729acfe8cdfc23",
  "packages/scope/src/demo-creation.ts": "ad2696564e94d810c619968d623ff97b39e917b0aa4ff6c96bfd4f2b8e83c424", // Reviewed current demo projection or ordinary GitHub authority owner. CF-1 changes it; actual maintained parser output.
  "packages/scope/src/github-wiring.ts": "6bccc5a379825c66d77723394fe7b37c2cfdfc722953e6cebca13ff1befaf66d", // Reviewed current demo projection or ordinary GitHub authority owner.
  "apps/room/page/route.ts": "8eccc79a8a3e3cd8b33c38c65374db5d01583b5e9afd76384fc2133bae4cb475",
  "apps/room/brand/route.ts": "71b45ff9b41b3bea31c775a16525349591e0d4f7dfdc65da79f095816b1c343c",
  "packages/scope/src/worker.ts": namedOwners["packages/scope/src/worker.ts"],
  "packages/scope/src/worker-mcp.ts": namedOwners["packages/scope/src/worker-mcp.ts"],
  "packages/scope/src/scope-index.ts": "030ff3f211aca71bb1e750888316c496ed21b04eb89f5ae16bb412e94bcc4664", // Exact indexed scope and kind gate before internal native birth discovery.
  "packages/scope/src/host-wiring.ts": "6cbde3017c210bc1875d07c470bc588c452bc855171646ce889bf39cd9065fa5", // Installed-register authority retains exact Native birth and host binding.
  "packages/scope/src/installed-registers.ts": "39618d91dba4884b866f1823d5bc2ee89e7ca0b78b47b884387e7bfeba2dee5e", // Installed-register authority retains exact Native birth and host binding.
  "packages/scope/src/register-setting.ts": "1ead9e620589e3707e2a6515951cc095b44308a34aee6855b3bb8da37bd230ca", // Shared exact Register selector; actual maintained parser output.
  "packages/scope/src/scope-index-census.ts": "f405bfcf12db50596d81ae19ce4478a46763e4b6bbeba7a45403a834376316ad", // Address/key admission precedes owner proof; exact census authority and page guards retained, without duplicate owner charge.
  "packages/scope/src/creation-admission.ts": "c0b2ff1d552b17b42710b9128a652c478e7c32ce96640c6c0d543f5748e2d4be", // Reviewed R1 ancestry owner; adopted AST value.
  "packages/scope/src/creation-lineage.ts": "12f2ab7d81f26f0a7c9d75095928d39e450f7eeca94e51793c7b7892760d2ee9", // Reviewed whole-lineage boundary; adopted AST value.
  "packages/scope/src/creation-versions.ts": "872e383c736e3d77b3377dec67ca29855612f1bbf2e9a6754c4c58db72fce97d", // Reviewed R6 creation-policy parser; actual maintained output.
  "packages/scope/src/creation-declaration.ts": "0aca81538bf80d643ff74166d99e535b68abf3b7dca2b06b65cee543806a3fd9", // Bounded immutable native Directory custody, not authority.
  "packages/scope/src/namespace.ts": "d69ee16321e6cbc2d5bf56e003bb635b3bd2b18808241ed390059f4944aa4e2d", // Reviewed internal declaration RPC; adopted AST value.
  "packages/scope/src/health.ts": "fab90430e09a90ea73a9f9e663f17ef9e393d2a81a98327d9625b9041cb6a872",
  "packages/scope/src/site/route.ts": "a0dd2fc19f24b87ff033d8ebbe89718b8a953c291fc5f2689d064ade92e40166",
  "packages/scope/src/site/host.ts": "7ba177e4cf693beaad6ecef85cc3d33455a5896cd35565f50a98e03ba848cd07", // Private Site token custody; actual maintained parser output.
  "packages/scope/src/site/token-reuse.ts": "7df9e0eb8e1c5bbfc050f52729ffaed86f00ea6d56ed04ac1efdf9e6cbf51ab0", // Reviewed pre-mint generation cleanup rescheduling; custody checks unchanged.
  "packages/scope/src/site/window.ts": "1b0e1d820a7840063d35d39dc74d61a2b9caa6ffb5763e82a21b6ae5524d4936", // Bounded site-read window; actual maintained parser output.
  "packages/scope/src/applications/route.ts": "1b36c95f39b85224469aa260eebae3fe44163bc3e0f81662afbfc0528c1ee953", // Actual union parser value adopted by root.
  "packages/scope/src/item-query-wire.ts": "8206b9a6531ca30cae1bc49cc249eea08c70a658305f41b3ebea6eda042055a8",
  "packages/scope/src/applications/projection-wire.ts": "289a66b25bf2dc63e0e7d4b0726c1eda067d21e9238bbf29737b4d8d89c1fa00",
  "packages/scope/src/object.ts": namedOwners["packages/scope/src/object.ts"],
  "packages/scope/src/object-archive.ts": namedOwners["packages/scope/src/object-archive.ts"],
  "packages/scope/src/core.ts": namedOwners["packages/scope/src/core.ts"],
  "packages/scope/src/applications/act-admission.ts": "bd0aba219f02c47c143e8a86b4204e1923d7c48d10cd4a873c93a40987f2eea9", // Exact native provenance and current trust; actual maintained parser output.
  "packages/derive/src/genesis.ts": "d2a6165d424376a9057cc9390e721a1970341ad937d739a6f94eb9575d9f1cc2",
  "packages/derive/src/judge.ts": "f1f34a923034e442ae321639b2a4ca0cf0332edf3c138cdb57bb0128e3d9ce38",
  "packages/scope/src/sessions.ts": "d701c671e110dae78d0b9a73cfd6229dc9b4a1bb89bdc97e76228c53168dd68d",
  "packages/scope/src/originals.ts": "f6091ac370a3346c493eb795ef72b2392217708a00492c59fcaf1f3df9903ac4", // Reviewed J1 owner: the member compare, the signature and actor check, and the caps.
  "packages/client/src/originals.ts": "4b77af1b7f1d97f573f072efbe278cd3fa38ee4809b031d648fa57c5d5d17cf4", // Reviewed J1 owner: the bytes that a second device verifies before it sends them again.
  "packages/scope/src/reads.ts": "27fb18acf08aee7b2c9f9abda0f0b8387f8dab4aab7cd5545efabacc29da6cb0",
  "packages/scope/src/signed-reads.ts": "3beb23ca30b343a71dd87673c3e1252cf3fc15d622b92632c499cc42056d4e89", // Census wire name; its separate fixed-index predicate grants no ordinary scope read.
  "packages/scope/src/limits.ts": "dfab21444a03339291f51f500941dc1b0d23926fa01fb173e7cd7cc91983f099", // R12 verified-key join failure window.
  "packages/scope/src/serving-limits.ts": "94f6987027c7638ebe0aad6899f1dbf352a25029aceca60c00476b600e7d410b", // New bounded memory-only counter, no live eviction.
  "packages/scope/src/serving-admission.ts": "44e8ef11b0bb97a0a2982643152d62d9ec1ab14f9af26a2a687d5a301ccf1168", // New bounded original-signature/counter ingress.
  "packages/bytes/src/records.ts": "ab0e3293165aae42bf4e30d235972035ff645a8219ee149705a4a40b1edbbf3f", // R11 named serving refusal; RC-1 adds the REFUSAL_CLASSES table only; actual maintained parser output.
  "packages/scope/src/session-preparation.ts": "49b091ff2910c0c2602fce76330e7084479a3bd4cb3bc1617005c18f2cd3fac3",
  "packages/scope/src/item-queries.ts": "61ead9996d2c338a26331e04b8576c52425d8d2c88dc86173a7d79108c2ee418",
  "packages/scope/src/applications/projection-source.ts": "4045ccd66ccc971a08a2a31e5f7daaf8f20453c03af8fe0f1cb134bf77ac86b7", // Closed native room metadata with optional supported membership pin.
  "packages/scope/src/applications/projection.ts": "c2a55ac89621321a2802cbfd65a431b319ca85ad962a78f16187dbf2353205e2",
  "packages/scope/src/destination-host.ts": "0a6d7b7ec08fb73ec6471b11fa2e6d444d0f4a98422bfd705b48e8f154c6b905", // Token refusal: a key that a compromised notice named takes no read token. CF-1 changes it; actual maintained parser output.
  "packages/scope/src/publication-policy.ts": "1ed9e0c923205b108ea161f52581a2a67ec9d20f65e1a650b6f25c8f8d82df02", // R16 bounded host publication policy; no Native evidence or pin change. CF-1 changes it; actual maintained parser output.
  "packages/scope/src/credential-store.ts": "cfe657393dedd0fafa09018742bee31a5dfa3837c857186f115cfb096f7d3523", // R13 private reservation and custody owner; actual maintained parser output.
  "packages/scope/src/read-token-quota.ts": "54020db49341f3b775c68f3b491db015d2e9f77f9ecb9d3c06f5d46e781d9065", // R13 private reservation and custody owner; actual maintained parser output.
  "packages/scope/src/workspace-host.ts": "2d2040debfd2c51cbe69bf41023b7c26068c68ee9d8b743140fc88e56c35dc7c", // Reviewed SQL custody, setup revocation and full refs for recorded branch names.
  "packages/scope/src/workspace-lineage.ts": "1813da1335de71432b6af8bf8d41f4a77478ed0fb212cdc68a863e99cc617c5f", // Reviewed bounded authenticated Register, Directory and Destination creation lineage.
  "packages/scope/src/native-birth.ts": "f8b131dd7da72f215e59aa80365706c78bee4e564a4a573a3c080c72326c5d7e", // Reviewed bounded genesis decoding and exact indexed scope and kind discovery.
  "packages/mcp/src/oauth-resource.ts": "895d3a1b241e5fe0d5228febff46fe6c921899110fef99056dd1b53199d341ae", // O1 resource discovery and grant transport boundary.
  "packages/mcp/src/oauth-access.ts": "96679465b97286aa2babe6e3b670bf51b202427300cea836e9be9da744884b78", // O1 resource discovery and grant transport boundary.
  "packages/mcp/src/oauth-http.ts": "6a2668b96a105b077cd07528897b0ed6f6d7aec8cec619a26a535bcb5adb6707", // O1 resource discovery and grant transport boundary.
  "packages/mcp/src/index.ts": "4b7c10621b87ff3d8ca88e046e9d8e15fd52affd8e0479460c24c39ccf434b8a", // O1 resource discovery and grant transport boundary; NF-4 reader aliases from the client.
  "packages/mcp/src/hosted.ts": "93456b882e0459bd50585d881edff8bd8cae29492d915bb1739e1a44f9381d84",
  "packages/mcp/src/hosted-retirement.ts": "3c6f4653e80ea848d5eb45e66e8dd943e7f0088c8f5a3d922d94fd29b6d7967c", // R15 caller-envelope and verified enrollment target owner.
  "packages/mcp/src/views/remote-origins.ts": "81c7e7a044690df7c00a30691ddc5e0da11531fabad2a9143d2d389ff8c0a1b1", // Exact remote presentation URL policy; no authority selection.
  "packages/mcp/src/hosted-tools.ts": "bea3d3cea128bd76102e36d0876992c1b77a5bf2263f376082c1f329d2035a60", // Reviewed R5 admission owner; actual maintained parser output.
  "packages/mcp/src/service.ts": namedOwners["packages/mcp/src/service.ts"],
  "packages/mcp/src/catalogue.ts": "0ee898b27949f5450f991f70e0fe1fc9f0820e6fb45aa97afe1a04a593a98d24", // Reviewed R5 admission owner; NF-4 imports declarationDigest from the client install module.
  "packages/mcp/src/input-schema.ts": "592587b6ecfaff69854b3bc9d9945f35876a833d53da93127b37a5ab7ea2b647", // Moved MCP schema derivation; actual maintained parser output.
  "packages/mcp/src/act-result.ts": "1af469f7a77c6bebc58dc2e19b69c93aeab0ddcbaed18acaf6d577887990b904", // Moved MCP answer projection and act output schema; actual maintained parser output.
  "packages/mcp/src/describe.ts": "a1708220ef2656a34c466037223cf0ab31133bc442919d92d04fe8a37ebada92", // Moved bounded MCP tool description; actual maintained parser output.
  "packages/mcp/src/inventory.ts": "9f5492ea706ef49c4555f81c83de78319916630075036ef574b7a067a4518c9c", // Reviewed parallel authority reads and target-only discovery; standing still reads fresh; NF-4 reader import.
  "packages/mcp/src/http.ts": "773765a2edab34cfd675038a9bf5bbd51ef671379a0ce379d48725ea1b61b3b9", // Reviewed Mcp-Name binding for prompts/get.
  "packages/client/src/application-trust.ts": "137391c8b1ed6f59f66e9368012c1355ed77325fdb16f67b73296be1ccc856b3", // Reviewed R10 trust-before-fetch owner; actual maintained parser output.
  "packages/client/src/application-install.ts": "f6c69d8f3abb87eaaecdaf25360deaaca98eec3ca6cb57a5912d72121cb1000c", // Reviewed R10 trust-before-fetch owner; actual maintained parser output. CF-1 changes it; actual maintained parser output.
  "packages/scope/src/applications/resolve.ts": "6338c9357780846b115999454239b68f34c5d6be3c090ca3f18b8f6e8771d0e2", // Reviewed R10 trust-before-fetch owner; actual maintained parser output.
  "examples/grow/simulator-worker.ts": "9f1c5f0a8fd16fd2200e5b4aecc5ebbe874bfd6497476e19e120c3a0dfd834d0",
  "examples/grow/simulator-host.ts": "25147890d54ef509cbea2996d81f4a8ea6d37d5309be90bf47e9a76acd381541"
};
// Integrated archive owners computed by the maintained owning parser.
// Root adopted the reviewed outputs; the historical map name is retained here.
const pendingArchiveSeals = {
  "packages/scope/src/archive-outcome-values.ts": "d142fa0fb776d6558a5c1101bab05105fe904e1cf4c71fc883fc8a5c5425bd67", // Certified rules evidence projection; actual maintained parser output.
  "packages/scope/src/archive-restart.ts": "bb8ff18338ffc3f2a53389d25c8eda77010a9dac9c7ef2dc63c5df171f7ed98b", // Deployment directive parser; actual maintained output.
  "packages/scope/src/archive-operator.ts": "28890e3e30348c9f84a5e59b8a1d4e19584e0389dfa2623e7b2fc5c3cb9e963a", // Private observation owner; actual maintained parser output.
  // Publication and floor owners were reviewed before these values were
  // computed by the maintained parser on the integrated source.
  "packages/scope/src/archive-target.ts": "0b96dfe16e0d051a9978e1324505206e6dcea9019985f2ee3dd787e712285469", // Read ceilings settle only after bounded replies; authority checks unchanged.
  "packages/scope/src/archive-source-window.ts": "300e4a3f51f23b93a2ce026b98993700e3c0b8947d35b68de195adc5c522ae45",
  "packages/scope/src/archive-publication.ts": "6c13c9f864b559e26d75982eca85c058975a12f18ad00b660c227577aae76d9b",
  "packages/scope/src/archive-build.ts": "bf1c79debbe0141140174c9a3d79f63d1952b874bce1d8713207dea8c817b8a0", // Actual pin SQL payload settles; final identity fence unchanged.
  "packages/scope/src/archive-driver.ts": "a8115888e3f21a5529173c3fddcb9c3317035881dcc7ca6c13c7c532136c6a5b", // Pin read settlement and bounded scalar observation; authority/retry checks unchanged.
  "packages/scope/src/archive-row.ts": "5def61284f023e083eb03a7c605b5c2008e2460384d1c1669e48d7d435b77c71", // Paid prior-capacity scalar reviewed; actual maintained parser output.
  "packages/scope/src/floor-writer.ts": "fb8fd859844b8d10ba43b477bcaf07ab32fe1bfa1b6684ad9ae70b930d328a11",
  "packages/scope/src/object.ts": namedOwners["packages/scope/src/object.ts"],
  "packages/scope/src/object-archive.ts": namedOwners["packages/scope/src/object-archive.ts"],
  "apps/room/worker.grow.ts": "59069aaa3e846f59f18375de9172d35e09fef8588b73611ad7f87d69797fada3",
  "apps/room/archive-policy.ts": "d22a58a9531989db6c9c5ab388af23795cf0e0ef4d1d839b88b082cc88f66d21",
  "apps/room/archive.ts": "f48d094c318ffdd1012f5917ba7997477285e165555d05cacf18a8fd388e2d8f", // Valid source proof settles; source policy and identity checks unchanged.
  "packages/scope/src/archive-host-item.ts": "b5e7e65542613603b5ace32572067d6449f0101bf569f697889ffb82c4299b28",
  "packages/scope/src/archive-host.ts": "ad759aff6f090fab3401d2f75274af294269f7db488ae2d5c56954759cdf754a", // Migration collectors settle only checked POST byte receipts; decoder fees and authority fences unchanged.
  "packages/scope/src/artifacts-host.ts": "17169f775db94ec5544115119385ab979854b43679185f4360b07311e1a8a516", // Reviewed durable fork setup custody; the journal owns its later revocation.
  "packages/scope/src/artifacts-wiring.ts": "addcb51aef7f62f98b9ddabe3a40ebb9f552df2d6d41f192eadd840dd0a4d76d",
};
// Actual maintained parser outputs adopted by root; never infer hashes from intent.
const pendingR8Seals = {
  "packages/cli/src/commands.ts": namedOwners["packages/cli/src/commands.ts"],
  "packages/cli/src/command-context.ts": namedOwners["packages/cli/src/command-context.ts"],
  "packages/cli/src/command-targets.ts": namedOwners["packages/cli/src/command-targets.ts"],
  "packages/cli/src/command-install.ts": namedOwners["packages/cli/src/command-install.ts"],
  "packages/cli/src/command-membership.ts": namedOwners["packages/cli/src/command-membership.ts"],
  "packages/cli/src/command-scope.ts": namedOwners["packages/cli/src/command-scope.ts"],
  "packages/cli/src/command-verify.ts": namedOwners["packages/cli/src/command-verify.ts"],
  "packages/cli/src/command-repository.ts": namedOwners["packages/cli/src/command-repository.ts"],
  "packages/cli/src/command-change.ts": namedOwners["packages/cli/src/command-change.ts"],
  "packages/cli/src/command-issues.ts": namedOwners["packages/cli/src/command-issues.ts"],
  "packages/cli/src/browser-helpers.ts": "0b3ff6a2b25e714cb86cdc12854f77b71a3c90215e1c7bb652a380a38eb9c194", // Shared declaration line and expected forwards; actual maintained parser output.
  "packages/client/src/describe.ts": "5fd433d592d3849baa7d88d1d831d23be4df073000a803931bf8dd44065bae5f", // Moved portable full/compact declaration and schema derivations; actual maintained parser output.
  "packages/client/src/mark-descriptions.ts": "7e22b5140e2a808e091b02d80acaa439f3d57d8c323a2480bfb994db9c063664", // Moved platform mark descriptions, own-property fallbacks and refusal names; actual maintained parser output.
  "packages/mcp/src/description-context.ts": "ef86ba4f8fc9e67f792d10510b9e9c20132b80c3d8915774fede7de714c4be17", // Private native-to-plain catalogue binding; NF-4 moved it to the client install module.
  "packages/client/src/expected.ts": "914ab6dab7f00e3f6523975f3be131911d07b190043352d465d338ad64e6a851", // Moved prototype-safe expected/via subject resolution; actual maintained parser output.
  "packages/cli/src/claim.ts": "e5799b13266b9bb8efdd1f765916213b91379385218b371cde8ab3efcd8bb3c8", // Remove the retired v1 offer field; current founding, routes and Native authority stay fixed.
  "packages/cli/src/command-support.ts": "d583fdc077383d497a92b4ec452dc4c316da1b6b665a73c917d2c5cd3407af1c", // Moved shared read, session and signing support; actual maintained parser output.
  "packages/cli/src/read-session-cache.ts": "12a5cf131a166001f66672bc3c4b6daf70070645255c61db7b93f18b6fbb83b7", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/verification.ts": "4875139168f453ff917ff565deefccc60b377ab529b42a236c6025bc7bf429d9", // Reviewed unique-entry ledger, source conflicts and owner retirement; actual maintained output.
  "packages/cli/src/files.ts": "692ad5257d940da6eefe571283600befb1db3323510d2ab2065654dcc2e780e7", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/store.ts": "e710dc929252a3f413fb889344fc4fdad1bc2bc3340b9fd4e91a57c4891295a5", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/line.ts": "d54491faa255f4a0aa96af07b8a972f090b5e486c14afaf760ad39582d85beaf", // Reviewed CLI session or verification boundary; actual maintained parser output; dap issue wait signs no act. CF-1 changes it.
  "packages/cli/src/invitations.ts": "45d96db128f59bbb5a5319120371aafa0e234fb9dc1baa213ba3f92a5811a4e0", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/scope-index-applications-command.ts": "5af0f495fb9af7ba04b64deda0019e39649c81971196c3999ab60d1d75a26571", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/scope-index-manifest.ts": "4bd67e5543b060c24e235a15f03983ad590ee77fc94a8a96627e2ad1adcd0155", // Preserve trusted session refusal outcomes; actual maintained parser output.
  "packages/cli/src/status-report.ts": "6167375d4e69a8be6614b9445f2d2d5262d0b2ea59145628de9f183e94a60d5d", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/client/src/session.ts": "0199b1f70200d0d5a6d724a7caa413c360f99bd95317a38a8db717aeee200a9a", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "apps/sandbox/worker.ts": "758b28ea299eddad07022a913d4b94d632814aa51f2868810300a582ee833f51", // Inject the reply window; retain the existing Native lifetime close on an observed HTTP disconnect.
  "packages/client/src/application-gateway.ts": "daa1d28c02085bd6be7a9698a7120cd106cc7233aad92565aaa05e67427878ef",
  "packages/client/src/application-route.ts": "62660d1d37d6d75f350d338a3efbb69c37ebcf8fd9d6dd2a27e21472e2d9c23b",
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
  const forward = 'export { mcpRoute, McpRegistry, McpAgent, type McpEnv } from "./worker-mcp.ts";';
  assert.equal(source.split(forward).length, 2);
  for (const replacement of ["", forward.replace("worker-mcp.ts", "other-mcp.ts"), forward.replace("McpAgent,", "McpAgent as OtherAgent,")]) {
    assert.throws(() => workerEntrypoints(source.replace(forward, replacement)), { code: "ERR_ASSERTION" });
  }
  const hosted = sourceOf("packages/scope/src/worker-mcp.ts");
  for (const extra of [
    hosted + "\nexport class UnexpectedHostedEntry extends WorkerEntrypoint {}\n",
    hosted.replace("McpAgent<E extends McpEnv = McpEnv> extends DurableObject", "McpAgent<E extends McpEnv = McpEnv> extends WorkerEntrypoint"),
  ]) assert.throws(() => workerEntrypoints(source, extra), { code: "ERR_ASSERTION" });
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
    ["packages/cli/src/command-scope.ts", "entryLine", '`genesis ${input.kind}`', '`genesis-kind ${input.kind}`'],
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
    replaceOnce(source, 'from "./public-origin.ts"', 'from "./other-public-origin.ts"'),
    replaceOnce(source, 'import { readPublicOrigin }', 'import { readPublicOrigin as changedReadPublicOrigin }'),
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
  const commands = "packages/cli/src/command-scope.ts";
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

test("the threat model names executable witnesses, and a renamed declaration left only in a comment is missing", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const document = sourceOf("docs/security/threat-model.md");
  const checked = checkSecurityWitnesses(root, { document });
  assert.equal(checked.invariants, 5);
  assert.ok(checked.witnesses >= checked.invariants);
  const witness = readSecurityWitnesses(document)[0];
  const source = sourceOf(witness.path);
  const quoted = JSON.stringify(witness.name);
  assert.equal(source.split(quoted).length, 2, "the source has one literal witness declaration");
  const renamed = source.replace(quoted, JSON.stringify(witness.name + " renamed"))
    + `\n// test(${quoted}, () => {});\n`;
  assert.throws(() => checkSecurityWitnesses(root, { document, overrides: new Map([[witness.path, renamed]]) }),
    /Missing or ambiguous security witness/);
});
