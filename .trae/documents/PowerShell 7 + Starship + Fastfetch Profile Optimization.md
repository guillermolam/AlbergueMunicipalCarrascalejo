## Goals
- Replace your current PowerShell 7.5.4 profile with a fast, IDE-friendly setup.
- Configure Starship using `C:\Users\guill\.config\starship.toml` with Nerd Font/emoji-safe settings.
- Enable Fastfetch on interactive shells (without slowing down tasks).
- Ensure Winget works reliably (PATH + optional completions).

## What I Found (Current State)
- Your active PS7 profile path is `C:\Users\guill\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`.
- `winget` wasn’t found because `%LOCALAPPDATA%\Microsoft\WindowsApps` was missing from PATH (typical for App Installer aliases). Adding it fixes discovery.
- Your current `starship.toml` is minimal (only `[character]`).

## Proposed Profile Design (Performance-first)
- **Guardrails**: run “pretty/extra” things only when `($Host.UI -and $Host.Name -ne 'ServerRemoteHost')` and session is interactive.
- **Encoding**: set console input/output encoding to UTF-8 for Nerd Fonts + emojis.
- **PATH hygiene**: ensure WindowsApps is present in session PATH (and optionally persist if missing).
- **PSReadLine**: enable predictions + history search, keep bindings minimal and fast.
- **Starship**: initialize only if `starship.exe` exists; set `STARSHIP_CONFIG` to the user file.
- **Fastfetch**: run only in interactive console sessions and only if `fastfetch` exists; use a lightweight config.
- **Optional modules** (lazy/conditional): Terminal-Icons, zoxide, etc. Only load if present.
- **Preserve your existing customizations**: keep your `wslub` function and your Ctrl+Shift+V clipboard cleanup handler.

## Starship Configuration Plan (`C:\Users\guill\.config\starship.toml`)
- Base it on Warbacon’s approach (fast prompt, clean defaults) but tuned for IDEs:
  - `add_newline = false`
  - sensible `command_timeout`
  - git modules on, heavy cloud/k8s modules off by default
  - directory truncation tuned for repo work
  - `cmd_duration` enabled
  - language modules for node/rust/go/python enabled
  - unicode symbols (requires Nerd Font in terminal settings)

## PowerShell Engine Config Plan (`powershell.config.json`)
- Create/update `C:\Users\guill\Documents\PowerShell\powershell.config.json` based on Warbacon’s file:
  - enable experimental features suitable for PS 7.5+ (notably PSFeedbackProvider and native tilde expansion)
  - keep it conservative to avoid regressions in IDE terminals

## Fastfetch Config Plan
- Create/update `%APPDATA%\fastfetch\config.jsonc` (Windows default) or `~/.config/fastfetch/config.jsonc` if that’s what your install uses.
- Use a lean module list (OS, host, kernel, uptime, shell, terminal, cpu, gpu, memory, disk, net) and disable slow probes.

## How I Will Apply Changes (Because These Files Are Outside Repo)
- I can’t edit `C:\Users\guill\Documents\PowerShell\...` or `C:\Users\guill\.config\...` with the repo file editor.
- I will apply changes using PowerShell commands that write the files directly (Set-Content/Out-File), then reload the profile.

## Verification Steps
- Reload profile in a fresh PowerShell 7 terminal.
- Verify:
  - `Get-Command winget` works and `winget --info` runs.
  - `starship --version` and prompt renders with Nerd Font symbols.
  - `fastfetch` runs only on interactive startup.
  - No noticeable startup delay; no errors in VS Code/Trae integrated terminal.

## IDE Terminal Settings (Non-destructive Recommendations)
- Provide the exact VS Code settings keys to set Nerd Font (no automatic edits unless you want):
  - `terminal.integrated.fontFamily`
  - `terminal.integrated.minimumContrastRatio`
  - Windows Terminal profile font face

If you confirm, I’ll implement the profile + starship + fastfetch configs and validate in a fresh terminal.