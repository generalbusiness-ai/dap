# A brokered market as a dap application: the roster and the engagement

Design note, 20 October 2026, draft 1. Proposed functionality: nothing
here is built.

A person runs a small matching business: night nurses in one city,
plumbers in another, used instruments in a third. Buyers post needs and
providers post offers in public groups and marketplaces, and the person
brings the two together for a fee. This month's personal agents can do
the finding: a pitch that circulated this week has an agent mine public
groups for night nurses at a given rate and hand back a list
([source](#sources)). The pitch says nothing about how the business is
then run, and its own comment thread names the three ways it fails:
nobody pays for a list they could ask their own agent for; a match is
not a fee; and a list scraped from other people's posts is a liability,
not an asset. This note designs the part the pitch leaves out. The
agent finds; the room is the business.

The application is a package in the sense of the
[applications note](2026-10-15-self-contained-applications.md), built
on the forms the grow room landed
([grow note](2026-10-17-grow-operation-application-design.md),
[plan 033](plans/033-2026-10-18-grow-room-demo.md)) and the forms the
[three sales applications](2026-10-19-sales-applications-design.md)
share, in particular the prospect room, whose outside party accepts a
proposal from their own AI app. Section 1 gives the pattern that every
such market has; section 2 says what the room adds; sections 3 to 5
design the application; section 6 places the personal agents; sections
7 and 8 list what exists and order the work.

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
   to own the room both sides return to.
2. **Fee capture.** A match is not a fee. The fee needs a moment at
   which both sides have accepted terms and contact details have not
   yet been exchanged.
3. **Consent.** A list mined from other people's posts and resold is
   what the thread's most-liked objection was about: the platform's
   terms on automated collection, and the privacy law of the city in
   the demo. The durable version of this business is not "scrape and
   resell" but "invite and enroll": the agent finds candidates, the
   operator invites them, and the data the market holds is data each
   party put there themselves.

## 2. What the room adds

The [sales note](2026-10-19-sales-applications-design.md), section 2,
says what a room adds to a personal agent in general: an agent serves
one principal and the room is where their agents meet; the authority is
on the act, so no agent signs a commitment; and the record holds shared,
exact facts that outlive any agent, with timed rules that fire whether
or not an agent is up. For a market, three of those are the business:

- **The roster is the asset, and it is consented.** A provider's offer
  is their own signed act as a member. The record never holds a scraped
  list; what it holds is an invitation the operator sent and an
  enrollment the provider signed. That is the "own the list" level with
  the consent trail that makes the list sellable, and it is what a
  disintermediated broker still has.
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

One package, **market**, installed once for each market: a niche and a
city, such as night nurses in Montreal. An installation is a site with
two kinds of room, after the grow site that reads its rooms.

| Member | Kind | Does |
|---|---|---|
| Operator | person | Runs the market; signs every invitation, match, introduction and fee |
| Sourcing agent | agent, the operator's | Proposes leads with their source; drafts needs the operator signs; delivers invitations; signs nothing that commits anyone |
| Provider | person, member of the roster room by invitation | Lists their own offer and keeps it current; accepts or declines a match from their own AI app |
| Buyer | not a member in the first version | Their need and their acceptance enter as the operator's recorded reports with sources, as the bid response treats the buyer |

| Grant | Held by | Acts |
|---|---|---|
| `market.configure` | operator | `set-rules`: the vetting rule, the fee, the territory, the stale period |
| `market.lead` | sourcing agent | `propose-lead`: a candidate with its source and no more than the invitation needs |
| `market.invite` | operator | `invite`: issues the invitation for one lead; the agent may deliver it, and the act is the operator's |
| `market.offer` | provider | `enroll-offer`, `update-offer`, `withdraw-offer` |
| `market.need` | operator | `record-need`: a report with its source, a group post, a message or a call |
| `market.match` | operator | `match`: one need, one offer, a reason; guarded by the offer being listed and by the vetting rule |
| `market.accept` | provider | `accept-match`, `decline-match` |
| `market.introduce` | operator | `introduce`: guarded by the provider's acceptance and the buyer's reported acceptance; writes the contact exchange and opens the fee |
| `market.fee` | operator | `record-settlement`, `waive` |

An act carries one fixed grant string, as in the bid response, so the
provider's acceptance and the operator's introduction are two acts under
two grants, and the record keeps both signatures. The sourcing agent
holds `market.lead` and nothing else.

**The two scopes.** The **roster room** holds what a public directory
would show: each provider's offer, the leads, and the market's rules.
Every provider is a member and reads all of it, which is the point of a
roster. Each need gets an **engagement room** of its own, with the
operator and the matched provider or providers as members, holding the
need, its matches, the introduction and the fee. A provider never reads
another need's terms or another provider's price, because they are not
a member of that room. The site reads its rooms for the operator's
roll-up, as the grow site reads its grow rooms. Section 5 says why this
is the shape, and what it does not give.

**The interaction.** The sourcing agent reads public groups and
marketplaces and signs `propose-lead` for each candidate, with the post
or profile as the source; a lead without a source is refused. The
operator reads the leads in their carousel and signs `invite` for the
ones that pass the vetting rule, which issues the invitation link. The
agent delivers it over the channel the candidate uses. The candidate
opens it in their own AI app or in the browser and signs `enroll-offer`:
what they do, where, at what price, when. That act is the consent
record, and the lead closes as enrolled. A lead not enrolled in fourteen
days closes expired.

A buyer's need arrives as a post, a message or a call. The agent drafts
it; the operator signs `record-need` with the source, which creates the
engagement room for that need with the operator as its first member.
The operator signs `match`, naming one listed offer and the reason;
the match adds that provider to the engagement room and appears in the
provider's carousel with Accept and Decline. The provider signs
`accept-match` at the match's revision. The operator records the
buyer's acceptance of the terms with its source, then signs
`introduce`, which refuses unless both acceptances stand at current
revisions; its effect writes the contact exchange, closes the other
matches of that need as declined, and opens the fee. The engagement
room keeps the match history; the roster room's offer gains one
engagement in its history, which is the trust signal the next match
reads. The operator signs `record-settlement` when the fee is paid, as
a report, since payment is outside the record.

**Shape.** Items in the roster room: `rules`, `lead` (proposed,
invited, enrolled, declined, expired), `offer` (listed, stale,
withdrawn). Items in an engagement room: `need` (open, matched,
introduced, filled, unfilled), `match` (proposed, accepted, declined,
introduced), `fee` (owed, settled, waived). Rules: an offer not
refreshed in thirty days; a match unanswered in two days; a need
unmatched in seven days; a lead uninvited in seven days and unenrolled
in fourteen. Views: the operator's carousel across the site (matches
awaiting a provider, stale offers, fees owed, leads to invite); the
provider's card in the roster room (their offer, with Refresh and
Withdraw) and in each engagement room they are in (the match, with
Accept and Decline, declared for the holders of `market.accept`); the
need record; the offer record with its history; the site roll-up.

**Bounds of the first version.** One roster room of at most two hundred
offers and five hundred leads; an engagement room of at most eight
matches; a need's queried representation of at most two kibibytes, so
the operator's carousel stays within the native query payload. A
withdrawn offer keeps its history. A second market is a second
installation. Payments, messaging and calendars are out of scope, as
the sales note says of integrations: they enter as the operator's
statements.

## 4. Why the buyer stays outside

The first version keeps the buyer outside the record for the reason the
bid response does: inviting them brings the reader question with it,
and a need is short-lived. Their words enter as the operator's reports
with sources, and the record never shows a report as the buyer's act.
A later version invites the buyer into the engagement room, where their
acceptance is their own act; that room already has the right members
and nothing else to hide from them, so the invitation is the only
addition.

## 5. Why two scopes, and what they do not give

Every member of a room reads the whole record
([roadmap](../docs/roadmap.md#private-views-in-one-record)). A market
has three readers with different rights: the operator reads
everything, a provider reads their own offer and their own matches, and
a buyer reads their own need. The shape above gives each reader a scope
whose membership is their right to read. Nothing is redacted; the
boundary is membership, which dap already checks on every act and every
read. The dap-spike found that readers written by hand are where
authors go wrong, and that writing a private-view model cost six
repairs for the Sale alone; this shape has no readers to write.

The shared decision, which match was introduced, lives in the
engagement room, and the roster room's offer cites it by the entry's
hash and position, which is the citation form the
[sequenced level note](2026-10-18-sequenced-level-and-order-scope.md)
gives. The operator's members replay it; a provider holds the citation
and reads what their own room shows. What this does not give: a
provider who lost a match cannot replay the comparison that chose the
other offer. In a brokered market they do not need to. The operator is
the party both sides trust to hold the whole; that trust is what the
fee is for. Where no such party exists, such as a vote over private
standing, the shape fails and private views in one record are needed.
That is the split the [use cases](../docs/use-cases.md) now make
between group 3 and group 4.

What the shape needs is not private views but
[an application's own messages between scopes](../docs/roadmap.md#an-applications-own-messages-between-scopes):
`record-need` creates an engagement room and `match` adds a member to
it, and `introduce` writes one line into the roster room's offer. The
mechanism runs for dap-room's own scopes; this would be the first
declared application to use it.

## 6. Personal agents in the market

Each member arrives with their own agent, and the one most likely to
appear on each side this month is the one that runs in its maker's
cloud and acts in the chat the person already uses. What each may do
here, and how it reaches the room:

- **Sourcing** is the operator's agent reading public groups and
  marketplaces and signing `propose-lead`. It needs a key of its own,
  enrolled under the operator's control, and a tool surface: the hosted
  MCP endpoint serves one, with a bearer an admin mints
  ([docs/mcp.md](../docs/mcp.md), "The hosted endpoint"). Reports from
  this month say the cloud agent can write its own client for a public
  streamable-HTTP MCP endpoint and keep it as a skill ([sources](#sources));
  Meta's own documentation of that agent does not mention MCP.
- **Outreach** is the same agent delivering the operator's invitation
  over the channel the candidate uses, with the connectors it has. The
  invitation is the operator's act; the delivery is the agent's
  statement.
- **Intake** is the agent hearing a need and drafting `record-need` for
  the operator to sign: agent drafts, person signs, as the bid response
  has it.
- **A provider's acceptance** is the provider's own act from their own
  AI app. That needs the person to reach the engagement room from the
  app they are in, in one step, as themselves, which is the OAuth head
  of the hosted endpoint, not built
  ([hosted endpoint note](2026-10-13-hosted-mcp-endpoint.md), section
  1; request `b04b0e79`). Until then a provider joins in the browser
  from the invitation link, which exists.
- **Views.** A host with the MCP Apps capability shows the card kit's
  cards; a host without it gets the text tool surface
  ([docs/mcp.md](../docs/mcp.md), "Cards"). The cloud agent in question
  shows no MCP Apps views; what it shows is tool output as text and a
  browser pane the person can take over, so the room's screens must
  work as plain pages, which the grow page already does.

No agent holds `market.match`, `market.accept`, `market.introduce` or
`market.fee`. A person who lets their agent take those acts is doing so
in their agent's own approval record, outside this design.

## 7. What exists and what is missing

| Needed | State | Where |
|---|---|---|
| Items, states, acts with grants and guards, timed rules, views by grant, the per-member carousel | Landed | the grow room; plan 033 G1 to G3 |
| A site that reads its rooms | Landed | the grow site's projection |
| An outside party's word as a report with a source; an invited outside member who accepts from their own AI app | Designed, not built | sales note, sections 4 and 5; slice C2 |
| An application's own messages between scopes: a room created by an act, a member added by an act, a line written across rooms | Mechanism runs; no declared application uses it | [roadmap](../docs/roadmap.md#an-applications-own-messages-between-scopes) |
| A person's access from their own AI app by OAuth | Not built; requested | request `b04b0e79`; [hosted endpoint note](2026-10-13-hosted-mcp-endpoint.md) |
| A hosted sourcing agent | Designed, not built; the agent runs in the operator's own cloud agent or machine until then | [hosted agent teams](2026-10-15-hosted-agent-teams-design.md) |
| Custody for payment and vetting evidence | Not designed | [roadmap](../docs/roadmap.md#evidence-capture-and-private-custody) |
| Private views in one record | Not needed here | section 5 |

## 8. Order and slices

After the sales slices C1 and C2, which land the forms this market
reuses, and not ahead of the grow demo's remaining slices. Sizes are
estimates from the grow and sales slices.

| Slice | What | Done when | Size |
|---|---|---|---|
| M1 | The roster room: rules, leads, offers; the sourcing agent as an enrolled member; invitation and enrollment; the stale rule | an agent's lead without a source is refused by name; the operator invites a lead and a person enrolls an offer from the invitation in the test host; an offer goes stale on the clock and the provider's carousel shows it; a two-hundred-and-first offer is refused by name | 2 days |
| M2 | Needs and matches in one engagement room created by `record-need`; the provider added by `match`; acceptance; the introduction's guard and effects; the fee | `introduce` is refused while either acceptance is missing or stale, then admitted with both; the other matches close declined; the provider's card shows Accept and Decline only to the holder; the two-day rule reaches the operator | 3 days |
| M3 | The site roll-up and the offer's engagement history written across rooms; the operator's carousel across the site | the roster offer cites the introduction's entry; the carousel lists matches awaiting a provider across three engagement rooms | 2 days |
| M4 | The hosted market and a page on the homepage, after the demo-room pattern of plan 033 | a provider in their AI app accepts a match | 1 day, after the OAuth head |

Named and deferred: the buyer as a member; custody; payments and
messaging as operations; more than one roster room under a site; a
provider's own agent taking acts under a grant the provider delegates;
feedback after an engagement as an item of its own.

## 9. Open questions

1. **Where the vetting rule reads.** Whether the rule that guards
   `match` reads only the offer's own fields and history, or also the
   lead's source, which would keep a reference to the public post in
   the record longer than the invitation needs it.
2. **Who refreshes an offer.** Whether a provider's agent may sign
   `update-offer` under a delegated grant, which is the first act in
   this design that a provider's agent would take.
3. **The buyer's room.** Whether the later version that invites the
   buyer puts them in the engagement room, as section 4 proposes, or
   gives each need a buyer room of its own, as the sales note's open
   question 1 asks of the bid.
4. **One site, many markets.** Whether a second niche in the same city
   is a second installation or a second roster room under one site, and
   what the roll-up then shows.

## Sources

The pitch and its comment thread: Greg Isenberg, "Meta Muse Will
Create 1,000 Millionaires", video of 19 October 2026
([YouTube](https://www.youtube.com/watch?v=tpZOU1ugODQ)), read from its
transcript and 164 comments on 20 October 2026. The business model,
the four levels, and the objections in section 1 are from there; no
claim about any law is made here beyond that the objection was raised.

The cloud agent, from its maker: Meta's safety write-up of 8 September
2026 ([How we built safety into Muse](https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse)),
which describes built-in and custom connectors and the permission
model and does not mention MCP; the connector platform
([platform.muse.ai](https://platform.muse.ai/)), whose submission form
takes an existing MCP endpoint with API-key or OAuth authentication, as
recorded by one submitter
([Stacktree, 19 September 2026](https://stacktr.ee/blog/muse-connector-platform));
and Meta AI Connectors ([dev.meta.ai](https://dev.meta.ai/products/connectors)),
a separate programme that offers MCP onboarding. Reports that the agent
writes its own MCP client for a public endpoint:
[Parallel](https://parallel.ai/articles/meta-muse-custom-integrations)
and [AnythingMCP](https://anythingmcp.com/guides/clients/muse), both
vendors, read 20 October 2026. What the agent's chat renders: a
[walkthrough of 13 September 2026](https://memeburn.com/meta-muse-web-ui-walkthrough/).
MCP Apps, the hosts that render them, and the absence of this agent
among them: the
[MCP blog, 26 January 2026](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/).
