# OcuClaw troubleshooting — named cases

**Guide version:** 2026-06-21

Reference only — execute nothing here unless a step routed you here by its case
name. After resolving a case, return to START_HERE.md
(https://ocuclaw.com/openclaw/START_HERE.md) and re-run the state assessment.

Step references in these cases (Step 3, Step 5, Step 7, Step 9, …) point to
fresh-install.md (https://ocuclaw.com/openclaw/fresh-install.md); the state
assessment, lane card, and guardrails are in START_HERE.md
(https://ocuclaw.com/openclaw/START_HERE.md).

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
OcuClaw setup help — guide 2026-06-21
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

**BETA-REPORT** — when a beta build misbehaves, assemble this paste-ready report, show it to the user, confirm together it contains no secrets, and have them post it in the beta-testing Discord (`https://discord.ocuclaw.com/`):
```
OcuClaw beta report — guide 2026-06-21
Installed beta version (from plugins inspect):
Platform/OS:
openclaw --version:
Plugin Status (loaded?):
Config keys set (names only, never values):
What broke (symptom):
Steps to reproduce:
Already tried:
```
If they'd rather drop back to stable in the meantime, that's the rollback path in beta.md (https://ocuclaw.com/openclaw/beta.md).

---
