# Site reads within bounded work

Site uses isolated Git object reads. The source asks for one object with shallow and filter capabilities, rather than fetching a commit's closure. The wire bound remains the smaller of the configured maximum and 16 MiB. The source reserves 18 times that bound for its owned payload allowance. It still refuses hosts that do not advertise the required capabilities. A page exceeding its byte bound keeps the 413 response; other Git refusals keep their existing handling.

GitHub Site keeps at most 128 successful repository identity observations per isolate for 30 seconds. A digest of the complete configuration, repository and read credential identifies an observation; the transport function must also match. A configuration, credential, repository or transport change requires another lookup. The digest key holds no raw credential. Failures are not cached. At capacity, a new success evicts the oldest entry. Concurrent misses can each call GitHub. A repository replacement can remain undetected until the observation expires.

The existing Site token owner checks a held key before its 256-key admission limit. Its witness fills the table, rejects a new key, and serves the held key without a new mint. The separate limits of 32 reserved mints, eight waiters per flight and 64 total waiters remain in force. No token-owner code changed.

The local Git witness builds 4,098 commits through Git fast-import and reads the selected commit, tree and blob through Git's HTTP backend. Full closure mode refuses the 4,096-object limit; isolated mode reads the selected objects. A separate room-lanes Node witness sends an anonymous request through the production Site handler and GitHub reader to the local Git HTTP backend, and asserts 200 and the rendered content. Its admission and native publication selection are stand-ins, as is the GitHub identity answer. The token witness uses its real SQLite owner with a scripted provider.

## Focused evidence

The files below are in `~/play/artroom-evidence/2026-11-21-s7-on-lv4-focused/`. The commands ran from the S7 checkout after `node scripts/cloudflare-pool-compat.mjs`. The full gate remains for the integrator.

| File | SHA-256 | Result |
|---|---|---|
| `artroom-s7-site-focused-20261121.log` | `a63d8ac8388e738e4e62d186e6fc3af61f5f7d1a42306d776cdb35af0a6e0f68` | Host and immutable publication: 6 passed |
| `artroom-s7-route-publication-20261121.log` | `9557085160237a222f1f3e54f6b3894d9cfab6ba5a6ef4e57d6b081e710b5be5` | Route and selected publication: 22 passed |
| `artroom-s7-git-history-20261121.log` | `f5341be41ede8bcb80275cf46769b29d23c82d97ecd579c74ed3ed93535a4344` | Local Git history: 1 passed |
| `artroom-s7-lanes-witness-20261121.log` | `6c97e255619382b1082d0e5633e44358017d74293e3ac532ac4fc8ad370f5f68` | Site and local Git: 1 passed |
| `artroom-s7-lanes-control-20261121.log` | `f2c5e279a95bae9888f0d52b62ce76e1d391a3e651ec1255303ab8c3f543d230` | Site shallow-mode control distinguishes |
| `artroom-s7-active-source-20261121.log` | `168055c830beb18315aa3ec1c5f3ed92858c88e0aabbaeccd12aba3b98957689` | Active-source inventory: 12 passed |
| `artroom-s7-lanes-typecheck-20261121.log` | `b91d29384f35cb1d0b20da37e74ed8bda5d069d9bbf6ede67718ff209e87c945` | Room lanes typecheck passed |
| `artroom-s7-token-20261121.log` | `e1f9bd2d3ec2a58de8fa7b730a82398de5d8301a6554e7e1cd89a50c6674af6f` | Token owner: 9 passed |
| `artroom-s7-identity-control-20261121.log` | `dea67cd0876365a0669fb6b4e8eaef47ce58401f3e2d7e8c810cbcf0c0bfe536` | Cache-hit control distinguishes |
| `artroom-s7-shallow-control-20261121.log` | `19c009ac9f97c2494ce4eda2d7d9b0a61d200f9f91d0723dfc8e7379d6c59f99` | Shallow-mode control distinguishes |
| `artroom-s7-security-20261121.log` | `a1524626b6ffba9569f9e60679eeb8ee327938af82e03b695fa053327584b386` | Security entry-point inventory: 13 passed |
| `artroom-s7-typecheck-20261121.log` | `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` | Scope typecheck passed |

The evidence directory also records the commands. The security inventory updates only the two changed Site owner seals.
