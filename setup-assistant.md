# OcuClaw Setup Assistant

> **Reading this yourself?** Hand this whole document to your OpenClaw agent and say
> "set up OcuClaw for me using this guide." It checks with you before each step.
> Keep your phone nearby — setup takes about 20–30 minutes.

**You are an OpenClaw agent.** Someone handed you this guide to set up OcuClaw on this machine. Do the work for them — completely, and out loud.

OcuClaw is the OpenClaw client for Even Realities G2 smart glasses. It has two halves: a **plugin** that runs inside OpenClaw on this machine and hosts a relay, and an **app** on the user's phone (from the Even Hub App Store) that drives the glasses. **Tailscale** privately connects the two. You set up the plugin here; the user sets up the app; you connect them. That's the whole shape — the steps below fill it in.

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
| Everything green and the app connects — update only | Offer U1 (stable update); offer B1 only if they confirm they're a beta-Discord tester |
| Everything green and the app connects — single fix | Go directly to the one routed step; no full checklist |

## Setup steps

### Step 1 · Prerequisites

GOAL: confirm the hardware is ready and the host meets the minimum version requirement.

CHECK: Ask the user — are the G2 glasses paired in the Even Realities app, and does Even Hub open on their phone? If not, stop: finish Even Realities onboarding first.

Set expectations: setup takes about 20–30 minutes; they'll need their phone, a terminal on this machine, and will create 1–2 passwords.

```bash
openclaw --version
```

VERIFY: version is ≥ 2026.4.25.   ·   If not → `HOST-OLD`.

---

### Step 2 · Install the plugin

GOAL: get the OcuClaw plugin onto this OpenClaw host.

**Step 2 owns all first-time installs, both channels. B1 is for updating or rolling back an already-installed plugin — not for first installs.**

Skip if: `openclaw plugins list` already shows `ocuclaw` → go to Step 3.

Ask first (routing): "Are you installing the **beta** build from the OcuClaw Discord?" Route to beta only if they confirm they're a beta-testing Discord member; otherwise install stable.

**Stable (default):**
```bash
openclaw plugins install ocuclaw
```

**Beta (only if the user confirmed they are a beta-Discord tester):**
```bash
openclaw plugins install ocuclaw@beta
```

(To install a pinned beta build instead: `openclaw plugins install ocuclaw@<spec>`.)

VERIFY: `openclaw plugins list` shows `ocuclaw`.   ·   If the install fails → `HOST-OLD`; for any other failure → `ESCALATE`.

---

### Step 3 · Relay token   [REQUIRED · the user runs this, never you]

GOAL: the user creates a relay password and sets it themselves so it never passes through you. The plugin's schema requires the token before it can be enabled — set it before Step 4.

Skip if: relayToken probe = 1 **and** the user still knows their token → go to Step 4. If probe = 1 but token forgotten → they set a new one with the same command below.

🔑 USER ACTION REQUIRED — you run this, I never see it.

Run this in your own terminal, replacing ONLY the quoted value (no `read`, no pipe, no extra flags). The value must be a real, non-empty password — you will re-type it on your phone in Step 9, so make it typeable:

```
openclaw config set plugins.entries.ocuclaw.config.relayToken "<your-relay-token>"
```

Then tell me "done." I will not continue until the relayToken probe returns 1.

⚠️ If the command errors `must have required property 'relayToken'`, the value came through empty — STOP and re-run it with a visible, non-empty value. Never set it empty, never proceed.

VERIFY: relayToken probe = 1.   ·   Still failing → `TERM-HELP`.

---

### Step 4 · Enable + agent tool access

GOAL: enable the plugin and ensure the agent can call OcuClaw's glasses-display tools.

Skip if: `openclaw plugins list` shows `ocuclaw` already enabled **and** the tool-access VERIFY below already passes → go to Step 5.

**Enable the plugin:**
```bash
openclaw plugins enable ocuclaw
```

**Grant lifecycle hooks** (non-secret — you may run this; lets per-session glasses display state reset cleanly at the end of each turn):
```bash
openclaw config set plugins.entries.ocuclaw.config.allowConversationAccess true --strict-json
```

**Grant agent tool access** — newer OpenClaw versions (2026.6+) default `tools.profile` to `"coding"`, which filters out plugin-owned tools; OcuClaw's `render_glasses_ui` would be invisible. Read the current list first:
```bash
openclaw config get tools.alsoAllow
```

Then, based on the output:
- "Config path not found" or empty →
  ```bash
  openclaw config set tools.alsoAllow '["ocuclaw"]' --strict-json
  ```
- A list that does not contain `"ocuclaw"` → re-set it to the existing entries **plus** `"ocuclaw"` (merge; never drop entries the user already has).
- Already contains `"ocuclaw"` → nothing to do.

Takes effect at the Step 5 restart.

VERIFY: `openclaw plugins list` shows `ocuclaw` enabled, **and** `openclaw config get tools` shows `"ocuclaw"` in `alsoAllow` — or shows no `profile` at all / "Config path not found" (older hosts without tool profiles; that is a pass).   ·   A rejection usually means the token didn't save → back to Step 3.

---

### Step 5 · Relay port + restart + verify

GOAL: bind the relay to a host-safe loopback port, then load the plugin.

**Step 5a — choose a safe wsPort (decide by value, not by emptiness).**

Read the current configured port (non-secret):
```bash
openclaw config get plugins.entries.ocuclaw.config.wsPort
```

Decide by value:
- **A specific non-`9000` value (e.g. `47800`)** → a deliberate choice; keep it, make no change. Go to Step 5b.
- **`9000` or "Config path not found"** → the risky default is in effect. Pick a free port:
  - Target `47800`. Check whether it is free on this host (read-only):
    - **Linux:** `ss -ltnH "sport = :47800"` (no output = free)
    - **macOS:** `lsof -nP -iTCP:47800 -sTCP:LISTEN` (no output = free)
    - **Windows:** `netsh int ipv4 show excludedportrange protocol=tcp` (must not fall in a block) AND `netstat -ano | findstr :47800` (no line = free)
  - If `47800` is taken, walk the ladder re-checking each: `47800 → 43117 → 38271`. Use the first free one.
  - Then set it (replace `<port>` with the number you chose):
    ```bash
    openclaw config set plugins.entries.ocuclaw.config.wsPort <port> --strict-json
    ```
  - **Write the chosen wsPort into your lane card now** (`Relay wsPort: <port>`).

**Step 5b — container sub-step** (read the lane card):
- **Container: no** → skip this sub-step entirely.
- **Container: yes, network mode = host** → no changes; skip this sub-step.
- **Container: yes, network mode = bridge (or named network)**:
  - Bind (you may run this — non-secret):
    ```bash
    openclaw config set plugins.entries.ocuclaw.config.wsBind "0.0.0.0"
    ```
  - The Docker port publish (`127.0.0.1:<port>:<port>`) must be done on the host machine, not inside the container → walk **`DOCKER-RELAY-UNREACHABLE`** with the user now.

**Step 5c — restart.** Before restarting, give the restart warning (rule 5). Then, if you changed anything in 5a or 5b, or if the gateway is not already healthy with ocuclaw `Status: loaded`:
```bash
openclaw gateway restart
```
If you changed nothing and the gateway was already healthy with the plugin loaded, you may skip the restart.

VERIFY (always, before leaving Step 5 — never continue to Step 6 with an unloaded relay):
```bash
openclaw gateway status
openclaw plugins inspect ocuclaw
openclaw plugins doctor
```
Pass = gateway healthy + `plugins inspect ocuclaw` shows `Status: loaded` + `plugins doctor` reports no ocuclaw issues. (Unrelated warnings about other plugins don't block — only ocuclaw-specific failures do.)

Container lane adds: confirm the startup log line reads `relay service started on ws://0.0.0.0:<port>` (not `ws://127.0.0.1:…`); the warning `[ocuclaw] relay is bound to … inside a container` must be gone.

If the startup log shows a bind/port error (`EADDRINUSE`, `WSAEACCES`, "address already in use", "forbidden by its access permissions") → `RELAY-PORT-CLAIMED`. If the log shows the relayToken error verbatim → `ERR-RELAY-TOKEN`. Any other gateway failure → `GW-DOWN`.

---

### Step 6 · Tailscale on this machine

GOAL: install Tailscale — only devices on the user's tailnet can reach the relay; the phone can reach this machine from anywhere.

**Container lane:** Tailscale belongs on the HOST, not inside the container. Every `tailscale` command in Steps 6 and 7 goes to the user's host terminal.

Skip if: `tailscale status` already shows signed in → go to Step 7.

**Install (per OS):**

Linux (needs root — if your lane card says "user runs elevated," hand this to the user):
```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

macOS: install the **standalone package** from `tailscale.com/download` — it puts `tailscale` on PATH. If the user has the Mac **App Store** build instead, its CLI lives at `/Applications/Tailscale.app/Contents/MacOS/Tailscale`. **Write that full path into the lane card's `Tailscale CLI` row if the App Store build is used** — you'll need it in Step 7.

Windows: run the installer from `tailscale.com/download/windows`.

**Sign in (per OS):**

| OS | Sign in |
|---|---|
| Linux | `sudo tailscale up` — user opens the printed URL and logs in |
| macOS | Open the Tailscale app and sign in |
| Windows | Sign in from the tray app |

VERIFY: `tailscale ip -4` prints a `100.x.y.z` address.   ·   If not → `TS-AUTH`.

---

### Step 7 · Serve routes (two doors into the relay)

GOAL: expose the relay on the tailnet. Two routes, one purpose each:

| Port | Type | Used by |
|---|---|---|
| `:8444` | direct TCP (TLS-terminated) | the OcuClaw app (Step 9) |
| `:8443` | HTTPS proxy | Even AI's agent endpoint (Step 12) |

**Resolve `<port>`** from your lane card (`Relay wsPort`). If it is blank, re-read it now: `openclaw config get plugins.entries.ocuclaw.config.wsPort`. If that returns `9000`, do Step 5 first, then return here.

Skip if: `tailscale serve status` already shows both routes each proxying to `localhost:<port>` → go to Step 8. (If they proxy to a different port, re-run the commands below with the current `<port>`; if the old `tcp://…:8443` scheme appears → `MIGRATE-8443`.)

**Run both commands** (substitute `<port>` from the lane card in both; use the `Tailscale CLI` path from the lane card if the macOS App Store build is in use):

```
Linux / macOS:   sudo tailscale serve --bg --tls-terminated-tcp=8444 tcp://localhost:<port>
                 sudo tailscale serve --bg --https=8443           http://localhost:<port>
Windows:         same two commands in an Administrator PowerShell, without sudo
```

VERIFY: `tailscale serve status` shows both blocks each proxying to `localhost:<port>`:
```
|-- tcp://<node>.<tailnet>.ts.net:8444 (TLS terminated, tailnet only)
|--> tcp://localhost:<port>

https://<node>.<tailnet>.ts.net:8443 (tailnet only)
|-- / proxy http://localhost:<port>
```
Note the machine name `<node>.<tailnet>.ts.net` from that output — you'll use it in Step 9.   ·   Port already claimed → `TS-PORT-CLAIMED`; unknown command or flag → `TS-SERVE-UNSUPPORTED`.

---

### Step 8 · Phone joins the tailnet

GOAL: the user's phone becomes a trusted member of the same private tailnet as this machine.

Ask the user to: install Tailscale on their phone (App Store / Google Play), sign in with the **same account**, and leave the VPN toggle on. If their tailnet requires device approval, they approve it at `login.tailscale.com/admin/machines`.

VERIFY: `tailscale status` on this machine shows the phone, **and** the phone's Tailscale app shows "Connected." If several devices appear in `tailscale status`, ask the user which is their phone — trust the phone app's own "Connected" state as the source of truth.   ·   If not → `PHONE-NO-REACH`.

---

### Step 9 · OcuClaw app

GOAL: the user installs and connects the OcuClaw phone app to the relay on this machine.

Ask the user to: open the Even Realities app → Even Hub App Store → install and open OcuClaw → go to **Relay Server** and enter:

- **Address:** `wss://<node>.<tailnet>.ts.net:8444` (use the exact machine name from Step 7)

  ⚠️ The address must start with `wss://` (not `ws://`), and use port `:8444` — not `:8443` (that is the Even AI door), and not the relay's local `wsPort` (e.g. `47800`), which is loopback-only and the phone can never reach it.

- **Token:** the relay password the user created in Step 3

Tap **Connect**.

VERIFY: the app shows "Connected" and OpenClaw Status fills in (session, model). Host-side confirmation: `openclaw logs` shows `[ocuclaw] relay client connected …` from the moment they tapped Connect.   ·   If not → `APP-CONNECT-FAIL`.

---

### Step 10 · End-to-end check

GOAL: confirm the full chain works — message sent, reply received, glasses display it.

Ask the user to: put on their glasses, then send "hello" from the app's Send Message box and read the reply on the glasses.

VERIFY: reply is visible on the glasses. Core setup is DONE — say so, warmly.

If not:
- App reported a send failure → `APP-CONNECT-FAIL`
- Message sent but no reply → `GW-DOWN`
- Reply visible in the app but glasses are dark → wake the glasses (double-tap), reopen OcuClaw inside Even Hub, and retry

---

### Step 11 · Voice input via Soniox   [OPTIONAL — recommended]

GOAL: let the user talk to the agent from the glasses instead of typing.

**Offer this step; let them skip to Step 12 if they prefer.**

Ask: "Would you like to set up voice input? You'll speak to me from the glasses and I'll transcribe it. It takes about 5 minutes and needs a Soniox account (free sign-up, requires a little credit for transcription). Say yes to continue or skip to move on."

If they want it:

1. Sign up at **soniox.com**, add a payment method, load a small credit balance.
2. In the Soniox dashboard, create an API key.

🔑 USER ACTION REQUIRED — you run this, I never see it.
Run this in your own terminal, replacing ONLY the quoted value (no `read`, no pipe, no extra flags):

```
openclaw config set plugins.entries.ocuclaw.config.sonioxApiKey "<your-soniox-api-key>"
```

Then tell me "done." I will not continue until the sonioxApiKey probe returns 1.

Once the probe returns 1, warn: "I'll restart the gateway now — I may go quiet for ~30s. If I don't come back, send me this document's URL again and I'll resume." Then run:

```
openclaw gateway restart
```

VERIFY: the user taps the microphone / listen button on their glasses and speaks a short phrase — it transcribes and appears as their message.   ·   If voice never activates or transcription fails → `ESCALATE` (note that voice input was the failing step).

---

### Step 12 · Even AI integration   [OPTIONAL — recommended]

GOAL: the Even AI wake word on the glasses gets answered by this OpenClaw session, not Even's default AI.

**Offer this step; let them skip to Step 13 if they prefer.**

Ask: "Would you like to wire up Even AI so your glasses' wake word goes to your OpenClaw? Saying yes routes all Even AI requests here. Say yes to continue or skip to wrap up."

If they want it:

**ORDER MATTERS: set the token first, then enable.** Config validation rejects enabling Even AI without its token already set.

**Part A — unlock Agent Configuration (Even Realities beta)**

This section is hidden until your Even Realities account is flagged for it. Sign in at `https://hub.evenrealities.com/hub` with the **same email** as your Even Realities account. Once signed in, an `Agent Configuration` section appears at the bottom of the app's Even AI settings. Propagation is not instant — if it is not there yet, wait a minute and fully force-close and reopen the Even Realities app on the phone.

**Part B — create a second password (the Even AI token)**

Create a strong password to use as the Even AI token (you will type it into the app in Part D).

🔑 USER ACTION REQUIRED — you run this, I never see it.
Run this in your own terminal, replacing ONLY the quoted value (no `read`, no pipe, no extra flags):

```
openclaw config set plugins.entries.ocuclaw.config.evenAiToken "<your-even-ai-token>"
```

Then tell me "done." I will not continue until the evenAiToken probe returns 1.

**Part C — enable Even AI (agent runs this)**

Once the probe returns 1, run:

```
openclaw config set plugins.entries.ocuclaw.config.evenAiEnabled true --strict-json
```

Then warn: "I'll restart the gateway now — I may go quiet for ~30s. If I don't come back, send me this document's URL again and I'll resume." Then run:

```
openclaw gateway restart
```

**Part D — configure the app (user, phone)**

Even Realities app → Settings → Even AI settings → Agent Configuration (at the bottom) → Add Agent:

- **URL:** `https://<node>.<tailnet>.ts.net:8443/v1/chat/completions`
- **Token:** the Even AI password set in Part B

⚠️ This is the OTHER door — the `https://…:8443/v1/chat/completions` URL, NOT the `wss://…:8444` relay address. Do not mix them up.

VERIFY: the user triggers Even AI on the glasses (wake word or button); the reply comes from their OpenClaw session.

If not:
- `Agent Configuration` never appears in the app → the beta unlock hasn't propagated yet; re-check that hub.evenrealities.com was signed in with the correct account email, wait, force-close and reopen the Even Realities app, and try again
- Token mismatch or auth error → `ERR-EVENAI-TOKEN`
- Anything else → `ESCALATE`

---

### Step 13 · Wrap-up

GOAL: confirm everything is in place, give the user their addresses to save, and hand off.

Briefly tell the user what was installed and configured: the OcuClaw plugin, the relay token, the Tailscale serve routes, the phone app, and any optional integrations (Soniox, Even AI) that were completed.

Give them their two addresses and ask them to **save these somewhere**:

| What | Address |
|---|---|
| OcuClaw app relay address | `wss://<node>.<tailnet>.ts.net:8444` |
| Even AI agent URL (if set up) | `https://<node>.<tailnet>.ts.net:8443/v1/chat/completions` |

The relay address in particular — they will need it to reconnect the app on a new phone or after a reinstall.

**Self-audit — re-show the setup checklist in its final state:**

Re-display the checklist you copied at the start, with every box in its current state (ticked, skipped, or blocked). Confirm every required box is ticked before continuing. If any required box is unchecked, return to that step — do not proceed to the closing note while a required box is open.

Then deliver the WRAP closing note (below), once, warmly, in your own words.

---

## Update / beta channel

### U1 — Update OcuClaw (already installed and healthy)

**U1 checklist — copy and tick:**
- [ ] Checked installed vs. latest version, told the user
- [ ] Pre-flight: evenAiEnabled/evenAiToken consistent (else CASE-D first)
- [ ] Updated + gateway restarted (restart warning given)
- [ ] Verified: new Version + Status: loaded + quick message test

**CHECK / LIST — gather the version landscape and translate for the user:**

```
openclaw plugins inspect ocuclaw
```
Note the `Version:` line (installed version).

```
npm view ocuclaw version
```
Latest stable version.

```
npm view ocuclaw dist-tags
```
Available channels (`latest`, `beta`).

```
npm view ocuclaw versions --json | node -e "const vs=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); vs.slice(-5).forEach(v=>process.stdout.write(v+'\n'))"
```
```
npm view ocuclaw time --json | node -e "const t=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); Object.entries(t).filter(([k])=>!['created','modified'].includes(k)).slice(-5).forEach(([k,v])=>console.log(k,v.slice(0,10)))"
```
Show the most recent few versions with dates — e.g. "you're on 1.2.4 (Apr 3); latest is 1.3.0 (Jun 6)". Do not dump the full list. For what changed, point at the changelog or Discord — npm carries no release notes.

If installed == latest stable: tell them they're up to date. Offer B1 only if they confirm they're a beta-Discord member; otherwise you're done.

**Pre-flight:** If the evenAiEnabled probe = 1 and the evenAiToken probe = 0 → run **CASE-D** before proceeding.

**DO:**

```
openclaw plugins update ocuclaw
```

Warn before restarting (~30 s quiet; resend this URL if I don't return), then:

```
openclaw gateway restart
```

**VERIFY:** `openclaw plugins inspect ocuclaw` shows the new `Version:` and `Status: loaded`. Run a quick Step 10 message test. On success → deliver the **WRAP** closing note.

**If failed:** CASE-D if validation rejected the update; HOST-OLD if OpenClaw is too old for the new version; otherwise ESCALATE.

---

### B1 — Beta channel (beta-Discord testers only) — UPDATE / ROLLBACK ONLY

**Gate:** Beta builds are for members of the beta-testing Discord group and can be unstable. If the user is not a confirmed beta-Discord member, route them to U1 instead. Continue only once confirmed.

**B1 checklist — copy and tick:**
- [ ] Confirmed the user is a beta-Discord tester (gate)
- [ ] Pre-flight: evenAi consistent (else CASE-D first)
- [ ] Moved to target beta (update ocuclaw@beta) — or rolled back (install ocuclaw@latest --force) — + restarted
- [ ] Verified: expected Version + Status: loaded + quick message test

**Pre-flight:** If the evenAiEnabled probe = 1 and the evenAiToken probe = 0 → run **CASE-D** before proceeding.

**Move to a newer beta:**

```
openclaw plugins update ocuclaw@beta
```

To move to a specific pinned build from the Discord (e.g. `1.3.0-beta.2`):

```
openclaw plugins update ocuclaw@1.3.0-beta.2
```

Re-run `update ocuclaw@beta` later to jump to a newer beta when one drops.

**Roll back to stable (if a beta misbehaves):**

```
openclaw plugins install ocuclaw@latest --force
```

Why `--force`: rolling back is a downgrade; plain `install ocuclaw@latest` aborts as "already installed," and `update ocuclaw` stays on the tracked `@beta` spec — `--force` is the documented overwrite path.

**After either action** — warn before restarting, then:

```
openclaw gateway restart
```

**VERIFY:** `openclaw plugins inspect ocuclaw` shows the expected `Version:` and `Status: loaded`. Run a quick Step 10 message test. On success → deliver the **WRAP** closing note.

**If failed:** HOST-OLD if a beta requires a newer OpenClaw; otherwise assemble the **BETA-REPORT** bundle (troubleshooting appendix) for the beta Discord.

---

## WRAP — closing note

Deliver this once, warmly, in your own words — only at a genuine finish: a fresh install reaching Step 13, a completed U1 or B1, or a resolved standalone fix. Never after a failure or an ESCALATE. Keep the three links exact.

- **Community** — point them at the Discord (`https://ocuclaw.com`): setup help, troubleshooting, feature requests, bug reports, beta chatter, and general community. Encourage them to join and report anything that bit them.
- **Support the project** — OcuClaw is built and maintained by one person; every donation goes directly into the project. Never required, hugely appreciated: ☕ `https://buymeacoffee.com/ocuclaw`
- **Feedback** — ask how it went: what worked, what didn't, how the assistant performed. Offer a short summary (their words plus your notes) to post in **`#install-assistant-feedback`** in the Discord — that channel is how the guide improves.
  <!-- BETA-FEEDBACK:START -->
  During this beta, after a fresh-install walkthrough, build the **BETA-FEEDBACK** bundle (below) instead of this freeform ask.
  <!-- BETA-FEEDBACK:END -->

---

<!-- BETA-FEEDBACK:START -->
## BETA-FEEDBACK — walkthrough feedback bundle

Only on a **fresh-install** walkthrough during the beta. Goal: the user's own words first, then a clean paste block.

1. **Ask the user first:** how did it feel — smooth, a few bumps, or rough? Anything confusing, surprising, or they'd change? Their words are the most valuable part.
2. **Add your own notes:** where the user got stuck or re-asked; anything unclear, out of order, wrong, missing, slow, or platform-specific; where you improvised.

Merge both into the block below, show it to the user, and confirm together it contains **no secrets or network details** (guide experience only — no tokens, no addresses, no node name). Then ask them to copy it into **`#install-assistant-feedback`** in the OcuClaw Discord (`https://ocuclaw.com`). Sharing is their choice, but it's the single most useful thing they can do.

**Copy-paste this into `#install-assistant-feedback`:**
```
OcuClaw walkthrough feedback — guide 2026-06-16
Platform: <OS only, e.g. macOS / Windows 11 / Ubuntu>
Outcome: <fully set up / set up with help / stopped at step __>
Steps done: <install · Tailscale · app connect · Soniox · Even AI>
How it felt (your words): <smooth / a few bumps / rough — plus anything you'd change>
Where it snagged (assistant's notes): <unclear/wrong/slow steps, or where I improvised>
Suggestions: <anything to change>
```
<!-- BETA-FEEDBACK:END -->

---

## When a step fails — troubleshooting

**Reference only** — execute nothing here unless a step routed you here by its key.

---

**ERR-RELAY-TOKEN** — gateway prints at startup:
```
OcuClaw relayToken is required.
Set the plugin config with:
  openclaw config set plugins.entries.ocuclaw.config.relayToken "your-token"
The same token must be entered in the OcuClaw app's relay server token field within Even Hub.
Then restart the gateway: openclaw gateway restart
```
Do what it says via the Step 3 user-terminal lane, then Step 5.

---

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
The token goes in via the user-terminal lane (Step 12); the disable command you may run yourself.

---

**CASE-D** — ⚠️ Migration note: if the config has `evenAiEnabled: true` without `evenAiToken`, `openclaw plugins update ocuclaw` fails validation. Even AI requests were already silently failing in that state. Fix: the user sets `evenAiToken` (the password in the Even Realities app's Agent Configure section) in their terminal — or you run `openclaw config set plugins.entries.ocuclaw.config.evenAiEnabled false --strict-json`. Then re-run the update.

---

**MIGRATE-8443** — older setups served the relay as TCP on `:8443`. Clear it, then run the Step 7 commands:
```bash
sudo tailscale serve --tls-terminated-tcp=8443 off
```
(If a legacy `https=8443` route already proxies to the actual relay port — the Step 5 `wsPort`, `47800` on new installs — keep it and just add the `:8444` route. If it points at a *different* port such as the old `:9000`, re-run both Step 7 commands so each route targets the actual Step 5 port.) After migrating, the app's relay address changes to `wss://…:8444` (Step 9); the Even AI URL stays on `:8443`.

---

**TS-AUTH** — `tailscale up` requires the user to open the printed URL and log in themselves. `sudo` password prompts belong to the user. Corporate tailnets may require admin device approval.

---

**TS-PORT-CLAIMED** — "already claimed": `tailscale serve status` shows what owns the port. Old relay route → MIGRATE-8443. Anything else → walk through it with the user before turning anything off; never guess.

---

**TS-SERVE-UNSUPPORTED** — if `tailscale serve` or the `--tls-terminated-tcp` flag is rejected as unknown, the host's Tailscale is too old: update it (re-run the Step 6 install command, or the OS package manager) and retry Step 7. On **macOS**, a `tailscale: command not found` instead means the App Store build's CLI isn't on `PATH` — call it via `/Applications/Tailscale.app/Contents/MacOS/Tailscale`, or install the standalone package (Step 6). If the routes apply but `https://…ts.net` / certificate provisioning fails, enable **MagicDNS** and **HTTPS certificates** for the tailnet in the admin console (`login.tailscale.com/admin/dns`), then retry.

---

**PHONE-NO-REACH** — check in order: is the phone's Tailscale app actually connected (VPN toggle on)? Same account as this machine (the phone shows up in `tailscale status`)? Device pending approval at `login.tailscale.com/admin/machines`?

---

**APP-CONNECT-FAIL** — the relay logs every connection attempt; collect evidence before guessing. Have the user tap Connect, then read the tail of the gateway log (`openclaw logs`, or the newest `/tmp/openclaw/openclaw-*.log` on Linux/macOS):
- `[ocuclaw] relay rejected connection: invalid token …` **anywhere in the last minute** → token mismatch → re-enter it, or reset via Step 3. (Repeat rejects from the same address are collapsed into one line per 60s — a fresh tap often prints nothing new while an earlier reject line is still the live evidence.)
- `[ocuclaw] relay client connected …` at that moment → the relay WAS reached — the problem is past connectivity (version banner in the app, or app-side).
- No connect **and no reject line in the last minute** → the attempt never reached the relay → address/route problem: work the address checklist below, re-verify the Serve routes (Step 7), and on a containerized host → DOCKER-RELAY-UNREACHABLE.

Have the user **read back exactly** what's in the app's Address field (the address must be `wss://…:8444` — see Step 9 ⚠️ for the full address rules):
- starts with `wss://`
- ends in `:8444`
- machine name `<node>.<tailnet>.ts.net` spelled exactly as Step 7 printed it

Then the token (a mismatch logs the reject line above): have the user re-enter it, or reset via Step 3. Relay actually up? `openclaw plugins inspect ocuclaw` shows `Status: loaded`. Still failing on a containerized host → DOCKER-RELAY-UNREACHABLE.

---

**AGENT-TOOLS-FILTERED** — chat works but the agent says it can't render: it "knows about" glasses surfaces yet reports `render_glasses_ui` (and `get_evenrealities_device_info`) as unavailable. Cause: newer OpenClaw versions (2026.6+) default `tools.profile` to `"coding"`, which filters out plugin-owned tools. The broken state is a `profile` set with no `"ocuclaw"` in `alsoAllow`. Check: `openclaw config get tools`. Fix: run the Step 4 tool-access step (merge `"ocuclaw"` into `tools.alsoAllow`), restart the gateway (rule 7 warning first), then re-test with Step 10.

---

**HOST-OLD** — OpenClaw below 2026.4.25 has a known plugin-install bug. Upgrade with `openclaw update` (detects the install type, can run `openclaw doctor`, and restarts the gateway itself). If that subcommand isn't available on a very old build, fall back to `npm install -g openclaw@latest` then `openclaw gateway restart`. Give the restart warning first either way, then re-run the State Assessment.

---

**GW-DOWN** — `openclaw status` (or `openclaw status --all` for the full read-only pasteable diagnosis), then `openclaw gateway status`, `openclaw gateway restart`, and `openclaw plugins doctor`. Read any errors to the user in plain words. If the failure is a relay bind/port error (`EADDRINUSE`, `WSAEACCES`, "address already in use", "forbidden by its access permissions"), it's a port conflict → `RELAY-PORT-CLAIMED`, not this entry.

---

**RELAY-PORT-CLAIMED** — the gateway is up but the relay couldn't bind its loopback port (startup log shows `EADDRINUSE`, `WSAEACCES`, "address already in use", or "forbidden by its access permissions"). The chosen port is taken or, on Windows, reserved by WinNAT. Pick a free port and re-point everything at it:

1. Find a genuinely free port (read-only, per OS):
   - **Windows:** `netsh int ipv4 show excludedportrange protocol=tcp` (avoid any listed block) AND `netstat -ano | findstr :<port>` (no line = no live listener).
   - **Linux:** `ss -ltnH "sport = :<port>"` (no output = free).
   - **macOS:** `lsof -nP -iTCP:<port> -sTCP:LISTEN` (no output = free).
   Walk the ladder `47800 → 43117 → 38271` (or any port in `30000–49151`), checking each, until one is both reservation-free and not listening.
2. Set it: `openclaw config set plugins.entries.ocuclaw.config.wsPort <port> --strict-json`
3. Restart (give the restart warning): `openclaw gateway restart`, then confirm `openclaw plugins inspect ocuclaw` shows `Status: loaded`.
4. If Step 7 serve routes already exist, re-run both Step 7 commands with the new `<port>` so they match.

---

**DOCKER-RELAY-UNREACHABLE** — containerized OpenClaw (the normal VPS-install shape): everything reports healthy — plugin `loaded`, "relay service started", serve routes applied — but the app can't connect, and no `[ocuclaw] relay client connected` line appears when the user taps Connect. The relay also self-diagnoses this at startup — the gateway log shows `[ocuclaw] relay is bound to 127.0.0.1 inside a container — …` with the exact fix commands: seeing that warning confirms this entry. Two halves must BOTH hold: the relay binds beyond the container's loopback (Step 5b, `wsBind = 0.0.0.0`), and Docker publishes the relay port to the **host's loopback only**. Work it with the user in their HOST terminal:

1. `docker ps --format '{{.Names}} {{.Ports}}'` — find the OpenClaw container's `<port>` mapping (`<port>` = the Step 5 `wsPort`):
   - `127.0.0.1:<port>-><port>/tcp` → publish correct; recheck the bind (Step 5 container-lane VERIFY).
   - `0.0.0.0:<port>->…` → ⚠️ **publicly exposed on the VPS's public IP** — fix via step 2 so the tailnet is the only external door.
   - no `<port>` mapping at all → check the network mode first: `docker inspect -f '{{.HostConfig.NetworkMode}}' <name>` — `host` means the container shares the host's network: the relay's loopback bind already works and nothing can or should be published; if `wsBind` was changed to `0.0.0.0`, set it back to `127.0.0.1` (host mode would otherwise expose the relay on the VPS's public interfaces), restart, and re-run the plain (non-container) Step 5 VERIFY. Any other mode → add the publish via step 2.

2. Fix the publish — run `docker compose ls` (host) first:
   - **Compose-managed** (a project is listed): edit the file shown under CONFIG FILES — in the OpenClaw service's `ports:` list add or correct to `- "127.0.0.1:<port>:<port>"` (remove any stale mapping for an old relay port) — then `docker compose -f <that file> up -d`.
   - **Not compose-managed** (empty list — standalone `docker run`): the container must be RECREATED with `-p 127.0.0.1:<port>:<port>` and otherwise identical settings. Read them first — `docker inspect <name>` shows image, volumes/mounts, env, and restart policy. Confirm the state lives on a mount/volume (not the container's own filesystem) BEFORE removing anything, write out the full `docker stop` / `docker rm` / `docker run …` sequence for the user, and check with them at each step.
   Either path restarts OpenClaw — give the rule 7 restart warning first. If you (the agent) live inside that container, the restart also cuts THIS chat: hand the user the complete remaining command list *and* the verify steps below before they apply anything, plus a one-line resume note they can paste into a fresh session.

3. VERIFY (host): `docker ps` now shows `127.0.0.1:<port>-><port>/tcp`, and `npx -y wscat -c ws://127.0.0.1:<port>` prints `Connected` then `Disconnected (code: 4001, reason: "invalid_token")` — that close IS the pass signal: the relay answered and asked for auth. `error: socket hang up` instead = still a dead backend (the relay always completes the handshake, so recheck the publish target port and the bind).

4. VERIFY (in container, once reconnected): Step 5's container-lane VERIFY — startup log `ws://0.0.0.0:<port>`, and `curl -s -i --max-time 5 http://$(hostname -i):<port>/ | head -3` returns `404` (was `connection refused` before the fix).

Then resume where the flow left off (usually Step 7 or Step 9).

---

**TERM-HELP** — opening a terminal on this machine: Linux — Ctrl+Alt+T or "Terminal" in the app menu · macOS — Cmd+Space, type Terminal · Windows — Start menu, type PowerShell. If they normally reach this machine remotely, they connect the same way they usually do (e.g. SSH). `command not found` usually means OpenClaw isn't on that shell's PATH or it's the wrong machine — have them confirm `openclaw --version` works there first. Mind the quotes around tokens.

---

**ESCALATE** — when stuck after honest attempts: assemble this paste-ready breakdown, show it to the user, confirm together it contains no secrets, and point them at the OcuClaw Discord:
```
OcuClaw setup help — guide 2026-06-16
Platform/OS:
openclaw --version:
openclaw status --all (read-only, pasteable — confirm no secrets):
Plugin Version / Status (from plugins inspect):
Config keys set (names only, never values):
tailscale status (summary):
tailscale serve status:
openclaw gateway status:
openclaw plugins doctor (ocuclaw lines):
Failing step + symptom:
Already tried:
```

---

**BETA-REPORT** — when a beta build misbehaves, assemble this paste-ready report, show it to the user, confirm together it contains no secrets, and have them post it in the beta-testing Discord (`https://ocuclaw.com`):
```
OcuClaw beta report — guide 2026-06-16
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

---

## Quick reference

| What | Value |
|---|---|
| Relay address (OcuClaw app) | `wss://<node>.<tailnet>.ts.net:8444` |
| Even AI agent URL | `https://<node>.<tailnet>.ts.net:8443/v1/chat/completions` |
| Relay backend | `localhost:<wsPort>` (plugin-hosted; `wsPort` = `47800` on a fresh install — confirm with `openclaw config get plugins.entries.ocuclaw.config.wsPort`) |
| Install / enable / update | `openclaw plugins install ocuclaw` · `enable` · `update` |
| Restart / status / doctor | `openclaw gateway restart` · `openclaw gateway status` · `openclaw plugins doctor` |
| Config root | `plugins.entries.ocuclaw.config.*` via `openclaw config set` |
| Containerized host (Docker / VPS) | `wsBind` `0.0.0.0` + Docker publish `127.0.0.1:<wsPort>:<wsPort>` — never `0.0.0.0` on the host side (Step 5 / DOCKER-RELAY-UNREACHABLE) |
| Agent tool access | `tools.alsoAllow` must include `"ocuclaw"` when `tools.profile` is set (Step 4 / AGENT-TOOLS-FILTERED) |
| Check versions | `npm view ocuclaw version` (latest) · `dist-tags` (channels) · `versions` (history) |
| Update / switch channel | `openclaw plugins update ocuclaw` (stable) · `update ocuclaw@beta` (move to beta) · `install ocuclaw@latest --force` (roll back to stable) |
| Community / support | Discord `https://ocuclaw.com` · `https://buymeacoffee.com/ocuclaw` |
