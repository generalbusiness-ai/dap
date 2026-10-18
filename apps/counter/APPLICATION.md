# Counter application package

Run these commands from the repository root:

```sh
dap check . --config apps/counter/dap.application.json
dap dev . --config apps/counter/dap.application.json
dap pack . --config apps/counter/dap.application.json --publisher release --out /tmp/counter.dap.json
```

`pack` needs an existing CLI key named `release` and a new output path. `check`
and `dev` use public TEST keys and need no room account or network service.
The explicit config path is relative to the selected source root. Paths inside
that config also start at the source root.

The maintained package uses `commitments.json`, the current browser's native
counting definition. The earlier `definition.json` remains historical data.
The package contains the compiled screen, its fonts, wordmarks, favicons and
font licences. `browser/application.html` gives the package relative resource
links. The host serves those signed assets through the generic application route.

The local scenario establishes a target of two, activates two participants,
checks an original retry, refuses another participant's fulfilment and a
consecutive turn, and finishes the count. Native replay checks the resulting
journal. The TEST actor grants are explicit scenario inputs. They do not show
room membership, device enrollment, audio or a hosted installation.

`dev` serves the screen and a native fixture inspection panel. The local screen does not enroll a TEST actor; the panel exposes the local
TEST actors for SDK work.

For native use, commit the signed packet to an HTTPS Git repository and
[install its exact release](../../docs/cli.md) in a `trusted-application` room.
The operator must trust that release and publisher. Read the active result
with `dap application <install-item>` and open its screen URL. The screen
loads its exact room and installation binding, then enrolls a device from a
matching private invitation. It stores that device's nonextractable key in
IndexedDB. Reload restores the identity; joining and arming the count still
require an explicit action. See [device startup](browser/startup.md).

The proposed defaults give the room's admin control and participation grants;
member and agent roles get participation grants. These declarations do not
create membership or authority. The installer must ask the admin to select
which defaults to grant.
