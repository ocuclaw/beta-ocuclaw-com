# OcuClaw Setup Assistant

**Guide version:** 2026-06-21

> **Reading this yourself?** Hand this whole document to your OpenClaw agent and say
> "set up OcuClaw for me using this guide." It checks with you before each step.
> Keep your phone nearby — setup takes about 20–30 minutes.

**You are an OpenClaw agent.** Someone handed you this guide to set up OcuClaw on this machine. Work phase by phase. Before each phase, say what you will do, why, and which commands matter. Ask for OK. Afterward, verify in plain words.

OcuClaw is the OpenClaw client for Even Realities G2 smart glasses. It has two halves: a **plugin** that runs inside OpenClaw on this machine and hosts a relay, and an **app** on the user's phone (from the Even Hub App Store) that drives the glasses. **Tailscale** privately connects the two. You set up the plugin here; the user sets up the app; you connect them. That's the whole shape — the steps below fill it in.

## File map (give the agent START_HERE.md; it loads the rest)

- Fresh install: https://ocuclaw.com/openclaw/fresh-install.md
- Update (stable, everyone): https://ocuclaw.com/openclaw/update.md
- Beta channel / rollback (beta-Discord testers only): https://ocuclaw.com/openclaw/beta.md
- Troubleshooting (by case name): https://ocuclaw.com/openclaw/troubleshooting.md
- Wrap-up / feedback: https://ocuclaw.com/openclaw/wrap-feedback.md
- Quick reference: https://ocuclaw.com/openclaw/quick-reference.md

**Progressive-loading rule.** Load only the file the router sends you to. A
clean install needs only this file, fresh-install.md, and wrap-feedback.md.
Do not pre-load troubleshooting.md, update.md, or beta.md.

This guide is authoritative for OcuClaw-specific setup. For generic OpenClaw
CLI behavior you are unsure about, check current OpenClaw docs.

Soniox voice input and Even AI are optional steps inside fresh-install.md
(Steps 11–12), not a separate file.

If you cannot fetch one of these files, ask the user for the direct URL to
that exact file, or ask them to paste it.

## How you (the agent) must work

**How you execute**

1. **Finish the whole job.** Work every required box before stopping; setup is not done while a required box is unchecked; a truly blocked step → `[blocked: reason]`, never a silent skip or early end.
2. **Run commands exactly as written.** Verbatim; don't rewrite, wrap in `read` or a loop, pipe, or add flags; substitute only the marked placeholder. *A clever "equivalent" has already broken installs.*
3. **Never set a secret to empty.** A token `config set` erroring `must have required property …` means the value came through empty — stop, re-run with a real visible value, don't proceed.
4. **Checkpoint each phase, not each command.** Before: say what you'll do, why, and which commands (1–2 plain sentences) — get an OK. After: verify the result in plain words.
5. **Warn before a restart; resume if you wake mid-setup.** Restart warning: "I may go quiet for ~30s. If I don't come back, send me this document's URL again and I'll resume where we left off." On wake: re-run the state assessment, re-enter at the routed step, don't re-ask passed checkpoints.

**Hard guardrails (never cross)**

6. **You never handle secrets — the user does.** Never ask for, generate, echo, or read a token; check presence only via the probes below; never run a bare `config get` on a secret leaf (it prints the value); never read the config file.
7. **Never expose the relay publicly.** Tailscale **Serve** only, never `funnel`; configuration goes through `openclaw config set` — non-secret values you may set, secret values only the user sets.
8. **Stay in bounds; hand off what you can't run.** Only commands from this guide; for OcuClaw setup this guide wins over web tutorials; for OS/vendor errors consult only that vendor's official docs and ask first; elevation you don't have or sandbox-blocked steps → give to the user, then verify.
9. **Version check.** Every file you fetch shows a `Guide version:` line. They must all match this one (2026-06-21). If a fetched file's version differs, you have a stale or cached copy — re-fetch it, or ask the user to paste that exact file.

### Secret presence probes

Each prints `1` (set / true) or `0` (missing / false) — the value never appears.
Run the form for your host OS. **⚠️ Run the whole line:** a targeted
`config get` on a secret leaf prints that one secret value if you drop the
`| grep -c …` (or, on Windows, the `-match` / `-eq` test). Never run it alone.

**Linux / macOS (bash/zsh):**
```bash
openclaw config get plugins.entries.ocuclaw.config.relayToken    2>/dev/null | grep -c '[^[:space:]"]'
openclaw config get plugins.entries.ocuclaw.config.sonioxApiKey  2>/dev/null | grep -c '[^[:space:]"]'
openclaw config get plugins.entries.ocuclaw.config.evenAiToken   2>/dev/null | grep -c '[^[:space:]"]'
openclaw config get plugins.entries.ocuclaw.config.evenAiEnabled 2>/dev/null | grep -c '^true$'
```

**Windows (PowerShell):**
```powershell
if ((openclaw config get plugins.entries.ocuclaw.config.relayToken    2>$null) -match '\S') {1} else {0}
if ((openclaw config get plugins.entries.ocuclaw.config.sonioxApiKey  2>$null) -match '\S') {1} else {0}
if ((openclaw config get plugins.entries.ocuclaw.config.evenAiToken   2>$null) -match '\S') {1} else {0}
if ((openclaw config get plugins.entries.ocuclaw.config.evenAiEnabled 2>$null) -eq 'true')  {1} else {0}
```

**Placeholder grammar.** Commands in this guide contain only these substitutable placeholders: `<port>`, `<node>.<tailnet>.ts.net`, `<container>`, and the quoted secret value the *user* fills. Substitute *only* those. Never change a command's shell structure, flags, quoting, or pipes, and never add a wrapper (`read`, a loop, `&&`, `|`). If a command appears to need anything beyond a marked placeholder, stop and ask — don't invent a variant.

## Setup checklist — copy this and track it

Copy this into your first reply and tick each box as you finish it. Do not tell the user setup is complete while any REQUIRED box is unchecked. A genuinely blocked box → mark `[blocked: reason]` and surface it, never drop it.

This is the FRESH-INSTALL checklist. If the state assessment routed you to U1 (update) or B1 (beta), follow that section's own short checklist instead — don't run these boxes.

**Required**
- [ ] Lane established — OS, container?, shell access, elevation
- [ ] OpenClaw ≥ 2026.4.25 + G2 glasses paired        (Step 1)
- [ ] Plugin installed                                 (Step 2)
- [ ] Relay token set by the user — probe = 1          (Step 3)
- [ ] Plugin enabled + agent tool access granted       (Step 4)
- [ ] Relay port safe, gateway restarted, plugin loaded(Step 5)
- [ ] Tailscale up on this machine                     (Step 6)
- [ ] Serve routes present → localhost:<port>          (Step 7)
- [ ] Phone on the tailnet                             (Step 8)
- [ ] OcuClaw app connected                            (Step 9)
- [ ] End-to-end: a reply appeared on the glasses      (Step 10)

**Optional (offer, don't assume)**
- [ ] Voice input via Soniox                           (Step 11)
- [ ] Even AI integration                              (Step 12)

Before the closing note, re-show this checklist in its final state as a self-audit.

## First — establish your lane

This is mandatory before any install action (the checklist's first box). Fill the **lane card** below — a short recorded block you keep and read at every later step instead of re-probing or re-arguing platform:

```
LANE CARD
  OS:            Linux | macOS | Windows              (uname -s / sw_vers / $PSVersionTable)
  Container:     no | yes → network mode host|bridge  (ls /.dockerenv /run/.containerenv ;
                 docker inspect -f '{{.HostConfig.NetworkMode}}' <container>)
  Shell access:  local | SSH | VPS console
  Elevation:     agent can sudo | user runs elevated  (sudo -n true / Admin PowerShell)
  Relay wsPort:  <filled at Step 5>
  Tailscale CLI: <filled at Step 6 — matters on the macOS App Store build>
```

Fill the environment rows now. `wsPort` and `Tailscale CLI` are appended when Steps 5 and 6 resolve them. Later steps read the card — they don't re-probe.

## Where to start

Run this now — and again after any restart or resume. It tells you which step (or section) to enter first.

### Check table

Run each check; record the result (1 = pass, 0 = fail).

| # | Check | Command |
|---|---|---|
| A | OpenClaw version ≥ 2026.4.25 | `openclaw --version` |
| B | Plugin installed + enabled | `openclaw plugins list` |
| C | relayToken set | relayToken probe (see probes above) |
| D | Gateway up, plugin loaded | `openclaw gateway status` · `openclaw plugins inspect ocuclaw` shows `Status: loaded` |
| E | Tailscale installed + signed in | `tailscale status` |
| F | Both Serve routes present AND proxying to the relay's `wsPort` | `tailscale serve status` (compare each backend `localhost:<port>` to `openclaw config get plugins.entries.ocuclaw.config.wsPort`) |
| G | Agent tool access — `ocuclaw` admitted past the tool profile | `openclaw config get tools` — pass if `alsoAllow` contains `"ocuclaw"`, or if `profile` is `full`/unset ("Config path not found" = pass) |

### Routing — enter at the FIRST matching row

| Finding | Enter |
|---|---|
| A: version below 2026.4.25, or G2 hardware unconfirmed | Step 1 |
| B: plugin not installed | Step 2 |
| C: relayToken probe = 0 | Step 3 |
| B: installed but not enabled | Step 4 |
| G: `tools.profile` set but `"ocuclaw"` missing from `tools.alsoAllow` | Step 4 |
| D: gateway down or plugin not `loaded` | Step 5 |
| E: Tailscale missing or not signed in | Step 6 |
| F: routes missing, old single-port scheme (`tcp://…:8443`), or present but proxying to a different local port than `wsPort` | Step 7 |
| Host green; app not yet connected (ask the user) | Step 9 |
| Everything green and the app connects — update only | Stable update → load update.md (everyone). Beta channel or rollback → load beta.md, only if they confirm they're a beta-Discord tester |
| Everything green and the app connects — single fix | Go directly to the one routed step; no full checklist |

## Router

If routed to a fresh install step, load fresh-install.md.
If routed to a stable update (any existing user), load update.md.
If routed to the beta channel or a rollback (beta-Discord testers only), load beta.md.
If a named failure case appears, load troubleshooting.md and jump to that case.
At a genuine finish, load wrap-feedback.md.
For address or command reminders, load quick-reference.md.

Keep START_HERE.md active throughout setup. It contains the guardrails, lane
card, checklist, and router.
