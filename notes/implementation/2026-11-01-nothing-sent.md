# Say what a stop knows of an earlier send, outside the MCP server

Status: source implementation. The gate passed at `60194e08`. No deployed Worker or real room ran these words. The Worker bundle's bytes change, because the page's bundle holds the CLI's and the page's words. The planner deploys.

Request `57a09263076c14142038360918a5f630d02a8027` and promise `bfaab3f50c90fcc3ca270e414fac76b029107a15` own this head. It follows [the MCP server's words](2026-11-01-unknown-send-words.md), which named these lines as an open limit.

## What changed

A person who reads "nothing was sent" after a lost reply can send again under a new key, and that makes a second entry. This head sorts every such line in `packages/cli/src`, `apps/room/page/src`, `packages/client/src` and `apps/counter/browser/client.ts`, and it corrects the false ones. It changes words and no custody code.

- **The CLI's claim.** `packages/cli/src/claim.ts` says "This step sent nothing", then what is known of the claim's earlier steps, and then "Keep this claim". A stop after `found` was accepted says that an earlier step went ahead, because this run can have sent it. The page shows these words too, because it runs `claim` and `checkClaim`.
- **The CLI's install.** `planSent` in `packages/cli/src/commands.ts` reads the plan's markers. An attempted plan has no known outcome, an acknowledged plan went ahead, and a plan with neither marker keeps "Nothing was sent."
- **The CLI's join.** `joinSent` reads the pending join in the same way. The two stops after the admitted entry say that the join request went ahead.
- **The page's custody.** A stop over an unreadable or missing creation record says that this browser cannot say whether an earlier send went. A stop for a missing lock says that a saved request stays kept, because that stop reads no custody.
- **The page's check.** `checkAnswerLine` says "This check sent nothing, and an earlier send of this request can still arrive."
- **The client's join.** A join past its deadline says "This press sent nothing, and an earlier send of this join has no known outcome."
- **Seals.** Ten seals of `packages/cli/src/commands.ts`, `claim.ts` and `invitations.ts` move to the owner's values. `planSent` and `joinSent` are new named declarations, with two new seals.

## The count

The request counts 78 lines. That count holds at `991129fc`: 29 lines say "nothing was sent", and 49 say "nothing was submitted".

```
git grep -n -iE "nothing was sent|nothing was submitted" 991129fc -- packages/cli/src apps/room/page/src packages/client/src apps/counter/browser/client.ts
```

This head sorts 144 lines, because close wordings carry the same claim: "nothing further was submitted", "no request was sent", "nothing was signed or sent", "Check submitted nothing", and the rest of this pattern.

```
git grep -n -iE 'nothing[ -]((was|further was|new was) )?(sent|submitted)|(signed|prepared|reserved) (or|and) (sent|submitted)|(^|[^a-z])no [a-z ]{0,30}(was|were) (sent|submitted)|not sent|was not submitted|(sent|submitted|sends|submits) nothing|prepares and submits nothing|(sent|sends) no ' 991129fc -- packages/cli/src apps/room/page/src packages/client/src apps/counter/browser/client.ts
```

The pattern leaves out "nothing was signed" alone, "nothing was replaced" and "no replacement was signed", which make no claim about a send. Tests are out of the sort.

| Group | Lines of the 144 | Lines of the 78 |
|---|---|---|
| true | 82 | 32 |
| false | 61 | 45 |
| unsure | 1 | 1 |

The line numbers are those of `991129fc`. Each new word is the sentence the line says now. "…" stands for the start of the line, which does not change.

| File and line at `991129fc` | Group | Reason | New words |
|---|---|---|---|
| `apps/counter/browser/client.ts:105` | true | `pending` and both custody stores are empty before this point, and the dispatcher has not run. Both sentences on this line. |  |
| `apps/room/page/src/claim.ts:70` | false | A resume reads this record. The record can hold an earlier send. | "…It is kept. This step sent nothing, and this browser cannot say whether an earlier send of this creation went. Report it. A new creation can make a second room." |
| `apps/room/page/src/claim.ts:75` | false | A resume reads this record. The record can hold an earlier send. | "…It is kept. This step sent nothing, and this browser cannot say whether an earlier send of this creation went. Report it. A new creation can make a second room." |
| `apps/room/page/src/claim.ts:84` | false | The journal can hold an earlier send, and the code cannot read it. | "…It is kept. This step sent nothing, and this browser cannot say whether an earlier send of this creation went. Report it. A new creation can make a second room." |
| `apps/room/page/src/claim.ts:96` | false | The journal can hold an earlier send, and it fails its check. | "…It is kept. This step sent nothing, and this browser cannot say whether an earlier send of this creation went. Report it. A new creation can make a second room." |
| `apps/room/page/src/claim.ts:105` | false | The operation was named earlier, and its record is gone. | "…This step sent nothing, and this browser cannot say whether an earlier send of this creation went. Report it. A new creation can make a second room." |
| `apps/room/page/src/claim.ts:172` | true | An invalid ID cannot name a journal row, and `randomUUID` never makes one. |  |
| `apps/room/page/src/claim.ts:173` | true | A fresh operation only, and it says that the originals are kept. |  |
| `apps/room/page/src/claim.ts:175` | false | A resume names an operation with no record, so its earlier send is unknown. The fresh half cannot happen. | "…This step sent nothing, and this browser cannot say whether an earlier send of this creation went. Report it. A new creation can make a second room." |
| `apps/room/page/src/claim.ts:183` | true | "Further" scopes the claim. |  |
| `apps/room/page/src/claim.ts:218` | true | the branch for a new operation. A creation in progress returns before this line. |  |
| `apps/room/page/src/claim.ts:219` | true | the branch for a new operation. A creation in progress returns before this line. |  |
| `apps/room/page/src/claim.ts:223` | true | the branch for a new operation. A creation in progress returns before this line. |  |
| `apps/room/page/src/claim.ts:233` | false | The stop comes before any custody read, and a resume can sit over a saved creation. | "…This step sent nothing. A saved creation stays kept, and an earlier send of it can have gone. A new creation can make a second room." |
| `apps/room/page/src/claim.ts:236` | true | Speaks of this continuation, and says that the earlier outcome may be accepted or unknown. |  |
| `apps/room/page/src/claim.ts:243` | true | No caller passes Check outside a resume: `start-custody.ts` returns first when no operation exists. |  |
| `apps/room/page/src/claim.ts:251` | true | Every supported runtime has `fetch`. A runtime with none cannot have sent. |  |
| `apps/room/page/src/claim.ts:267` | true | The branch for a new operation, and it says that the originals are kept. |  |
| `apps/room/page/src/claim.ts:278` | true | the branch for a new operation. A creation in progress returns before this line. |  |
| `apps/room/page/src/claim.ts:281` | true | the branch for a new operation. A creation in progress returns before this line. |  |
| `apps/room/page/src/claim.ts:288` | false | A saved repository means that the creation's steps went. | "…It is kept. This step sent nothing, and an earlier step of this creation went ahead. Report it. A new creation makes a second room." |
| `apps/room/page/src/claim.ts:294` | true | Speaks of this continuation, and says that earlier steps may be accepted or unknown. |  |
| `apps/room/page/src/connection-custody.ts:38` | true | "Further" scopes the claim, and it says that the originals are kept. |  |
| `apps/room/page/src/connection-custody.ts:57` | false | Reached on check and continue before the journal read, so a saved connection can hold an earlier send. | "…Check the original Start. This step sent nothing. A saved connection stays kept, and an earlier send of it can have gone." |
| `apps/room/page/src/connection-custody.ts:80` | true | Mode `new`, after the check that the last row is finished. No row exists for this input. |  |
| `apps/room/page/src/connection-custody.ts:82` | true | Mode `new`, before the row exists. |  |
| `apps/room/page/src/connection-custody.ts:88` | true | No row is retained, and the page's custody is the only record of a send from this browser. |  |
| `apps/room/page/src/connection-custody.ts:90` | true | Speaks of Check. A reserved row never reached a stage that sends. |  |
| `apps/room/page/src/connection-custody.ts:94` | true | A row in state `reserved` never reached `save`, which comes before any dispatch. |  |
| `apps/room/page/src/data.ts:1145` | true | `act` calls this before it signs. The act is the first send of this press. |  |
| `apps/room/page/src/data.ts:1157` | true | a comment on this one path, no reader sees it. |  |
| `apps/room/page/src/data.ts:1162` | true | a comment on this one path, no reader sees it. |  |
| `apps/room/page/src/data.ts:1167` | true | the page signed this request in this press, and it stops before the act. The in-memory fence blocks a press under an unknown send. The refusal shows the route is up, so the list read holds the lock. |  |
| `apps/room/page/src/data.ts:1168` | true | the page signed this request in this press, and it stops before the act. The in-memory fence blocks a press under an unknown send. The refusal shows the route is up, so the list read holds the lock. |  |
| `apps/room/page/src/data.ts:1169` | true | the page signed this request in this press, and it stops before the act. The in-memory fence blocks a press under an unknown send. The refusal shows the route is up, so the list read holds the lock. |  |
| `apps/room/page/src/data.ts:1179` | true | the page signed this request in this press, and it stops before the act. The in-memory fence blocks a press under an unknown send. Only a page that held a session in this load reaches it, and a reload opens on signed reads and skips the keep. |  |
| `apps/room/page/src/data.ts:1186` | unsure | This press's request never went. After a reload in an outage, the failed list read leaves no lock, and an earlier press with a lost reply has its own key. Settled by a ruling on whether a new press of the same words is the same intent, and a two-device run of that path. |  |
| `apps/room/page/src/join-custody.ts:59` | false | The stop comes before any custody read, and a check can sit over a saved enrollment. | "…This step sent nothing. A saved enrollment stays kept, and an earlier send of it can have gone. Do not use the invitation again." |
| `apps/room/page/src/join-custody.ts:97` | true | Says that the original stays unknown and that no replacement went. |  |
| `apps/room/page/src/join-custody.ts:101` | true | Says that the check failed and that no replacement went. |  |
| `apps/room/page/src/main.ts:658` | true | the page signed this request in this press, and it stops before the act. The in-memory fence blocks a press under an unknown send. |  |
| `apps/room/page/src/main.ts:667` | true | the page signed this request in this press, and it stops before the act. The in-memory fence blocks a press under an unknown send. |  |
| `apps/room/page/src/main.ts:670` | true | the page signed this request in this press, and it stops before the act. The in-memory fence blocks a press under an unknown send. |  |
| `apps/room/page/src/main.ts:796` | true | Reached on a refused row, and the words are about a replacement. |  |
| `apps/room/page/src/main.ts:862` | true | Mode `new` runs only when the screen found no original. A Start from another tab in that gap stays retained, and `startRoom` refuses the next new run. |  |
| `apps/room/page/src/original-check.ts:9` | true | a comment on this one path, no reader sees it. |  |
| `apps/room/page/src/original-check.ts:27` | false | A comment. The page did send earlier, and only this press did not. | "This press sent nothing." |
| `apps/room/page/src/original-check.ts:33` | false | A comment. The page did send earlier, and only this press did not. | "This press sent nothing." |
| `apps/room/page/src/original-check.ts:66` | true | A comment that says a missing row does not show that no act was sent. |  |
| `apps/room/page/src/original-check.ts:169` | false | A row reads "You sent". The scope has no entry yet, and the send can be in flight. A person who reads this can send under a new key. | "…This check sent nothing, and an earlier send of this request can still arrive. Do not send it again as a new request. Check again after…" |
| `apps/room/page/src/original-check.ts:172` | false | The row reads "You sent", and a copy that fails its check says nothing about that send. | "…This check sent nothing, and it cannot say whether an earlier send went. Read the scope before you send this request again." |
| `apps/room/page/src/retained-editor-data.ts:25` | true | "new" scopes the claim. `continueEdit` returns on an unknown task, so earlier steps are verified accepted, and the message says so. |  |
| `apps/room/page/src/retained-editor-data.ts:82` | true | "new" scopes the claim. `continueEdit` returns on an unknown task, so earlier steps are verified accepted, and the message says so. |  |
| `apps/room/page/src/retained-editor-data.ts:109` | true | "new" scopes the claim. `continueEdit` returns on an unknown task, so earlier steps are verified accepted, and the message says so. |  |
| `apps/room/page/src/retained-editor-data.ts:111` | true | "new" scopes the claim. `continueEdit` returns on an unknown task, so earlier steps are verified accepted, and the message says so. |  |
| `apps/room/page/src/retained-editor-data.ts:116` | true | "new" scopes the claim. `continueEdit` returns on an unknown task, so earlier steps are verified accepted, and the message says so. |  |
| `apps/room/page/src/retained-editor-data.ts:119` | true | "new" scopes the claim. `continueEdit` returns on an unknown task, so earlier steps are verified accepted, and the message says so. |  |
| `apps/room/page/src/retained-editor-data.ts:144` | true | "new" scopes the claim. `continueEdit` returns on an unknown task, so earlier steps are verified accepted, and the message says so. |  |
| `apps/room/page/src/retained-editor-data.ts:146` | true | "new" scopes the claim. `continueEdit` returns on an unknown task, so earlier steps are verified accepted, and the message says so. |  |
| `apps/room/page/src/retained-editor-data.ts:166` | true | "new" scopes the claim. `continueEdit` returns on an unknown task, so earlier steps are verified accepted, and the message says so. |  |
| `apps/room/page/src/retained-editor-data.ts:171` | true | Says that the outcome is unknown and that only the next step did not go. |  |
| `apps/room/page/src/retained-editor.ts:74` | true | `canReturnToDraft` requires that every step has `attempted` false and no answer. |  |
| `apps/room/page/src/retained-editor.ts:82` | true | Shown when `attempted` is false, and `sendStep` sets it before the submit. |  |
| `apps/room/page/src/retained-editor.ts:88` | true | `prepareEdit` only reads, and this is the words for a thrown value that is not an Error. |  |
| `apps/room/page/src/start-custody.ts:80` | false | The stop comes before any custody read, and a check can sit over a saved Start. | "…This step sent nothing. A saved Start stays kept, and an earlier send of it can have gone. A new creation can make a second room." |
| `apps/room/page/src/start-custody.ts:88` | true | Mode `new`, after the check that no Start is retained. |  |
| `apps/room/page/src/start-custody.ts:101` | true | Speaks of Check, and no original claim is prepared. |  |
| `packages/cli/src/application-install-runtime.ts:14` | false | The stop reads no custody, and the request key can hold an earlier send. | "…This call signed and sent nothing, and it did not read the record under this request key. Keep the original request key and arguments." |
| `packages/cli/src/application-install.ts:4` | true | A context with no custody port cannot send an application request at all. |  |
| `packages/cli/src/claim.ts:75` | false | The entry is admitted, so the step went. | "…This step sent nothing, and an earlier step of this claim went ahead. Keep this claim: a new claim creates a second repository." |
| `packages/cli/src/claim.ts:103` | true | a comment on this one path, no reader sees it. |  |
| `packages/cli/src/claim.ts:112` | true | No claim is retained, and it speaks of Check. |  |
| `packages/cli/src/claim.ts:124` | false | A pending claim exists, so an earlier send can have gone. | "…This step sent nothing, and an earlier send of this claim has no known outcome. Keep this claim: a new claim can create a second repository." |
| `packages/cli/src/claim.ts:125` | false | A pending claim exists, so an earlier send can have gone. | "…This step sent nothing, and an earlier send of this claim has no known outcome. Keep this claim: a new claim can create a second repository." |
| `packages/cli/src/claim.ts:150` | true | the new-claim branch, with no saved claim or with `--again`, which asks for a new intent. The saved claim is untouched. |  |
| `packages/cli/src/claim.ts:153` | true | the new-claim branch, with no saved claim or with `--again`, which asks for a new intent. The saved claim is untouched. |  |
| `packages/cli/src/claim.ts:169` | true | the new-claim branch, with no saved claim or with `--again`, which asks for a new intent. The saved claim is untouched. |  |
| `packages/cli/src/claim.ts:189` | false | A digest-only claim exists, and its send can have gone. | "…This step sent nothing, and an earlier send of this claim has no known outcome. Keep this claim: a new claim can create a second repository." |
| `packages/cli/src/claim.ts:191` | false | A digest-only claim exists, and its send can have gone. | "…This step sent nothing, and an earlier send of this claim has no known outcome. Keep this claim: a new claim can create a second repository." |
| `packages/cli/src/claim.ts:210` | false | A digest-only claim with no readable directory: the outcome is exactly what is unknown. | "…This step sent nothing, and an earlier send of this claim has no known outcome. Retry the reads later, or recover it manually. --again signs a new claim, which can create a second repository." |
| `packages/cli/src/claim.ts:217` | true | Speaks of Check, and says that the original is not confirmed. |  |
| `packages/cli/src/claim.ts:219` | false | A receipt exists for this stage, so it went. Only Check sent nothing. | "…It remains pending; Check submitted nothing." |
| `packages/cli/src/claim.ts:221` | false | A receipt exists for this stage, so it went. Only Check sent nothing. | "…It remains pending; Check submitted nothing." |
| `packages/cli/src/claim.ts:229` | false | The step holds an accepted fact, so it went. | "…This step sent nothing, and an earlier step of this claim went ahead. Keep this claim: a new claim creates a second repository." |
| `packages/cli/src/claim.ts:230` | false | The step holds an accepted fact, so it went. | "…This step sent nothing, and an earlier step of this claim went ahead. Keep this claim: a new claim creates a second repository." |
| `packages/cli/src/claim.ts:278` | false | A saved repository means that `found` went. This run can have sent it. | "…This step sent nothing, and an earlier step of this claim went ahead. Keep this claim: a new claim creates a second repository." |
| `packages/cli/src/claim.ts:285` | true | Speaks of Check. |  |
| `packages/cli/src/claim.ts:288` | false | `found` is accepted by this line, and this run can have sent it. | "…This step sent nothing, and an earlier step of this claim went ahead. Keep this claim: a new claim creates a second repository." |
| `packages/cli/src/claim.ts:292` | false | `found` is accepted by this line, and this run can have sent it. | "…This step sent nothing, and an earlier step of this claim went ahead. Keep this claim: a new claim creates a second repository." |
| `packages/cli/src/claim.ts:298` | false | `found` is accepted by this line, and this run can have sent it. | "…This step sent nothing, and an earlier step of this claim went ahead. Keep this claim: a new claim creates a second repository." |
| `packages/cli/src/claim.ts:302` | true | Speaks of Check. |  |
| `packages/cli/src/claim.ts:305` | false | `found` and `seat` are accepted by this line, and this run can have sent them. | "…This step sent nothing, and an earlier step of this claim went ahead. Keep this claim: a new claim creates a second repository." |
| `packages/cli/src/claim.ts:309` | false | `found` and `seat` are accepted by this line, and this run can have sent them. | "…This step sent nothing, and an earlier step of this claim went ahead. Keep this claim: a new claim creates a second repository." |
| `packages/cli/src/claim.ts:315` | false | `found` and `seat` are accepted by this line, and this run can have sent them. | "…This step sent nothing, and an earlier step of this claim went ahead. Keep this claim: a new claim creates a second repository." |
| `packages/cli/src/commands.ts:153` | true | Before the opening act of this run. |  |
| `packages/cli/src/commands.ts:157` | true | Before the opening act of this run. |  |
| `packages/cli/src/commands.ts:235` | false | Reached before the config read, and an attempted plan can be on disk. `line.ts` checks the flag first, so only the exported function reaches it. | "…; this run signed and sent nothing." |
| `packages/cli/src/commands.ts:239` | false | Reached before the config read, and an attempted plan can be on disk. | "…; this run signed and sent nothing." |
| `packages/cli/src/commands.ts:240` | false | Reached before the config read, and an attempted plan can be on disk. | "…; this run signed and sent nothing." |
| `packages/cli/src/commands.ts:242` | false | Reached before the config read, and an attempted plan can be on disk. `line.ts` checks the flag first, so only the exported function reaches it. | "…; this run signed and sent nothing." |
| `packages/cli/src/commands.ts:246` | false | Reached before the config read, and an attempted plan can be on disk. | "…; this run signed and sent nothing." |
| `packages/cli/src/commands.ts:251` | false | Reached before the config read, and an attempted plan can be on disk. | "…; this run signed and sent nothing." |
| `packages/cli/src/commands.ts:257` | false | The plan can hold the attempted marker. | `planSent(plan)`: "This run sent nothing, and an earlier send of this plan has no known outcome. A new plan can make a second register." An acknowledged plan "went ahead". A plan with no marker stays "Nothing was sent." |
| `packages/cli/src/commands.ts:288` | true | Each caller has already refused an attempted plan or has no plan. |  |
| `packages/cli/src/commands.ts:319` | true | Speaks of this run, and says to keep the original request. |  |
| `packages/cli/src/commands.ts:325` | true | Speaks of this run, and says to keep the original request. |  |
| `packages/cli/src/commands.ts:344` | false | The plan can hold the attempted marker. | `planSent(plan)`: "This run sent nothing, and an earlier send of this plan has no known outcome. A new plan can make a second register." An acknowledged plan "went ahead". A plan with no marker stays "Nothing was sent." |
| `packages/cli/src/commands.ts:348` | false | `before.plan` can hold the attempted marker. | `planSent(plan)`: "This run sent nothing, and an earlier send of this plan has no known outcome. A new plan can make a second register." An acknowledged plan "went ahead". A plan with no marker stays "Nothing was sent." With no plan, the old words stay. |
| `packages/cli/src/commands.ts:363` | true | No plan and no pending request reach this line. |  |
| `packages/cli/src/commands.ts:421` | false | The plan can hold the attempted marker. | `planSent(plan)`: "This run sent nothing, and an earlier send of this plan has no known outcome. A new plan can make a second register." An acknowledged plan "went ahead". A plan with no marker stays "Nothing was sent." |
| `packages/cli/src/commands.ts:422` | false | The plan can hold the attempted marker. | `planSent(plan)`: "This run sent nothing, and an earlier send of this plan has no known outcome. A new plan can make a second register." An acknowledged plan "went ahead". A plan with no marker stays "Nothing was sent." |
| `packages/cli/src/commands.ts:423` | false | The plan can hold the attempted marker. | `planSent(plan)`: "This run sent nothing, and an earlier send of this plan has no known outcome. A new plan can make a second register." An acknowledged plan "went ahead". A plan with no marker stays "Nothing was sent." |
| `packages/cli/src/commands.ts:424` | false | The plan can hold the attempted marker. | `planSent(plan)`: "This run sent nothing, and an earlier send of this plan has no known outcome. A new plan can make a second register." An acknowledged plan "went ahead". A plan with no marker stays "Nothing was sent." |
| `packages/cli/src/commands.ts:429` | false | The plan can hold the attempted marker. | `planSent(plan)`: "This run sent nothing, and an earlier send of this plan has no known outcome. A new plan can make a second register." An acknowledged plan "went ahead". A plan with no marker stays "Nothing was sent." |
| `packages/cli/src/commands.ts:438` | false | The plan can hold the attempted marker. | `planSent(plan)`: "This run sent nothing, and an earlier send of this plan has no known outcome. A new plan can make a second register." An acknowledged plan "went ahead". A plan with no marker stays "Nothing was sent." |
| `packages/cli/src/commands.ts:441` | false | The plan does hold an attempted marker on this line. | `planSent(plan)`: "This run sent nothing, and an earlier send of this plan has no known outcome. A new plan can make a second register." An acknowledged plan "went ahead". A plan with no marker stays "Nothing was sent." |
| `packages/cli/src/commands.ts:445` | true | Guarded by `plan.attempted === undefined`, and it speaks of this run. |  |
| `packages/cli/src/commands.ts:446` | true | Guarded by `plan.attempted === undefined`, so no send of the plan can have happened. |  |
| `packages/cli/src/commands.ts:456` | false | The plan can hold the attempted marker. Only an injected transport reaches it. | `planSent(plan)`: "This run sent nothing, and an earlier send of this plan has no known outcome. A new plan can make a second register." An acknowledged plan "went ahead". A plan with no marker stays "Nothing was sent." |
| `packages/cli/src/commands.ts:532` | false | A pending join exists, so an earlier send can have gone. | "…pending join." `joinSent(pending)`: "This run sent nothing, and an earlier send of this join has no known outcome." An accepted join "went ahead". "Retry the original invitation link." |
| `packages/cli/src/commands.ts:555` | false | A pending join exists, so an earlier send can have gone. | `joinSent(pending)`: "This run sent nothing, and an earlier send of this join has no known outcome." An accepted join "went ahead". "Restore its private record before retrying." |
| `packages/cli/src/commands.ts:557` | false | A pending join exists, so an earlier send can have gone. | `joinSent(pending)`: "This run sent nothing, and an earlier send of this join has no known outcome." An accepted join "went ahead". "Restore its private record before retrying." |
| `packages/cli/src/commands.ts:561` | false | A pending join exists, so an earlier send can have gone. | `joinSent(pending)`: "This run sent nothing, and an earlier send of this join has no known outcome." An accepted join "went ahead". |
| `packages/cli/src/commands.ts:568` | false | The join holds an accepted fact, so it went. | `joinSent(pending)`: "This run sent nothing, and an earlier send of this join has no known outcome." An accepted join "went ahead". |
| `packages/cli/src/commands.ts:569` | false | The join holds an accepted fact, so it went. | `joinSent(pending)`: "This run sent nothing, and an earlier send of this join has no known outcome." An accepted join "went ahead". |
| `packages/cli/src/commands.ts:580` | false | An entry is admitted, and this run can have sent it. | "…The join request went ahead, and the join remains pending. Retry the original invitation link." |
| `packages/cli/src/commands.ts:583` | false | An entry is admitted, and this run can have sent it. | "…The join request went ahead, and the join remains pending. Retry the original invitation link." |
| `packages/cli/src/commands.ts:631` | true | `dap act` signs a new intent in each run, and this stop comes before it. |  |
| `packages/cli/src/commands.ts:1392` | true | Speaks of this phase, and the next sentence tells the person to inspect before another mutation. |  |
| `packages/cli/src/invitations.ts:263` | true | Speaks of Check. |  |
| `packages/cli/src/invitations.ts:384` | true | This command serves only filesystem custody, so a store of this kind cannot hold an enrollment from it. |  |
| `packages/cli/src/invitations.ts:526` | true | a comment on this one path, no reader sees it. |  |
| `packages/cli/src/invitations.ts:544` | false | The pointer shows a retained invitation, and its record is gone. | "…This command signed and sent nothing, and it cannot say whether an earlier send of that invitation went. Restore the record; do not issue the invitation again." |
| `packages/cli/src/invitations.ts:545` | false | A checker invitation is retained, and its stages can have gone. | "…Resume it through issueCheckerInvitation. This command signed and sent nothing, and an earlier send of that invitation can have gone." |
| `packages/cli/src/line.ts:133` | true | `dap act` signs a new intent in each run, and this stop comes before it. |  |
| `packages/client/src/browser-joining.ts:21` | true | A status name in a type. No person reads it, and each reason says what it knows. |  |
| `packages/client/src/browser-joining.ts:115` | true | A different link or seat cannot make the kept join's intent. |  |
| `packages/client/src/browser-joining.ts:119` | true | A status name, and the reason says that an earlier join is kept. |  |
| `packages/client/src/browser-joining.ts:127` | true | The store was empty, and a failed save leaves at most a prepared row that never went. |  |
| `packages/client/src/browser-joining.ts:137` | false | The kept join can have gone: this is the path after a lost reply. | "…This press sent nothing, and an earlier send of this join has no known outcome. Check it; do not use the invitation again." |
| `packages/client/src/creation-offer.ts:34` | true | Every caller reads the offer on the branch for a new operation. |  |
| `packages/client/src/http.ts:64` | true | Every supported runtime has `fetch`. A runtime with none cannot have sent. |  |
| `packages/client/src/originals.ts:64` | true | Every supported runtime has `fetch`. A runtime with none cannot have sent. |  |
| `packages/client/src/session.ts:98` | true | Every supported runtime has `fetch`. A runtime with none cannot have sent. |  |

## Decisions

- **The stops of the page before a send stay.** The page signs each request in the press that sends it, and the fence in memory blocks a second press while an earlier send is unknown. `data.ts:1186` is the one line I could not settle. The request names these stops as true.
- **The words speak of what ran.** The MCP server says "This call". The CLI says "This run" or "This step", because a claim's run sends several steps. The page says "This step", "This check" or "This press".
- **A run that sent a step cannot say "This run sent nothing".** `dap create` can send `found` and then stop at a later line of the same run, and `dap join` can send and then stop at the entry it reads. Those stops say "This step", or say only that the request went ahead.
- **The code reads a marker where it holds one.** `planSent` and `joinSent` read the plan and the pending join. The stops that read no custody say so.
- **A runtime with no `fetch` keeps its words.** Every supported runtime has `fetch`, and a runtime with none cannot have sent. `apps/room/page/src/claim.ts:251` and lines 64, 64 and 98 of `http.ts`, `originals.ts` and `session.ts` in `packages/client/src` stay.
- **The status name `nothing-sent` stays.** No person reads it. Each reason beside it is true.
- **`packages/mcp` is out of this head.** Request `db537dce` owns it.

## Evidence

The checkpoint is `60194e08d2bb390da3defe2516f520b4d5a7db81`, tree `38388b48`. It includes main. Raw evidence is in `~/play/artroom-evidence/2026-11-01-nothing-sent/`, `SHA256SUMS` `98f38cc4abced025b0a34c243e462ff9665468f78f2f72eb55a56f6e3abcfbc0`. The red run and the controls ran at `32e26c3f`, as their `head.txt` files state, before this note joined the head.

**The red run.** `red/run.log` is an observed run of the new tests at the source of main `991129fc`, with the head's tests and the bundle of main. It has 23 failed tests of 62. Every failure is an assertion. `a plan that never went keeps the plain words` is red there because the new line puts "The plan is kept" first. It guards the words, and the control `never-sent-says-unknown` shows what it guards.

**The controls.** All 44 turned their named case red by an assertion, each with `scripts/control.mjs`, and the source was clean afterwards. `controls/summary.jsonl` lists them. Two of them work in the other direction: `never-sent-says-unknown` and `fresh-creation-says-unknown` put the warning on a path with no earlier send, and each turns its plain-words case red.

**The tests.** Most reach their line through the real path. `packages/cli/test/claim.scope.test.ts`, `join.scope.test.ts` and `apps/room/page/test/original-copy.scope.test.ts` run real scopes. `packages/cli/test/nothing-sent.test.ts` runs the real commands with a scripted lost reply, and `apps/room/page/test/nothing-sent.test.ts` runs the real custody code over stand-in storage and locks.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `4fff1458d28fe039` |
| Red run | `red/run-red.sh` | 1 | `f5c3d8194b2d5c43` |
| Controls, 44 | `controls/run-controls.mjs` | 0 | `8ef6ef5833e36e7d` |

The gate reports 3492 plain and 975 native tests, 116 Node and 56 Counting.

## Open limits

- **`apps/room/page/src/data.ts:1186` is unsure.** The press's own request never went. After a reload in an outage, `openOriginals` reports a failed read with no rows, because `lastRead` lives in memory. No lock then stands over an earlier press with a lost reply, and that press has its own key. A ruling on whether a new press of the same words is the same intent settles the line, with a two-device run of that path.
- **A defect outside the request.** The same gap lets a keep succeed and a second act go, whatever the words say. I read this and did not run it. A page that reloads with no session sends with no copy, which the signed-requests note states as a limit. This case differs: the session works, and only the list read fails.
- **A second defect outside the request.** `keepOriginal` says "or reload the page" when it stops for a lost session. The retained editor reaches that line through `sendStep`, and a reload loses its task, so a person who follows it can open a second change. I read this and did not run it.
- **Held by shared words, not by a case of their own.** In `packages/cli/src/claim.ts`, `CLAIM_WENT` at lines 75, 288, 292, 298, 305, 309 and 315, and `CLAIM_UNKNOWN` at lines 189 and 191. In `packages/cli/src/commands.ts`, `planSent` at lines 348 and 424. Line 424 needs a plan that changes between two reads, and line 348 needs a cohort with no pin in this build.
- **A CLI word on the page.** `packages/cli/src/claim.ts:210` names `--again`, which the page does not have. The line already named it.
- **Not run.** No deployed Worker, real room, browser or hosted endpoint ran these words. Two of the 82 true lines have a paired control, and the others have none.
