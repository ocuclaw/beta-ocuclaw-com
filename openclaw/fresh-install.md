# OcuClaw fresh install — Steps 1–13

**Guide version:** 2026-06-21

Return to START_HERE.md (https://ocuclaw.com/openclaw/START_HERE.md) for the
guardrails, lane card, checklist, and router at any time.

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
- A list that does not contain `"ocuclaw"` → merge `"ocuclaw"` into the existing entries.
  Never replace an existing tools.alsoAllow list with only ["ocuclaw"] unless
  the old list was empty. Merge "ocuclaw" into the existing list and preserve
  all existing entries.
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
openclaw plugins inspect ocuclaw --runtime
openclaw plugins doctor
```
Pass = gateway healthy + `plugins inspect ocuclaw` shows `Status: loaded` + `plugins inspect ocuclaw --runtime` confirms runtime loading + `plugins doctor` reports no ocuclaw issues. (Unrelated warnings about other plugins don't block — only ocuclaw-specific failures do.)

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

  > **Common wrong addresses — do not mix these up:**
  > OcuClaw app relay address: `wss://<node>.<tailnet>.ts.net:8444`
  > Even AI agent URL: `https://<node>.<tailnet>.ts.net:8443/v1/chat/completions`
  > Local relay backend: `localhost:<wsPort>`

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

> **Common wrong addresses — do not mix these up:**
> OcuClaw app relay address: `wss://<node>.<tailnet>.ts.net:8444`
> Even AI agent URL: `https://<node>.<tailnet>.ts.net:8443/v1/chat/completions`
> Local relay backend: `localhost:<wsPort>`

VERIFY: the user triggers Even AI on the glasses (wake word or button); the reply comes from their OpenClaw session.

If not:
- `Agent Configuration` never appears in the app → the beta unlock hasn't propagated yet; re-check that hub.evenrealities.com was signed in with the correct account email, wait, force-close and reopen the Even Realities app, and try again
- Token mismatch or auth error → `ERR-EVENAI-TOKEN`
- Anything else → `ESCALATE`

---

### Step 13 · Handoff

Return to START_HERE.md (https://ocuclaw.com/openclaw/START_HERE.md), then
load wrap-feedback.md (https://ocuclaw.com/openclaw/wrap-feedback.md) only
after the required checklist is complete or the user intentionally skipped the
optional steps (Soniox, Even AI).
