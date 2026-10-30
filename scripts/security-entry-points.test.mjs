import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertInventory, documentedInventory, servedInventory, sourceSeal, namedSourceSeals, roomHttpEntry, sandboxInventory, workerEntrypoints, scopeRows } from "./security-entry-points.mjs";

// Every runtime declaration is selected. $module retains ordered imports,
// exports, declaration identities, and module execution. Each expected hash has
// its own source-ordered line. Root adopts actual parser values after review.
const namedOwners = {
  "packages/scope/src/object.ts": {
    "packages/scope/src/object.ts:$module": "54cd1a42de7dc10191191a46a03326ee8c7ecd5ee3afed596bdace1e37fc5d00",
    "packages/scope/src/object.ts:ScopeObject": "02c6a3144960cca0a801630a5e75021d3f1b2dca0c24a4400fac74600c82e842", // Read-only fixed-index methods on the existing outside-state facade.
  },
  "packages/scope/src/worker.ts": {
    "packages/scope/src/worker.ts:$module": "ea5fa597ed7ca5c673dad1c33a3763d1356b673f090c6646c2d15cdb09fe40e8",
    "packages/scope/src/worker.ts:ScopeIndex": "c427427157118cacbc763f65d5523f598eeb72a0b9a01520f1b088c5bc6dbad5", // Reviewed empty Site wake deletion; route and authority gates unchanged.
    "packages/scope/src/worker.ts:MISSING": "e8958a6cf8d4cd2f412b30c76b38aca2f4523bc2b9df96606ac01059b6d4fb42",
    "packages/scope/src/worker.ts:api": "4cd7bb21bc07be9505a24e36194387cd97bf183ffbd9484c59fc1e06f13bb32e",
    "packages/scope/src/worker.ts:BODY_BYTES": "158a6579a52843b40416a1f4d27e7bffb5e0f5df07105254bd3e87c3d3d203fd",
    "packages/scope/src/worker.ts:answered": "f1c36263f63cc8977a334b803d6c89c4863d2e078704d7cdffdce1c3dc2eaea0",
    "packages/scope/src/worker.ts:READ_STATUS": "a2325662f4bea021dee824bc3b9236588c1fb2432e5b1f24e9f3e37fa50f8910",
    "packages/scope/src/worker.ts:SESSION_STATUS": "99632b0bd230a76488353a2e1fce61925bbb595605a27d0f9e8c8e67f77a9587",
    "packages/scope/src/worker.ts:read": "4a083fdf987741284f15628b0c45881da42de526268465ee66f4c37422636dd9",
    "packages/scope/src/worker.ts:body": "c93c1b9fbe8c86c85bad134535f22e138e76cfe5653c19ce09ba1a638287da36",
    "packages/scope/src/worker.ts:QUERY_STATUS": "cb170da8d7dca22a5dd36b21c59decce3a629ec5aff60745a39b350a1f2c9489",
    "packages/scope/src/worker.ts:queryResponse": "3ce5909b0b8713f13903dc84328673d0cfa85910dff434b928e22fd3e2fe11b9",
    "packages/scope/src/worker.ts:PROJECTION_STATUS": "c37cfcdbb416865b0082d7b326a76c8476deab28059b07bdd665c7cc9cdb7111",
    "packages/scope/src/worker.ts:projectionResponse": "e17f1f4aa800bc06b4f8d065f77e8a594c2738c77873a52671fa7f1b22bf249b",
    "packages/scope/src/worker.ts:route": "8e41a02f0a9d01c802beea51c095d82f3720ca0d3d5dc178213f5de2a8ccde63",
    "packages/scope/src/worker.ts:routedRequest": "51a0718b0fefea0e8508361ba7a48330bcc6740abce56a6ff3694402ae49681c",
    "packages/scope/src/worker.ts:outsideOf": "5060e5b7730a2c3839ae7e2a4d953ccaca63c78fb7a4fa07e1b63677f8a4216a",
    "packages/scope/src/worker.ts:sessionWiring": "cb8f4d0e2b06854a3fbf080e5b4ce72e4182060b60f27cc7fb7f5ed6ac8779c5",
    "packages/scope/src/worker.ts:snapshotReaderOf": "dac91fd4e800bdcd1a9f7e47bd077b6efd0acd4eb3c70bf63122a12bdb7446b5",
    "packages/scope/src/worker.ts:DeployedScope": "0714da9436f9fd5a4c70169986ba9f056046490903dc6072b7d2a28adb28b5ef",
    "packages/scope/src/worker.ts:ApplicationStreamLifetime": "4c82d6b5ea8ae68089f2f80321e3361b6176c9725d0b46481b6f32b6d2093ba3",
    "packages/scope/src/worker.ts:ApplicationScreenService": "d0e151737f0a735c031d7bb134c45d0ce8e87e7ec6d7a03eaf5455acbb92ac25",
    "packages/scope/src/worker.ts:mcpRoute": "1ab549b7363fa9deed65368e72c0a8fbde019972cd0d81321d5cabf00b4cd962",
    "packages/scope/src/worker.ts:boundedBytes": "6553fab5e2b9129266d64c02f7c3c9317095f1888fd12a10d12490d9f5d90f40",
    "packages/scope/src/worker.ts:observeThrough": "7e507f9bd9233223446711d089eb6d6b4236b69642eb9d39260e4712d81dab7a",
    "packages/scope/src/worker.ts:sqlOf": "5631baea8c5029d6ba93da6b3d199e63897c5f5ac05ae61e16b8d6f3e337f7fb",
    "packages/scope/src/worker.ts:McpRegistry": "f03a3a5f89e4a5b77c63d82dc72eb60c1eb34801a8dc55e661d05f7c07c7325b",
    "packages/scope/src/worker.ts:McpAgent": "a36d308c7bd5a575e6784a307fb3b404eb2187d39da8a93294eea2217b765c8f",
  },
  "packages/cli/src/commands.ts": {
    "packages/cli/src/commands.ts:$module": "f01145b2807692fd13b82de9222af26a5a27bc042eabf8175f4c505609ec8093",
    "packages/cli/src/commands.ts:NEW_REGISTER": "f828e83eeb39a37566e323156efb63274fc43b1d6b9e95b38fbf0cdbba327fbf",
    "packages/cli/src/commands.ts:short": "62f9d565f48fc73fc6b282a941d6d37a48055c6c32f2ef88f21b22ead55f6e57",
    "packages/cli/src/commands.ts:scopeIndexAccess": "b54a6859075907491f4c19313b149572acd5b3bd94c492d61fb342601759c299",
    "packages/cli/src/commands.ts:directoryReader": "ebf7a12b7e199bfb0e7962191eae486cc1ca4ed04707f9dd73eacbc48b8e147c",
    "packages/cli/src/commands.ts:openingDirectory": "6d4a21e1c95322a35ff4b68ee9753efea36ba9013d100748587084babbd8f087",
    "packages/cli/src/commands.ts:scopeNamed": "d16130a225872b6e96da8b6375ff41dcec104f7772f1e6c527c92d03cfd382e4",
    "packages/cli/src/commands.ts:definitionOf": "138ced231e1b804af138be95c50fdd958e478c196d21b11cba3a431658bedf0b",
    "packages/cli/src/commands.ts:laneActive": "8797076412cc4a14365ca99fc4faed2de3f34e7d0b7b62fc6283a446615a8aee",
    "packages/cli/src/commands.ts:INSTALL_COHORTS": "f46267d8dfae3b78be0877be93e107f823fdb331ff4253867ef192deee8be0e9",
    "packages/cli/src/commands.ts:CREATION_INSTALL_COHORTS": "95df309854693793def410cf83bce1771d08453b7ff5c962a3ef6e96a815b051",
    "packages/cli/src/commands.ts:selectedRegister": "5c870d139ef5e27b13eeb8bb227093d46997d10f1b3dfbbafb9f28f4b61fbb33",
    "packages/cli/src/commands.ts:installSelection": "35eafead7d52c28b228bd17a9395ab5f48b7c7a2f73bcecb09ba6fbbca81fd42",
    "packages/cli/src/commands.ts:selectedPlan": "d49aa2ab7620a418121c6f4afba66998e36e79bffe48cd8728e7aad309b1b545",
    "packages/cli/src/commands.ts:install": "0459a25a99cd5e54f3022e4074e722ca3823120075dcf3c6cea420889dd2ea7d",
    "packages/cli/src/commands.ts:installing": "848bc5a890238b9ee8e382ed5a958844ee8cd409e6e09236ff8c4fa3a10b72bd",
    "packages/cli/src/commands.ts:registerIdOf": "5db562b18c0929cea45b8322e913408ed5326b3b865aece7b884c284f137102d",
    "packages/cli/src/commands.ts:knownPlatform": "7b5bdce0c14e94a85bce0329ddaef5b6a5ba276b1c5ef4393155b1468aafa8a8",
    "packages/cli/src/commands.ts:installAttemptOf": "9a7a6449aee1060b49444f9bef0e3fe271e5279d29ddec38caa9fd6b3a1d95a2",
    "packages/cli/src/commands.ts:readBackCohortConfig": "440e708afd45bf7ca11a22d1c913ccd642a4aa58d7ac7d92b6d1da753dec980b",
    "packages/cli/src/commands.ts:saveCohortConfig": "1414316c62c3977bc1e64131e636a7821ed3dbe7389abc50d557ea7764d6bf44",
    "packages/cli/src/commands.ts:retainedCohortPlan": "9a4da2b6b172f0208fbcb1551a61c38ccfdd3a1494496e97e0ca47c2acb9d8f5",
    "packages/cli/src/commands.ts:cohortPlan": "1399c578e038b1984e7d6654f0f99c3170ab66503e0fd673bff824c333df5a25",
    "packages/cli/src/commands.ts:plannedLines": "df7c3d59e0ea56d6a03a14c93367f8233354e841005fd9fbc8a332f6d21fdfd2",
    "packages/cli/src/commands.ts:planInstall": "614a251f08f95bdc42191d2c54fff570341aa10d76ba598d7d1c91e77cff55c2",
    "packages/cli/src/commands.ts:installPlanned": "746f81f7078018a4bdd15e21606c3ed37eff93b4be159129e41a774bcf8a46db",
    "packages/cli/src/commands.ts:executePlannedInstall": "ed6af3d664e460a88356c3be9db6ebb292a331990e9be8c497f0cc470e35db73",
    "packages/cli/src/commands.ts:invite": "0f89f53e82d14214cc46d83bb6df8e11516e328c5b54eacced4dcc67ae1c2d5b",
    "packages/cli/src/commands.ts:join": "6c1ee13d33e404308ff73008807d432b924bcf4632c2ad1b8e5ee1b5b5b9ffa7",
    "packages/cli/src/commands.ts:standing": "57372328838e0f9bcb936554f41738f9445ed53384112aae1cdad745a4dc1fce",
    "packages/cli/src/commands.ts:acts": "f4577a1dbe4bb307bf92057f101967b5fd2f9a11240342f4f3377e177a81fd53",
    "packages/cli/src/commands.ts:act": "9024c4a6a69387a54512c7a3abf9ad9565fb7f1476299479a54fe50967339742",
    "packages/cli/src/commands.ts:apps": "02729fd520eb4ed349fad0e776f974929a3663d442a0588e9b95ee104ed9ed8c",
    "packages/cli/src/commands.ts:items": "035ef813ce6aea0c10a2215c856e5e8c30fed9e0db64dcd24eb43e98ee713baa",
    "packages/cli/src/commands.ts:entryLine": "61bf6dce3240a56b1a4d0286b713cb5cfce96d1f933c03b89182e71ff8cf7846",
    "packages/cli/src/commands.ts:log": "3ef9c27f7f2f22e7f2531f7e4d0cc859af988009fb92e3e79b13261a45943aeb",
    "packages/cli/src/commands.ts:show": "e5008fae01934cb48b95ed52c0f9108c9f2f8799ef8072e61b80f1abe2823fc9",
    "packages/cli/src/commands.ts:sessionDeniedDependency": "7ae8c948cf2c7f3a75f1428273c9d10ec4487d42eb21cd7ad1d153cca53a2f90",
    "packages/cli/src/commands.ts:replayOf": "6373a96397d59b0d86e7bae907354f310eab097dda08eb239db585699ef002cb",
    "packages/cli/src/commands.ts:verificationContext": "bc38c07b7cbcbaa2118086aaf05068fc05d2cd90b1994edc81968e48788c41b6",
    "packages/cli/src/commands.ts:verifyScopeCommand": "4dd727df2ca467fbf11c1d3bd3219dc74ed2a0a12bdd1045f9e8879d0508b598",
    "packages/cli/src/commands.ts:roomScopes": "926803aafcc62c997771ecc71315e810fbde87705955e725d3da7555589f7a44",
    "packages/cli/src/commands.ts:verifyAll": "6beb947558d6b835c1bda9401866b24d34b13562bf3509fed68e838b0662ede8",
    "packages/cli/src/commands.ts:OWN_HOST": "d8049ba56c1494f7f9ab575b4ccdbe4ea8192229bb9d2a280bbb4528e1c5784a",
    "packages/cli/src/commands.ts:remoteOf": "57afba6cdd6f9169d7366eb5641f61a52a420f55ba723bff6922bfc6332496a9",
    "packages/cli/src/commands.ts:remoteLine": "1eb8d789b8f70e63d8b28176c5b5f923eeae5065c26a17487274295b2803d354",
    "packages/cli/src/commands.ts:destinationStateOf": "9b79f77e56af254690a859fa8c4924f59ed1b9fc228d54e8eceee6478126207c",
    "packages/cli/src/commands.ts:destinationOf": "12e9a159bbe98128f0e7f0bd184477a845e06ce0d1eede21b2dd9b498672da42",
    "packages/cli/src/commands.ts:remote": "fcb9d2f615c3de93ca2e366e3460fa2551da32424c482703795b5d053b905449",
    "packages/cli/src/commands.ts:authorization": "e4e08477eb4c8766ccbb228da6d28f0b0c98a11500d80fcbe92e686eabb654ec",
    "packages/cli/src/commands.ts:b64": "2ccaf086d7986f6c72fc6eb746042e77b2da0a99cba0d51e10a9aa87025e0c6d",
    "packages/cli/src/commands.ts:headerEnv": "2b29643df8f13576381b9be7133dd6f5dc668a80d10822ac7fbc0d3bcb1ee878",
    "packages/cli/src/commands.ts:clone": "90ea609e9984ae81dc13547ecc44b5c0a3a00d6ac74d0de46cf1e5f940d9da94",
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
    "packages/mcp/src/service.ts:$module": "fb835312df0ab323595be7d5a96d00dfb1578b737f95957cffbf090d95dfffc7",
    "packages/mcp/src/service.ts:ListRestart": "83803f5cf365099c3ed7ad6d12153b68e7616977007feffed4ca4b01bd4ca95d",
    "packages/mcp/src/service.ts:SERVER_NAME": "1a22dd379fec10cbed8b5938dfd522ce9e8cffe176de5f4554e3cad8668764e2",
    "packages/mcp/src/service.ts:SERVER_VERSION": "93926c4b4205a41211c5dfd2e083d8a5d4eed978060ba4d0781fb54d9d3eb366",
    "packages/mcp/src/service.ts:INSTRUCTIONS": "40301d4cf4dd1c45f29eadbcd4483f791f3d5038beb4a98c03bad0a1e9c47924",
    "packages/mcp/src/service.ts:LIST_PAGE_BYTES": "59dd525548661c8bb7618a95bd2fb0d6b1b2fd122a15ea45213a0ae0d26c949b",
    "packages/mcp/src/service.ts:WATCH_MS": "d28d2082347de271b370282a615fc2dc8e34a7d6962e08d76375d7292afaa0c8",
    "packages/mcp/src/service.ts:WAIT_MOST_SECONDS": "18c43e609ce676dbf274befbe7224acfae088c3435e31eaea0e3a549f780868f",
    "packages/mcp/src/service.ts:SEARCH_ENTRIES": "ebb27ed02343da3a66559ab18d5b621bbad76c5eb3fd905dddd0fa6224bfcfa3",
    "packages/mcp/src/service.ts:NAME_BYTES": "eb5d62e380f50f07aee001aec26c9231aa055d764899a3b6196b2802bbd82e9b",
    "packages/mcp/src/service.ts:SEARCH_PAGES": "298946253cdfd6df568a241f3bf5eddd96bf6b9134fb238032aa96340aa8177a",
    "packages/mcp/src/service.ts:SINGLETON_PLACES": "ec70762d20b63a866c02b01074f0f4f20a50b5040e040648133c2b08ca04557d",
    "packages/mcp/src/service.ts:callResultText": "7a858143e1225b48031ff2a853d96ad2a6c0efcd1c101924bea6d04d6e183b67",
    "packages/mcp/src/service.ts:BOUNDS": "838a3fb5498e8b323318642271e728afe0e2409fb658f370ce9e7d7c2c6cbfbb",
    "packages/mcp/src/service.ts:PAGE_SPARE": "b56f933bf61a623da82d81f9c1b944072d6c71538bf56e6e622c3c2d24a7eb09",
    "packages/mcp/src/service.ts:pageOf": "e0aed29507d78dc28f1b498cf91a4d01bfa6e59aae798f1414fc909e071b6bb2",
    "packages/mcp/src/service.ts:ok": "0c1818e2749e7828fa629cfc35cc4d7203068f7243d3193907ac71a416fd13b0",
    "packages/mcp/src/service.ts:ERROR_BYTES": "3cf4f0d3c6271b3cef45b42e64e8d210f063b480addfd1f4f1d26d73c3e64d04",
    "packages/mcp/src/service.ts:failed": "d77838edf83316f8fc07c79973a118b3589d432ecb7a22dfe8f7115c3e1c24d6",
    "packages/mcp/src/service.ts:projectAnswer": "ab287949458589079d41c6552bb2a306162fff4c3b30edb21ab83a74fed72cab",
    "packages/mcp/src/service.ts:configDigest": "db445c9209d8d937f49e2016f1a7ef2eb7ab57a189a05093d2ce8d61e49ff5db",
    "packages/mcp/src/service.ts:Stop": "be559905e3dbcdb763828b74b97ba6c27e00c98644ae913cb46daaa6b4a0ebe7",
    "packages/mcp/src/service.ts:stopCall": "f8d89a63e2e2336d69c4fe331483fc42f64ad5c183df574ae74e0f774223a007",
    "packages/mcp/src/service.ts:READ": "c46ffafd29a0b32d79613c7d6b784a9d6cab99b90c99b98fe9246a8b6b6682eb",
    "packages/mcp/src/service.ts:WRITE": "5920731b91c504f8bfb945b3edbe132bea0167ec1c9a44579e3dd658e5e9cd91",
    "packages/mcp/src/service.ts:scopeArg": "f26abaf59aa4dd047516a35275783c236e8f5410f1472a9fdcac4a0a5cc22652",
    "packages/mcp/src/service.ts:keyArg": "368a6f3d59380df455b92a9478dc8c993a5535b2d40e9046a4e71df139cc5149",
    "packages/mcp/src/service.ts:McpService": "277421711f2606803ad4470eaf699e514d59bf225c10ce60128c0786f2092529",
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
    "packages/scope/src/core.ts:Scope": "e578408e0a585561db69e4bf15984c311d74bc5baf95c3ac95f4bde6fd8ca51f", // Native initialization reads held hash metadata directly; a genesis fold builds its first rows.
  },
};

// Reviewed matcher/gate owners. These are change tripwires, not runtime proof.
const seals = {
  "packages/platform/src/reservation-v17.ts": "e00aa0f08f9b3b1f4aca5e794436367ab550dcd1966c5258f1e96e42ab97a856", // Reviewed retained-policy decoder; actual maintained parser output.
  "packages/platform/src/evidence.ts": "e3f0fa91c32d848b5bec7dc9ac047d4cc72815ddce70365ad8fade6884a7354b", // Reviewed platform binding codec under ruling 1bc4f7fd; actual maintained parser output.
  "packages/git/src/checkout-snapshot.ts": "82f53717d419b70fe208801b6d0bf2fc0c947ac2beffb27b2e2d01898f48ee25", // Detached object identity and closure bounds; imports do not seal this implementation.
  "packages/checkers/src/stage-origin.ts": "f8ca858b23eaf0441cad60ded741cc96cdf3b68ee01bd275f4ce525eba5cfa1e", // Actual Native admission and causal proof verifier.
  "packages/scope/src/stage-snapshot.ts": "6c0cd626b2b58bb578f58160264c25fbcd5f67c2ad0ba39aeab4725c5a55dff9", // Signed stage read and current Rules, key and work-source gates.
  "packages/bytes/src/address.ts": "d6d2fc3f86f50318c6a88b21649daef212f40c4d46b942033d27b3853902ccd2", // Canonical local full-address and routable /64 counter keys; actual maintained output.
  "packages/bytes/src/index.ts": "8ef5b10b548cf682eabcd3057c2ee4f86e4d14dad870da2ab41997a8dd9fcb02", // Bind the shared address-key export to its reviewed owner.
  "apps/room/celld/worker.ts": "d1bc465525bd0af046fa0703464f14aeaaee8286b88415dfec3b9e03869fb644", // H1 reviewed production entry or public-origin gate owner.
  "packages/scope/src/public-origin.ts": "d6e867fc859db69b6fcf2d465d387a032966331cbae04310ea4c24cda3773269", // H1 reviewed production entry or public-origin gate owner.
  "packages/platform/src/versions.ts": "a1df3e5e529cc8caa98f59dccc41290c8a8dcd2e3fddc5257749eb6c0b8d8802", // Closed native publication protocol policy; actual maintained parser output.
  "apps/room/worker.ts": "aba04e12dc206f0be6bda4a8edeac64569e0edd44b7a87772595d7db40bb8b67",
  "apps/room/fetch.ts": "0b1713cce239011343ffdad8c3ec94491509ff5b63a782cdf0d8ff215fd7d76c", // R2 owning AST value adopted on the reviewed branch.
  "apps/room/demo-creation.ts": "91d9ac8a8fa37e3c99c117be7d99dc2d9e370efeacd70f8f49a00a4062bcd67c",
  "packages/scope/src/demo-creation.ts": "a3db32b06d66dc08dc5c585514a02ed60929d3bcc05d0be9d433affea17fefe7", // Reviewed current demo projection or ordinary GitHub authority owner.
  "packages/scope/src/github-wiring.ts": "54adf6e1021117f8cc00cf6b8e3a7ddfae00635455f8cc316ada56b85dbc65a7", // Reviewed current demo projection or ordinary GitHub authority owner.
  "apps/room/page/route.ts": "8eccc79a8a3e3cd8b33c38c65374db5d01583b5e9afd76384fc2133bae4cb475",
  "apps/room/brand/route.ts": "71b45ff9b41b3bea31c775a16525349591e0d4f7dfdc65da79f095816b1c343c",
  "packages/scope/src/worker.ts": namedOwners["packages/scope/src/worker.ts"],
  "packages/scope/src/scope-index.ts": "340df0f22c82427511da3787fe2e71eaba66b6a59b133c719f212b0bde85a617", // Census port type; existing internal lookup/registration behavior retained.
  "packages/scope/src/register-setting.ts": "c2f1f2a01229e29f627eb061ea551e57139a3512744d25de50195dda93473168", // Shared exact Register selector; actual maintained parser output.
  "packages/scope/src/scope-index-census.ts": "1892fba9c476330693d9b8071bd7b2653d2261bef7e9487fd95018d74aba2769", // Address/key admission precedes owner proof; exact census authority and page guards retained, without duplicate owner charge.
  "packages/scope/src/creation-admission.ts": "f55e56accbf10c2bb77b2cdadc180f12a3af12e486777c39494217fa624acf48", // Reviewed R1 ancestry owner; adopted AST value.
  "packages/scope/src/creation-lineage.ts": "bb7e10ac7c7b769a682282e586cd6fbda6661e724abe89641387600eb0e5c5f8", // Reviewed whole-lineage boundary; adopted AST value.
  "packages/scope/src/creation-versions.ts": "a8f639325611fa080dda267193ac14ec4dfbeb0494c7cd3d86a1c4c93a915d6c", // Reviewed R6 creation-policy parser; actual maintained output.
  "packages/scope/src/creation-declaration.ts": "71b45f8d6f6c799aaff0ab07f8398c36b9f339f04a02a6ef57157efb1958363d", // Bounded immutable native Directory custody, not authority.
  "packages/scope/src/namespace.ts": "7d8f7fe6a2769391f8e576cbfb8b08969b1fa2bb07c56409d2edf9267e48a672", // Reviewed internal declaration RPC; adopted AST value.
  "packages/scope/src/health.ts": "3d31d6c6d6413294cfe14d46430d357fb65a7949423642b642b139abefcdbdc8",
  "packages/scope/src/site/route.ts": "f4bbcdd1f53220ccce1337ec011e0c662f199f979513ca38ea891bda7add6ee8",
  "packages/scope/src/site/host.ts": "bfcdb093e430467da019b5994d034c2341c8b137dd14aacc97ac9d5e4222e332", // Private Site token custody; actual maintained parser output.
  "packages/scope/src/site/token-reuse.ts": "ac9268b1d7718d40ee266d274fea29cb65a30f51a1a36985411e42d2eb71a540", // Reviewed pre-mint generation cleanup rescheduling; custody checks unchanged.
  "packages/scope/src/site/window.ts": "a5f64febfd69c17c682dc8bf1aa464378a3609d73d9ef0112c16fd79892aea54", // Bounded site-read window; actual maintained parser output.
  "packages/scope/src/applications/route.ts": "1a052942a992a9c9f13cd46205d1dcec5f6577814f9dcfb18362f00ec16f4c1f", // Actual union parser value adopted by root.
  "packages/scope/src/item-query-wire.ts": "8206b9a6531ca30cae1bc49cc249eea08c70a658305f41b3ebea6eda042055a8",
  "packages/scope/src/applications/projection-wire.ts": "2e07df5447469dc09aff0d4017e010634150f49c92f614221402cf46a869c6d0",
  "packages/scope/src/object.ts": namedOwners["packages/scope/src/object.ts"],
  "packages/scope/src/core.ts": namedOwners["packages/scope/src/core.ts"],
  "packages/scope/src/applications/act-admission.ts": "78014728ebb278fbdd6da703822b827563bbb4edb5fd67c17cfb47c3c47d7f2a", // Exact native provenance and current trust; actual maintained parser output.
  "packages/derive/src/genesis.ts": "df7722143f01c8084b8f045ef959b203ae1756c4dfde170d0454cfe0b0392843",
  "packages/derive/src/judge.ts": "65a10677dd4da355e9edac490979cacf6911cfa1aa37020c41516f5c53ad94fb",
  "packages/scope/src/sessions.ts": "4ef554909c1612dbcdd43f074d5844779e046f0af41c615d100c98b4d754054d",
  "packages/scope/src/reads.ts": "7d66e866c46fc354286d6454e202402788881b062b87376d85ee35888f938b26",
  "packages/scope/src/signed-reads.ts": "3204207ea73dc48cdc40727bbde7f8b734675975fd78694a501b0116cf0abfe2", // Census wire name; its separate fixed-index predicate grants no ordinary scope read.
  "packages/scope/src/limits.ts": "dfab21444a03339291f51f500941dc1b0d23926fa01fb173e7cd7cc91983f099", // R12 verified-key join failure window.
  "packages/scope/src/serving-limits.ts": "3a9f410f926f1e3711b78a750dd7dfb055f418fa9904be55ccb3f8cea869a987", // New bounded memory-only counter, no live eviction.
  "packages/scope/src/serving-admission.ts": "56196763d35e17e67df94862264b2b1af0f1e812d46cc5c50163a4c580cd06a2", // New bounded original-signature/counter ingress.
  "packages/bytes/src/records.ts": "41fdc4c632929c538eb64289a2124dbce160be7d4a6ad35f44aa50302b1e8b53", // R11 named serving refusal; actual maintained parser output.
  "packages/scope/src/session-preparation.ts": "44b7bf3227e638fa2cc9e49e61162d903b4d915102069ab7848511f102b9ccf1",
  "packages/scope/src/item-queries.ts": "61ead9996d2c338a26331e04b8576c52425d8d2c88dc86173a7d79108c2ee418",
  "packages/scope/src/applications/projection.ts": "f7d3bb45d448ec654a89f875697f865e1e89baeb5d7529e0db0859bd855b009f",
  "packages/scope/src/destination-host.ts": "e272abc7502b17f171944632ab2da10c23ab2bb58018404ec43b57379eb5d3eb",
  "packages/mcp/src/hosted.ts": "c78bce660a4927fd05a5856e9d19f7b93d8737659ce58c4dc50842f39ee0db9a",
  "packages/mcp/src/hosted-tools.ts": "5bb4dd74b12896bb8f5f5cb366f25bd31af849c2690d0e3ab5d81eb277f94a47", // Reviewed R5 admission owner; actual maintained parser output.
  "packages/mcp/src/service.ts": namedOwners["packages/mcp/src/service.ts"],
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
  "packages/scope/src/archive-target.ts": "b679f2a125db53efe9fb96b2c048824dc388910b884547600776c8b7f7d727c4", // Read ceilings settle only after bounded replies; authority checks unchanged.
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
  "packages/scope/src/archive-host-item.ts": "44fd36bee675f5abc450ffb60b9858d820e20c88461589ecfeff61e36ef0e327",
  "packages/scope/src/archive-host.ts": "ad759aff6f090fab3401d2f75274af294269f7db488ae2d5c56954759cdf754a", // Migration collectors settle only checked POST byte receipts; decoder fees and authority fences unchanged.
  "packages/scope/src/artifacts-host.ts": "df100e1d2d24bb859af31935b21598cd948e2dec0199d954c34742e33dc38f53",
  "packages/scope/src/artifacts-wiring.ts": "50c9248563a085a5902a97fbb8c9b350e2864211945f9d2f349cd8ea9c585cb5",
};
// Actual maintained parser outputs adopted by root; never infer hashes from intent.
const pendingR8Seals = {
  "packages/cli/src/commands.ts": namedOwners["packages/cli/src/commands.ts"],
  "packages/cli/src/browser-helpers.ts": "7e5f139e800efad56f08799f4e34700f2fde7c76de33422a2eb69d03de4f03fa", // Moved description, expectation and value helpers; actual maintained parser output.
  "packages/cli/src/claim.ts": "26858433403847e4857951909bd48ca1153d92dc28595081c093141db550773a", // Moved claim verification and retained custody; actual maintained parser output.
  "packages/cli/src/command-support.ts": "3d8bb5498e66827db4f74943f90b441b614340663dc30be2a9d17efec9d1817e", // Moved shared read, session and signing support; actual maintained parser output.
  "packages/cli/src/read-session-cache.ts": "12a5cf131a166001f66672bc3c4b6daf70070645255c61db7b93f18b6fbb83b7", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/verification.ts": "51042fd79fae343e7369ca49bae9351f2672fe868e9e3b934aa5c7fbb1c01219", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/files.ts": "7d0d64f352787e5d30ea03265fb5137a17a1eef61e97454e5408959297ca1d5c", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/store.ts": "e452f4b9087d3d4d1dcfb90766e83e0805699598739157ee51bf07a68266d377", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/line.ts": "029e530d325e9ca0a47859a306a30884151401e26ce59d40e6768dfd4912b4c4", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/invitations.ts": "98580f46ed9468bb0fddc9736d19e222a82d4fe6e7483caf8559e53a25d4ef0b", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/scope-index-applications-command.ts": "e72f729f4232f674d0e132c865e4d7c359ac567a21e97b4e7b905342379d33b7", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/cli/src/scope-index-manifest.ts": "da24a4005531491586b09cbe793175a5cf1d2ccf9f1e637b364b89121c1c2c52", // Preserve trusted session refusal outcomes; actual maintained parser output.
  "packages/cli/src/status-report.ts": "00e41c40d07337fa5a6eb28ff3fa3df27670a861f718598a8ecc7ad83596b7cf", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "packages/client/src/session.ts": "3e4dfcbab9c9ab8585929b4c75ba01ac86c4e9ea7978f70f6bf3681af15bddb6", // Reviewed CLI session or verification boundary; actual maintained parser output.
  "apps/sandbox/worker.ts": "d354c1740d51e2b83e0b93272384607c609c65386c3fc4b8d977edfb89b6636a",
  "packages/client/src/application-gateway.ts": "daa1d28c02085bd6be7a9698a7120cd106cc7233aad92565aaa05e67427878ef",
  "packages/client/src/application-route.ts": "dcb686835049af3043e1cb8c73a989545636ea5bac2d85aaee6be92b6cd3abcc",
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
    ["packages/scope/src/worker.ts", "body", 'new TextDecoder("utf-8", { fatal: true, ignoreBOM: false })', 'new TextDecoder("utf-8", { fatal: false, ignoreBOM: false })'],
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
