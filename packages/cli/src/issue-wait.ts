/**
 * `dap issue wait <issue> <ask>`: hold the lane's head stream until the record says the agent can go on, and exit.
 * The stream is the feed: a line says only that the head moved. The summary read under the same session decides. No model runs meanwhile.
 * It signs no act. A session request is the only signature, and each start reads the record first, so a wake missed while this was down is found at once.
 */
import type { Item, Read, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { isMemberRef } from "@generalbusiness/dap-bytes";
import { ScopeHandle, completeSummary, httpTransport, observeScope, openHttpHeadStream, type CompleteSnapshot, type HeadStreamFetch, type ObservationState } from "@generalbusiness/dap-client";
import { issueNamed, type Context, type Outcome } from "./commands.ts";
import { configOf, done, failed, managedReadsOf, readerOf, run, signerOf, usage } from "./command-support.ts";

/** Reaching the bound is its own exit code, so a harness can start the same wait again. */
export const ISSUE_WAIT_BOUND_EXIT = 3;
export const ISSUE_WAIT_HOURS = 72;
/** A timer longer than 24.8 days fires at once, so the bound stops short of that. */
const ISSUE_WAIT_MOST_HOURS = 576;
const local = (ref: unknown): number | null => typeof ref === "number" ? ref : ref && typeof ref === "object" && "seq" in ref && typeof ref.seq === "number" ? ref.seq : null;

interface Question { ask: Item | null; items: readonly Item[] }

/** The line that wakes the agent, or null while the question still waits on a person. An unrelated entry and an approval with no decision wake nothing. */
export function questionWoke({ ask, items }: Question, id: number, lane: string): string | null {
  const show = (seq: number | null) => seq === null ? `dap log ${lane}` : `dap show ${lane}:${seq}`;
  if (!ask) return null;
  if (ask.state === "decided") return `Question ${id} is decided. Read the record and resume: ${show(local(ask.refs["decisionAt"]))}`;
  if (ask.state === "withdrawn") return `Question ${id} was withdrawn. Read the record and resume: ${show(null)}`;
  const changes = items.find(item => item.type === "approval" && item.state === "submitted" && item.values["verdict"] === "request-changes" && local(item.refs["ask"]) === id && local(item.refs["bodyAt"]) === local(ask.refs["bodyAt"]));
  if (!changes) return null;
  const by = changes.parties["approver"];
  return `${isMemberRef(by) ? by.member : "A member"} requested changes on question ${id}. Read the record, revise the question and ask again: ${show(changes.id)}`;
}

export function issueWait(ctx: Context, named: string, askWord: string, options: { hours?: number; bound?: Promise<void> } = {}): Promise<Outcome> {
  return run(async () => {
    if (!/^(0|[1-9][0-9]*)$/.test(askWord) || !Number.isSafeInteger(Number(askWord))) return usage("issue wait needs a question's item number, as the ask's receipt names it.");
    const hours = options.hours ?? ISSUE_WAIT_HOURS;
    if (!(hours > 0 && hours <= ISSUE_WAIT_MOST_HOURS)) return usage(`--hours needs a number above 0 and at most ${ISSUE_WAIT_MOST_HOURS}.`);
    const id = Number(askWord);
    const config = await configOf(ctx);
    const repository = config.repository ?? null;
    if (!repository) return usage("No repository is known here. Run: dap create <name>, or dap join <link>.");
    const issue = await issueNamed(ctx, config, await readerOf(ctx, config), named);
    const reads = await managedReadsOf(ctx, config), signer = await signerOf(ctx, config);
    const session = await reads.session();
    if (!session) return failed(`No read session was issued, so this command cannot hold the feed of ${issue.lane}.`);
    const transport = httpTransport(config.service, ctx.fetch ? { fetch: ctx.fetch } : {});
    const first = await new ScopeHandle(transport, issue.lane, session.reader()).summary();
    if (!first.ok) return failed(`Cannot read ${issue.lane}: ${first.reason}.`);
    const scope: ScopeRef = first.value.scope, origin = config.service.replace(/\/+$/, "");
    const question = async (reader: string, read: Read<Summary>): Promise<Read<CompleteSnapshot<Question>>> => {
      const complete = completeSummary(read);
      if (!complete.ok) return complete;
      const live = complete.value.value.items.find(item => item.type === "ask" && item.id === id);
      if (live) return { ...complete, value: { ...complete.value, value: { ask: live, items: complete.value.value.items } } };
      // A decided or withdrawn question has left the live summary. Its state never changes after that, so this read need not hold the same head.
      const final = await new ScopeHandle(transport, issue.lane, reader).queryItems({ v: 1, scope, type: "ask", states: ["decided", "withdrawn"], ids: [id], limit: 1, cursor: null });
      if (!final.ok) return { ok: false, reason: final.reason === "forbidden" ? "forbidden" : "unavailable" };
      return { ...complete, value: { ...complete.value, value: { ask: final.value.items[0] ?? null, items: [] } } };
    };
    const asked = await question(session.reader(), first);
    if (!asked.ok) return failed(`Cannot read ${issue.lane}: ${asked.reason}.`);
    if (!asked.value.value.ask) return failed(`Issue ${issue.lane} holds no question ${id}.`);
    const already = questionWoke(asked.value.value, id, issue.lane);
    if (already) return done(already);

    return await new Promise<Outcome>(resolve => {
      let ended = false;
      const end = (outcome: Outcome) => { if (ended) return; ended = true; clearTimeout(timer); observation.cancel(); resolve(outcome); };
      const headFetch = ctx.fetch as unknown as HeadStreamFetch | undefined;
      const observation = observeScope<Question>({
        context: { origin, scope, definition: first.value.definition, membership: repository.membership, member: session.claims.member, key: signer.key, deployment: session.claims.deployment },
        current: () => !ended,
        authenticate: async () => { const next = await reads.session(); return next ? { ok: true, session: next } : { ok: false, reason: "unavailable" }; },
        snapshot: async next => question(next.reader(), await new ScopeHandle(transport, issue.lane, next.reader()).summary()),
        open: (next, signal) => openHttpHeadStream(origin, scope, next, signal, headFetch ? { fetch: headFetch } : {}),
        emit: (state: ObservationState<Question>) => {
          if (state.status === "current") { const woke = questionWoke(state.snapshot.value, id, issue.lane); if (woke) end(done(woke)); }
          else if (state.status === "forbidden" || state.status === "unsupported" || state.status === "error") end(failed(`The room's feed for ${issue.lane} stopped: ${state.reason}. The question may still be open. Read the record.`));
        },
      });
      const bound = () => end({ code: ISSUE_WAIT_BOUND_EXIT, lines: [`Question ${id} still waits after ${hours} hours. This command signed nothing. Run it again to keep waiting.`] });
      const timer = options.bound ? undefined : setTimeout(bound, hours * 3_600_000);
      void options.bound?.then(bound);
      void observation.done.then(() => end(failed(`The room's feed for ${issue.lane} ended. The question may still be open. Run the same command to keep waiting.`)));
    });
  });
}
