# Design proposal: shared learning within your existing AI app

We propose a hosted dap service for a continuing learning project inside
ChatGPT or Claude. A learner practises with their own agent and can invite
a tutor or peer to review selected work. MCP Apps supplies the plan,
submission, and feedback views inside each person's AI app. The same shape
serves expert services such as healthcare and financial advice, described in
[Connect to an expert](#connect-to-an-expert).

## What dap adds to the learner's assistant

ChatGPT or Claude can already explain a topic, make a plan, and help someone
practise. Learning and coaching products already offer plans, recordings,
and feedback. Those features establish the baseline.

Dap adds a **shared working process across separate conversations**: the
agreed goal and plan, selected submissions, who owes feedback, and what
happens next. A tutor joins that work through their own assistant, without
joining the learner's private chat. Both return to the same project later.

The learner's agent helps with private practice and outside tasks such as
scheduling. Dap runs the shared process and any authorized background work.
The experience to prove is a useful learning relationship conducted through
people's existing assistants, with less coordination and no separate portal
to remember to visit.

## Scenario: prepare a five-minute presentation

A learner asks their assistant for help delivering a presentation in four
weeks. They can begin without a tutor.

1. **Agree a plan.** The assistant creates a project with a baseline attempt,
   short practice sessions, and a checkpoint. The learner accepts the plan
   in the app view.
2. **Practise privately.** The learner rehearses with their assistant. They
   choose a short recording and a question to submit, then preview exactly
   what will be shared.
3. **Invite useful feedback.** A tutor or peer receives a project link. In
   their own AI app or browser, they see the selected recording, relevant
   goal, and review request. They comment on a specific moment in the clip.
4. **Continue from the feedback.** In a new conversation, the learner asks,
   “What should I practise next?” The assistant retrieves the agreed plan
   and feedback, proposes a revision, and helps with another attempt. The
   learner adopts the change. No one copies a transcript between chats.

A tutor can also start the project after a lesson with an existing client:
“Here is our practice plan. Join with this link, or have your agent guide you.”

## What the first version includes

Four MCP Apps views carry the cycle: **Today**, **Plan**, **Submit**, and
**Feedback**. The required functionality is:

- **Start and resume:** create a project from a goal or lesson notes and
  recover it from a new conversation. Connection and invitation flows keep
  the intended project selected.
- **Share deliberately:** store and play a selected audio or video attempt,
  attach feedback to its exact version and time range, and show who can
  read it. Private rehearsal stays outside the shared record.
- **Invite a reviewer:** give another person enough context to contribute
  from their own conversation. They can join without a builder subscription.
- **Adapt the process:** support solo practice and a tutor-reviewed
  checkpoint, with different schedules and review requirements per learner.
  A changed plan preserves earlier submissions and assessments.
- **Continue between visits:** an optional hosted agent tracks missing work
  and prepares follow-up under a visible budget. Its owner can pause or stop
  it. A recording or agent summary does not establish mastery.

Use existing voice and call services. The first version needs a tested
upload and playback path on its chosen host, rather than a conferencing
stack or specialist assessment engine.

## Connect to an expert

The tutor scenario is one case of a wider shape. A person talks to their
own assistant, and at some point the assistant says, "Let me connect you to
one of our experts." Four parts then work together:

- **The person's assistant** helps them prepare, in their private chat.
- **A structured form**, shown as an MCP Apps view, collects what the
  expert needs. The person sees exactly what will be shared and approves it.
- **A named expert**, who is a person, answers from their own AI app or
  browser. The record signs the answer as the expert's, not the assistant's.
- **The provider's own backend**, such as a booking or account system,
  carries out what was agreed.

Dap holds the process between those parts: what was asked, the exact
version that was shared, who owes an answer and by when, what the expert
said, and what happens next. The record keeps an assistant's drafts apart
from an expert's statements, as the
[use cases](../docs/use-cases.md#three-kinds-of-statement) describe. In
regulated work, that separation matters most. The provider can show who
advised what, and on which facts.

In the three cases below, an expert's answer and an operation on the
provider's backend are different things. An accepted recommendation, a
requested booking, or an approved return authorizes nothing by itself. An
instruction the backend carries out has its own explicit authorization,
for the exact action and version, under the provider's rules, and the
record keeps the backend's confirmed reference or receipt, with the
operation pending or unknown until one is confirmed.

**A nurse answers a medication question.** A patient asks their assistant
whether a cold remedy is safe with a prescribed medicine. The assistant
says that a clinic nurse should answer. The intake form lists the
medicines, the symptom, and the question. The nurse answers within the
clinic's stated time. If a visit is needed, the patient asks for the
booking, the clinic's booking system makes it, and the record keeps the
booking as pending until that system confirms a reference. In a later
conversation, the patient asks, "What did the nurse say?" The assistant
reads the nurse's answer, not its own summary of it.

**An adviser recommends a retirement transfer.** A client asks whether to
move an old workplace retirement account. The fact-find form collects
balances, charges, goals, and attitude to risk. A licensed adviser signs a
recommendation with its reasons and required disclosures. The client
accepts or declines it in the app. Accepting it does not move the money:
the transfer instruction is a separate act, authorized for that exact
recommendation and version under the firm's rules, and the record shows
the transfer as pending until the firm's account system confirms it. A
later review starts from the signed recommendation and the facts it relied
on.

**A tax preparer asks for missing documents.** A household's assistant
collects documents against the preparer's checklist. The preparer asks for
what is missing, and the household answers in the form. The household
approves the exact version of the return before the preparer files it, and
the record keeps the filing as pending until the preparer's system
confirms a receipt.

These services need more than the learning case:

- **A room for each client.** Every room member reads the whole record. A
  provider serves many clients, so each case needs its own room until
  [private views](../docs/roadmap.md#private-views-in-one-record) exist.
  They are not designed.
- **Custody of sensitive records.** Health records and statements need
  custody that only some members can read, with stated retention.
  [Evidence capture and private custody](../docs/roadmap.md#evidence-capture-and-private-custody)
  is not designed.
- **Operations on the provider's backend.** Booking, account instructions,
  and filing are outside operations. Today dap runs only Git publication
  that way ([outside parties and systems](../docs/roadmap.md#outside-parties-and-systems)).
- **The provider's rules.** The provider, not the client, sets response
  times, who may advise, and which disclosures an answer needs.
- **Host restrictions.** The
  [ChatGPT plugin rules](https://developers.openai.com/plugins/plugin-guidelines)
  (read 16 October 2026) forbid collecting or processing protected health
  information and government identifiers, and forbid facilitating or
  meaningfully enabling money transfers or investment trades. So the
  patient's medicines and symptoms, the household's tax documents, and the
  transfer instruction do not pass through that plugin path, and moving
  the transfer call to the provider's backend does not change that, since
  the rules cover facilitation. Only permitted context, status, and receipt
  flows may be considered there, subject to the host's and the field's
  validation. No other host's permission is assumed here.
- **Validation in each field.** Health, financial, and tax services each
  have their own rules on advice, records, and data. A provider must
  validate the service against them. This note claims no compliance.

## Adoption and proof

Evaluation includes one complete practice and feedback cycle, without a
card. A learner starts alone, or a tutor tries the service with one existing
client. Storage, retention, and agent limits are stated before work begins.
The owner explicitly chooses paid continuation after finding it useful.
Human review, if sold, has its own price.

Compare this cycle with the learner using their assistant and a plain plan.
Do they return to practise, receive useful feedback, and improve on an
unassisted attempt? Can the reviewer contribute without reconstructing the
project? Repeat with a different supported process for a second learner.
Those results test the value of dap's coordination and customization. For
an expert service, run the same test with one provider and one client. Does
the expert answer from the shared record without asking again, and does the
client find the answer in a new conversation?

This is proposed functionality. It still needs a learning definition,
MCP Apps views, media storage, invitations, and hosted execution. Every room
member can read its whole record, so sharing only selected work requires a
separate review room. Host capabilities, distribution, and permitted payment
flows need validation. The [application design](2026-10-15-self-contained-applications.md),
[hosted teams design](2026-10-15-hosted-agent-teams-design.md),
[roadmap](../docs/roadmap.md), and
[ChatGPT plugin rules](https://developers.openai.com/plugins/plugin-guidelines)
hold the relevant constraints.

Existing product examples, consulted 16 October 2026:
[Bobbin's assistant connections](https://withbobbin.com/releases),
[CoachAccountable's agent API](https://blog.coachaccountable.com/2026/08/coachaccountable-plays-well-with-ai-agents-thanks-to-the-api/),
and [GlideOS's bring-your-own-agent model](https://www.glideapps.com/byoa).
