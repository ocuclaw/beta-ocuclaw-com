# OcuClaw Setup Assistant

> **Reading this yourself? Here's how to use it.** This is a setup guide meant to be
> *run by your OpenClaw agent*, not followed by hand. Hand the whole document to your
> agent — paste it into your OpenClaw chat, or tell your agent to fetch this page —
> then ask it to **"set up OcuClaw for me using this guide."** It checks with you
> before each step and explains what it's doing, so you don't need to understand the
> commands yourself. Keep your phone nearby; setup takes about 20–30 minutes.

**You are an OpenClaw agent.** A person gave you this document because they want
you to set up OcuClaw — the OpenClaw client for Even Realities G2 smart glasses —
using this machine as the host. Do the work for them, but never silently.

OcuClaw has two halves: a **plugin** (runs inside OpenClaw on this machine and
hosts a relay on a private loopback port — `localhost:47800` by default) and an **app** (installed on their phone from
the Even Hub App Store, drives the glasses). Tailscale connects the two privately.

## Ground rules — read once, apply everywhere

1. **Checkpoint every phase.** Before: say what you'll do, why, and which
   commands — 1–2 plain sentences — then ask permission. After: show the
   verification result and translate it into plain language. One checkpoint per
   phase, not per command.
2. **Stay in bounds.** Run only commands listed in this document. Anything else:
   explain and ask first. For OcuClaw-specific setup this document wins — don't
   blend in steps from random web guides. For OS/vendor command errors (Tailscale,
   npm, your shell), consult the official vendor docs only, and ask before
   deviating from this document.
3. **You never handle secrets — the user does.** You never ask for, generate,
   echo, store, or read a token, password, or API key. The *user* runs the
   documented `openclaw config set …` command for each secret in their own
   terminal (P3 / P11 / P12 show which). To check a secret is set, use only the
   count-only probes below — never run a bare `config get` on a secret leaf (it
   prints that value), never read the config file.
4. **Never expose publicly.** Tailscale **Serve** only — never `tailscale
   funnel` (that makes the relay public). Never edit OpenClaw's config file by
   hand; configuration changes go through `openclaw config set` — non-secret
   values you may set yourself, secret values only the user sets (rule 3).
5. **Gauge the user once, early:** "Have you used a terminal before?" Novice →
   plain words, no jargon. Expert → terse. Same checkpoints either way. Note the
   **host OS** now too: these read-only probes are explicitly allowed (rule 2) —
   `uname -s` (Linux/macOS), `sw_vers` (macOS), `$PSVersionTable` / `ver` (Windows).
   Confirm with the user; the OS drives P6/P7 and which secret-probe form you run.
6. **Commands you can't run, the user runs.** On **Linux/macOS**, probe `sudo -n
   true` once; if it fails you can't elevate, so every `sudo` command below moves
   to the user's terminal. On **Windows** there is no ambient elevation: the
   admin-required commands run in an **Administrator PowerShell**, which you
   usually can't spawn yourself, so those go to the user too. Global rule — a
   `sudo`-prefixed command in this document is the Unix form; on Windows run the
   same command **without `sudo`** in an Administrator PowerShell. Same "give it to
   the user" handling for anything your policy or sandbox blocks — then verify.
7. **Restart warning.** Before any `openclaw gateway restart`, tell the user:
   "I may go quiet for ~30s. If I don't come back, send me this document's URL
   again and I'll resume where we left off."
8. **Resume.** If you wake mid-setup, run the State Assessment and re-enter at
   the routed phase. Don't re-ask checkpoints that already passed. On a novel
   error not covered below: gather diagnostics (`openclaw plugins doctor`,
   `openclaw gateway status`), explain plainly, then ESCALATE — don't experiment.
9. **Finish with WRAP.** When a flow genuinely completes *and* succeeded, deliver
   the **WRAP** closing note once (see the WRAP section before the troubleshooting
   appendix). Never deliver it after a failure or an ESCALATE.
<!-- BETA-FEEDBACK:START -->
10. **Beta walkthrough feedback.** This guide is in beta. When you begin a fresh
    setup, tell the user once, early and warmly, that you'll keep light notes on how
    the walkthrough goes and offer a short, shareable summary at the end to help
    improve the guide — nothing sensitive, and sharing is optional. At the closing
    WRAP of a fresh install, assemble the **BETA-FEEDBACK** bundle (after the WRAP
    section).
<!-- BETA-FEEDBACK:END -->

### Secret presence probes (the only allowed way to check)

Each prints `1` (set / true) or `0` (missing / false) — the value never appears.
Run the form for your host OS (rule 5). **⚠️ Run the whole line:** a targeted
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

## State assessment — run now, and after any restart or resume

| # | Check | Command |
|---|---|---|
| A | OpenClaw version ≥ 2026.4.25 | `openclaw --version` |
| B | Plugin installed + enabled | `openclaw plugins list` |
| C | relayToken set | relayToken probe above |
| D | Gateway up, plugin loaded | `openclaw gateway status` · `openclaw plugins inspect ocuclaw` shows `Status: loaded` |
| E | Tailscale installed + signed in | `tailscale status` |
| F | Both Serve routes present AND proxying to the relay's `wsPort` | `tailscale serve status` (compare each backend `localhost:<port>` to `config get …wsPort`) |

Enter at the FIRST matching row:

| Finding | Enter |
|---|---|
| A below 2026.4.25, or hardware unconfirmed | P1 |
| B: not installed | P2 |
| C: probe = 0 | P3 |
| B: installed but not enabled | P4 |
| D: gateway down / plugin not `loaded` | P5 |
| E: missing or signed out | P6 |
| F: routes missing, old single-port scheme (`tcp://…:8443`), or present but proxying to a different local port than `wsPort` | P7 |
| Host green; app not yet connected (ask the user) | P8 |
| Everything green and the app connects | Offer U1 (stable update check); offer B1 only if they confirm they're a beta tester; then P11/P12 if unset; else P13 |

## Phases

Template: **GOAL · CHECK (skip-if) · DO · VERIFY · IF-FAILED → appendix key.**

### P1 — Prerequisites
- GOAL: confirm hardware and host meet requirements.
- CHECK: ask — are the G2 glasses paired in the Even Realities app, and does
  Even Hub open? If not, stop: finish Even Realities onboarding first.
- Set expectations: ~20–30 min; they'll need their phone, a terminal on this
  machine, and will create 1–2 passwords.
- DO: `openclaw --version`
- VERIFY: ≥ 2026.4.25.
- IF-FAILED → HOST-OLD.

### P2 — Install the plugin
- ASK FIRST (routing): "Are you installing the **beta** build from the OcuClaw
  Discord?" Route to beta only if they confirm they're a beta-testing Discord
  member (same gate as B1, the full beta lane at the end); otherwise install stable.
- CHECK: `openclaw plugins list` already shows `ocuclaw` → P3.
- DO (stable — default): `openclaw plugins install ocuclaw`
- DO (beta — only if they confirmed): `openclaw plugins install ocuclaw@beta`
  (the beta channel is published; see B1 for refresh / rollback).
- VERIFY: `openclaw plugins list` shows ocuclaw.
- IF-FAILED → HOST-OLD; otherwise ESCALATE.

### P3 — Relay token (user's own terminal)
- GOAL: the user creates a relay password and sets it themselves, so it never
  passes through you.
- CHECK: relayToken probe = 1 AND the user knows their token → P4. Probe = 1
  but token forgotten → they set a new one (same DO).
- DO (user, their own terminal — see TERM-HELP if stuck):
  1. Create a strong password (password manager recommended). They'll type it
     into their phone in P9, so it must be typeable.
  2. Run, replacing `your-relay-token` but keeping the quotes:
     `openclaw config set plugins.entries.ocuclaw.config.relayToken "your-relay-token"`
- Why now: the plugin's schema requires the token BEFORE the plugin can be enabled.
- VERIFY: relayToken probe = 1.
- IF-FAILED → TERM-HELP.

### P4 — Enable the plugin
- CHECK: `openclaw plugins list` shows ocuclaw enabled → P5.
- DO: `openclaw plugins enable ocuclaw`
- DO (agent — non-secret, rule 4): grant OcuClaw's internal agent-lifecycle hooks so
  per-session glasses display state resets cleanly at the end of each turn. Without it
  those hooks are blocked and the gateway logs a warning on every run:
  `openclaw config set plugins.entries.ocuclaw.hooks.allowConversationAccess true --strict-json`
- VERIFY: list shows it enabled.
- IF-FAILED: a rejection usually means the token didn't save → back to P3.

### P5 — Set the relay backend port, restart the gateway, verify runtime
- GOAL: bind the relay to a loopback port that is free on this host (Windows
  often reserves `9000` via WinNAT), then load the plugin.
- STEP 1 — ensure a host-safe relay backend port, deciding BY VALUE (not by
  emptiness). Read the effective port (non-secret): `openclaw config get
  plugins.entries.ocuclaw.config.wsPort`. IMPORTANT: for an enabled plugin this
  returns the configured value OR the materialized schema default `9000`, so you
  CANNOT tell "unset" from "deliberately 9000" — treat both the same:
  - A specific NON-`9000` value (e.g. `47800`) → a deliberate choice; keep it,
    make NO change. Go to Step 2.
  - `9000` (or `Config path not found`) → the risky default is in effect; set a
    safe port (you may run this yourself, rule 3):
    1. Target `47800`.
    2. Confirm `47800` is actually free on this host (read-only, all allowed):
       - **Windows:** `netsh int ipv4 show excludedportrange protocol=tcp`
         (WinNAT reservations — `47800` must not fall inside any start–end block)
         AND `netstat -ano | findstr :47800` (no line = no live listener).
       - **Linux:** `ss -ltnH "sport = :47800"` (no output = free).
       - **macOS:** `lsof -nP -iTCP:47800 -sTCP:LISTEN` (no output = free).
       If `47800` is reserved or in use, walk this ladder, re-checking each, until
       one is free: `47800 → 43117 → 38271`. (Even if you skip this, P5's VERIFY +
       RELAY-PORT-CLAIMED still catch a bad bind on every OS.)
    3. Set it (replace `<port>` with the number you chose; keep `--strict-json`):
       `openclaw config set plugins.entries.ocuclaw.config.wsPort <port> --strict-json`
- STEP 2 — restart if needed: if you changed the port in Step 1, OR the gateway
  is not already healthy with ocuclaw `Status: loaded` (State Assessment D red),
  give the restart warning, then `openclaw gateway restart`. If you changed
  nothing and D was already green, you may skip the restart.
- VERIFY (always, before leaving P5 — never continue to P6 without a loaded
  relay): `openclaw gateway status` healthy; `openclaw plugins inspect ocuclaw`
  shows `Status: loaded`; `openclaw plugins doctor` reports no ocuclaw issues.
  (Unrelated `doctor`/`config` warnings about *other* plugins or host settings
  don't block — only ocuclaw-specific failures do.)
- IF-FAILED → if the startup log shows a relay bind/port error (`EADDRINUSE`,
  `WSAEACCES`, "address already in use", "forbidden by its access permissions")
  → RELAY-PORT-CLAIMED; else GW-DOWN; if it shows the relayToken error verbatim
  → ERR-RELAY-TOKEN.

### P6 — Tailscale on this machine
- GOAL: a free, private, encrypted tunnel so the phone can reach this machine
  from anywhere; only devices signed into the user's tailnet can connect.
- CHECK: `tailscale status` shows signed in → P7.
- DO (per platform — install first, then sign in):

  Install:
  - **Linux:**
    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    ```
    (The install script needs root; if you can't elevate — rule 6's `sudo -n true`
    failed — hand this command to the user to run.)
  - **macOS:** install the **standalone package** from `tailscale.com/download`
    (recommended — it puts the `tailscale` CLI on `PATH`, which P7 needs). The Mac
    **App Store** build keeps its CLI at
    `/Applications/Tailscale.app/Contents/MacOS/Tailscale` — call it via that full path in P7.
  - **Windows:** run the installer from `tailscale.com/download/windows`.

  Then sign in:

  | Platform | Sign in |
  |---|---|
  | Linux | `sudo tailscale up`, user opens the printed URL and logs in |
  | macOS | open the Tailscale app, sign in |
  | Windows | sign in from the tray app |

- VERIFY: `tailscale ip -4` prints a `100.x.y.z` address. (`tailscale version`
  confirms the build — the Serve routes in P7 need a reasonably current Tailscale.)
- IF-FAILED → TS-AUTH.

### P7 — Serve routes (two doors into the relay)
- GOAL: expose the relay on the tailnet. Two routes, one purpose each:

  | Port | Type | Used by |
  |---|---|---|
  | `:8444` | direct TCP (TLS-terminated) | the OcuClaw app — stabler, no HTTP proxy in the path |
  | `:8443` | HTTPS proxy | Even AI's agent endpoint (P12) |

- RESOLVE `<port>` FIRST (you may have entered P7 directly without running P5):
  read the relay's ACTUAL backend port (non-secret) — `openclaw config get
  plugins.entries.ocuclaw.config.wsPort` (returns the configured value or the
  materialized default `9000`). If it returns `9000` — the risky default that P5
  is meant to move off — run P5 (Step 1 + Step 2) now, then re-read. `<port>` is
  the resulting non-`9000` value, used in every command below.
- CHECK: `tailscale serve status` already shows both routes AND both proxy to
  `localhost:<port>` → P8. If both exist but point at a different local port (e.g.
  an old `:9000`), the relay moved — re-run the DO commands below with `<port>`.
  Shows `tcp://…:8443` (old scheme) → MIGRATE-8443 first.
- DO (sudo lane; on Windows use an Administrator PowerShell and drop `sudo`).
  Point both routes at `<port>` — substitute it in **both** commands (the example
  shows the `47800` default):
  ```bash
  sudo tailscale serve --bg --tls-terminated-tcp=8444 tcp://localhost:47800
  sudo tailscale serve --bg --https=8443 http://localhost:47800
  ```
- VERIFY: `tailscale serve status` contains both blocks, each proxying to
  `localhost:<port>` (`47800` by default; other routes may also exist — leave them alone):
  ```
  |-- tcp://<node>.<tailnet>.ts.net:8444 (TLS terminated, tailnet only)
  |--> tcp://localhost:47800

  https://<node>.<tailnet>.ts.net:8443 (tailnet only)
  |-- / proxy http://localhost:47800
  ```
  Note the machine name from that output (`<node>.<tailnet>.ts.net`) — the
  user's addresses are built from it.
- IF-FAILED → TS-PORT-CLAIMED; if `tailscale serve` or `--tls-terminated-tcp` is
  rejected as an unknown command/flag → TS-SERVE-UNSUPPORTED.

### P8 — Phone joins the tailnet
- DO (user, phone): install Tailscale from the App Store / Google Play; sign in
  with the SAME account; leave the VPN toggle on. If the tailnet requires
  device approval, approve at login.tailscale.com/admin/machines.
- VERIFY: the phone appears in `tailscale status` on this machine, and the
  phone's Tailscale app shows Connected. If several devices show up in `tailscale
  status`, don't guess — ask the user which one is their phone, and trust the phone
  app's own "Connected" state as the source of truth.
- IF-FAILED → PHONE-NO-REACH.

### P9 — OcuClaw app
- DO (user, phone): Even Realities app → Even Hub App Store → install and open
  OcuClaw. In Relay Server enter:
  - Address: `wss://<node>.<tailnet>.ts.net:8444` (fill in the real machine name
    from P7). **⚠️ Must start with `wss://` (not `ws://`) and use the external
    port `:8444` — not `:8443` (the Even AI door), and not the relay's local
    `wsPort` (e.g. `47800`), which is loopback-only and never reachable from the
    phone.** The user types this by hand, so it's the easiest place to slip.
  - Token: the relay password created in P3
  Tap Connect.
- VERIFY: the app shows Connected and OpenClaw Status fills in (session, model).
- IF-FAILED → APP-CONNECT-FAIL.

### P10 — End-to-end check
- DO (user): with the glasses on, send "hello" from the app's Send Message box;
  read the reply on the glasses.
- VERIFY: reply visible on the glasses. Core setup is DONE — say so, warmly.
- IF-FAILED: app reported a send failure → APP-CONNECT-FAIL · sent but no reply
  → GW-DOWN · reply visible in the app but glasses dark → wake the glasses
  (double-tap), reopen OcuClaw inside Even Hub, retry.

### P11 — Voice input via Soniox (recommended — most users set this up)
- Pitch honestly: talk to the agent from the glasses instead of typing. Needs a
  Soniox account — free to create, but transcription needs a little credit on it.
  The key is set the same way the relay token was. Skippable → P12.
- DO (user): sign up at soniox.com, add payment info and load some credit onto the
  account (Soniox needs a positive balance to transcribe), create an API key in
  their console, then in their own terminal:
  `openclaw config set plugins.entries.ocuclaw.config.sonioxApiKey "your-soniox-api-key"`
- DO (agent): confirm sonioxApiKey probe = 1 first (don't restart on an unset
  key), then restart warning + `openclaw gateway restart`
- VERIFY: the user taps to listen on the glasses and speaks.
- IF-FAILED → ESCALATE (note that voice was the failing phase).

### P12 — Even AI integration (recommended)
- Pitch: the Even AI wake word gets answered by THEIR OpenClaw. Skippable → P13.
- ORDER MATTERS: token first, then enable — config validation rejects enabling
  Even AI without its token.
- DO (user, terminal): create a second password (the Even AI token), then:
  `openclaw config set plugins.entries.ocuclaw.config.evenAiToken "your-even-ai-token"`
- DO (agent): confirm evenAiToken probe = 1, then run:
  `openclaw config set plugins.entries.ocuclaw.config.evenAiEnabled true --strict-json`
  then restart warning + `openclaw gateway restart`
- DO (user, web) — **unlock "Agent Configuration" first.** This section is itself an
  Even Realities beta and stays hidden until the account is flagged for it. The user
  signs in at `https://hub.evenrealities.com/hub` with the **same email** as their
  Even Realities account; that flags the account, and an `Agent Configuration`
  section then appears at the bottom of the app's `Even AI` settings. Propagation
  isn't instant — if it's not there yet, wait a bit and fully restart (force-close
  and reopen) the Even Realities app on the phone.
- DO (user, phone): Even Realities app → Settings → Even AI settings → Agent
  Configuration (at the bottom) → Add Agent:
  - URL: `https://<node>.<tailnet>.ts.net:8443/v1/chat/completions`
  - Token: the Even AI password just created
  ⚠️ This is the OTHER door: the `https://…:8443/v1/chat/completions` URL —
  NOT the `wss://…:8444` relay address.
- VERIFY: the user triggers Even AI on the glasses; the answer comes from their
  OpenClaw session.
- IF-FAILED → if `Agent Configuration` never shows up, the beta unlock hasn't
  propagated yet (re-check the hub sign-in used the right account email, wait, then
  restart the app); on a token error → ERR-EVENAI-TOKEN; otherwise ESCALATE.

### P13 — Wrap-up
Tell the user, briefly: what was installed and configured (plugin, token(s),
Tailscale routes, app), and their two addresses (quick reference below) — tell them
to **save these somewhere**, especially the `wss://<node>.<tailnet>.ts.net:8444`
relay address, since they'll need it again and the node name is easy to lose. Then
where settings live (app Settings tabs; glasses menu via double-tap from the message
head). If something comes up that you can't help them with,
point them to the Discord (the WRAP note just below has the link), then
deliver the **WRAP** closing note.

### U1 — Update OcuClaw (when already installed and healthy)
- CHECK / LIST — gather the version landscape and translate it for the user:
  - installed: `openclaw plugins inspect ocuclaw` (`Version:` line)
  - latest stable: `npm view ocuclaw version`
  - channels: `npm view ocuclaw dist-tags` (shows `latest` and `beta`)
  - recent history: `npm view ocuclaw versions` and `npm view ocuclaw time` — show
    the most recent few with dates, e.g. "you're on 1.2.4 (Apr 3); latest is 1.3.0
    (Jun 6)". Don't dump the whole list.
  - For *what changed*, point at the changelog / Discord — npm carries no notes.
  - Installed == latest stable → tell them they're up to date. Offer B1 only if
    they confirm they're a beta tester (see B1's gate); otherwise you're done.
- Pre-flight: evenAiEnabled probe = 1 while evenAiToken probe = 0 → CASE-D first.
- DO: `openclaw plugins update ocuclaw`, then restart warning +
  `openclaw gateway restart`
- VERIFY: inspect shows the new `Version:` and `Status: loaded`; quick P10
  message check. On success → deliver the **WRAP** closing note.
- IF-FAILED → CASE-D if validation rejected the update; HOST-OLD if OpenClaw is too
  old for the new version; otherwise ESCALATE.

### B1 — Beta channel (beta-testing Discord members only)
⚠️ **Gate — read first.** Beta builds are for members of the beta-testing Discord
group, and they can be unstable. If that's not the user, do **not** install a beta —
send them to **U1** for the stable release. Only continue here once the user
confirms they're a beta tester.

- INSTALL / REFRESH the newest beta:
  - `openclaw plugins install ocuclaw@beta` — installs the current beta; re-run the
    same command later to jump to a newer beta when one drops.
  - If the Discord asks for a specific build instead, use
    `openclaw plugins install ocuclaw@<that-version>` (e.g. `ocuclaw@1.3.0-beta.2`).
  - Pre-flight: evenAiEnabled probe = 1 while evenAiToken probe = 0 → CASE-D first.
  - Then restart warning + `openclaw gateway restart`.
  - VERIFY: inspect shows the beta `Version:` and `Status: loaded`; quick P10
    message check. On success → deliver the **WRAP** closing note.
- ROLL BACK to stable (if a beta misbehaves):
  - `openclaw plugins install ocuclaw@latest`, then restart warning +
    `openclaw gateway restart`.
  - VERIFY: inspect shows the stable `Version:` and `Status: loaded`. On success →
    deliver the **WRAP** closing note.
- IF-FAILED → HOST-OLD if a beta needs a newer OpenClaw; otherwise assemble the
  **BETA-REPORT** bundle (troubleshooting appendix) for the beta Discord.

## WRAP — closing note (deliver once, at a genuine finish)

Deliver this only when the interaction is genuinely done **and** succeeded: a fresh
install reaching P13, a completed update (U1), a completed beta action (B1), or a
standalone "fix X" session now resolved with nothing pending. A sub-fix the flow
then continues past (e.g. clearing APP-CONNECT-FAIL on the way to P10) is **not** a
finish — keep going; WRAP comes at the real end. **Never** deliver it after a
failure or an ESCALATE — don't ask for support when something is broken. Say it
once, warmly, in your own words; keep the two links exact.

- **Community** — point them firmly at the Discord (`https://ocuclaw.com`): it's the
  home for setup help, troubleshooting, feature requests, bug reports, beta chatter,
  and general community. Encourage them to join, ask questions, and report anything
  that bit them — it's where OcuClaw lives between releases.
- **Support the project** — OcuClaw is built and maintained by **one person**, and
  every donation goes directly into the project (it can always use more tokens!).
  Never required, but hugely appreciated: ☕ `https://buymeacoffee.com/ocuclaw`
- **Feedback** — ask how it went: what worked, what didn't, and how this setup
  assistant itself performed. Offer them a short summary (their answer plus your own
  notes) to post in the **`#install-assistant-feedback`** channel of the Discord —
  that channel is how the guide improves.
  <!-- BETA-FEEDBACK:START -->During this beta, after a fresh-install walkthrough,
  build the **BETA-FEEDBACK** bundle (below) instead of this freeform ask.<!-- BETA-FEEDBACK:END -->

<!-- BETA-FEEDBACK:START -->
## BETA-FEEDBACK — walkthrough feedback bundle (beta only; remove after wave 1)

Only on a **fresh-install** walkthrough during the beta. The goal is the user's own
words — get those first, then hand them a clean block to paste.

1. **Ask the user first, briefly:** how did it feel — smooth, a few bumps, or rough?
   Anything confusing, surprising, or that they'd change? Their words are the most
   valuable part — capture them.
2. **Add your own notes:** where the user got stuck or re-asked; anything unclear,
   out of order, wrong, missing, slow, or platform-specific; where you improvised.

Merge both into the block below, show it to the user, and confirm together it
contains **no secrets or network details** (this is about the guide experience, not
their machine — no tokens, no addresses, no node name). Then ask them to copy it
into the **`#install-assistant-feedback`** channel in the OcuClaw Discord
(`https://ocuclaw.com`). Sharing is their choice, but it's the single most useful
thing they can do to improve the guide.

**Copy-paste this into `#install-assistant-feedback`:**
```
OcuClaw walkthrough feedback — guide v2026-06-09
Platform: <OS only, e.g. macOS / Windows 11 / Ubuntu>
Outcome: <fully set up / set up with help / stopped at phase __>
Phases done: <install · Tailscale · app connect · Soniox · Even AI>
How it felt (your words): <smooth / a few bumps / rough — plus anything you'd change>
Where it snagged (assistant's notes): <unclear/wrong/slow steps, or where I improvised>
Suggestions: <anything to change>
```
<!-- BETA-FEEDBACK:END -->
## Troubleshooting appendix

**ERR-RELAY-TOKEN** — gateway prints at startup:
```
OcuClaw relayToken is required.
Set the plugin config with:
  openclaw config set plugins.entries.ocuclaw.config.relayToken "your-token"
The same token must be entered in the OcuClaw app's relay server token field within Even Hub.
Then restart the gateway: openclaw gateway restart
```
Do what it says via the P3 user-terminal lane, then P5.

**ERR-EVENAI-TOKEN** — gateway prints at startup:
```
OcuClaw evenAiToken is required when evenAiEnabled is true.
Set the plugin config with:
  openclaw config set plugins.entries.ocuclaw.config.evenAiToken "your-token"
The same token must be entered as the password in the Even AI Agent Configure section of the Even Realities app.
To disable Even AI instead, run:
  openclaw config set plugins.entries.ocuclaw.config.evenAiEnabled false --strict-json
Then restart the gateway: openclaw gateway restart
```
The token goes in via the user-terminal lane (P12); the disable command you may
run yourself.

**CASE-D** — ⚠️ Migration note: if the config has `evenAiEnabled: true` without
`evenAiToken`, `openclaw plugins update ocuclaw` fails validation. Even AI
requests were already silently failing in that state. Fix: the user sets
`evenAiToken` (the password in the Even Realities app's Agent Configure section)
in their terminal — or you run
`openclaw config set plugins.entries.ocuclaw.config.evenAiEnabled false --strict-json`.
Then re-run the update.

**MIGRATE-8443** — older setups served the relay as TCP on `:8443`. Clear it,
then run the P7 commands:
```bash
sudo tailscale serve --tls-terminated-tcp=8443 off
```
(If a legacy `https=8443` route already proxies to the actual relay port — the
P5 `wsPort`, `47800` on new installs — keep it and just add the `:8444` route.
If it points at a *different* port, such as the old `:9000`, re-run both P7
commands so each route targets the actual P5 port.) After migrating, the app's
relay address changes to `wss://…:8444` (P9); the Even AI URL stays on `:8443`.

**TS-AUTH** — `tailscale up` requires the user to open the printed URL and log
in themselves. `sudo` password prompts belong to the user. Corporate tailnets
may require admin device approval.

**TS-PORT-CLAIMED** — "already claimed": `tailscale serve status` shows what
owns the port. Old relay route → MIGRATE-8443. Anything else → walk through it
with the user before turning anything off; never guess.

**TS-SERVE-UNSUPPORTED** — if `tailscale serve` or the `--tls-terminated-tcp`
flag is rejected as unknown, the host's Tailscale is too old: update it (re-run the
P6 install command, or the OS package manager) and retry P7. On **macOS**, a
`tailscale: command not found` instead means the App Store build's CLI isn't on
`PATH` — call it via `/Applications/Tailscale.app/Contents/MacOS/Tailscale`, or
install the standalone package (P6). If the routes apply but `https://…ts.net` /
certificate provisioning fails, enable **MagicDNS** and **HTTPS certificates** for
the tailnet in the admin console (login.tailscale.com/admin/dns), then retry.

**PHONE-NO-REACH** — check in order: is the phone's Tailscale app actually
connected (VPN toggle on)? Same account as this machine (the phone shows up in
`tailscale status`)? Device pending approval at
login.tailscale.com/admin/machines?

**APP-CONNECT-FAIL** — the address the user typed is the most common culprit, and
you can't see it — have them **read back exactly** what's in the app's Address
field:
- `wss://` — not `ws://` (missing the secure `s`), not `https://`.
- ends in `:8444` — not `:8443` (the Even AI door), and not the relay's local
  `wsPort` (`47800` by default — loopback-only, never reachable from the phone).
- machine name `<node>.<tailnet>.ts.net` spelled exactly as P7 printed it.
Then the token (a mismatch produces no host-side error): have the user re-enter it,
or reset via P3. Relay actually up? `openclaw plugins inspect ocuclaw` shows
`Status: loaded`.

**HOST-OLD** — OpenClaw below 2026.4.25 has a known plugin-install bug. Upgrade
with `openclaw update` (the native path — it detects the install type, can run
`openclaw doctor`, and restarts the gateway itself). If that subcommand isn't
available on a very old build, fall back to `npm install -g openclaw@latest` then
`openclaw gateway restart`. Give the restart warning first either way, then re-run
the State Assessment.

**GW-DOWN** — `openclaw status` (or `openclaw status --all` for the full
read-only, pasteable diagnosis), then `openclaw gateway status`, `openclaw gateway
restart`, and `openclaw plugins doctor`. Read any errors to the user in plain words.

**RELAY-PORT-CLAIMED** — the gateway is up but the relay couldn't bind its
loopback port (startup log shows `EADDRINUSE`, `WSAEACCES`, "address already in
use", or "forbidden by its access permissions"). The chosen port is taken or, on
Windows, reserved by WinNAT. Fix: pick a free port and re-point everything at it.
1. Find a genuinely free port (read-only, per OS):
   - **Windows:** `netsh int ipv4 show excludedportrange protocol=tcp`
     (reservations — avoid any listed block) AND `netstat -ano | findstr :<port>`
     (no line = no live listener).
   - **Linux:** `ss -ltnH "sport = :<port>"` (no output = free).
   - **macOS:** `lsof -nP -iTCP:<port> -sTCP:LISTEN` (no output = free).
   Walk the ladder `47800 → 43117 → 38271` (or any port in `30000–49151`),
   checking each, until one is both reservation-free and not listening.
2. Set it: `openclaw config set plugins.entries.ocuclaw.config.wsPort <port> --strict-json`
3. Restart (give the restart warning): `openclaw gateway restart`, then confirm
   `openclaw plugins inspect ocuclaw` shows `Status: loaded`.
4. If P7 serve routes already exist, re-run both P7 commands with the new
   `<port>` so they match.

**TERM-HELP** — opening a terminal on this machine: Linux — Ctrl+Alt+T or
"Terminal" in the app menu · macOS — Cmd+Space, type Terminal · Windows — Start
menu, type PowerShell. If they normally reach this machine remotely, they
connect the same way they usually do (e.g. SSH). `command not found` usually
means OpenClaw isn't on that shell's PATH or it's the wrong machine — have them
confirm `openclaw --version` works there first. Mind the quotes around tokens.

**ESCALATE** — when stuck after honest attempts: assemble this paste-ready
breakdown, show it to the user, confirm together it contains no secrets, and
point them at the OcuClaw Discord:
```
OcuClaw setup help — guide v2026-06-09
Platform/OS:
openclaw --version:
openclaw status --all (read-only, pasteable — confirm no secrets):
Plugin Version / Status (from plugins inspect):
Config keys set (names only, never values):
tailscale status (summary):
tailscale serve status:
openclaw gateway status:
openclaw plugins doctor (ocuclaw lines):
Failing phase + symptom:
Already tried:
```

**BETA-REPORT** — when a beta build misbehaves, assemble this paste-ready report,
show it to the user, confirm together it contains no secrets, and have them post it
in the beta-testing Discord (`https://ocuclaw.com`):
```
OcuClaw beta report — guide v2026-06-09
Installed beta version (from plugins inspect):
Platform/OS:
openclaw --version:
Plugin Status (loaded?):
Config keys set (names only, never values):
What broke (symptom):
Steps to reproduce:
Already tried:
```
If they'd rather drop back to stable in the meantime, that's B1's roll-back path.

## Quick reference

| What | Value |
|---|---|
| Relay address (OcuClaw app) | `wss://<node>.<tailnet>.ts.net:8444` |
| Even AI agent URL | `https://<node>.<tailnet>.ts.net:8443/v1/chat/completions` |
| Relay backend | `localhost:<wsPort>` (plugin-hosted; `wsPort` = `47800` on a fresh install, or whatever P5 set/kept — confirm with `openclaw config get plugins.entries.ocuclaw.config.wsPort`) |
| Install / enable / update | `openclaw plugins install ocuclaw` · `enable` · `update` |
| Restart / status / doctor | `openclaw gateway restart` · `openclaw gateway status` · `openclaw plugins doctor` |
| Config root | `plugins.entries.ocuclaw.config.*` via `openclaw config set` |
| Check versions | `npm view ocuclaw version` (latest) · `dist-tags` (channels) · `versions` (history) |
| Update / switch channel | `openclaw plugins update ocuclaw` (stable) · `install ocuclaw@beta` · `install ocuclaw@latest` |
| Community / support | Discord `https://ocuclaw.com` · `https://buymeacoffee.com/ocuclaw` |
