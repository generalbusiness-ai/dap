# Choose a role and manage membership

You invite people to a room, give each one a role and add or retire their
devices. Most of these tasks need a role that holds `membership.invite` or
`membership.manage`. By default, only an admin holds them.

## Choose a role

A role is a list of actions. Every member with that role can do the same
things. A job name such as "reviewer" or "writer" grants nothing.

| Role | What it can do by default |
|---|---|
| admin | Everything a maintainer can do, plus invite and manage members and publish the rules |
| maintainer | File and triage issues, propose, review and merge changes |
| member | File issues, propose and review changes. It cannot merge. |
| agent | File issues and propose changes. It cannot review or merge. |
| checker | Record check results. A check result is not a review. |

The room can still refuse an act that your role allows, for example when a
review requirement lacks approvals. To see the acts that your role allows
on a scope, run `dap acts <scope>`, such as `dap acts membership`.
[Get the dap command](../../../docs/get-dap.md) sets up the command.

## Invite a person

### In the browser

After you start a room in the browser, the screen **Your room is ready**
offers **Invite people**.

1. Choose **Create invitation**.
2. In **Handle**, type the person's handle, such as `@rita`.
3. Choose **Create invitation**. The page shows a private link.
4. Choose **Copy invitation link** and send the link to that person only.

The browser invitation gives the role `member` and lasts 24 hours. The room
screens do not invite people yet. To invite later or with another role, use
the `dap` command.

### With the dap command

1. Invite the person with a role.

   ```sh
   dap invite @rita --role member --hours 24
   ```

   You see the invitation and a private link:

   ```
   Invited @rita as member: invitation sc_p6xp2lmd...:5, until 2099-01-02T00:00:00Z.
   Link for @rita only (it holds the invitation's secret): artroom-invite:eyJ2Ijox...
   ```

2. Send the link to that person only. They follow
   [Join a room and publish one text change](first-change.md).

The role can be `admin`, `maintainer`, `member`, `agent` or `checker`. A
handle that the room already uses is refused. The command refuses
`--acts`, because a role's actions apply to every member with that role.

If the reply might be lost, add `--keep`. The command saves the invitation
before it sends it. Then `dap invite --check` reads the outcome without
sending, and `dap invite --continue` sends the original request again.

## Add a device for a member

Each device has its own key. A new device keeps the member's role. You need
`membership.invite` to make a device link. Without it, the **Devices**
screen asks you to ask an admin.

### In the browser

1. Choose your handle at the top of the page, then choose **Devices**.
2. In **Member**, type the member's handle.
3. Choose **Create device link**. The page shows a private link.
4. Send the link to that member only.

### With the dap command

1. Make the device link.

   ```sh
   dap invite @rita --device
   ```

2. Send the private `artroom-device-key:` link to that member only.

On the new device, the member joins with the link. In a browser, they
choose **Join with an invitation link** and paste it. With the command,
they run `dap join '<link>'` in an empty config directory.

## Change a role or retire a key

These tasks use the generic `dap act` command on the membership scope.
`--target` takes the item number from the membership record. A handle is
refused there.

To change a person's role:

```sh
dap act set-role --on membership --target <member> --set role=maintainer
```

`set-role` takes `admin`, `maintainer` or `member`. It applies only to an
active person. The room refuses to change the role of its last admin with
`last-admin`.

To retire a device key:

```sh
dap act revoke-key --on membership --target <key> --set as=retired
```

If the key was stolen, set `as=compromised` instead. The room then also
tells the directory.
[What a revoked key keeps][revoked] lists what a revoked key can still
read, and for how long.

[revoked]: ../../../docs/security/trust-boundaries.md#what-a-revoked-key-keeps

The room does not let you revoke the last active key of its last admin.

## Connect an agent

An agent is a separate member with its own key. A person invitation with
the role `agent` still makes a person.

- In the browser, the screen **Your room is ready** offers
  **Create agent invitation**.
- With the command, an admin adds the agent with `add-member` and invites
  its key with `invite-key`. [`dap join`](../../../docs/cli.md#dap-join)
  describes how the agent enrolls its key.
