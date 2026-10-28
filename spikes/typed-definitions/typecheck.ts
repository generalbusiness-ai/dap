/**
 * What the compiler refuses. Each `@ts-expect-error` line is a mistake the
 * original hand-written definitions would accept and the validator would
 * report only at run time. `tsc -p` fails if any line stops being an error.
 */
import type { AskedOf } from "@generalbusiness/dap-client";
import { lending as lendingData } from "../../examples/lending/definition.ts";
import { lending, thing, library } from "./lending.ts";
import { board } from "./counter.ts";
import { equals, none, open, range, signer, transition } from "./lib.ts";

// A state the item does not declare.
// @ts-expect-error "borrowed" is not a state of thing
transition(thing, "lending.member", {}, ({ on }) => ({ guards: [on.state(["borrowed"])] }));
// @ts-expect-error "lost" is not a state of thing
transition(thing, "lending.member", {}, ({ on }) => ({ effects: [on.to("lost")] }));

// A slot the item does not have.
// @ts-expect-error "owner" is not a party of thing
transition(thing, "lending.member", {}, ({ on }) => ({ effects: [on.party("owner", signer)] }));
// @ts-expect-error "title" is not a slot of thing
open(thing, "lending.member", {}, ({ on }) => ({ guards: [none(range(thing, undefined, { where: (it) => [equals(it.slot("title"), on.slot("name"))] }))] }));

// A field the act does not declare.
// @ts-expect-error the act has no field "page"
transition(thing, "lending.member", { fields: {} }, ({ f, on }) => ({ effects: [on.value("page", f.page)] }));

// A range over states another item has.
// @ts-expect-error "running" is a state of board, not of thing
range(thing, ["running"]);
void board; void library;

// The typed client: the act's fields are a precise type from the builder's output …
type Borrow = AskedOf<typeof lending, "borrow">;
const borrow: Borrow = { on: 1, fields: { content: "page" } };
// @ts-expect-error "contents" is not a field of borrow
const misspelt: Borrow = { on: 1, fields: { contents: "page" } };
// @ts-expect-error borrow is a transition and needs its item
const noItem: Borrow = { fields: { content: "page" } };
void borrow; void misspelt; void noItem;

// … and from the hand-written value, declared as `DeclaredDefinition`, it is not: any field name passes.
type BorrowData = AskedOf<typeof lendingData, "borrow">;
const anything: BorrowData = { on: 1, fields: { contents: "page", whatever: 3 } };
void anything;
