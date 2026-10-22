# Quiet Codex Themes

Two low-glare VS Code color themes inspired by the warm, quiet workspace in the reference image.

- **Quiet Codex Light** pairs an ivory editor with parchment sidebars, soft graphite text, and restrained olive accents.
- **Quiet Codex Dark** uses charcoal and warm graphite surfaces with sage, muted brass, and terracotta syntax colors.

## Try the themes locally

From this directory, run `code --extensionDevelopmentPath=.` to launch an Extension Development Host. In the new window, run **Preferences: Color Theme** and choose either Quiet Codex theme.

To install a packaged version, install `@vscode/vsce`, run `vsce package` from this directory, then install the generated `.vsix` with **Extensions: Install from VSIX...**.

## C# conditional branches

When the C# extension provides `excludedCode` semantic tokens, Quiet Codex gives those lines a distinct background and monochrome text. The styling follows the active C# project context automatically; no separate target-framework selection is needed.

## Automatic day/night schedule

Automatic switching is enabled by default. Quiet Codex Dark starts at 19:00 and remains active overnight and through the morning; Quiet Codex Light starts at 10:00. Change the start hours or disable the schedule in VS Code Settings by searching for `Quiet Codex Themes`. Times use the computer's local clock and whole hours.

