# Observe one scope through native HTTP

`observeScope` observes an authenticated complete snapshot while the existing
HTTP `/stream` announces head changes. It sends no domain mutation and does
not settle a command. Keep pending requests, Spokens and known answers in
their existing custody owner.

Supply a fixed `ObservationContext`: exact service origin, full scope and
membership references, definition pin, member, key and trusted expected
deployment. Session claims must match every captured identity; this does
not infer a deployment from an untrusted response. `authenticate`
obtains the caller's existing native read session; it must not enroll or
replace that caller. `openHttpHeadStream` sends its token in Authorization,
never in the URL. Its stream-specific HeadStreamFetch requires supported
redirect:error and response url/redirected/headers metadata; it rejects any
redirect, changed response route or non-application/x-ndjson body before
reading. The narrower ordinary Fetch type is not assumed to supply these
guarantees. The current binding/MCP interfaces expose no equivalent
stream, so they are unsupported unless an adapter actually supplies it.

The `snapshot` callback is an adapter over actual authenticated reads.
For a native Summary, `completeSummary(await handle.summary())` preserves
its real identity and `at`; it does not manufacture a head or native proof.
Other projections must validate their own values and complete same-head
pagination. One scope is observed; this is no atomic room/vector snapshot.

The first validated head emits `streaming` before the first snapshot request.
Each connection emits this state, even when the notice has the same head as
the retained snapshot. The state reports a working subscription, not a new
snapshot or current authority. At most
one refresh runs; updates during it coalesce into another read. Valid data
obtained behind a newer notice is emitted `retained`, so a busy scope still
shows useful stale data. No lower complete view replaces a newer one;
same-sequence/different-hash is a visible error. Head notices do not carry
incarnation/pin, so the snapshot verifies those exact captured bindings.

Every NDJSON frame is bounded at 1,024 raw payload bytes before decoding or
parsing. Accepted chunks are at most 64KiB; retained frame storage is at
most 1,024 bytes. Nonempty processing yields to the task queue after
16KiB or 32 frames, while heads remain coalesced state. This is no lifetime
byte quota and cannot bound buffers allocated by the upstream.
Reauthentication, open, first head and each snapshot wait default to 30
seconds, configurable up to 300. Reconnect waits are independent: the default
waits are 1, 2, 4, 8, 16, then 30 seconds, capped at 30 seconds. A valid notice
resets the backoff. Cancellation interrupts the wait even when a custom
`reconnectDelay` ignores its signal. Session
expiry on the local clock triggers a renewed native read session and a new
subscription/current snapshot. The server's actual token windows decide
access; EOF does not mean revoked. Forbidden renewal stops visibly. An EOF
reconnect reads current state and claims no missed-history replay.

EOF before any notice is unavailable with reason `stream-ended-before-head`.
A transient outage emits one `fallback` state with its reason and optional
retained snapshot. Repeated failed reconnects do not repeat that signal.
A valid notice resets the outage and emits `streaming`, so a subscriber can
stop its own polling before another snapshot completes. EOF after a notice
uses reason `stream-ended`; session renewal uses `session-expired`.
Existing terminal `forbidden`, `unsupported`, and `error` states remain
terminal. They do not start fallback polling.

The room Page trusts its own serving HTTPS origin for the initial native
session's deployment identity. It captures that identity once and checks
later sessions against it. This is service trust through the same origin,
not an independent deployment assertion. During a transient outage, the
Page polls complete authenticated summary heads every five seconds by
default. Its retained `pollIntervalMs` setting accepts 1,000 to 60,000
milliseconds. A valid stream notice stops those polls.

`current()` must remain true only for the application's captured context;
call `cancel()` immediately when it changes. Checks after awaits and before
emission reject late results; `refresh()` also detects a changed context.
A changed context suppresses ALL old UI emissions, including cancelled,
so an old observer cannot clear a new renderer. Explicit cancel while the
captured context remains current emits cancelled once. EOF/error aborts the old attempt before a pending snapshot can be painted
current. Abandoned open callbacks that later yield a body receive a
best-effort cancel, with late rejection handled. Cancel asks
fetch/body to abort and resolves local waiting without depending
on an upstream reader obeying cancellation. An ignoring callback may retain
its own resources; the helper cannot physically drain it. No token/key is
returned in observation states or diagnostic reasons.

Source checks use the client Node codec/transport lifecycle fixture, not a
native/provisioned/hosted acceptance claim. Existing Scope `sessions.test`
shows first native head, cancellation/release once, token window and restart;
`operations.test` shows late committed heads. Those tests were read and not
rerun for this helper. No new native test is needed to repeat those backend
semantics; any new handoff gap must be named before its serialized execution.
