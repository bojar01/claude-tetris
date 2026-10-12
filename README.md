# Tetris for Claude Code

A [Claude Code](https://claude.com/claude-code) plugin that opens a game of Tetris in your terminal
while Claude thinks or codes. The game pauses on its own when Claude is done, and resumes on the
next turn.

```
╭────────────────────╮
│ · · · · · · · · · ·│  TETRIS
│ · · · ██████ · · · │
│ · · · · ██ · · · · │  Score  1240
│ · · · · · · · · · ·│  Lines  12
│ · · · · ░░░░░░ · · │  Level  2
│ · · · · · ░░ · · · │  Best   3810
│ ██ · · · · · · ████│
│ ████ · ██████ ████ │  Next
╰────────────────────╯  ████████
```

## Features

- The game opens as soon as Claude starts working, and pauses as soon as it is done.
- The seven classic pieces, a ghost piece showing where the piece will land, and a preview of the
  next one.
- A new level every 10 lines, with faster gravity at each level.
- Your best score is kept across sessions.
- A `/tetris` command to open the game at any time.

## Requirements

- Claude Code, used **in a terminal** (the install command is not available in the desktop app's
  Code tab; once installed, the plugin shows up there too).
- A terminal wide enough for the game to open on its own: 144 columns, or 110 once you have opened
  it at least once with `/tetris`. In a narrower terminal, `/tetris` still opens it.

## Installation

In a Claude Code session, type:

```
/plugin install tetris --marketplace <owner>/<repo>
```

Replace `<owner>/<repo>` with the GitHub repository that hosts this plugin. Then:

1. When asked "Add marketplace?", answer `y`.
2. Pick the install scope (`user` by default: the plugin is active in all your sessions) and
   confirm with Enter.
3. The message `Installed tetris. Plugin is now active.` confirms the install. The plugin works
   right away, without a restart.

### From a local copy

To try the plugin without installing it, clone the repository and start Claude Code with the
folder:

```sh
git clone https://github.com/<owner>/<repo>.git
claude --plugin-dir ./<repo>
```

## Usage

There is nothing to do: send Claude a request and the game opens. Click in the game to give it the
keyboard, and press `Esc` to go back to the prompt.

| Key | Action |
| --- | --- |
| `←` `→` (or `h` `l`) | move the piece |
| `↑` (or `k`, `x`) | rotate the piece |
| `↓` (or `j`) | soft drop by one row (+1 point) |
| `Space` or `Enter` | hard drop (+2 points per row) |
| `p` | pause / resume |
| `r` | new game |
| `Esc` | leave the game and go back to the prompt |

### Scoring

| Lines cleared at once | Points (× level) |
| --- | --- |
| 1 | 100 |
| 2 | 300 |
| 3 | 500 |
| 4 | 800 |

## Uninstalling

```
/plugin uninstall tetris
```

Or use the `/plugin` menu, which can also disable it without removing it.

## Development

The plugin is a Claude Code hooks module written in TypeScript (TSX), with no dependencies:

```
.claude-plugin/
  plugin.json        plugin manifest
  marketplace.json   lets the plugin be installed straight from the repository
hooks/
  hooks.json         declares the hooks module
  register.tsx       /tetris command, open and pause with Claude's activity, best score
  tetris.tsx         the game and its rendering
types/
  index.d.ts         types of the plugin's shared state
tests/
  tetris.test.tsx    plugin tests
```

Validate the plugin and run the tests from the repository root:

```sh
claude plugin validate .
claude plugin test .
```

To work on it, start Claude Code with `claude --plugin-dir .`: the plugin reloads on every change.
