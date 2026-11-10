# Follow a change through publication

You merge a reviewed change and confirm that the room published it. You
need a role that holds `change.merge`. By default, an admin and a
maintainer hold it. A member cannot merge, even a change of their own.

A merge asks the room's destination to publish the current version. The
change is merged only when the destination reports a published commit.

## Merge in the browser

1. Open **Changes** and choose the change.
2. Check the state beside the title. **Needs review** or
   **Waiting for review** means that the version still lacks approvals.
3. Choose **Merge change** when the page offers it. The page shows the
   room's answer.
4. Read the state again. **Awaiting confirmation** means that the
   destination is still publishing. **Merged** means that it published the
   version.
5. For a one-file version, choose **Open latest page** to see the published
   file.

**Open latest page** shows the latest published branch. A later change can
replace what it shows.

## Merge with the dap command

1. Merge the change by its scope ID.

   ```sh
   dap merge sc_q3xk...
   ```

2. Read the result. The command waits for the destination's answer.

   | You see | It means |
   |---|---|
   | `Published: commit ...` | The room published this commit. For one file, a `Page:` line follows. |
   | `Reserved: merge ..., tree ...` | The destination reserved the version. Required checks must pass before it publishes. |
   | `Not published: ... rules-not-met:<requirement>` | A review requirement lacks approvals. The change stays open. |
   | `Refused: unauthorized` | Your role does not hold `change.merge`. |
   | `Observation unknown: ...` | The merge took effect, but the command could not read its outcome. |

   A published merge looks like this:

   ```
   Published: commit 5d0c1e6b..., by the merge sc_q3xk...:8.
   Page: https://dap-demo.inguz.workers.dev/site/sc_hs5f27fz.../HEAD/guide/start.md
   ```

3. If the change is refused, read the reason. After the missing reviews
   arrive, run `dap merge` again.

To close an issue when the change is published, add `--closes <issue>`.
`--closes` links the change as its author, so only the author can use it.

## If you do not know whether the merge took effect

If the page shows **Check status**, choose it. It reads the outcome and
sends nothing new.

If the command prints `Observation unknown`, do not run `dap merge` again.
The merge already took effect. Read the change's journal instead.

```sh
dap log sc_q3xk...
```

A repeated merge signs a new request. It does not recover the outcome of
the first one.

## If publication stops

- **A review is missing:** ask an eligible reviewer to follow
  [Review an exact change version](reviewing.md).
- **A required check failed:** fix the cause and ask for the check again.
- **The path is invalid:** the destination refuses a path such as one with
  a `..` or `.git` segment as `path-invalid`. Propose a corrected change.
  In the browser, the change shows **Invalid path** and offers
  **Create corrected proposal**.
