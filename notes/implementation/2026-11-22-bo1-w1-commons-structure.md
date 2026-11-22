# BO1-W1 prepares the Commons Worker configuration

The Commons Worker removes `DEMO_START_CONFIG`. Both register settings
hold `unplanned`. The CLI configuration test accepts that closed pair or
two identical valid scope IDs. It rejects missing, malformed and unequal
values and checks that the Commons Start offer is absent.

The source changes are `apps/room/wrangler.commons.jsonc` and
`packages/cli/test/demo-config.test.ts`. The configuration retains its
namespace, bindings, creation cohort and `enforce` setting. The
[BO1-W1 plan](2026-11-22-bo1-w1-commons-plan.md) and rulings `9b0585ca`
and `e53e0500` govern the closed-state deploy, timed register plan and
two-value pin update.

## Evidence

The gate ran on `8a9bcfc674605a3f8ccf002ba87501f3c7331e80`, tree
`b03f0993960f4ca4df0ef7da497ba298bee85a2c`, with published base
`c02f76a0fd02c14f7a7e256009acbd681b6285cf`. Workroom acts `835db5a8`
and `c6acb343` record the start and finish. The review head adds this note
and updates the security documentation to describe the closed configuration.
The configuration and test at gated head `8a9bcfc6` match those at the
review head byte-for-byte.

Outputs are under `~/play/artroom-evidence/2026-11-22-8a9bcfc-bo1-structure/`.

| Check | Result | Output and SHA-256 |
| --- | --- | --- |
| CLI config owner | Exit 0. 9 passed in one file, 1.57 s wall. | `preflight/config-owner.log` `1e1b594a2eb5dfba2140b1278844070e1f23127b6d3ed6da60a3001127777584` |
| Security settings owner | Exit 0. 3 passed, 140.00 s wall. | `preflight/security-settings.log` `20ae871adc0eaf795d433615b3180920928dbc155ee5032e541b7805e753e72e` |
| Pre-gate pins | Exit 0, 20.52 s wall. | `preflight/pins.log` `785756a936fe0a55bbccae8ec082f3eab132f9ba422e98b3db334ade3ddea3b0` |
| `npm run gate` | Exit 0, 1,283.25 s wall. | `gate.txt` `e8185014cc79c23210f3117c54f55979d635b6e34e3deeecab15dff07bfbfa6a` |
| Test stage ledger | Kernel checked 166 production sources with zero refusals. Node passed 246 and Counting passed 60. Plain passed 5,141 with one skip. Native passed 1,240 with two skips. Native timeout crossings recorded zero lost, two stale and zero unowned. | `gate-files/test-evidence/stages.json` `e49cb939d6c3662aabe70c41c810dcdd52cc5fd257ee0dfc5b8f4b70e54263f1` |
| Scale selection | `outside-scale-paths` for the two structural paths. | `gate-files/test-evidence/scale-selection.json` `d2dc144efed5660dc5f873e73427b9ac50c0a730c6afb1824d8405a55591a00d` |

## Hosted follow-up

The planner deploys this structural head with both settings unplanned.
The later timed step uses one retained, signed register plan and the
matching `REGISTER_SCOPE` and `ARTIFACTS_CONFIG.registerScope` values.
The plan deadline contributes to the register ID. The planner asks the
checker about availability before signing and keeps an attempted plan
for reconciliation. The [BO1-W1 plan](2026-11-22-bo1-w1-commons-plan.md)
records the checks, time limits and witness conditions.
