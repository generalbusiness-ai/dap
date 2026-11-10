# Review an exact change version

You read one version of a change and record a verdict on it for one review
requirement. You need a role that holds `change.review`. By default, an
admin, a maintainer and a member hold it. You cannot review a version that
you wrote.

## Know the review requirements

The room's rules split the repository into review requirements. Each one
names paths, how many approvals a version needs and who may give them. The
default rules have three:

| Requirement | Paths | Who may approve |
|---|---|---|
| `rules` | `AGENTS.md` and `CLAUDE.md` in any folder, `.github/workflows/`, `.github/actions/` | A role with `rules.publish`: an admin |
| `infrastructure` | `.gitignore` and `.gitattributes` in any folder, `.github/` | A role with `change.merge`: an admin or a maintainer |
| `source` | Every path that no other requirement names | A role with `change.review` |

A room can change these. Open **Rules** in the page to read your room's
requirements. One verdict counts for one requirement. A change that touches
two requirements needs a verdict for each.

## Review in the browser

1. Open **Changes** and choose the change. The heading shows its state and
   **Version** with its number.
2. Open **Preview source**. It shows the exact text of this version.
3. Read **Review requirements**. It shows how many approvals each
   requirement has and how many it needs.
4. Choose **Review change**. The dialog **Review version** opens with the
   version number.
5. In **Decision**, choose **approve** or **request changes**.
6. In **Review requirement**, choose the requirement that you judge. The
   list shows only the requirements that you may review for this file.
7. Optionally, write a **Review comment**.
8. Choose **Review change**. The page shows the room's answer.

If someone asked you for the review, the page names that request in the
dialog.

For a version with several files, the page has no guided
**Review change** task and no source preview. **Advanced** still offers
the review form, with the version filled in. To read each file first,
review that version with the `dap` command.

## Review with the dap command

In the commands below, `<change>` is the change's scope ID, such as
`sc_q3xk...`. `<version>` is the version number that `dap edit`,
`dap propose` or the page printed.

1. Read the change's journal.

   ```sh
   dap log <change>
   ```

2. Read the entry that proposed the version.

   ```sh
   dap show <change>:<version>
   ```

   The line `Fields:` shows what the author signed. For one file, the
   fields hold the file's path, digest, size and text. For several files,
   they list one source entry for each file. Read each source entry with
   `dap show`.

3. Record your verdict for one requirement.

   ```sh
   dap act review-verdict --on <change> \
     --set manifest=<version> --set verdict=approve --set extent=source
   ```

   You see the entry that recorded it:

   ```
   Took effect: entry sc_q3xk...:9, hash sha256:2cd70f9ada97.
   ```

The field `manifest` takes the version number. To ask for changes, set
`verdict=request-changes`. A `request-changes` verdict is not an approval.

## Change your verdict

You can record one verdict for each version. To replace it, name your
earlier review's item number in `earlier`. The change record lists it under
**Reviews**.

```sh
dap act review-verdict --on <change> \
  --set manifest=<version> --set earlier=<review> \
  --set verdict=request-changes --set extent=source
```

The new verdict replaces the earlier one. An approval does not carry over to
a new version of the same change. Read the new version and review it again.

## If the room refuses your verdict

- **`author-cannot-review`:** you wrote this version. Ask another member to
  review it.
- **`verdict-exists`:** you already reviewed this version. Replace your
  verdict as described above.
- **`unauthorized`:** your role does not hold `change.review`. Ask an admin.
- **The version is no longer current:** the author proposed a newer
  version. Read the new version and review it.
- **A wrong requirement name:** a verdict for a requirement that the rules
  do not hold counts for none. Check **Rules** and record it again.
