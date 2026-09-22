---
date: 2026-09-22
status: >-
  research note. It adopts nothing. A survey of Weixin (WeChat) Mini
  Programs for multi-party use cases that overlap dap's, with the platform
  model compared to dap's in both directions. Usage numbers are from the
  sources listed and are uneven: platform totals are current, category
  shares are from Aladdin's TOP100 index, and the multi-party subset is
  ranked by my judgment from those, marked as such. Extended the same day
  with three sections on Web-native onboarding, the role of payment, and
  chat without the channel silo.
origin: Hugh's question of 2026-09-22.
bases: >-
  notes/2026-09-20-direction-and-next-steps.md (the roles, the ladder,
  the structure spectrum); notes/2026-09-14-evolving-spaces-design.md §1,
  §2, §5; the sources listed at the end, read 2026-09-22.
directions: notes/2026-09-20-direction-and-next-steps.md
---

# Weixin Mini Programs and dap: overlaps, flexibility, and what people actually use

## In one paragraph

Weixin Mini Programs are the largest working example of situated,
low-friction, multi-party software: about 973 million monthly users
across 4.3 million programs in early 2026, opened from a chat, a share
card or a QR code, with identity and payment already present. Almost
every popular one is a business talking to many customers one at a
time. The genuinely multi-party ones, group buying chains run by a
neighbour, sign-up and to-do chains inside a group chat, class groups,
property management, are smaller but real, and WeChat has pulled the
lightest of them into the chat client itself. The platform is more
flexible than dap where it counts for adoption: joining is one tap, the
person is already identified, notifications land in the chat, and
structure is added to a conversation rather than started as an app. It
is less flexible exactly where dap's direction sits: the record belongs
to the developer, not the person; each program is a silo, so a family's
situation spans six programs and three group chats with no shared
history; audiences and views are whatever each developer coded;
notification and even the right to operate in medical or financial
categories are gated by licence; and nobody can run their own serving
party. What is demonstrated at scale is that people use light structure
around a real activity, and that an organiser or professional can
introduce a tool through an existing relationship. What is not
demonstrated, here or anywhere in this survey, is that people value a
retained, attributed account across independent providers enough to
maintain it; that is dap's own hypothesis and §9 says so. The platform
does not itself provide such a user-governed, portable account across
independent services.

Two project terms: a **context** is one governed scope of decisions with
one ordered record; a **package** supplies the rules for one part of an
activity.

## 1. The platform model, in dap's terms

| Weixin | Nearest dap idea | What differs |
|---|---|---|
| a Mini Program: one developer's app inside WeChat, reviewed by Tencent, under a category | a package plus the client that renders it | one developer owns logic, data and screen together; nothing composes across programs |
| `openid` per program and `unionid` per developer, on a real-name WeChat identity | a principal | issued and verified by Tencent; a person cannot bring their own key or run without Tencent |
| `openGID`: a group chat id a program receives when opened from a card shared into that group; different programs get different ids for the same group | a context-scoped identity; "this dap" shared into a relationship | the same per-context isolation choice dap makes for keys, but only for groups, only on share-open, and with no membership list |
| a share card into a group chat, or a QR code | the envelope and route; the weak offer to become a participant | one tap and you are in; there is no invitation carrying a role |
| subscription messages, one-time or long-term | the notification half of an obligation | one-time needs a user tap per message; long-term is open only to public-service categories such as government, medical, transport, finance and education |
| WeChat Pay | payment | in dap's scope by omission |
| cloud development, or the developer's own server | the serving party and the record | the developer holds the record; the person has no export, no history across programs, no view of their own |
| category licences: medical needs an institution's licence and agreement, finance a financial licence | the trust profile | a person-controlled claim or care space could not even register in those categories |
| WeCom (企业微信) customer groups, up to 500 WeChat members, and customer inheritance when an employee leaves | the professional acting for a firm; colleague handoff | the firm's relationship survives the representative, which is the requirement the direction note's generality story states |
| native group tools: 群接龙 (a chain anyone can append to), 群待办 (a group to-do), 群投票 | the unstructured end of the structure spectrum, with a little structure added inside the chat | WeChat moved the most-used mini-program pattern into the chat client itself |

## 2. Where Weixin is more flexible in practice

- **Joining.** No install, no account, identity already present, payment
  already present. A card in a group chat is the whole onboarding. This
  is the bar dap's rung 2, "can you confirm this arrangement?", has to
  meet.
- **Structure grows out of the conversation.** A chat is the default.
  A chain, a to-do or a vote is one tap inside it. A mini program is
  the next step up. A shop is the step after. Nobody starts by choosing
  an application. This is the direction note's spectrum, and WeChat shows
  people climb it in that order.
- **Reach and verticals.** Hospitals, governments, insurers, property
  managers and schools are already on the platform with their own
  programs, so the supplier side of many dap cases exists today, one
  program at a time.
- **Firm-to-person bridging.** WeCom lets a business's staff talk to
  ordinary WeChat users inside groups the business governs, with the
  business keeping the relationship when staff change.
- **Developer freedom inside the box.** Arbitrary logic and data, real
  identity, real money, on a platform users trust.

## 3. Where Weixin is less flexible in practice

- **The record is the developer's.** A person has no account of their
  own dealings, no export, and no history that survives the program.
  Retention and recovery are the developer's choice. dap's first
  requirement, useful to one participant with a coherent attributed
  account, cannot be built by a user on this platform; it can only be
  given to them by a developer.
- **Silos.** Every program is one developer's world. The family
  situation in the direction note, parents into assisted living, would
  be a hospital program, a facility's program, an estate agent's
  program, a mover's program, two group chats and a shared document,
  with no shared record and no one screen. That is exactly the gap dap's
  perspective and anchor are meant to close.
- **Audiences and views are hand-coded per program.** There is no
  platform notion of who may read what across parties; each developer
  implements whatever visibility they implement. dap's consistency
  property has no counterpart.
- **Identity and trust are centralised.** Real-name identity is a
  strength for onboarding and a limit for anyone who wants a
  context-scoped identity or a chosen representative. Identity and
  distribution depend on Tencent; an application's backend may be the
  developer's own, and portability and export depend on that
  application.
- **Notification is rationed by category.** Long-term subscription
  messages go to licensed public services. Everyone else gets one
  message per user tap. Any dap-like space that needs to tell a person
  "the adjuster replied" cannot do so unprompted unless it is the
  insurer.
- **Licensing gates the cases that matter most.** Medical and financial
  categories need institutional licences to register at all. The
  structurally disadvantaged party cannot run the space; only the
  supplier can.
- **Group context is coarse.** A program learns a group's id only when
  opened from a card shared there, and never learns its membership.
  There is no attaching a second program to the same relationship, and
  no mid-stream change of rules.

## 4. What people use, ranked, and what overlaps dap

Platform totals: 973 million monthly users of WeChat Mini Programs in
March 2026 (QuestMobile), 764 million daily in 2025, 4.3 million
programs. Aladdin's TOP100 index by number of programs: tools about
36 percent, retail and life services about 10 percent each; internet
companies about three quarters of the list. Category order by use, from
the same sources: e-commerce and local services first (shopping, food
delivery, ride hailing, reservations), then games, tools, education.

The multi-party subset below is ranked by my judgment from those
sources. The tiers are about order of magnitude, not precise counts, and
most of tier 1 is one business talking to many people one at a time.

| Tier | Use case | Evidence of scale | Overlap with dap |
|---|---|---|---|
| 1, hundreds of millions | scan-to-order at restaurants, including a shared cart for a table | the local-services category leads all others | one context, one transaction, many parties briefly; the shared cart is a tiny partitioned view |
| 1 | group buying (拼团) in e-commerce programs | e-commerce is the largest category | many-to-one around one offer; no shared record among buyers |
| 1 | government services, including the health-code era | public-service categories are the only ones with long-term notifications | the citizen-to-state case; one-directional |
| 1 | hospital registration and payment | one vendor alone serves 1,000 institutions and 8 million bookings; medical is a licensed category | the care episode's structured island; proxy booking for a relative shows the helper role |
| 2, tens of millions | community group buying with a neighbour as 团长 (group leader) | 群接龙 reported 12 million users, 4 million monthly and 600,000 daily by late 2019 with 27,000 leaders | the closest live instance of dap's roles being multiple and nebulous: a neighbour introduces and controls, neighbours participate, a supplier furnishes goods |
| 2 | sign-up and collection chains (群接龙, 接龙管家), now native in the chat and interoperable with the desktop client since 2026 | WeChat built the pattern into the client, which it does only for mass use | the participation ladder in miniature: a line in a chat, then a program, then a shop |
| 2 | collection forms and shared sheets (腾讯文档, 问卷星) opened from a group | tools are the largest TOP100 category | a shared record with roles, but the document is the record and the people are cells |
| 2 | class and school groups on WeCom, with notices, fee collection and forms | WeCom customer groups hold 500 WeChat members; an education edition exists | the firm-backed professional with parents as participants; handoff between teachers is built in |
| 2 | property management: report a repair, pay a fee, vote on a resolution, sign up for an event, read notices | a standard product category with many vendors | the supplier side of the water-leak case, and a checklist presented to residents |
| 2 | insurance claims: one-tap claim, photo evidence, progress tracking | one insurer's one-tap claim is used by over 88 percent of its claimants; online claim satisfaction above 95 percent in 2025 | the claim case, entirely on the insurer's record; the claimant has no account of their own |
| 3, millions or fewer | carpooling, shared expense books, shift scheduling, wedding invitations with RSVP, group albums, renovation platforms | present in the tools category; no scale figures found | each is one relationship with light structure; the shapes dap's spectrum covers at rung 2 |

Three observations from the ranking.

- **The biggest overlaps are one-to-many, not many-to-many.** The
  largest programs put a business in front of many people. Genuine
  multi-party coordination lives in tier 2 and is run by a person, the
  团长, the teacher, the property manager, with a program as their tool.
- **The lightest structure is the one WeChat absorbed into the client:**
  the chain in a chat, append your name, your order, your availability.
  That is the direction note's unstructured end with one affordance
  added. The 群接龙 interview names cross-group synchronisation and manual
  record-keeping as what the tool removed, alongside merchant promotions
  and referral incentives; the simple form was part of that bundle, not
  an isolated cause.
- **Nothing gives the person the record.** In every row, the record
  belongs to the business or the tool vendor. Coordinated, situated,
  low-friction spaces are used at a scale no other platform matches. The
  platform does not itself provide the thing dap's direction makes
  first, the person's own account across independently governed
  dealings; whether people want that is the untested hypothesis.

## 5. Comparisons worth keeping

- **The 团长 is the direction note's introducer.** A neighbour opens a
  chain, collects orders and money, and hands goods out at the gate.
  They introduce the space, control it, and serve the group, and nobody
  formalised any of that. The property manager and the class teacher
  are the same role in a firm. The roles are multiple and nebulous in
  practice, as the note says.
- **The chain is rung 0 and rung 1 together.** One message in a chat is
  an account anyone can append to; the program version is the same
  chain with a record behind it. Structure was added when the chat could
  not carry the accounting. This is the order dap's ladder proposes, and
  the survey observes it without isolating why it won.
- **WeCom's customer inheritance is the handoff requirement, built.**
  When an employee leaves, the firm reassigns their customers and the
  groups continue. The direction note's generality story asks for exactly
  that: replacing a representative does not cancel the firm's
  undertaking.
- **`openGID` is dap's per-context identity, chosen independently.** A
  group's id differs per program, as a person's key differs per context
  in dap. Tencent reached the same isolation rule from the other side,
  to keep programs from correlating groups.
- **Notification is the scarce resource, and it is allocated by trust.**
  Long-term messages go only to licensed public services. dap's
  obligations will meet the same problem on any real phone: the space
  can record that the adjuster replied, and getting the person's
  attention is a separate, rationed thing.
- **Structure is added to a conversation, not chosen up front.** The
  group-tools tab is the model for a client that starts as a chat and
  grows a checklist. That is a stronger starting point for stage 2's
  screens than an application with a chat in it.

## 6. Onboarding in the Web, distinct from the platforms

WeChat's onboarding works because three things are already present when
a card is tapped: an identity, a payment method, and the conversation
the card was shared into. Any Web-native equivalent has to supply the
same three from outside the platform the tap happens in, and then keep
the record outside it. The approaches below are grouped by which of the
three they supply. Each is checked against its current documentation;
where a platform has withdrawn an option, the text says so.

### The card: making a dap link legible everywhere

- **Link unfurling** (Open Graph and oEmbed for the Web; the unfurl and
  embed systems of iMessage, WhatsApp, Slack, Discord, Teams, Telegram,
  Bluesky, Mastodon and Reddit) renders one URL as a card with a title,
  a summary and an image. This is the design note's envelope rendered
  as a card before anyone joins. It costs nothing and works on every
  surface at once. Its preview data must be authored separately and be
  safe to make public: platforms crawl links to build previews, so the
  card can never carry the private anchor's title, status or summary,
  and a crawler must neither consume an invitation nor gain access.
- **Per-platform rich cards** go further where the platform allows
  actions inside the card: Slack Block Kit, Teams Adaptive Cards,
  WhatsApp interactive messages and Flows (forms inside the chat), RCS
  rich cards with suggested actions, which now reach iPhones too,
  Telegram inline keyboards and Mini Apps, Discord Activities, Reddit's
  developer platform apps embedded in posts. A rung-2 act, "confirm this
  arrangement", can be a button on such a card, with the signed act
  happening in dap and the card merely carrying the link.
- **Install-free execution**: App Clips on iOS are the closest native
  analogue of a mini program, launched from a link, a QR code or
  Messages. Android's Instant Apps were the other and are historical:
  Google documents the shutdown of publication, serving and the Instant
  API from December 2025. Progressive web apps and the Web Share Target
  API are the Web's own version. A dap client as a PWA that
  opens from any card and can be shared back into any chat needs no
  platform permission.

### The identity: a key the person already holds

- **Passkeys (WebAuthn)** are the Web's passwordless sign-in: a
  per-site key pair, synced across a person's devices by Apple, Google
  and password managers, created in one tap. They are scoped to the
  relying party, and the PRF extension that could derive per-context
  secrets from one is optional, so passkeys are an authentication
  option, not a solved architecture for portable signing and recovery.
  The mapping to dap's per-engagement key is a design to make when an
  episode needs it.
- **Portable identities from open social protocols**: an atproto
  identity (Bluesky) is a DID with its own OAuth, so a third-party app
  can act as the person with their consent; a Nostr key can sign through
  a browser extension or a remote signer. Either lets dap accept an
  identity the person already carries and use it for a context-scoped
  key by derivation or delegation, and both carry a following graph that
  is a real distribution surface.
- **Verified claims, one-off**: the W3C Digital Credentials API shipped
  in Chrome 141 and Safari 26 in autumn 2025 and lets a site request a
  credential from a wallet, such as a driving licence attribute or, from
  April 2026, an Aadhaar credential in Google Wallet. This is not
  sign-in; it is the trusted-evidence route of the Club decision note
  made available at the browser: a registrar's attestation presented
  once, verifiable, with no account.
- **Federated sign-in** (Sign in with Apple or Google, FedCM) is the
  fallback for people without any of the above, at the cost of a
  third-party identity.

### The payment vehicle as an identity and a channel

- **Cash App Pools and Venmo Groups** are the nearest Western analogue
  to the 团长's collection. A Cash App pool is opened by a shareable link
  that contributors can pay into with Apple Pay or Google Pay without
  installing Cash App; Venmo Groups tracks and settles shared expenses
  for up to 30 people. Neither exposes a third-party API any more; Venmo
  retired its developer and payouts APIs, and integrations such as
  Splitwise work by hand-off links into the app.
- **What that means for dap.** A $cashtag or a Venmo handle is an
  identity most adults already hold, but it cannot be used as a signing
  identity and cannot host a third party. The workable relationship is
  the direction note's rung 1: the payment app is an ordinary channel,
  dap composes the request and captures the receipt with its source,
  and the arrangement lives in dap. The Web Payment Request API and
  Apple Pay on the Web return verified contact details with a payment,
  which is a quiet onboarding path where a payment is genuinely part of
  the engagement.

### Candidate routes to test

The Weixin examples show five routes by which people arrived, without
isolating what made each one work; the 群接龙 interview names
bookkeeping relief, platform distribution and merchant incentives
together. Each route has a Web-native form and each is a hypothesis for
the pilot, not a ranking.

1. **A card into a chat that already exists.** The relationship
   distributes the space. This is the ladder's rung 1 and needs only
   unfurling to work everywhere, and it is the route dap can have without
   any platform's permission.
2. **A code at the point of need.** Scan-to-order is the largest mini
   program category, and the QR code on the table is part of how; the
   rest is the restaurant, the payment and the menu already being there. For dap the
   equivalents are a code on the insurer's letter, on the facility's
   brochure, on the contractor's estimate: the supplier furnishes the
   card, and the person keeps the space.
3. **A message from the supplier's own channel.** An SMS or email from
   the insurer carrying the link is "handed, not discovered". It needs
   nothing from dap but a link that unfurls.
4. **A platform's own mini-app store.** Telegram Mini Apps, LINE Mini
   Apps, App Clips: reach is built in, and TON-linked Telegram mini apps
   passed 100 million monthly users in 2025. The cost is the platform's
   rules; for Telegram, digital goods and services must be paid in
   Telegram Stars while physical goods and services may use other
   providers and currencies, and any payment integration follows that
   platform's current rules. A dap client can be published there as one
   more surface without living there.
5. **An identity people already hold.** Passkeys, a phone number, an
   atproto handle. Every account created is a person lost; every key
   reused is a person kept.

The principle under all five: dap owns the record and the identity
derivation; every platform is a surface for the card and a channel for
the conversation; the platforms are never where the space lives. And a
card is an access mechanism, not an acquisition channel: a quote, an
estimate or "can you confirm Friday" gives a party a reason to act, and
"join our space" does not. Who introduces the space, whose work it
saves, and who might pay are questions the pilot brief answers before
any card is sent.

## 7. How much of Weixin's use depends on payment

Payment is essential where the use case is a transaction, incidental
where it is coordination, and cheap to add everywhere because WeChat Pay
is one line for a developer. The distinction matters for dap, which
leaves payment out of scope.

| Use case | Payment's role | Without it |
|---|---|---|
| scan-to-order, ride hailing, e-commerce group buying | the use case is a purchase | nothing remains |
| community group buying via a 团长 | collection is the tool's core function; the 团长 collects and settles through the program | the chain still works for sign-up; settlement moves to a transfer |
| hospital registration | the registration fee and insurance settlement are part of the flow | booking alone still works; the value halves |
| government services | mostly none; occasional fees | unchanged |
| sign-up chains, collection forms, shared sheets | none in the common case; optional collection | unchanged |
| class groups | fee collection is one feature; communication is the use | unchanged |
| property management | fee payment is central; repairs, votes and notices are not | half remains |
| insurance claims | payout, not payment: the insurer pays the claimant | the claim process is unchanged; the payout arrives by transfer |
| carpooling, shared expense books | settlement is the point | the record remains, the settlement leaves |
| wedding RSVP, group albums, shift scheduling | none, or optional gifts | unchanged |

So in tier 1 payment is the product, and in the multi-party tier it is
usually one affordance among several: "collect" or "settle" as a button
beside "sign up" and "confirm". That is the shape dap can support
without building payment: settlement as a captured external act with
its receipt, through whichever rail the parties already use, exactly as
§6 treats Cash App and Venmo. The direction note's omission of payment
stands; what the Weixin evidence adds is that "collect" is common enough
at rung 2 that the capture of a payment receipt should be an early
account-package case, not a later one.

## 8. Chat at the centre without the channel silo

Chat is central for three reasons the survey makes visible: it is where
the card lands, it is the unstructured end of the structure spectrum,
and it is where structure gets added one affordance at a time. The silo
comes from two design choices most chat products share: the channel is
the container, so a message lives in exactly one place; and the platform
is the record, so the conversation cannot leave. dap's design already
inverts both, and the design space below follows from that.

**What replaces the channel.** In dap an audience is a property of a
message and a view is a subsequence of one series. Within one governed
context a channel is therefore a view, not a container: two threads can
be two audiences over one record, and a message can be in both without
being copied. Independently governed dealings, the family's arrangements
and the insurer's claim, retain separate histories, composed with source
attribution in the person's perspective; they are not merged into one
record to simplify the chat. Three products show parts of this working.

- **Front and Missive**, shared inboxes, put an email thread and the
  team's private comments on one timeline with two audiences. That is
  the dual-audience thread in daily use.
- **Matrix** makes a room an event graph replicated across servers with
  a `history_visibility` setting of joined, invited, shared or
  world-readable, which are dap's members, invited, retroactive and
  spine audiences under other names, and it bridges to Slack, Discord,
  WhatsApp and iMessage. It is the closest existing protocol to dap's
  record, and its bridges are the closest existing answer to "chat where
  the people already are".
- **Google Wave** put a conversation, structured gadgets and robots on
  one replayable timeline with private replies and federation, which is
  dap's Discussion plus attached packages. Google's closure post of
  August 2010 says only that it had not seen the adoption Google wanted.
  That people could not tell what a wave was for is commentary since,
  not Google's diagnosis. What the closure establishes is that
  sophisticated collaboration mechanics alone do not ensure adoption,
  and the direction note treats comprehension as the first gate for
  that reason.

**The design space.** Five axes, each with the position dap's direction
already takes.

| Axis | Positions | Where dap sits |
|---|---|---|
| where the record lives | the chat platform; dap; both, with copies | dap; the platforms are channels |
| the unit of audience | the container (a channel or group); the message | the message |
| how a person sees several relationships | one channel each, switched between; one screen composed across them | one perspective, the anchor, across contexts |
| how structure appears | a separate application screen; an inline card in the conversation; an assistant's message | inline cards first, the group-tools model, with the screen questions as the frame |
| who bridges the chats | a bot in each chat; the person's client capturing; a software assistant reading with consent | the person's client at rung 1; a bot or assistant only where the other party asks for it |

Four designs fall out of the axes. They are options, not stages; the
direction note fixes the first path to test and keeps the rest as
background.

1. **Chat as an ordinary channel, dap as the account.** Messages arrive
   as captured material with their source; the person's replies go out
   through the same channels. This is rung 1 and needs no platform's
   cooperation. Its cost is duplication: the conversation is in two
   places, and the account is the one that lags.
2. **The dap thread inside the chat.** A card in the group unfurls the
   space; the space's own timeline is a Discussion context whose every
   message is a signed event; other parties who tap the card are at
   rung 2. The chat platform stays the place people look, the record is
   dap's, and the silo is avoided because the same series serves every
   audience. An ordinary card links to a scoped dap page; it does not
   itself synchronize messages or return attention to the originating
   chat. A live bridge, which maps remote users and operates across
   services as a Matrix bridge does, is a separate optional integration.
3. **Structure as cards on that timeline.** An act's affordance renders
   as a card; the fold's verdict updates it; a checklist is a sequence
   of cards. The conversation and the structure are one timeline, which
   is the group-tools model; the chain in a chat is the observed example,
   and why it spread is not isolated by this survey. Attaching a package
   mid-stream adds new card kinds without moving anyone.
4. **The anchor over many chats.** One screen per person, composed
   across every context that shares the referent, with the three
   questions answered at the top and the threads beneath. Shared-inbox
   products such as Missive already compose several accounts,
   organisations and guest conversations on one screen, so this is not
   empty territory; what the direction note's perspective adds is
   composition across independently governed records without merging
   their authorities. One screen does not require one history. It is
   the design to test on people first.

**Two cautions the survey supports.** Notification is the scarce
resource on every platform and it is rationed by trust, so the design
should assume the chat delivers attention and dap delivers the record,
not the reverse. And a bot in someone else's group is a third party in
their conversation; the person's own client capturing what they can
already see asks nothing of anyone, which is why rung 1 comes first.

## 9. Competing ways to do the job

Beside the mini-program comparison belongs the landscape a person
actually chooses from. These are advertised capabilities checked on the
products' own pages, not evaluations, and none is a claim of equivalent
semantics.

| Way | What it offers today | What it says about dap's hypothesis (c) |
|---|---|---|
| existing chat and email plus a shared document, calendar or checklist | the baseline everyone already has; no new venue to persuade anyone into | the pilot's "less burden than before" is measured against this |
| care coordination products such as Caring Village | family and professional coordination with calendars, tasks and messages | "useful alone" for a family is not empty territory |
| person-held health records such as Guava | imports portal records, PDFs and photographed documents; person-selected, time-limited sharing; visit preparation | a person-held account across providers exists in care; dap's addition must be shown, not assumed |
| a client hub such as Jobber's | a customer's view tied to work requests, quote changes and approvals, appointments and payments | the supplier-furnished space with a concrete reason to act |
| shared inboxes such as Missive | several accounts and organisations, internal discussion, guest conversations, tasks and an audit trail | the dual-audience thread and a composed screen exist; the anchor is not unique |
| assistants such as Lindy | source-backed administrative work across apps with named approval for actions that reach outside | capture, summarising and drafting are not distinguishing by themselves |

The combination the pilot is built to observe, which this survey did
not find advertised together and did not evaluate hands-on, is an
understandable account of what currently stands, who said it, what is
still disputed, and what the person
retains and can share when a helper or a provider changes.

## 10. What this does not establish

No usage figure here is for the multi-party subset as such; the tiers
are inferred from category data and single-vendor disclosures. The
survey's evidence supports two hypotheses, that people use light
structure around a real activity and that an organiser can introduce a
tool through an existing relationship, and not the third, that a person
values a retained account across independent providers; §2 of the
direction note keeps the three apart. The technology and design
options in §6 and §8 are background for the pilot brief, not an adopted
roadmap; the direction note fixes the first path to test. The
platform's own reports rank by program, not by relationship shape.
Nothing here is evidence that a person-held account would be adopted;
it is evidence that the surrounding behaviour exists and that the
platform does not itself provide a user-governed, portable account
across independent services.

## Sources

- QuestMobile via Statista and marketing summaries: 973 million monthly
  users of WeChat Mini Programs, March 2026; 764 million daily, 2025;
  4.3 million programs. https://www.statista.com/statistics/1228315/china-number-of-wechat-mini-program-monthly-active-users/
- Aladdin index (阿拉丁指数), TOP100 composition: tools about 36 percent,
  retail and life services about 10 percent each. https://www.aldzs.com/
- 群接龙 scale, late 2019: ifanr, https://www.ifanr.com/minapp/1227011
- Native group chain, group to-do and group tools; desktop interop in
  2026: https://zhuanlan.zhihu.com/p/2016822596658820597 and
  https://www.fkdmg.com/article/5246.html
- `openGID` and `shareTicket`: WeChat open community,
  https://developers.weixin.qq.com/community/develop/doc/00028e3b330710feafc6e3e3d51809
- Subscription messages and category limits:
  https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message-overview.html
  and https://zhuanlan.zhihu.com/p/447678821
- WeCom education and customer groups: https://work.weixin.qq.com/wework_admin/industry_solution/education
- Insurance: 平安好车主 one-tap claim usage over 88 percent, and 2025
  online claim satisfaction: https://m.21jingji.com/article/20201125/herald/31ce3feefbe96a7b889126fe73014db6_zaker.html
  and https://news.vobao.com/article/1176474799871188683.shtml
- Hospital registration vendor scale: https://developers.weixin.qq.com/community/develop/doc/0000a4057d4d6040984a238a551c00
- Property management program features: https://cloud.tencent.cn/developer/information/%E7%89%A9%E4%B8%9A%E6%8A%A5%E4%BF%AE%E5%B0%8F%E7%A8%8B%E5%BA%8F
- 群接龙 interview on what the tool removed and the incentives around it: https://www.ifanr.com/minapp/1227011
- Google's Wave closure post, August 2010: https://googleblog.blogspot.com/2010/08/update-on-google-wave.html
- Competing ways: https://caringvillage.com/faq/, https://guavahealth.com/faq,
  https://www.getjobber.com/features/client-hub/, https://missiveapp.com/features,
  https://www.lindy.ai/
- Slack link unfurling: https://docs.slack.dev/messaging/unfurling-links-in-messages/
- WebAuthn PRF extension is optional: https://www.w3.org/TR/webauthn-3/#prf-extension
- Android Instant Apps shutdown from December 2025: https://developer.android.com/topic/google-play-instant
- Telegram payment rules, Stars for digital goods: https://core.telegram.org/bots/payments-stars
- Matrix bridges: https://matrix.org/docs/matrix-concepts/elements-of-matrix/#bridges
- Telegram Mini Apps scale: https://bitcoinist.com/ton-mini-apps-pass-100m-monthly-active-users-on-telegram/
- Digital Credentials API status, Chrome 141 and Safari 26:
  https://developer.chrome.com/blog/digital-credentials-api-shipped and
  https://www.corbado.com/blog/digital-credentials-api
- Cash App Pools and Venmo Groups: https://money.com/cash-app-pools-split-payments-feature/
  and https://www.fastcompany.com/90981819/venmo-groups-payment-feature;
  Venmo developer APIs retired: https://venmo.com/developers/
- Matrix room history visibility and event graph:
  https://matrix-org.github.io/synapse/latest/development/room-dag-concepts.html
  and https://matrix.org/blog/2026/07/08/matrix-v1.19-release/
