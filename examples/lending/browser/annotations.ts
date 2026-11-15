/** Refusal wording is presentation data. It changes no pinned declaration. */
import type { Kind } from "@generalbusiness/dap-client";
import { lending } from "../definition.ts";

const common = {
  unauthorized: "Your seat in this room does not allow that.",
  "guard-failed": "The library cannot accept that action in the current state.",
  "revision-moved": "Someone changed that thing first. Look again, then decide.",
  "type-full": `The library is full: it holds ${lending.items.thing.max} things. Staff can cancel one to make room.`,
  final: "That thing is gone.",
  "bad-field": "The library did not accept those fields.",
};

/** Reason keys stay open until DX-B1 supplies typed native refusal names. */
export const refusalAnnotations = {
  donate: {
    ...common,
    "guard-failed": "That shelf page is invalid or already used.",
    "revision-moved": "Someone changed the library first. Look again, then decide.",
  },
  borrow: { ...common, "guard-failed": "That thing is already lent." },
  return: { ...common, "guard-failed": "That thing is not lent." },
  cancel: { ...common, unauthorized: "Only staff can cancel a thing.", "guard-failed": "That thing cannot be cancelled now." },
  publish: { ...common, "revision-moved": "Someone changed the library or that thing first. Look again, then decide." },
  reserve: {
    ...common,
    "guard-failed": "You can hold at most two reservations at once. The tool must also be free for that day.",
    "tool-day-taken": "Someone reserved that tool for that day.",
    "type-full": `The library already has ${lending.items.reservation.max} held reservations. Wait for one to end.`,
  },
  release: {
    ...common,
    "guard-failed": "Only its holder can release a held reservation.",
    "revision-moved": "Someone changed that reservation first. Look again, then decide.",
    final: "That reservation has ended.",
  },
  "release-by-staff": {
    ...common,
    unauthorized: "Only staff can use this release action.",
    "guard-failed": "That reservation is no longer held.",
    "revision-moved": "Someone changed that reservation first. Look again, then decide.",
    final: "That reservation has ended.",
  },
} satisfies Record<Kind<typeof lending>, Readonly<Record<string, string>>>;

export function annotatedRefusal(kind: Kind<typeof lending>, reason: string): string {
  const words: Readonly<Record<string, string>> = refusalAnnotations[kind];
  const said = Object.hasOwn(words, reason) ? words[reason]! : "The library refused.";
  return `${said} (${reason})`;
}

const proposal = {
  "library-unavailable": "The library could not be read.",
  "name-required": "Give the thing a name.",
  "description-required": "Describe the thing.",
  "name-too-long": `The name is too long: at most ${lending.acts.donate.fields.name.max} bytes.`,
  "description-too-long": `The description is too long: at most ${lending.acts.donate.fields.description.max} bytes.`,
  "thing-unavailable": "That thing is not in the library.",
  gone: "That thing is gone.",
  lent: "That thing is already lent.",
  "not-lent": "That thing is not lent.",
  "reason-required": "Say why the thing is gone.",
  "reason-too-long": `The reason is too long: at most ${lending.acts.cancel.fields.reason.max} bytes.`,
} as const;

export const proposalAnnotations = {
  donate: proposal, borrow: proposal, return: proposal, cancel: proposal,
  publish: proposal,
  reserve: proposal,
  release: proposal,
  "release-by-staff": proposal,
} satisfies Record<Kind<typeof lending>, typeof proposal>;

export function proposalWords(kind: Kind<typeof lending>, reason: keyof typeof proposal): string {
  return proposalAnnotations[kind][reason];
}
