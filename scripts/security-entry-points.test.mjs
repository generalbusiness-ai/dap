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
    "packages/scope/src/object.ts:$module": "f927397e3c4a57d6c026b3e603d1e21a8198b543a1b8e32fa57d2260f9dd7194",
    "packages/scope/src/object.ts:ScopeObject": "519d4bbbe3a24cfbbbcea10ab7d2e12a9a40f6ae1fea0012cfe89525aae7c303"
  },
  "packages/scope/src/object-archive.ts": {
    "packages/scope/src/object-archive.ts:$module": "7d7c0da57c8b69bc953c19a59e3bd6af25a5f02863bac10ef6fd839fc9dd5adc",
    "packages/scope/src/object-archive.ts:configuredArchive": "f87b94060681ad7de5afa06eff80baf1f67bbc803cb1f5f41185b5bf35a3e11c",
    "packages/scope/src/object-archive.ts:archiveDriver": "d7d94f8700e5c3fc868896b85272d2ca555dfaef9b7a5f7abab38d86be0fdf67",
    "packages/scope/src/object-archive.ts:floorOffer": "d090ac7253f79e303cf89e44935def408bf83778706cfc50a169a01806bb0805"
  },
  "packages/scope/src/worker.ts": {
    "packages/scope/src/worker.ts:$module": "cb9087e87840a9de25e56a2460799f87145a6814157713f3b67751ff0192d664",
    "packages/scope/src/worker.ts:ScopeIndex": "b958e6997f55b05833f7075643065a54760b34fe6ede7f6051ec2354ad3b6c81",
    "packages/scope/src/worker.ts:MISSING": "e8958a6cf8d4cd2f412b30c76b38aca2f4523bc2b9df96606ac01059b6d4fb42",
    "packages/scope/src/worker.ts:api": "87713d2ffe8f050d1974d8de340a9ffaa732ef4bcee440a1ef51c605f05be8b3",
    "packages/scope/src/worker.ts:scopedApi": "589e93aaf890c448dd328ed5615463ca54440231a54937938cd73235acf7cd0c",
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
    "packages/scope/src/worker.ts:route": "97d61bda3cbfe7b427c932d6839a46e73cb5b9b6e75e575bf798329ebdc210ad",
    "packages/scope/src/worker.ts:routedRequest": "0f31c1f1c059802b01cfd801e4958789c123bc602cdcdb49a0194ec4cea9f77a",
    "packages/scope/src/worker.ts:outsideOf": "0853140503300b3a8a9a5e26ac61973e0db4dac32f2a414d48ff0d87c58efda2",
    "packages/scope/src/worker.ts:sessionWiring": "cb8f4d0e2b06854a3fbf080e5b4ce72e4182060b60f27cc7fb7f5ed6ac8779c5",
    "packages/scope/src/worker.ts:snapshotReaderOf": "dac91fd4e800bdcd1a9f7e47bd077b6efd0acd4eb3c70bf63122a12bdb7446b5",
    "packages/scope/src/worker.ts:DeployedScope": "660756384c04ec84a02cd513cf7bc8e00a2542b596bf16a846afcc25bf04020d",
    "packages/scope/src/worker.ts:ApplicationStreamLifetime": "4c82d6b5ea8ae68089f2f80321e3361b6176c9725d0b46481b6f32b6d2093ba3",
    "packages/scope/src/worker.ts:ApplicationScreenService": "c21c6c69f6b8f28aa64abfd9ca8e11a94a104f560d6430018f8ff9a68d52e5b8"
  },
  "packages/scope/src/worker-mcp.ts": {
    "packages/scope/src/worker-mcp.ts:$module": "ce4f069fd674de88949d3f07b4359c21dfea1f7469412d001af973f1a9f59e2f",
    "packages/scope/src/worker-mcp.ts:mcpRoute": "0a3bd1e1d904a6502a52c889b52be7387268ae7d93a54e2b75879dd9854db08f",
    "packages/scope/src/worker-mcp.ts:boundedBytes": "6553fab5e2b9129266d64c02f7c3c9317095f1888fd12a10d12490d9f5d90f40",
    "packages/scope/src/worker-mcp.ts:observeThrough": "7e507f9bd9233223446711d089eb6d6b4236b69642eb9d39260e4712d81dab7a",
    "packages/scope/src/worker-mcp.ts:roleStandingThrough": "669398e6a2afe677dafebc39acb3c4bbf330824b013ea217ad949eb05a3110ed",
    "packages/scope/src/worker-mcp.ts:sqlOf": "5631baea8c5029d6ba93da6b3d199e63897c5f5ac05ae61e16b8d6f3e337f7fb",
    "packages/scope/src/worker-mcp.ts:McpRegistry": "50751525177639a7a0ca5bde758c9ced544cd0587c75e8a5afd3de35f7acc870",
    "packages/scope/src/worker-mcp.ts:McpAgent": "2e25a7729f084928fc5b88343fbdfcb5d0c90fab8e4ea878076be9118b52d2ea"
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
    "packages/cli/src/command-install.ts:$module": "4d1709bca5b4415e8fcf8c08d1b4e6fa25d0442ebb139d20e39a919bac47dd1a",
    "packages/cli/src/command-install.ts:NEW_REGISTER": "f828e83eeb39a37566e323156efb63274fc43b1d6b9e95b38fbf0cdbba327fbf",
    "packages/cli/src/command-install.ts:INSTALL_COHORTS": "2fa587b0df6d9e471ce031fd5d3d1f7553d5673650ae2f271281ae6e774c4d69",
    "packages/cli/src/command-install.ts:CREATION_INSTALL_COHORTS": "0d7ce5d3e9756752ead7d5e4f644f07c29c1d955baee86ccbaf256973dc9ab9d",
    "packages/cli/src/command-install.ts:selectedRegister": "0b4142d8bac4adda31b5069dd28803215169f33e4c16b1e1d73ff182c70cceac",
    "packages/cli/src/command-install.ts:planSent": "9419fa14ca00c84bfbc468192900fd822717cb76e1ba8e178d616c009ae054a6",
    "packages/cli/src/command-install.ts:installSelection": "7a81a68cc8931bd45374d3996a73f728eb6bceaf88ed66d00500bf586ae536c5",
    "packages/cli/src/command-install.ts:selectedPlan": "d7365c8ecdaf43a83329a680e7073716936bea43f1f53e9e52cdbff91c6d083a",
    "packages/cli/src/command-install.ts:install": "0459a25a99cd5e54f3022e4074e722ca3823120075dcf3c6cea420889dd2ea7d",
    "packages/cli/src/command-install.ts:installing": "848bc5a890238b9ee8e382ed5a958844ee8cd409e6e09236ff8c4fa3a10b72bd",
    "packages/cli/src/command-install.ts:registerIdOf": "5db562b18c0929cea45b8322e913408ed5326b3b865aece7b884c284f137102d",
    "packages/cli/src/command-install.ts:knownPlatform": "7b5bdce0c14e94a85bce0329ddaef5b6a5ba276b1c5ef4393155b1468aafa8a8",
    "packages/cli/src/command-install.ts:installAttemptOf": "9a7a6449aee1060b49444f9bef0e3fe271e5279d29ddec38caa9fd6b3a1d95a2",
    "packages/cli/src/command-install.ts:readBackCohortConfig": "440e708afd45bf7ca11a22d1c913ccd642a4aa58d7ac7d92b6d1da753dec980b",
    "packages/cli/src/command-install.ts:saveCohortConfig": "1414316c62c3977bc1e64131e636a7821ed3dbe7389abc50d557ea7764d6bf44",
    "packages/cli/src/command-install.ts:retainedCohortPlan": "b632965f5f5ab892a8da03a6f1adbf94b9a059fcae1d7eff431a076f461f1c38",
    "packages/cli/src/command-install.ts:cohortPlan": "c143bd7773ca8744fef5f35c9bb1c53af4aadab2b42d5805123c85a0046619e9",
    "packages/cli/src/command-install.ts:plannedLines": "df7c3d59e0ea56d6a03a14c93367f8233354e841005fd9fbc8a332f6d21fdfd2",
    "packages/cli/src/command-install.ts:planInstall": "614a251f08f95bdc42191d2c54fff570341aa10d76ba598d7d1c91e77cff55c2",
    "packages/cli/src/command-install.ts:installPlanned": "746f81f7078018a4bdd15e21606c3ed37eff93b4be159129e41a774bcf8a46db",
    "packages/cli/src/command-install.ts:executePlannedInstall": "2d3ba2a6ced07d65136848b2c3621751fce05f666de2f378fe65a699cea9132f"
  },
  "packages/cli/src/command-membership.ts": {
    "packages/cli/src/command-membership.ts:$module": "02ddb501239e0af446ce07a4b88ad6098a4700ff1a75db1765da9f185ba01c32",
    "packages/cli/src/command-membership.ts:joinSent": "b8a644d194680aeaccda9873f7eb9ee6f9e71110cdefe87b0af35d5ce946d692",
    "packages/cli/src/command-membership.ts:invite": "0f89f53e82d14214cc46d83bb6df8e11516e328c5b54eacced4dcc67ae1c2d5b",
    "packages/cli/src/command-membership.ts:inviteDevice": "58940c0af841e2c88452ef724a83725ccbe75a65dfce3dd1ed5c828f3a0b26c6",
    "packages/cli/src/command-membership.ts:join": "010369bee04feb57bc5200e220cd623b6a81fd9a8e2c8ca866656e78c7d3ae11"
  },
  "packages/cli/src/command-scope.ts": {
    "packages/cli/src/command-scope.ts:$module": "45a4a2e30983d81ce76aa0ef0cc1dab3a07833fb7ed8c99376deba4613fcef95",
    "packages/cli/src/command-scope.ts:scopeIndexAccess": "b54a6859075907491f4c19313b149572acd5b3bd94c492d61fb342601759c299",
    "packages/cli/src/command-scope.ts:standing": "57372328838e0f9bcb936554f41738f9445ed53384112aae1cdad745a4dc1fce",
    "packages/cli/src/command-scope.ts:acts": "f4577a1dbe4bb307bf92057f101967b5fd2f9a11240342f4f3377e177a81fd53",
    "packages/cli/src/command-scope.ts:act": "d6e5b20c300da48234cb5c1471aafe9544e17d87e06dace4f4082d5965c42397",
    "packages/cli/src/command-scope.ts:apps": "02729fd520eb4ed349fad0e776f974929a3663d442a0588e9b95ee104ed9ed8c",
    "packages/cli/src/command-scope.ts:items": "035ef813ce6aea0c10a2215c856e5e8c30fed9e0db64dcd24eb43e98ee713baa",
    "packages/cli/src/command-scope.ts:entryLine": "61bf6dce3240a56b1a4d0286b713cb5cfce96d1f933c03b89182e71ff8cf7846",
    "packages/cli/src/command-scope.ts:log": "3ef9c27f7f2f22e7f2531f7e4d0cc859af988009fb92e3e79b13261a45943aeb",
    "packages/cli/src/command-scope.ts:show": "e5008fae01934cb48b95ed52c0f9108c9f2f8799ef8072e61b80f1abe2823fc9",
    "packages/cli/src/command-scope.ts:status": "f77f1396b4bed9f01c159ca07c991ef52da9cd9a50ea4e1aae3f5765d50504b4"
  },
  "packages/cli/src/command-verify.ts": {
    "packages/cli/src/command-verify.ts:$module": "ebda9dc52241266d12fb734e8ba19f64e875e2cca5ccbaf45b541e4d70555be7",
    "packages/cli/src/command-verify.ts:sessionDeniedDependency": "72ee1a12a97166f54168dc35ab2bbb59a0c51f172d1a3c7dbf7d4ef3f1d187b7",
    "packages/cli/src/command-verify.ts:replaySource": "e2b4cc945442035616ec92e9ab07f44170a5f3014f3444feb49582e46d831064",
    "packages/cli/src/command-verify.ts:otherRoomsOf": "7c301eee78006007a2f2a6cdfdfbfb73f7224782dd9b8fe3173303a1eec4ead7",
    "packages/cli/src/command-verify.ts:replayOf": "e4f3f261612d3e755c94a4a19d8d54920d4f938c9e30cee8caafd59f12c3fdac",
    "packages/cli/src/command-verify.ts:verificationContext": "bc38c07b7cbcbaa2118086aaf05068fc05d2cd90b1994edc81968e48788c41b6",
    "packages/cli/src/command-verify.ts:verifyScopeCommand": "4dd727df2ca467fbf11c1d3bd3219dc74ed2a0a12bdd1045f9e8879d0508b598",
    "packages/cli/src/command-verify.ts:roomScopes": "c128a0c451a22e0cee69335e6ca7d72a0417bfd0699bf5d22bb051edcc6b3fda",
    "packages/cli/src/command-verify.ts:sharedProofLines": "e549a716ca1e5e2dce6deae3196eab99740493badc0e025f941292aa175ffb33",
    "packages/cli/src/command-verify.ts:verifyAll": "abed4baea2213f8387369e5699bc114055b1a2ead05fa2f619a203240258065f"
  },
  "packages/cli/src/command-repository.ts": {
    "packages/cli/src/command-repository.ts:$module": "f1bd9853416b1a5e966ccb641769880b6ac43e6a62512261a38d604b995e45f6",
    "packages/cli/src/command-repository.ts:OWN_HOST": "d8049ba56c1494f7f9ab575b4ccdbe4ea8192229bb9d2a280bbb4528e1c5784a",
    "packages/cli/src/command-repository.ts:remoteOf": "57afba6cdd6f9169d7366eb5641f61a52a420f55ba723bff6922bfc6332496a9",
    "packages/cli/src/command-repository.ts:remoteLine": "1eb8d789b8f70e63d8b28176c5b5f923eeae5065c26a17487274295b2803d354",
    "packages/cli/src/command-repository.ts:destinationStateOf": "941a3b984ed85ee15d6dc971028979d33a4a938b1503439e5fa205a04c4a5c84",
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
    "packages/mcp/src/service.ts:$module": "d1cd323e3e00f2ebcfec11b77a705887aa51b8edb3432ab36ef4608a53542e33", // Reviewed exact-read context; fresh authority, target, custody and signing admission remain.
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
    "packages/mcp/src/service.ts:stopCall": "f8d89a63e2e2336d69c4fe331483fc42f64ad5c183df574ae74e0f774223a007",
    "packages/mcp/src/service.ts:VIEW_DIFF_POLLS": "49f2a59ec14b31da35f8ef7c9715c2de7a158ec849702c175f51ef42dee7e7cc",
    "packages/mcp/src/service.ts:COMMIT_ID": "5d97f59cc4546e45416555cffd622add0da00d115a8b8f31ca2c3946ed311f7d",
    "packages/mcp/src/service.ts:DIFF_OUTPUT": "9333d83a48a94f5eb2cc23c2165fba345ef47e57f58a7dd26090082bed58e296",
    "packages/mcp/src/service.ts:READ": "c46ffafd29a0b32d79613c7d6b784a9d6cab99b90c99b98fe9246a8b6b6682eb",
    "packages/mcp/src/service.ts:WRITE": "5920731b91c504f8bfb945b3edbe132bea0167ec1c9a44579e3dd658e5e9cd91",
    "packages/mcp/src/service.ts:scopeArg": "36e8957cdbc823f8e1bf9ab903a7a353df3b10d1292ed7d378362aabc41f6ef4",
    "packages/mcp/src/service.ts:scopeRefArg": "b1d77904c4c34f4e134b6732b42ea8612d4c8f30da9f6cd1bfa7fd874674bb2d",
    "packages/mcp/src/service.ts:memberRefArg": "80b4a7634bee92e5b6d8b03dea6102cbf701fcab94198e54de219783961ee281",
    "packages/mcp/src/service.ts:keyArg": "368a6f3d59380df455b92a9478dc8c993a5535b2d40e9046a4e71df139cc5149",
    "packages/mcp/src/service.ts:McpService": "aa4fddb5cb0af77bcd49299e5678cd73eef74bad02b7f42bdd79c89d5100776d", // Reviewed exact-read context; fresh authority, target, custody and signing admission remain.
    "packages/mcp/src/service.ts:commitIdFault": "36b75703f0eb36b5abca60906629f23df18a233d26c395f0b61c792eddabe405",
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
    "packages/scope/src/core.ts:Scope": "09f30cd084ded0a13e764f488984d9a6b88679ac5a725877266aabb32f56d23b", // Native initialization reads held hash metadata directly; a genesis fold builds its first rows.
  }
};

// Reviewed matcher/gate owners. These are change tripwires, not runtime proof.
const seals = {
  "packages/derive/src/validate/index.ts": "d6b90a6b4e6e8319cb0a73e50d2864751cab6fb1974bc578d5937d9ee99f1efa", // F canonical identity/retained-origin boundary; actual maintained parser output.
  "packages/derive/src/validate/spelling.ts": "1c53e1ec4503e15be23d409b4862162a52f24f9e7e504a96922db90845a31a11", // F canonical identity/retained-origin boundary; actual maintained parser output.
  "packages/platform/src/evidence-incident-origin-v17.ts": "bbafa17fca7c592f03c2109301ec2cc7bcf100ef469dec8eb96efd11bb68dc93", // F canonical identity/retained-origin boundary; actual maintained parser output.
  "packages/contract/src/catalog-vocabulary.ts": "87e8a51c86fa079adde3f08f0be6dadfd17c731d1b3ee7f9d94e6fe1a8e6592c", // BR13 exact native question/relation owner; actual maintained parser output.
  "packages/platform/src/version-questions.ts": "eefb44287cc13e9dbd11702efc7c6fd5af121bec6802bc361f35bd34efa7aded", // BR13 exact native question/relation owner; actual maintained parser output.
  "packages/platform/src/version-relations.ts": "245685492d713c42be17181a62cf9436dbe12eeffa902741c31c19640de67416", // BR13 exact native question/relation owner; actual maintained parser output.
  "packages/scope/src/http-stream.ts": "ac798ac542c6295bda6495ef9c3f46f2c78511bfb89b88ee4b2d4df7711e2168", // Retain the exact existing close capability on observed HTTP disconnect.
  "packages/bytes/src/session.ts": "71a16d6d2d02b2f424e711a80ca28fe8e10204d3daacc4d0cf23f85ebe80903e", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/mcp/src/oauth-parameters.ts": "b48c22470c29dfa7c11260fc874128859650791294ec93d8ae0007bdca95534c", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/mcp/src/oauth-clients.ts": "6a9a783055313436b3d4746df9cbf38817dc4cb03477fab607980eb98a60f55a", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/mcp/src/oauth-issuer.ts": "abfa05c1826d3d856a3e7bc2be7d265370e70171f6e7ee84cfc4dbd96379e32b", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/scope/src/oauth-routes.ts": "2696e4f28843ff2dc63a34a76f9cddc09eb5d61c81f4faafa611f1137b425548", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "apps/room/page/oauth-route.ts": "859183c042ec2708d4d357ec49fffe0aae4fb9f4c44ea3cff734e9b2c33cbf1e", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "apps/room/page/src/oauth-context.ts": "15e8f1a89a49d4e403801efa2f9caefd83d6c3327ac897bb3b0475d4dbc37ff3", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "apps/room/page/src/oauth-custody.ts": "cedf10f00ac0135438b5cfba43056a2b78f86760f1ea9d528f7a81e78e3693dd", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "apps/room/page/src/oauth-main.ts": "8a110a1da61e83ef46ec007c0544cdf6b2619bfc25eec8159cc9119b1dc48efd", // O3 OAuth authority, public-client policy or retained browser consent owner.
  "packages/platform/src/own-agent-membership.ts": "4155cefc45d92b7396511b6a7173b438b45ff203593ca328aa9d9f322f24804c", // O2 own-agent guard and exact opt-in cohort owner.
  "packages/platform/src/own-agent-cohort.ts": "5de494854f15f912b1ea19cbd556e3cb1d328050170aa497721918c70941ddc8", // O2 own-agent guard and exact opt-in cohort owner.
  "packages/platform/src/own-agent-cohort-data.ts": "5e018d8d4fa152ed3c827c64cbbf0587f5a7a2358b02e3e2cf90aec933fac502", // O2 own-agent guard and exact opt-in cohort owner.
  "packages/bytes/src/read-minimum.ts": "5ead3e9579b2805c525bae5d1ad3bd6883c0a18f0022a202c01eea91a181939c", // DX-A2 reviewed minimum admission and wait owner; actual maintained AST value.
  "packages/scope/src/read-wait.ts": "0bf31ae0c52975c9e91b22dfac278c03ab04c575b88941c3a6480433fd79e2cb", // DX-A2 reviewed minimum admission and wait owner; actual maintained AST value.
  "packages/scope/src/authority.ts": "b396cf4e526f30a1e5b4b4437d0fd0006a032cd4a3da9c1c8bf275e269ee5c74", // Token refusal: the commit of read-token asks whether a compromised notice named the key; maintained whole-AST value.
  "packages/scope/src/observation-cache.ts": "d43f96c5f634d188e1c989d39b75669c89fdf8a062ab2450b0f9b6621b227186", // Bounded reusable observation payload and FIFO owner; actual maintained parser output.
  "packages/scope/src/turn.ts": "480fd9b6ace0b1704ca5900469a3b9dfb8bbb6148068dde3553a42f725747a2b", // R3 alarm-only timed drain; actual maintained parser output.
  "packages/platform/src/reservation-v17.ts": "e00aa0f08f9b3b1f4aca5e794436367ab550dcd1966c5258f1e96e42ab97a856", // Reviewed retained-policy decoder; actual maintained parser output.
  "packages/platform/src/evidence.ts": "e3f0fa91c32d848b5bec7dc9ac047d4cc72815ddce70365ad8fade6884a7354b", // Reviewed platform binding codec under ruling 1bc4f7fd; actual maintained parser output.
  "packages/git/src/checkout-snapshot.ts": "82f53717d419b70fe208801b6d0bf2fc0c947ac2beffb27b2e2d01898f48ee25", // Detached object identity and closure bounds; imports do not seal this implementation.
  "packages/checkers/src/stage-origin.ts": "6311b4c69f7d00f5dac7cbdb51e22895efa379ce2c30f6e50a2d32d6aed1c3a6", // Actual Native admission and causal proof verifier.
  "packages/scope/src/stage-snapshot.ts": "1c4a9890a6e3ba4b3c536aba628947c197b4c054419dbe23a00374c5ccadad3a", // Signed stage read and current Rules, key and work-source gates.
  "packages/bytes/src/address.ts": "d6d2fc3f86f50318c6a88b21649daef212f40c4d46b942033d27b3853902ccd2", // Canonical local full-address and routable /64 counter keys; actual maintained output.
  "packages/bytes/src/index.ts": "7c8c95148c4af026aa1416b4f2d9ce8e53b33343a49bf27d1875a86e2d5c07b7", // Bind the shared address-key and citation parser exports to their reviewed owner.
  "apps/room/celld/worker.ts": "d1bc465525bd0af046fa0703464f14aeaaee8286b88415dfec3b9e03869fb644", // H1 reviewed production entry or public-origin gate owner.
  "packages/scope/src/public-origin.ts": "d6e867fc859db69b6fcf2d465d387a032966331cbae04310ea4c24cda3773269", // H1 reviewed production entry or public-origin gate owner.
  "packages/platform/src/versions.ts": "6b9b184d22fbffaa617049e1b6ec01bc64fd6039b068ac534d0adaf443868962", // Closed native publication protocol policy; actual maintained parser output.
  "apps/room/worker.ts": "aba04e12dc206f0be6bda4a8edeac64569e0edd44b7a87772595d7db40bb8b67",
  "apps/room/worker.commons.ts": "c525a1b0d13e6243099d03b80c5207b76f082c71432db2b8ecaf86ccf8cb1160", // Reviewed separate deployment entry; actual maintained parser output.
  "apps/room/fetch.ts": "83b2a56552c5f6874935d1491f487fd7d2b9e2651a9acceb87d731139897ad2c", // Forward the HTTP context to the existing scope route; dispatcher gates stay fixed.
  "apps/room/demo-creation.ts": "91d9ac8a8fa37e3c99c117be7d99dc2d9e370efeacd70f8f49a00a4062bcd67c",
  "packages/scope/src/demo-creation.ts": "15e2638cfdc116d58944b9bd6017fdab33b6b45545d66b54507b452b4a0a9c94", // Reviewed current demo projection or ordinary GitHub authority owner.
  "packages/scope/src/github-wiring.ts": "6bccc5a379825c66d77723394fe7b37c2cfdfc722953e6cebca13ff1befaf66d", // Reviewed current demo projection or ordinary GitHub authority owner.
  "apps/room/page/route.ts": "8eccc79a8a3e3cd8b33c38c65374db5d01583b5e9afd76384fc2133bae4cb475",
  "apps/room/brand/route.ts": "71b45ff9b41b3bea31c775a16525349591e0d4f7dfdc65da79f095816b1c343c",
  "packages/scope/src/worker.ts": namedOwners["packages/scope/src/worker.ts"],
  "packages/scope/src/worker-mcp.ts": namedOwners["packages/scope/src/worker-mcp.ts"],
  "packages/scope/src/scope-index.ts": "69c37e61623d85db20567a30079a495b4d9012063b38196726dad2a209170a8f", // Exact indexed scope and kind gate before internal native birth discovery.
  "packages/scope/src/host-wiring.ts": "1fd252906b38aeaea52fcd04fe3a533aed0335147e4de678d7c49b7744e39f93", // Installed-register authority retains exact Native birth and host binding.
  "packages/scope/src/installed-registers.ts": "39618d91dba4884b866f1823d5bc2ee89e7ca0b78b47b884387e7bfeba2dee5e", // Installed-register authority retains exact Native birth and host binding.
  "packages/scope/src/register-setting.ts": "1ead9e620589e3707e2a6515951cc095b44308a34aee6855b3bb8da37bd230ca", // Shared exact Register selector; actual maintained parser output.
  "packages/scope/src/scope-index-census.ts": "1892fba9c476330693d9b8071bd7b2653d2261bef7e9487fd95018d74aba2769", // Address/key admission precedes owner proof; exact census authority and page guards retained, without duplicate owner charge.
  "packages/scope/src/creation-admission.ts": "c0b2ff1d552b17b42710b9128a652c478e7c32ce96640c6c0d543f5748e2d4be", // Reviewed R1 ancestry owner; adopted AST value.
  "packages/scope/src/creation-lineage.ts": "05c6dfe2ee8f9389b51b38d578d6c83e77815b5de33ec46515f06a112bd2a8f4", // Reviewed whole-lineage boundary; adopted AST value.
  "packages/scope/src/creation-versions.ts": "872e383c736e3d77b3377dec67ca29855612f1bbf2e9a6754c4c58db72fce97d", // Reviewed R6 creation-policy parser; actual maintained output.
  "packages/scope/src/creation-declaration.ts": "dabb9a1b40504e5f88e051b938babd117c38c2095443e0645a45ca056703c3c5", // Bounded immutable native Directory custody, not authority.
  "packages/scope/src/namespace.ts": "e15f6bc3794c7578088df355a67a417e6f60bdebfc6b04f57c3e78a358b16f37", // Reviewed internal declaration RPC; adopted AST value.
  "packages/scope/src/health.ts": "1fc701231daac790f66cc4df748495d69bb9b171be2b5ea75d2eb28d819b49bd",
  "packages/scope/src/site/route.ts": "f4bbcdd1f53220ccce1337ec011e0c662f199f979513ca38ea891bda7add6ee8",
  "packages/scope/src/site/host.ts": "7c5352e51ef3ddd368f28f272f4f10917889fc44b5a4eee701168fe4aff7a814", // Private Site token custody; actual maintained parser output.
  "packages/scope/src/site/token-reuse.ts": "7df9e0eb8e1c5bbfc050f52729ffaed86f00ea6d56ed04ac1efdf9e6cbf51ab0", // Reviewed pre-mint generation cleanup rescheduling; custody checks unchanged.
  "packages/scope/src/site/window.ts": "1b0e1d820a7840063d35d39dc74d61a2b9caa6ffb5763e82a21b6ae5524d4936", // Bounded site-read window; actual maintained parser output.
  "packages/scope/src/applications/route.ts": "be263fc237b3c3c0f8e57b6f528880f83482f75b52cd9cf9c29f936feceb8bd4", // Actual union parser value adopted by root.
  "packages/scope/src/item-query-wire.ts": "8206b9a6531ca30cae1bc49cc249eea08c70a658305f41b3ebea6eda042055a8",
  "packages/scope/src/applications/projection-wire.ts": "289a66b25bf2dc63e0e7d4b0726c1eda067d21e9238bbf29737b4d8d89c1fa00",
  "packages/scope/src/object.ts": namedOwners["packages/scope/src/object.ts"],
  "packages/scope/src/object-archive.ts": namedOwners["packages/scope/src/object-archive.ts"],
  "packages/scope/src/core.ts": namedOwners["packages/scope/src/core.ts"],
  "packages/scope/src/applications/act-admission.ts": "adb58ae723ac29b37b5340df95cb0eda44bccd1f6895b64979d6aafdd02aef92", // Exact native provenance and current trust; actual maintained parser output.
  "packages/derive/src/genesis.ts": "15a4adb0e86d62a5be70249c176a2677717a0616119eedcb7b7427a5291fbc2c",
  "packages/derive/src/judge.ts": "7bafa496e7f0d647ffb84a7fa1131fe682335bb293b1ceeb7bee5c9b50693560",
  "packages/scope/src/sessions.ts": "bb65eb7c3670b2b145c8adda4432536f2165be5d6e37bbe04f95976f7b8c3c3b",
  "packages/scope/src/originals.ts": "c8a5185ad8a57a851ecbe77d87649b0bbfd45bf9c93e685d7dc3a35982ef72cc", // Reviewed J1 owner: the member compare, the signature and actor check, and the caps.
  "packages/client/src/originals.ts": "4b77af1b7f1d97f573f072efbe278cd3fa38ee4809b031d648fa57c5d5d17cf4", // Reviewed J1 owner: the bytes that a second device verifies before it sends them again.
  "packages/scope/src/reads.ts": "1fbb2ae6de2566c33c5dc6e19bd8ef7660a30cab6707a12c02508d650085a2cb",
  "packages/scope/src/signed-reads.ts": "3204207ea73dc48cdc40727bbde7f8b734675975fd78694a501b0116cf0abfe2", // Census wire name; its separate fixed-index predicate grants no ordinary scope read.
  "packages/scope/src/limits.ts": "dfab21444a03339291f51f500941dc1b0d23926fa01fb173e7cd7cc91983f099", // R12 verified-key join failure window.
  "packages/scope/src/serving-limits.ts": "94f6987027c7638ebe0aad6899f1dbf352a25029aceca60c00476b600e7d410b", // New bounded memory-only counter, no live eviction.
  "packages/scope/src/serving-admission.ts": "a9915cf54ff03406bd5b2da15fc4e611a066a0ccf06503c1f21e3f4cfac951e7", // New bounded original-signature/counter ingress.
  "packages/bytes/src/records.ts": "05bf74f714d8c40e54d6923ec49ed0c95e82bb97b1f82227983ec7b964a8d696", // R11 named serving refusal; actual maintained parser output.
  "packages/scope/src/session-preparation.ts": "73d24f725ed50623a90919c8560c3afba86fcea4c020beb67ed46dec87c06523",
  "packages/scope/src/item-queries.ts": "61ead9996d2c338a26331e04b8576c52425d8d2c88dc86173a7d79108c2ee418",
  "packages/scope/src/applications/projection-source.ts": "800626b52a793bc3ede355e90bc632176440032f51adccc5868dd46e95a1167f", // Closed native room metadata with optional supported membership pin.
  "packages/scope/src/applications/projection.ts": "8576f78bb68850421ca7843e6fd0e4ecfb18f136009b82296097feca603f5484",
  "packages/scope/src/destination-host.ts": "290e90f6432b23419878fd3574b438bd09bd1e2e9bbb691604fcb0bd827119ea", // Token refusal: a key that a compromised notice named takes no read token.
  "packages/scope/src/publication-policy.ts": "e2594477a0116afc4ca6615f8710390fbf116eedd6d82c90770bec6f19a3bcf9", // R16 bounded host publication policy; no Native evidence or pin change.
  "packages/scope/src/credential-store.ts": "e1dacade2330f66d0df7cc8fe0f34159760d144dbaffbec25e89451cf2c997e2", // R13 private reservation and custody owner; actual maintained parser output.
  "packages/scope/src/read-token-quota.ts": "5e2ad59fab743aae169c24743f5f3e80b114a8c7775b7eb0dfb668dc79ceef52", // R13 private reservation and custody owner; actual maintained parser output.
  "packages/scope/src/workspace-host.ts": "537ed96759a3889f59272b1a660a3cfd8ef8f46ec2aa15618c8b7c3568b57bfe", // Reviewed SQL custody, setup revocation and full refs for recorded branch names.
  "packages/scope/src/workspace-lineage.ts": "dbb0409a8ab6a8127d2734455cb3db867e46a96dfe0f2ccda0dcf998bd2aced9", // Reviewed bounded authenticated Register, Directory and Destination creation lineage.
  "packages/scope/src/native-birth.ts": "ab9ecd331850e5f183fafaee07145c64adadb3ad904ea95bcc4ddf569da6ad6f", // Reviewed bounded genesis decoding and exact indexed scope and kind discovery.
  "packages/mcp/src/oauth-resource.ts": "895d3a1b241e5fe0d5228febff46fe6c921899110fef99056dd1b53199d341ae", // O1 resource discovery and grant transport boundary.
  "packages/mcp/src/oauth-access.ts": "96679465b97286aa2babe6e3b670bf51b202427300cea836e9be9da744884b78", // O1 resource discovery and grant transport boundary.
  "packages/mcp/src/oauth-http.ts": "6a2668b96a105b077cd07528897b0ed6f6d7aec8cec619a26a535bcb5adb6707", // O1 resource discovery and grant transport boundary.
  "packages/mcp/src/index.ts": "3758cff2791d786d180b809101f05fb1b1fd843f29bb4c3f56e73bce73354ab0", // O1 resource discovery and grant transport boundary.
  "packages/mcp/src/hosted.ts": "64f14a288dd9005620cbac3a903b5cf99712792e85d001c8d38054241bfece32",
  "packages/mcp/src/hosted-retirement.ts": "8707c99fe68ac3cf7af20a343f92c36b3bb81237b3681ae2a03169df5513882b", // R15 caller-envelope and verified enrollment target owner.
  "packages/mcp/src/views/remote-origins.ts": "81c7e7a044690df7c00a30691ddc5e0da11531fabad2a9143d2d389ff8c0a1b1", // Exact remote presentation URL policy; no authority selection.
  "packages/mcp/src/hosted-tools.ts": "bea3d3cea128bd76102e36d0876992c1b77a5bf2263f376082c1f329d2035a60", // Reviewed R5 admission owner; actual maintained parser output.
  "packages/mcp/src/service.ts": namedOwners["packages/mcp/src/service.ts"],
  "packages/mcp/src/catalogue.ts": "32f361d456a36b46fc828b030b1cc5969dc2bee1ebe77aa26f8bd7c4c025fec7", // Reviewed R5 admission owner; actual maintained parser output.
  "packages/mcp/src/input-schema.ts": "c86a7a0bd03d5a4677a0041f775d1d657b4b40000a39131cfd99f6e939cbb5c5", // Moved MCP schema derivation; actual maintained parser output.
  "packages/mcp/src/act-result.ts": "df3f07460866a98ae567dba786e9f143218184758fe423c63f91774667dedcbf", // Moved MCP answer projection and act output schema; actual maintained parser output.
  "packages/mcp/src/describe.ts": "a1708220ef2656a34c466037223cf0ab31133bc442919d92d04fe8a37ebada92", // Moved bounded MCP tool description; actual maintained parser output.
  "packages/mcp/src/inventory.ts": "dad209ef8960de581efb010769f9307908dddf6aa49214d275303f55b35dab7f", // Reviewed parallel authority reads and target-only discovery; standing still reads fresh.
  "packages/mcp/src/http.ts": "773765a2edab34cfd675038a9bf5bbd51ef671379a0ce379d48725ea1b61b3b9", // Reviewed Mcp-Name binding for prompts/get.
  "packages/client/src/application-trust.ts": "137391c8b1ed6f59f66e9368012c1355ed77325fdb16f67b73296be1ccc856b3", // Reviewed R10 trust-before-fetch owner; actual maintained parser output.
  "packages/client/src/application-install.ts": "4046c6792d4671cdb259691dcf2171a2c3144450664c696cb722db161790164b", // Reviewed R10 trust-before-fetch owner; actual maintained parser output.
  "packages/scope/src/applications/resolve.ts": "6338c9357780846b115999454239b68f34c5d6be3c090ca3f18b8f6e8771d0e2", // Reviewed R10 trust-before-fetch owner; actual maintained parser output.
  "examples/grow/simulator-worker.ts": "cb1ca915e33f702245c3c37215d75fe89aa8531caf4424e694b9ee54780710f1",
  "examples/grow/simulator-host.ts": "26a8521b98737cae3d80a9fe3b9ac17fb10b11fcf2f8ce973251253bdbf2b7df"
};
// Integrated archive owners computed by the maintained owning parser.
// Root adopted the reviewed outputs; the historical map name is retained here.
const pendingArchiveSeals = {
  "packages/scope/src/archive-outcome-values.ts": "f31f598d3163ce8f7ec46003c0508951a05f136451be47134a7d6df15a1e30c4", // Certified rules evidence projection; actual maintained parser output.
  "packages/scope/src/archive-restart.ts": "1ef6109fa2fc54cc481e31d818ce739fa037594aeabe17f065208c22a2c425af", // Deployment directive parser; actual maintained output.
  "packages/scope/src/archive-operator.ts": "422376afb07d7345290d1e821eb6410bc834c55edd86540fa058b94c405d08c9", // Private observation owner; actual maintained parser output.
  // Publication and floor owners were reviewed before these values were
  // computed by the maintained parser on the integrated source.
  "packages/scope/src/archive-target.ts": "e64f4fd910684134d449163190c2c73711ca84dfc649becbf098f824d981ccd7", // Read ceilings settle only after bounded replies; authority checks unchanged.
  "packages/scope/src/archive-source-window.ts": "4db3f5885e7541f713b9668d1cde655e42be1950dd6af77d5711a323b3582e1c",
  "packages/scope/src/archive-publication.ts": "d8c39d220bc7eea59301478aa553960267aac16f06502b4103a85647c71eb457",
  "packages/scope/src/archive-build.ts": "b20a6d3c3572e702f92540021ff055c3126384fa17532bb16435ee5155b635fb", // Actual pin SQL payload settles; final identity fence unchanged.
  "packages/scope/src/archive-driver.ts": "7007cc64415ac5f0c7777e5dc017383b969f819fe1d80395f4bc67bc505479d7", // Pin read settlement and bounded scalar observation; authority/retry checks unchanged.
  "packages/scope/src/archive-row.ts": "02f01270071d022253335b5d4b41c8574e75f0eb806e58f70afa60e4b8fbc613", // Paid prior-capacity scalar reviewed; actual maintained parser output.
  "packages/scope/src/floor-writer.ts": "fb8fd859844b8d10ba43b477bcaf07ab32fe1bfa1b6684ad9ae70b930d328a11",
  "packages/scope/src/object.ts": namedOwners["packages/scope/src/object.ts"],
  "packages/scope/src/object-archive.ts": namedOwners["packages/scope/src/object-archive.ts"],
  "apps/room/worker.grow.ts": "0cc4c1c63f79f8da8dad5e98b2ace5b69fcd818d41640ed4e316ee534adf749f",
  "apps/room/archive-policy.ts": "ed3b746b5a26c3e872e41b13ba133f43ade42b5612aa5028ba544fc013be5ce7",
  "apps/room/archive.ts": "9547f8b9a4a1dd842b6151287a9b15efdf3abed011cb6b12bc191d5e04b78e4d", // Valid source proof settles; source policy and identity checks unchanged.
  "packages/scope/src/archive-host-item.ts": "066484f4ec1f886ee9cbaedffd3e7c33819e76230f792b842f4865d6b94fda83",
  "packages/scope/src/archive-host.ts": "ad759aff6f090fab3401d2f75274af294269f7db488ae2d5c56954759cdf754a", // Migration collectors settle only checked POST byte receipts; decoder fees and authority fences unchanged.
  "packages/scope/src/artifacts-host.ts": "17169f775db94ec5544115119385ab979854b43679185f4360b07311e1a8a516", // Reviewed durable fork setup custody; the journal owns its later revocation.
  "packages/scope/src/artifacts-wiring.ts": "c056b6f4a2f286e8c54e72ea35ba3c02b67e67d064ccbc09df5dd455481fa579",
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
  "packages/client/src/describe.ts": "43c62d2cfd7040fd635aa0bb7430ec3f26918982023bdf1d817533021afe9ce9", // Moved portable full/compact declaration and schema derivations; actual maintained parser output.
  "packages/client/src/mark-descriptions.ts": "7e22b5140e2a808e091b02d80acaa439f3d57d8c323a2480bfb994db9c063664", // Moved platform mark descriptions, own-property fallbacks and refusal names; actual maintained parser output.
  "packages/mcp/src/description-context.ts": "d249472e0f84ef0984c884685d85ba287a9bc35f1fce6800874b896eac138a41", // Private native-to-plain catalogue binding; actual maintained parser output.
  "packages/client/src/expected.ts": "bdbfca2345390f4db5ae2ed39dce352ff11348e2ef28adc5d62206b28b4e6d80", // Moved prototype-safe expected/via subject resolution; actual maintained parser output.
  "packages/cli/src/claim.ts": "ea9e90d5e2d6f65a621b351d53e96bddc8f11cacb7113ecc0305bfba0b95233b", // Remove the retired v1 offer field; current founding, routes and Native authority stay fixed.
  "packages/cli/src/command-support.ts": "53798996a3c1c0b8591d09c4b575b4fcf3859125c7dfd5d010be795d90eeb036", // Moved shared read, session and signing support; actual maintained parser output.
  "packages/cli/src/read-session-cache.ts": "12a5cf131a166001f66672bc3c4b6daf70070645255c61db7b93f18b6fbb83b7", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/verification.ts": "3fb0f354c0d00dd1d21cf293e11dfc81738b9de4e8f5eb43ac9fd918dc9db557", // Reviewed unique-entry ledger, source conflicts and owner retirement; actual maintained output.
  "packages/cli/src/files.ts": "7d0d64f352787e5d30ea03265fb5137a17a1eef61e97454e5408959297ca1d5c", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/store.ts": "9b185a206c417ebbcc738d86419b0af5a3d46159eb4914d485b6bb3e0e50e0fd", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/line.ts": "a7633c2619611fb93c4f76d4710a0b48ad29c6161eeb5f94825296e82790bfe3", // Reviewed CLI session or verification boundary; actual maintained parser output; dap issue wait signs no act.
  "packages/cli/src/invitations.ts": "f9ce8e94410e2b0b149da0f1f6db0118e1b293f589c862a96c356b1ee82ede53", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/scope-index-applications-command.ts": "e72f729f4232f674d0e132c865e4d7c359ac567a21e97b4e7b905342379d33b7", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/scope-index-manifest.ts": "a01740e192abf37501b403fe56c7c641e56eaa56cb07c92367a8fa1cd7efdc91", // Preserve trusted session refusal outcomes; actual maintained parser output.
  "packages/cli/src/status-report.ts": "4df678cff2b3fd5d9a106724c93fff16f8a284d04add98605b485a896a5a9c5d", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/client/src/session.ts": "3e4dfcbab9c9ab8585929b4c75ba01ac86c4e9ea7978f70f6bf3681af15bddb6", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "apps/sandbox/worker.ts": "758b28ea299eddad07022a913d4b94d632814aa51f2868810300a582ee833f51", // Inject the reply window; retain the existing Native lifetime close on an observed HTTP disconnect.
  "packages/client/src/application-gateway.ts": "daa1d28c02085bd6be7a9698a7120cd106cc7233aad92565aaa05e67427878ef",
  "packages/client/src/application-route.ts": "3ba8c4d9e680ce7ff2078bbb3067b557aece506506efc4c0a89751777ba2a300",
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
