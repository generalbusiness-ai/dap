# Compact-card kit: preparation

This is preparation for request `a9551a6d`, promise `3710cde8`, and
clarification `f89c614b`. The design child `bc635338` is landed on Main
`df806354`; its approval does not establish runtime behavior. Capacity
Source `f254698d` is with checker. Runtime implementation follows capacity.

The current reference is
[the compact-card design](../2026-10-17-compact-cards-design.md).
The prototype is a behavior reference, not an implementation to copy.
This checkpoint adds no runtime code and claims no passing kit witness.

## Boundaries

The kit composes a generic card from its kind, exact displayed revision,
actor, reasons for attention, at most two acts, narrow model context and
useful text fallback. Needs you, Work, Decision and Change supply the
application data. Lane names and state transitions do not enter the kit.

The MCP service owns reads, signing and custody. The view holds no keys.
An opening tool returns identity, screen kind, revision, counts and a
short text fallback. Titles, bodies, actors and histories come from a
separate app-only call. Neither initial structured content nor result
metadata is assumed to be hidden from the model.

App-only visibility is enforced by the MCP Apps host. It is not proof
that a raw MCP client cannot call a tool by name. The basic-host witness
must filter the model's tool list and enforce same-server app calls;
server authorization still applies to every read and act.

Package resources provide HTML, an expected byte digest and resource
metadata. Check the bytes before serving them. Preserve declared CSP and
permissions rather than replacing them with an empty policy. The journey
resources declare no external domains. Host aliases and the dedicated
origin belong only in `views/hosts.ts`; the basic host must work without
that adapter. M1's package installation remains separate work.

## Service and bridge

Both existing wire revisions need resource list and read methods, with
their existing discovery and result conventions. Resource metadata links
view tools to the four S2 `ui://dap/` resources. Resource and tool changes
must participate in the existing generation and paging rules.

Keep the browser entry separate from the server's TypeScript compilation.
The current MCP configurations provide Node or Workers globals, not the
browser DOM. A separate browser configuration must check the bridge;
adding DOM globals to the server would hide an accidental browser import.
Bundle each resource to one HTML file with inline code and styles. The
existing Counter asset generator is the repository's build pattern, not
a source of application-specific view code. Add a freshness witness that
rebuilds those four resources from their actual inputs and compares the
served bytes and digests before the final gate. Fixture histories and the
test host must not become inputs to the production resource bundle.

The view uses the standard MCP Apps handshake and JSON-RPC messages over
`postMessage`. Accept messages only from its parent. Bound outstanding
requests, clear their timers on reply and teardown, and report denied or
unavailable host capabilities without inventing success.

Navigation reads through the server and updates model context quietly.
Keep projection read points, actual entry bodies read, presented ranges,
intended review cutoffs and unavailable ranges distinct. Summary cards
claim no entry bodies. Back refreshes the parent while preserving the
selected item and return point; a failed refresh is not an empty queue.

Inline is the summary; detail requests full screen. Back requests inline
again. Respect the mode the host actually accepts. Measure the dedicated
content root after render, width and font changes, and report smaller as
well as larger heights. Use host style variables and no custom font load.

## Acts and the captured-revision prerequisite

The server must bind an act to the exact displayed revision and its
subject. It must also reject a superseded view instance and duplicate
dispatch. A disabled button alone establishes none of these properties.
Lost replies use existing custody and settlement, retaining the original
envelope; a view refresh or context retry must never sign a successor.

Current `McpService.#perform` derives `expectedOf` from a fresh summary.
It accepts no captured revision input, and custody's meaning excludes
one. Planner report `c3079e3c`, answering routing request `c5a9acd0`,
brings forward only optional `at` input from S6 for the S2 model-act
witness. Omission keeps the existing fresh-summary behavior. A present
`at` names exactly the expected subjects with their displayed revisions;
missing, extra or malformed subjects refuse before signing with a named
reason. The signed `expected` set keeps those captured numbers. The
scope's own check refuses a stale revision; the service adds no second
judgment and substitutes no fresh revision.

Include explicit `at` in custody's meaning while preserving the meaning
bytes of omitted-input requests. Reusing a key with another captured set
must conflict. Re-reporting a kept request must retain its original
envelope, even after the current state moves; check new-envelope coverage
inside the existing custody build path. The witness must distinguish
native stale refusal from a service that silently refreshes or rejects
the revision before signing. Full S6 views and J1 remain separate work.

After acceptance, keep a one-line receipt while loading the next card.
Record it in model context. If reporting fails, retry the notification,
not the act. Ordinary acts start no chat turn. Only explicit handoff uses
`ui/message`; free text goes to the host composer. Older instances keep
readable receipts and lose their write controls.

## Witnesses to build

- Resource serving rejects altered bytes and preserves nonempty metadata
  in a separate fixture; both wire revisions retain useful text fallback.
- A basic host pages, opens, goes Back and refreshes with preserved
  identity; denied, absent, incomplete, stale and unavailable stay distinct.
- Actual bridge messages carry narrow context matching the displayed
  revision. A subsequent model act signs that captured revision; a relevant
  concurrent change causes a native refusal rather than silent retargeting.
- Two mounted instances, duplicate clicks, lost replies and failed context
  reporting cannot produce a second write or discard unresolved custody.
- Browser checks cover light and dark, chat and phone, keyboard focus,
  controller identity, accepted and denied full screen, and height changes
  in both directions through the sandbox relay.
- A recorded rehearsal compares in-place receipts with message-per-act.
  State what the host actually did and why the chosen flow was retained.

Fixture projections and a basic host prove their stated interfaces. They
do not establish real lane authority, a provider operation or acceptance
inside a desktop AI app. That acceptance remains owed under the parent
request. No deployment is part of this preparation.

Protocol reference: [MCP Apps, stable 2026-01-26](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx).
