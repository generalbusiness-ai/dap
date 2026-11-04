# Goose runs dap cards with limits on waits and model context

Goose Desktop 1.57.0 renders dap's four card views and records a real
native approval through a card. A repaired **Ask in chat** press
also reaches the model. Goose can supply useful checks before a person's
session, but these observations do not establish a complete agent host
or replace the desktop AI app's own acceptance scenes.

Request `1a44f042` and promise `3b2ced3e` own this report. The earlier
[CLI record](2026-11-01-goose-host.md) remains a historical partial result.
The [revision repair](2026-11-03-goose-revision.md) separately records its
approved source child and real Goose and Claude preservation scenes.
This report changes no dap runtime, tests, or host configuration.

## Purpose judgments

- **Builder's own test host: sufficient with named gaps.** Actual cards,
  app-only reads, approval, receipts, reload, and long waits expose faults
  without asking a person to drive those checks. Native control repeatedly
  loses the Goose window and needs a person to reopen it. The 120-second
  wait, model-context delivery, changed-file diff, and interdiff remain
  limits. Goose supplies bounded checks, not unattended replacement for
  every person-session scene.
- **Second supported host for people: sufficient with named gaps.** The
  four views render, and a person can approve the displayed Question.
  A call beyond 120 seconds displays a timeout; fullscreen reports an
  inconsistent result; a restarted server requires reopening the view.
  Changed-file diff, interdiff, and large-card delivery remain unverified.
  These bounds must accompany any claim of Goose support.
- **Agent host: not sufficient on the available evidence.** The existing
  model executes bounded reads, and **Ask in chat** creates a user turn.
  The model did not report the approval receipt or signer after the
  context-update probe. The configured scratch identity is a person key;
  the name `@gooseagent` does not establish an enrolled agent identity.
  No autonomous act, agent authority, or complete agent lifecycle ran.

## Sources and observation labels

**Observed in Goose** means native accessibility, a native screenshot,
or protocol metadata from the installed app. Model prose alone proves no
card render. Screenshots were viewed in the conversation; the retained
units contain no standalone screenshot files unless their manifests say so.

**Read from source** means the retained official Goose 1.57.0 source at
`30bba95105e59bc3e7df624cf6b4d433690cfe12`, as indexed by the earlier
source matrix. Matching version strings do not prove installed binary
equality. **Not reached** names an actual evidence limit.

The four-view scene ran fixed dap source `e32d7dfc`. The lifecycle,
approval, theme, and first size probes ran `18f16811`. The final handoff
and delayed reads ran `bf3bceb6`, which includes the common content-array
repair. Those checkpoints are separate observations, not one run.

## The ten requested rows

1. **Extension negotiation and a resource without `ui.domain`: observed
   in Goose.** Discovery advertises `io.modelcontextprotocol/ui` with
   `text/html;profile=mcp-app`. Goose reads the real `ui://` resource,
   whose recorded metadata has no domain, and renders the card. The old
   revision reply `2025-11-21` initially stopped dap's stricter bridge.
   The separately reviewed bridge now accepts that revision and
   `2026-01-26`; both real-host preservation scenes render.

2. **App-only tools: observed calls, source-backed visibility.** The
   advertised catalog marks `view_read` and `view_act` as app-only. The
   actual card calls both: navigation uses `view_read`, and approval uses
   `view_act`. The recorded Goose source filters tools whose visibility
   omits `model`. The model used normal read tools; that behavior alone
   does not independently prove the absence of every hidden tool from
   its complete runtime catalog.

3. **Processes and routing: observed in Goose.** Each configured scratch
   extension starts one observer relay and one real dap server. The relay
   adds a process and logging overhead. In the final run, Goose's child
   relay 57203 launches server 57217; both model and card calls traverse
   that connection. Reload closes the old pair and starts a new pair.
   These observations expose one real server per connection, rather than
   the earlier desktop AI app's separate connections. They establish no
   process topology for another host.

4. **Input, result, structured content, and fallback: partly observed.**
   Real cards open with their selected view, read structured results, and
   display the resulting private card. The observer retains the
   `structuredContent` presence and frame hashes. Earlier CLI transcripts
   preserve that field, and normal read-tool fallback JSON agrees with
   it. Read from source: Goose forwards card input and result and retains
   structured content during normalization. No test removes structured
   content from a Desktop result, so fallback-only Desktop behavior
   remains not reached.

5. **40 seconds and beyond 120 seconds: observed read-reply holds.** A
   real card press makes a real read. After the service answers, the relay
   holds the unchanged successful reply for exactly the declared delay.
   It changes no payload, result, Native deadline, or extension timeout.
   The 40-second hold releases 10,144 bytes, and detail renders afterward.
   The 130-second hold releases 10,172 bytes after 130,001.39 ms with the
   same hash. The actual card displays “The app did not answer tools/call
   in 120 seconds.” That message comes from dap's own `AppBridge` timer
   and `TOOL_WAIT_MS=120000`, not an observed Goose backend cutoff.
   Goose's extension timeout remains the default 300 seconds.
   The late reply does not restore the parent needs-you view. Offscreen
   accessibility reads temporarily retained disabled controls; scrolling
   the card into view revealed the timeout. No retry manufactured recovery.
   These are injected host waits after real reads, not slow Native acts.
   Cancellation of a slow server operation remains not reached.

6. **Largest answer: host limit not reached.** The largest successful
   recorded tool reply across these Desktop units is 10,191 UTF-8 bytes,
   excluding its final LF. The final resource reply is 49,765 bytes and
   contains 48,239 HTML bytes; a resource frame is a separate measurement.
   A real 65,536-byte Question body hits dap's own display budget. One
   authorized revision produces a 60,659-byte body whose item-page card
   exactly meets the 61,440-byte canonical limit. The first model opener
   adds a forbidden list scope and fails before reading that Question.
   The corrected opener reaches the summary page, whose additional
   reasons exceed the display budget. No large body reaches Goose.
   This result establishes neither a Goose size refusal nor a host limit.
   The separately reviewed [summary repair](2026-11-04-question-summary-budget.md) now keeps summaries within their display budget. This report adds no later large-answer host scene.

7. **Context, message, display modes, resize, theme, and CSP: mixed.**
   Observed in Goose: after approval, a no-tool model query reports the
   Question and revision from the opener but cannot report the receipt
   verdict or signer. This proves no `ui/update-model-context` delivery.
   The retained Goose source has no explicit handler for that request.
   The pinned 2025-11-21 upstream interfaces also omit the method, so
   missing delivery is a compatibility limit, not proof of a Goose
   protocol defect. Dependency behavior remains a limit. The original **Ask in chat**
   press fails because dap sends an object where the host requires an
   array. Separate child `697bdbe2` repairs the common caller. At
   `bf3bceb6`, one real press creates “Help me with manifest 21, revision
   23.” The model reads `needs_you` and completes its response. That
   message names the parent list identity while detail shows Change 2,
   version 1; it proves no selected-version handoff. Goose enters its
   fullscreen presentation while the card reports that fullscreen was
   not granted. Inline detail remains usable. Window zoom visibly
   reflows the title, but supplies no exact resize-notification payload.
   Light and System themes reach remounted cards; Settings navigation
   prevents a same-mount theme-notification claim. Read from source:
   Goose forwards CSP metadata into its sandbox. No active CSP-blocking
   test ran, so enforcement remains not reached.

8. **Native approval and receipt: observed in Goose and independently
   verified.** One actual **Approve** press records Question 4's review.
   The card displays “Review recorded: approved. Signed by @gooseana
   (person).” A separate read-only verifier checks the signed approval,
   body reference, and entry hash at sequence 7:
   `sha256:8a1dce8866db9faf5bd037cb064024b109bd97d8a75598ef987d17abfc5335e7`.
   The verification script signs no act. No Request changes, Decide, or
   Merge press ran. The earlier diff press separately records one
   read-token act followed by confirmed mint-read, not a merge.

9. **Reload and saved chat: observed in Goose.** Native reload closes
   one server pair and starts another. The first old-view read returns
   an error; opening a fresh view succeeds. Reopening the saved chat
   retains its rendered card. A later **Open** reaches detail through the
   new server. Persistence of rendered HTML therefore does not establish
   persistence of the server's in-memory view identity.

10. **Four views, diff, and interdiff: partly observed.** Needs you,
    Decision, and Change render their real TEST content. Work renders
    its expected empty state. The actual **View diff** press displays
    “No difference: the two commits hold the same files.” Both sides
    name the same commit, so the result proves no changed-file rendering.
    Interdiff remains not reached. The diff design still requires Hugh
    to see renders and decide before a build; this report bypasses no
    design decision.

## What Goose could catch before a person's session

Goose supplies a real absent-domain sandbox render, so it can catch a
card that fails to mount in that host. It exposed the unsupported revision
and the common `ui/message` content shape. Its card presses and protocol
recorder expose the actual server connection and dap's 120-second wait.
The 40-second row exceeds the earlier ten-second press boundary, though
it holds a read reply rather than delaying a Native act.

Goose cannot reproduce the desktop AI app's domain policy or process
split merely by using a different sandbox and one extension connection.
That app keeps its own sandbox, simultaneous-connection, slow-act,
receipt, and chat-reopen checks. Claude preservation confirms rendering
after the revision repair, but it does not supply those missing scenes.

The 120-second timeout is an observed dap card boundary. No recorded
JSON-RPC cancellation reaches the server during the injected wait. The fullscreen
discrepancy and missing receipt-context delivery remain named limitations;
this report does not assign an unproved root cause to Goose. The earlier
content-array error belonged to dap and has its own reviewed repair.
The separately landed summary repair supplies no later Goose size scene. The separately landed [Card history repair](2026-11-04-card-history.md) tests late signed-act replies at fixture boundaries; it supplies no new Goose recovery acceptance. The historical 130-second hold in row 5 calls `view_read`, whose timeout already offered **Read card again**. No recorded press tests that recovery.

## Configuration, custody, and evidence

Every real request uses the existing Ana scratch identity against
dap-demo. Setup, the approval, and the one size-fixture revision affect
only the new scratch room. No real-room owner home enters Goose. The
existing provider and model remain configured; no new credential or
provider purchase occurs.

The final run temporarily disables the seven original default extensions
and enables only `dap_goose_followup`, with the default 300-second timeout.
The exact original configuration returns: 3,540 bytes, mode 0600, SHA-256
`c8412475547121797fea881db71b72cb8819b2fb5180b49a905f8ace7a1ff321`.
The verified owned relay and server have stopped. After Hugh reopened
the window on 4 November, builder used native **View → Reload**, then
opened **Extensions**. All seven original defaults were on, and no scratch
extension appeared. The exact configuration hash and mode still matched;
the retired launcher remained mode 0000. The sealed cleanup unit is
`~/play/artroom-evidence/2026-11-04-goose-cleanup-recheck-6`. This later
observation completes cleanup; it runs no new host scene.

The [final observation manifest](evidence/2026-11-04-goose-ten-row.manifest.json) names 79 sealed files across six units. Those units contain public TEST content and protocol metadata, never configuration contents or private custody. Earlier initialization, four-view rendering, source inspection, and the separate repair retain their existing reviewed manifests. Retain these units for at least 30 days and record any later removal in a workroom act.

| Observation | Unit and retained file | Result |
|---|---|---|
| Reload, theme, resize, and the first size probe | `2026-11-03-goose-lifecycle/result.json` | Observed at `18f16811`; size probe stops at dap's budget |
| Native approval and independent verification | `2026-11-03-goose-review-card/native-verification.json` | Question 4, sequence 7, approved by the Ana person key |
| Original message shape | `2026-11-03-goose-message-shape/comparison.json` | dap sent an object where the host required an array |
| Original wait setup | `2026-11-03-goose-waits/result.json` | Preserved separately from the final delayed replies |
| Final Ask press and 40-second and 130-second read-reply holds | `2026-11-03-goose-waits-followup/result.json` | User turn created; long read hits dap's unchanged 120-second timer |
| Exact configuration and native cleanup reload | `2026-11-04-goose-cleanup-recheck-6/result.json` | Original hash and mode match; seven defaults enabled; scratch extension absent |

## Gate and documentation follow-up

This report follows the completed [Card history gate](2026-11-04-card-history.md). Its actual `gate.exit` reads `exit 0` at source `ee9781b3398f35ac40e44a8acca85e5de14b3020`, tree `030639b65693c9db6a43111d95849a31d07b5622`. That gate took 1,623.11 seconds and completed all four terminal phases: 135 Node, 56 Counting, 3,911 plain with one skip, and 1,078 Native with two skips. Its [gate manifest](evidence/2026-11-04-card-history-gate-validation.manifest.json) retains the exact source, dependency, completeness, process-closure, and raw-output records.

Only documentation differs from that gate: the Card note and two manifests already on main, plus this report and its observation manifest. Source and tests remain unchanged. The review names both the gate tree and final candidate tree and records document-link, notes, whitespace, and commit-message checks. The documentation-only follow-up rule in [Test dap](../../docs/testing.md#follow-up-after-a-gate) requires no repeated gate. This existing gate establishes no earlier Goose observation or new real-host acceptance.

The [initialize record](evidence/2026-11-02-goose-initialize-reply.manifest.json), [four-view record](evidence/2026-11-03-goose-supported-desktop.manifest.json), and [Claude preservation record](evidence/2026-11-03-claude-goose-preservation.manifest.json) retain their own earlier source checkpoints and observation files. The final observation manifest records full Git heads and trees for the later `18f16811` and `bf3bceb6` scenes. The cleanup checkpoint executes no dap server. No deployment follows this report.
