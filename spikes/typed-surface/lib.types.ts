/** Positive API typing. The measured diagnostic fixtures own the negative examples. */
import { by, define, fact, grants, item, itemOf, live, one, open, reasons, ref, require, required, roles, siblings, text, transition, value, via } from "./lib.ts";

const grant = grants({ create: "typing.create", edit: "typing.edit" });
const why = reasons({ notOpen: "not-open" });
const root = item("root", { states: { open: live }, values: { label: value.fixed(text(40)) } });
const link = item("link", { states: { open: live }, refs: { root: ref.fixed(itemOf(root)) } });
const establish = open(root, grant.create, { fields: { label: required(text(40)) } }, ({ f, on }) => ({ effects: [...on.take(f, "label")] }));
const edit = transition(link, grant.edit, { also: (on) => siblings({ link: by(link) }, ($) => ({ root: via(root, $.link, "root"), original: via(root, on, "root") })) }, ({ f, also }) => ({ guards: [require(also.root.in("open"), why.notOpen), also.link.equals(f.link, also.link.id)] }));
export const typedDefinition = define({ name: "typing", genesis: "establish", grants: grant, reasons: why, items: [root, link], acts: { establish, edit } });
export const typedFact = fact(typedDefinition.acts.establish);
export const typedRoles = roles(grant, { writer: [grant.create, grant.edit] });
export const typedSingleton = one(root);
