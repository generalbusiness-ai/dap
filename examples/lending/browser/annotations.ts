/** Refusal wording is presentation data. It changes no pinned declaration. */
import type { Kind } from "@generalbusiness/dap-client";
import { lending } from "../definition.ts";

const common = {
  unauthorized: "Your seat in this room does not allow that.",
  "guard-failed": "That thing cannot be cancelled now.",
  "revision-moved": "Someone changed that thing first. Look again, then decide.",
  "type-full": `The library is full: it holds ${lending.items.thing.max} things. Staff can cancel one to make room.`,
  final: "That thing is gone.",
  "bad-field": "The library did not accept that text.",
};

/** Reason keys stay open until DX-B1 supplies typed native refusal names. */
export const refusalAnnotations = {
  donate: common,
  borrow: { ...common, "guard-failed": "That thing is already lent." },
  return: { ...common, "guard-failed": "That thing is not lent." },
  cancel: { ...common, unauthorized: "Only staff can cancel a thing." },
  publish: common,
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
} satisfies Record<Kind<typeof lending>, typeof proposal>;

export function proposalWords(kind: Kind<typeof lending>, reason: keyof typeof proposal): string {
  return proposalAnnotations[kind][reason];
}
