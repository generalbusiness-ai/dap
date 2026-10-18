# Lending application package

Run these commands from the repository root:

```sh
dap check . --config examples/lending/dap.application.json
dap dev . --config examples/lending/dap.application.json
dap pack . --config examples/lending/dap.application.json --publisher release --out /tmp/lending.dap.json
```

`pack` needs an existing CLI key named `release` and a new output path. `check`
and `dev` use public TEST keys and need no room account or network service.
The explicit config path and every source path inside it are relative to the
selected source root.

The package binds the current browser's native `definition.json` and includes
the compiled screen, fonts, favicons, wordmarks and font licences. The package
entry HTML uses relative resource links. The hosted page keeps its own entry.

The maintained scenario donates a thing, checks an original retry, refuses an
actor without membership, borrows and returns the thing, refuses a member's
staff action and a donation outside `shelf/`, and lets staff retire the thing.
The native journal replays consistently. Publication requests stay queued to a
labelled destination reference stand-in. No Git provider receives a page.

`dev` serves the screen and a native fixture inspection panel. The screen still
needs its existing room and device binding; it does not enroll a TEST actor.
Package installation and a shared room binding are the next M1 work. This
checkpoint keeps the existing hosted Lending route.

The proposed role defaults give members and agents `lending.member`; admins
also get `lending.staff`. An installer must ask the room admin which defaults
to grant. A package declaration alone grants no authority.
