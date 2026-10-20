# A brokered market as a dap application: the market room and the provider rooms

Design note, 20 October 2026, draft 2. Proposed functionality: nothing
here is built.

A person runs a small matching business: night nurses in one city,
plumbers in another, used instruments in a third. Buyers post needs and
providers post offers in public groups and marketplaces, and the person
brings the two together for a fee. Personal agents can now do the
finding: a pitch published on 19 October 2026 has an agent mine public
groups for night nurses at a given rate and hand back a list
([source](#sources)). The pitch says nothing about how the business is
then run, and its own comment thread names the three ways it fails:
nobody pays for a list they could ask their own agent for; a match is
not a fee; and a list scraped from other people's posts is a liability,
not an asset. This note designs the part the pitch leaves out. The
agent finds; the rooms are the business.

The application is a pair of packages in the sense of the
[applications note](2026-10-15-self-contained-applications.md), built
on the forms the grow room landed
([grow note](2026-10-17-grow-operation-application-design.md),
[plan 033](plans/033-2026-10-18-grow-room-demo.md)) and the forms the
[three sales applications](2026-10-19-sales-applications-design.md)
share. Section 1 gives the pattern that every such market has; section 2
says what the rooms add; sections 3 to 5 design the application;
section 6 places the personal agents; sections 7 and 8 list what exists
and order the work.

## 1. The pattern

A brokered market has the same objects whatever is traded:

| Object | What it is |
|---|---|
| Need | A buyer's request: what, where, when, at what budget |
| Offer | A provider's listing: what, where, at what price, when available |
| Trust signal | Evidence about a provider: a recommendation, a reference, a licence, a history in this market |
| Match | A proposed pairing of one need and one offer, with the reason |
| Introduction | The act that puts the two in contact |
| Engagement | The booking or sale that follows |
| Settlement | The fee, and what it is owed for |

The lifecycle is: source, qualify, list, match, introduce, both accept,
engage, settle, give feedback. Each step is a record someone writes,
and a rule says who may write it and what it must rest on.

Three things decide whether the broker keeps a business, and the
comment thread under the pitch raised all three:

1. **Disintermediation.** Once introduced, the two parties can cut the
   broker out. The usual answers are to charge at the introduction, not
   the engagement; to hold the trust artifact, the vetted roster with
   its history, which is what one commenter called "own the list"; and
   to own the rooms both sides return to.
2. **Fee capture.** A match is not a fee. The fee needs a moment at
   which both sides have accepted terms and contact details have not
   yet been exchanged.
3. **Consent.** A list mined from other people's posts and resold is
   what the thread's most-liked objection was about: the platform's
   terms on automated collection, and the privacy law of the city in
   the demo. The durable version of this business is not "scrape and
   resell" but "invite and enroll": the agent finds candidates, the
   operator invites them, and what a provider later reads is what they
   and the operator put there.

## 2. What the rooms add

The [sales note](2026-10-19-sales-applications-design.md), section 2,
says what a room adds to a personal agent in general: an agent serves
one principal and the room is where their agents meet; the authority is
on the act, so no agent signs a commitment; and the record holds shared,
exact facts that outlive any agent, with timed rules that fire whether
or not an agent is up. For a market, three of those are the business:

- **The roster is the asset, and it is consented.** A provider's offer
  is their own signed act, in a room they share only with the operator.
  The candidate list that the sourcing agent builds stays in the
  operator's own room. A provider enters the roster by an invitation the
  operator sent and an enrollment the provider signed. That is the "own
  the list" level with the consent trail that makes the list sellable,
  and it is what a disintermediated broker still has.
- **Two moments are signed by their holders.** The provider's
  acceptance of a match is the provider's act. The introduction is the
  operator's act, and its guard needs both acceptances. No agent holds
  either grant. Fee capture is a guard, not a hope.
- **Freshness is a timed rule.** An offer not refreshed for thirty days
  goes stale and the provider is told; a match unanswered for two days
  reaches the operator; a need unmatched for a week closes unfilled.
  The roster stays current whether or not the operator's agent is
  running.

What an agent alone does well, and does here: finding candidates in
public places, delivering an invitation over the channel the candidate
already uses, hearing a need in a group and drafting it for the operator
to sign, and showing the operator their day.

## 3. The application

Every member of a room reads every scope in that room
([roadmap](../docs/roadmap.md#private-views-in-one-record)). Read
rights in this market therefore follow rooms, not scopes:

| Room | Members | Holds | Who reads it |
|---|---|---|---|
| Market room | the operator and the operator's sourcing agent | the market's rules, the leads with their sources, a listing for each enrolled provider, the needs, the matches, the introductions and the fees | the operator and the sourcing agent |
| Provider room, one for each enrolled provider | the operator and that provider | the provider's offer with its price and history, the matches offered to that provider, the provider's answers, and the introductions that concern them | the operator and that provider |

There is no room that all providers share. A provider never reads
another provider's price, another provider's matches, a need they were
not offered, or a lead. The buyer is not a member in the first version
(section 4).

The application is two packages:

- **`market`**, installed once in the market room for each market: a
  niche and a city, such as night nurses in Montreal.
- **`market-provider`**, installed in each provider room. Its genesis
  names the market's scope by its full reference, so the provider scope
  knows the one scope it answers to.

| Member | Kind | Does |
|---|---|---|
| Operator | person, member of every room | Runs the market; signs every invitation, match, introduction, export and fee |
| Sourcing agent | agent, the operator's, member of the market room only | Proposes leads with their source; drafts needs the operator signs; delivers invitations; signs nothing that commits anyone |
| Provider | person, member of their own provider room only | Lists their own offer and keeps it current; accepts or declines a match from their own AI app |
| Buyer | not a member in the first version | Their need and their acceptance enter as the operator's recorded reports with sources, as the bid response treats the buyer |

| Grant | Held by | Acts | Room |
|---|---|---|---|
| `market.configure` | operator | `set-rules`: the vetting rule, the fee, the territory, the stale period | market |
| `market.lead` | sourcing agent | `propose-lead`: a candidate with its source and no more than the invitation needs | market |
| `market.invite` | operator | `invite`: marks a lead as invited once its provider room exists | market |
| `market.need` | operator | `record-need`: a report with its source | market |
| `market.match` | operator | `match`: one need, one listing, a reason | market |
| `market.export` | operator | `offer-match`, `send-introduction`, `close-offer`: the only acts that send to a provider room (section 5) | market |
| `market.introduce` | operator | `introduce`: guarded by the provider's acceptance and the buyer's reported acceptance; writes the contact exchange and opens the fee | market |
| `market.fee` | operator | `record-settlement`, `waive` | market |
| `provider.offer` | provider | `enroll-offer`, `update-offer`, `withdraw-offer`; each sends the listing summary to the market | provider |
| `provider.accept` | provider | `accept-match`, `decline-match`; each sends the answer to the market | provider |

An act carries one fixed grant string, as in the bid response, so the
provider's acceptance and the operator's introduction are two acts under
two grants, and the record keeps both signatures. The sourcing agent
holds `market.lead` and nothing else.

**The interaction.** The sourcing agent reads public groups and
marketplaces and signs `propose-lead` for each candidate, with the post
or profile as the source; a lead without a source is refused. The lead
stays in the market room, which no provider reads. The operator reads
the leads in their carousel and chooses the ones that pass the vetting
rule. For each, the operator's client creates a provider room through
the current room creation path, installs `market-provider` there,
issues a person invitation to that room, and then signs `invite` on the
lead. The agent delivers the invitation link over the channel the
candidate uses. The candidate opens it in their own AI app or in the
browser and signs `enroll-offer`: what they do, where, at what price,
when. That act is the consent record. It sends the listing summary to
the market scope, where it opens the provider's listing, and the lead
closes as enrolled. A lead not enrolled in fourteen days closes expired.

A buyer's need arrives as a post, a message or a call. The agent drafts
it; the operator signs `record-need` with the source. The operator signs
`match`, naming one listing and the reason. Then the operator signs
`offer-match`, whose fields are only what that provider may read: the
need's what, where and when, and the fee that an introduction would
cost. It sends them to that provider's scope, where they open an offered
match with Accept and Decline. The provider signs `accept-match` at the
offered match's revision, which sends the answer back. The operator
records the buyer's acceptance of the terms with its source, then signs
`introduce`, which refuses unless both acceptances stand at current
revisions. Its effect writes the contact exchange, closes the other
matches of that need, and opens the fee. The operator then signs
`send-introduction` to the chosen provider, with the buyer's contact
details as disclosed, and `close-offer` to each other provider who was
offered the need. The listing in the market room gains one engagement
in its history, which is the trust signal the next match reads. The
operator signs `record-settlement` when the fee is paid, as a report,
since payment is outside the record.

**Shape.** Market scope items: `rules`, `lead` (proposed, invited,
enrolled, declined, expired), `listing` (listed, stale, withdrawn),
`need` (open, matched, introduced, filled, unfilled), `match`
(proposed, offered, accepted, declined, introduced, closed), `fee`
(owed, settled, waived). Provider scope items: `offer` (listed, stale,
withdrawn), `offered` (open, accepted, declined, introduced, closed).
Rules: an offer not refreshed in thirty days; a match unanswered in two
days; a need unmatched in seven days; a lead uninvited in seven days and
unenrolled in fourteen. Views: the operator's carousel in the market
room (matches awaiting a provider, exports not yet sent, stale
listings, fees owed, leads to invite); the provider's card in their
room (their offer, with Refresh and Withdraw; each offered match, with
Accept and Decline, declared for the holders of `provider.accept`); the
need record; the listing record with its history.

**Bounds of the first version.** A declared view reads a complete set of
at most 100 live items for each source
(`packages/bytes/src/application-projection-types.ts`), and the
operator's carousel reads the market scope's sources whole. So the first
version admits at most 100 live items of each type in the market scope:
100 open leads, 100 listings, 100 open needs, 100 open matches and 100
open fees. The 101st is refused by name, and the operator's view never
meets an incomplete read. A closed item is final and leaves the live
read. A provider scope holds one offer and at most 100 open offered
matches. A second market is a second installation, with its own market
room. Payments, messaging and calendars are out of scope, as the sales
note says of integrations: they enter as the operator's statements.

## 4. Why the buyer stays outside

The first version keeps the buyer outside the record for the reason the
bid response does: inviting them brings the reader question with it,
and a need is short-lived. Their words enter as the operator's reports
with sources, and the record never shows a report as the buyer's act.

A later version can invite the buyer. They would not join the market
room, which holds every need, lead and listing. Like a provider, a buyer
would get a buyer room of their own with the operator, and the market
scope would send to it only what that buyer may read: their own need,
the offers matched to it, and the introduction. That needs the same
exports as section 5, in the other direction.

## 5. Why separate rooms, and what they do not give

A market has three readers with different rights: the operator reads
everything, a provider reads their own offer and their own matches, and
a buyer reads their own need. The shape above gives each reader a room
whose membership is their right to read. Nothing is redacted; the
boundary is membership, which dap already checks on every act and every
read. The dap-spike found that readers written by hand are where
authors go wrong, and that writing a private-view model cost six
repairs for the Sale alone; this shape has no readers to write.

**What a message carries.** A message from one scope to another is not
only a reference. Native delivery reads and retains the full source
entry in the receiving scope (`packages/scope/src/delivery.ts`), and
the receiving room's readers can read retained entry inputs
(`packages/scope/src/reads.ts`). A message therefore discloses its
whole source entry to every reader of the receiving room. So in this
design:

- Only the export acts send from the market scope to a provider scope:
  `offer-match`, `send-introduction` and `close-offer`.
- An export act's fields hold only what that provider may read. Its
  guards read only the one match it concerns, and its effects change
  only that match's state. It uses no fact of another scope, so its
  entry is the whole retained closure.
- `match` and `introduce` send nothing. They hold the operator's reason,
  the comparison, the contact exchange for the chosen provider and the
  fee, and these stay in the market room.
- In the other direction, every act in a provider scope sends to the
  market scope, which the operator and the sourcing agent read. A
  provider writes nothing in their room that the operator may not read.

The first slice checks this with each provider room's readers: it reads
every retained entry in a provider scope and finds no field of another
provider, another need or a lead.

**What a citation proves.** A native fact reference is
`{ at: { scope, inc, kind }, seq, hash }` (`packages/contract/src/scope.ts`).
A provider scope holds such a reference to each export it received, and
the export's retained entry. That proves which act of the market scope
the provider was told about, at which position. It does not prove the
comparison that chose another offer, because the provider never reads
the market room. A provider who lost a match cannot replay that choice.
In a brokered market they do not need to. The operator is the party
both sides trust to hold the whole; that trust is what the fee is for.
Where no such party exists, such as a vote over private standing, the
shape fails and private views in one record are needed. That is the
split the [use cases](../docs/use-cases.md) now make between group 3
and group 4.

**What closing does not undo.** Closing an offered match or removing a
member does not retract what that member already read. The first
export to a provider is the first disclosure to them, so the operator
sends `offer-match` only after deciding to offer.

## 6. Personal agents in the market

Each member arrives with their own agent. A likely one in October 2026
is a cloud agent that runs in its maker's cloud and acts in the chat
the person already uses. What each may do here, and how it reaches the
rooms:

- **Sourcing** is the operator's agent reading public groups and
  marketplaces and signing `propose-lead`. It needs a key of its own,
  enrolled under the operator's control, and a tool surface: the hosted
  MCP endpoint serves one, with a bearer an admin mints
  ([docs/mcp.md](../docs/mcp.md), "The hosted endpoint"). Whether the
  cloud agent named in the [sources](#sources) can reach a remote MCP
  server is not settled. Two vendor reports from September 2026
  describe different routes. One (26 September) describes writing an SDK
  bridge and names no setting for adding a server. The other (checked
  25 September) describes adding a server URL in its settings, with
  OAuth. Neither is verified here. The maker's safety article of
  8 September does not mention MCP.
- **Outreach** is the same agent delivering the operator's invitation
  over the channel the candidate uses, with the connectors it has. The
  invitation is the operator's act; the delivery is the agent's
  statement.
- **Intake** is the agent hearing a need and drafting `record-need` for
  the operator to sign: agent drafts, person signs, as the bid response
  has it.
- **A provider's acceptance** is the provider's own act from their own
  AI app. That needs the person to reach their provider room from the
  app they are in, in one step, as themselves. That is the OAuth work on
  the hosted endpoint, which is not built
  ([hosted endpoint note](2026-10-13-hosted-mcp-endpoint.md), section 1;
  request `3f598e55`). Until then a provider joins in the browser from
  the invitation link, which exists.
- **Views.** A host with the MCP Apps capability shows the card kit's
  cards; a host without it gets the text tool surface
  ([docs/mcp.md](../docs/mcp.md), "Cards"). Whether the cloud agent
  named in the sources renders MCP Apps views is not verified. The MCP
  Apps announcement of 26 January 2026 lists the hosts that rendered
  them then, and it predates that agent. A walkthrough of 13 September
  2026 shows a browser pane, and it does not test MCP Apps. The room's
  screens therefore also work as plain pages, as the grow page does.

No agent holds `market.match`, `market.export`, `market.introduce`,
`market.fee` or `provider.accept`. A person who lets their agent take
those acts does so in their agent's own approval record, outside this
design.

## 7. What exists and what is missing

| Needed | State | Where |
|---|---|---|
| Items, states, acts with grants and guards, timed rules, views by grant, the per-member carousel | Landed | the grow room; plan 033 G1 to G3 |
| A declared application with scopes of its own that send to each other: one scope creates another, and a child sends summaries to its parent | Landed | Grow's Site creates Rooms and receives each Room's summary (`examples/grow/site.ts`, `examples/grow/room.ts`; `packages/scope/test/grow-demo-tick.test.ts`) |
| One application whose scopes are in different rooms, with different members, and that send to each other across rooms | Not built; the first slice confirms whether a declared send can address a scope of another room and how the receiver admits it | [roadmap](../docs/roadmap.md#an-applications-own-messages-between-scopes) |
| Exports whose retained entries are safe for the receiving room's readers | Designed here; nothing enforces it | section 5 |
| A room created and a package installed for each enrolled provider | The pieces exist as person-run steps: room creation, package install by URI, person invitation | [docs/cli.md](../docs/cli.md) |
| An outside party's word as a report with a source; an invited outside member who accepts from their own AI app | Designed, not built | sales note, sections 4 and 5; slice C2 |
| A person's access from their own AI app by OAuth | Not built; requested | request `3f598e55`; [hosted endpoint note](2026-10-13-hosted-mcp-endpoint.md) |
| A hosted sourcing agent | Designed, not built; the agent runs in the operator's own cloud agent or machine until then | [hosted agent teams](2026-10-15-hosted-agent-teams-design.md) |
| Custody for payment and vetting evidence | Not designed | [roadmap](../docs/roadmap.md#evidence-capture-and-private-custody) |
| Private views in one record | Not needed here | section 5 |

## 8. Order and slices

After the sales slices C1 and C2, which land the forms this market
reuses, and not ahead of the grow demo's remaining slices. Sizes are
estimates from the grow and sales slices.

| Slice | What | Done when | Size |
|---|---|---|---|
| M0 | A send from a declared scope in one room to a declared scope in another, and its admission | in a test host, a scope of one room sends to a scope of another room whose genesis names it; the receiver admits it only from that sender; a provider-room reader can read the retained entry and nothing else of the sender | 1 day |
| M1 | The market room: rules, leads, listings; the sourcing agent as an enrolled member; provider room creation, install and invitation; `enroll-offer` and its listing summary; the stale rule | an agent's lead without a source is refused by name; the operator invites a lead and a person enrolls an offer in their own provider room; the listing appears in the market room; the 101st open lead is refused by name; an offer goes stale on the clock | 3 days |
| M2 | Needs, matches and exports; acceptance; the introduction's guard and effects; the fee | `introduce` is refused while either acceptance is missing or stale, then admitted with both; each losing provider receives `close-offer`; a reader of each provider room reads every retained entry and finds no other provider's offer, no other need and no lead | 3 days |
| M3 | The listing's engagement history and the operator's carousel | the carousel lists matches awaiting a provider, exports not yet sent and fees owed, within the 100-item bounds | 1 day |
| M4 | The hosted market and a page on the homepage, after the demo-room pattern of plan 033 | a provider in their AI app accepts a match | 1 day, after the OAuth work |

Named and deferred: the buyer room; custody; payments and messaging as
operations; more than one market room under a site; a provider's own
agent taking acts under a grant the provider delegates; feedback after
an engagement as an item of its own; a bounded read beyond 100 live
items.

## 9. Open questions

1. **Where the vetting rule reads.** Whether the rule that guards
   `match` reads only the listing's own fields and history, or also the
   lead's source, which would keep a reference to the public post in
   the record longer than the invitation needs it.
2. **Who refreshes an offer.** Whether a provider's agent may sign
   `update-offer` under a delegated grant, which is the first act in
   this design that a provider's agent would take.
3. **Room cost.** Each provider room is a full room. Whether a market
   with 100 providers wants 100 rooms, or a lighter room form without
   its own repository.
4. **One site, many markets.** Whether a second niche in the same city
   is a second installation or a second market scope in one room, and
   what the roll-up then shows.

## Sources

The pitch and its comment thread: Greg Isenberg, "Meta Muse Will
Create 1,000 Millionaires", video of 19 October 2026
([YouTube](https://www.youtube.com/watch?v=tpZOU1ugODQ)), read from its
transcript and its comments on 20 October 2026. The business model,
the four levels, and the objections in section 1 are from there; no
claim about any law is made here beyond that the objection was raised.
The comment count and which comment was most liked were not checked
independently.

The cloud agent, from its maker: Meta's safety article of 8 September
2026 ([How we built safety into Muse](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)),
which describes built-in and custom connectors and the permission
model and does not mention MCP; Meta's Help Center on custom connectors
([meta.com/help](https://www.meta.com/help/artificial-intelligence/1687253048996149/)),
which confirms custom connectors in general and names no MCP route; the
connector platform ([platform.muse.ai](https://platform.muse.ai/)),
whose submission form takes an existing MCP endpoint with API-key or
OAuth authentication, as recorded by one submitter
([Stacktree, 19 September 2026](https://stacktr.ee/blog/muse-connector-platform));
and Meta AI Connectors ([dev.meta.ai](https://dev.meta.ai/products/connectors)),
a separate programme that offers MCP onboarding. Two vendor reports
describe different routes to a remote MCP server:
[Parallel, 26 September 2026](https://parallel.ai/articles/meta-muse-custom-integrations)
(an SDK bridge, no add-server setting) and
[AnythingMCP, checked 25 September 2026](https://anythingmcp.com/guides/clients/muse)
(a server URL in settings, with OAuth). What the agent's chat showed on
13 September 2026: a
[walkthrough](https://memeburn.com/meta-muse-web-ui-walkthrough/).
The hosts that rendered MCP Apps on 26 January 2026: the
[MCP blog](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/).
