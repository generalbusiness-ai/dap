# Work on an issue and resume after a decision

Use your existing room configuration and member key. Start a new assistant
session when needed, but keep the same key. This workflow does not hand work to
another member, create an identity, or decide for a person.

Request the MCP prompt `work-on` with a `goal` of at most 4096 UTF-8 bytes:

```json
{"name":"work-on","arguments":{"goal":"Work on the recorded Clear completed issue"}}
```

The prompt guides your use of the maintained tools. It runs no daemon and
keeps no progress file. The native record holds the work.

## Accept the recorded terms

1. Call `room` and list the tools. Read the issue and your offered commitment.
2. Read the commitment's `termsAt` entry. Use `step` to obtain its full fact:
   scope, incarnation, kind, sequence and hash. Never invent a hash from a
   sequence number.
3. Call the offered `accept` act with that commitment and exact terms fact.
   Keep a distinct `idempotencyKey` for each act. A lost reply requires
   `settle` with that same key, not a newly signed replacement.

An old offer keeps its old terms after the conditions change. A new offer
names the new terms. Do not relabel an old commitment or accept a new offer
with an old terms fact. The latter fails with `terms-differ`.

## Ask a person and wait

1. Use `ask` to record the question and text. Include the exact Brief digest
   when the installed profile requires it.
2. Use `request-approval` to name a person and the question's current `bodyAt`
   fact. An approval covers that text. It does not revise issue conditions.
3. Use `block` with your accepted commitment and that ask's fact. The block
   affects your commitment. Another agent can continue its own change.
4. Call `wait` with both the question item and its type:

```json
{"scope":"<issue scope>","item":123,"type":"ask","states":["decided"],"seconds":60}
```

Use the actual identifiers from the record in place of these examples. A
decided question is final, so `type: "ask"` lets `wait` find it among retained
items. After a timeout, read the question again and repeat while it stays open.
Set `seconds` to at most 60. A timeout records no lane act and grants
no permission to proceed. Authentication may renew a read session.

If a read is unavailable, stop. If the question changes or is withdrawn, read
the current record before choosing another step. Never approve or decide in
place of the requested person.

## Resume from a fresh session

1. Open the same configured room with the same member key. Do not re-enrol.
2. Call `room`. Read your commitments and blocked items from the issue.
   Read the question and its decision, including retained final items. Do not
   copy progress from the previous conversation.
3. If conditions changed, wait for the owner's new offer. Read and accept that
   offer's exact new terms. Keep old and new commitments distinct.
4. Use `release-block` on the original block. Name its original commitment and
   the matching `decide` fact. A decision about another ask cannot release it.
5. Propose through the offered change tools or `dap propose`, linking the
   issue. Read the current schemas before signing. Do not claim fulfilment
   unless the record contains it.

`work` and `context` help when the local application offers them. Otherwise
use `inspect`, `items`, `step` and `text`. Follow every returned cursor and
byte offset you need. An incomplete read is not proof that work is absent.

This guide makes no hosted-agent, provider, deployment or new-member handover
claim. People retain approval, decision, review and merge authority.
