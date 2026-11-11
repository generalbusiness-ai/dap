# Serving windows that leave room for another sender

This source proposal addresses request
`8bd2c9d2208811e7540a64d570515394d487c83a` under builder promise
`75b128e9f86b452f70c156e9f5c00b1d5545c069`. This source integrates
reviewed V2 at main `df41e59964f09ce1d723ce870f5e4e5c6d8d4641`.
The original V1 and corrected V2 proposals remain unchanged historical
inputs. V1 was not adopted. The five witnesses, compiler checks,
controls, and gate remain **UNRUN**. Required AST seal values remain
pending actual maintained output.

Creation, signed reads, and register `found` own separate capped
tables. An exhausted address creates no key row. Each table retains
8192 identity windows and one shared overflow window; full capacity
alone refuses no new identity. The overflow budget uses the lower
key/address limit. Only expired windows leave a table. All three
tables hold at most 24,579 windows in total. Restart or actual owner
eviction resets these memory counters.

The Site window calls `addressKey` for every valid IP, so one
routable IPv6 /64 uses one identity. It retains 4096 identity rows
plus a shared 240-attempt overflow window. `missing` remains one
bucket. Bounded non-IP transport labels retain distinct `opaque:`
identities for existing local callers; they cannot alias canonical
`address:` IP keys. The same table and overflow bounds cover them.
There is no fixture-only production switch.

Cloudflare supplies the public edge address. The sandbox reads that
platform header and passes the value as an explicit argument to
`ApplicationScreenService.native` or `nativeStream`. The service
ignores a forwarded header when no argument accompanies it. A real
browser cannot replace Cloudflare's edge header with a synthetic
transport label. Hosted and other in-process callers remain
addressless unless their trusted transport explicitly provides an
address. Local tunnel header custody remains the separate S3 lane.

The cheap creation decision runs at the fixed index before HTTP
body reading, JSON parsing, bounded signed-value copying, and
signature verification. In-process creation reserves the address
before copying its supplied signed value. The reservation records
which owner incarnation and overflow window it charged. The private
creation path carries that identity into verified-key accounting. It
skips a charge only for that same still-live window. Expiry or owner
restart makes an older reservation charge the new window normally. A body and the public API cannot supply the
reservation. The counter still grants no native authority, and the
unchanged creation admission and judge decide the operation.

`found` uses its own hourly key and address windows, with the existing
creation settings as its finite limits. Ingress verifies custody for
the key charge and refuses serving exhaustion before target lookup.
The original native signature, founding policy, authority, and
judgment remain in force. The patch adds no contract refusal or
reason; it uses the existing serving `rate-limited` unavailable
answer. The entry-point inventory now describes open-register acts
as self-signed; ordinary acts still require their native authority.

The proposal leaves `has` as a fresh read-only SQL index lookup.
It adds no `has` cache, expiry policy, or persistent serving state.

The sandbox gateway still admits the maintained native routes on
its configured room Worker. Its pinned descriptor contains only a
directory, installation item, and presentation digest. Application
flows also call the installation's membership, rules, destination,
and lane scopes. Restricting every call to the directory ID would
break those flows. A complete room-scope allowlist needs a separately
reviewed context contract or bounded native projection; the current
descriptor cannot establish it at small cost. Address propagation
closes this finding's shared serving-bucket failure without granting
new authority or widening the existing route set.

The five witnesses share the existing owners:

| Finding | Witness and boundary |
| --- | --- |
| 1.1 | The revised `serving-limits.test.ts` churn case sends exactly 8191 keys from one address, then admits a fresh creator, a fresh reader, and a returning reader. A small cap also proves bounded overflow, separate read capacity, no live eviction, and one two-phase overflow charge. |
| 1.2 | The revised `site-window.test.ts` churn case sends 4096 addresses from one /64 and admits a different visitor. It also fills the real dedicated cap and tests the one shared overflow limit. |
| 1.3 | The added sandbox Site case in `serving-admission.test.ts` crosses the actual gateway, named Worker service binding, and fixed serving owner. One visitor's exhausted Site window leaves a different visitor admitted. Only the edge Request and ExecutionContext stand in for Cloudflare. |
| 1.6 | The added `found` case in the same file checks one key across addresses and one address across keys before a target stand-in. It proves serving admission, not native founding authority. |
| 1.4 | The added HTTP creation case traps body access after exhausting the address window. It expects 429 with zero body reads and no target selection. |

The review's original traces and output remain separate historical
inputs. No source preparation result replaces those observed
failures. The added cases and baseline distinctions still require
their actual booked executions.

This source includes the landed identifiers (b) through main df41.
The S1 gate follows JP1 and OPS1 under the current work order, after
ordinary working checks and exact source correspondence review.
Root owns all bookings and execution. The planner deploys after
landing. This draft claims no acceptance, deployment, review
approval, or successful validation.
