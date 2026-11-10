# Get the dap command

You clone the dap repository, install its locked dependencies, and give
yourself a `dap` command that runs the checkout's launcher. You need Git,
npm, and Node.js 22.18 or later. Node 22.18 runs the command and the
tutorials. The project tests on Node 26.

No package registry publishes the `dap` command yet, so you run it from a
clone of the repository.

## Install the command

1. Clone the repository and go into it.

   ```sh
   git clone https://github.com/generalbusiness-ai/dap.git
   cd dap
   ```

   Git prints its progress and makes the directory `dap`.

2. Install the locked dependencies.

   ```sh
   npm ci
   ```

   npm reports the packages that it installed. The launcher needs these
   dependencies. It loads its own TypeScript loader from the checkout and
   fetches nothing when it runs.

3. Run the launcher with no arguments.

   ```sh
   node packages/cli/bin/dap.js
   ```

   The command prints `Usage:` and the list of commands, and exits with
   code 2. Exit code 2 means a command line that the command cannot run.

## Make `dap` a command

Choose one of these two ways. Run each command from the root of the clone.

- To use `dap` in the current shell, define an alias:

  ```sh
  alias dap="node $PWD/packages/cli/bin/dap.js"
  ```

  Add the same line, with the absolute path written out, to your shell's
  startup file to keep it.

- To put `dap` on your `PATH`, write a small script into a directory that
  is already on your `PATH`, such as `~/.local/bin`:

  ```sh
  printf '#!/bin/sh\nexec node "%s/packages/cli/bin/dap.js" "$@"\n' "$PWD" > ~/.local/bin/dap
  chmod +x ~/.local/bin/dap
  ```

Then run `dap` from any directory. It prints the same `Usage:` text. The
launcher works from any working directory.

## Choose where your keys live

The command keeps your signing keys and room configuration in a config
directory. Set `DAP_HOME` to choose that directory. Without it, a new
user's directory is `~/.config/dap`, or `$XDG_CONFIG_HOME/dap` when you set
`XDG_CONFIG_HOME`. Use a separate `DAP_HOME` for each identity, such as a
second person or an agent. [What it needs](cli.md#what-it-needs) in the
command reference gives the full rules.

## Update the command

To run a newer version, pull the new source and install again from the
root of the clone:

```sh
git pull
npm ci
```

## Next steps

- To take part in a room, follow
  [Join a room and publish one text change](../apps/room/docs/first-change.md).
- To connect Claude Desktop to a room, follow
  [Connect an AI app to a room](connect-an-ai-app.md).
- For every command and flag, read [The dap command](cli.md).
