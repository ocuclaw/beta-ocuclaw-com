# OcuClaw quick reference

**Guide version:** 2026-06-21

Reminders only. For recovery procedures, load troubleshooting.md
(https://ocuclaw.com/openclaw/troubleshooting.md). Back to START_HERE.md
(https://ocuclaw.com/openclaw/START_HERE.md). The `Step N` pointers in the
table resolve in fresh-install.md
(https://ocuclaw.com/openclaw/fresh-install.md).

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
| Community / support | Discord `https://discord.ocuclaw.com/` · `https://buymeacoffee.com/ocuclaw` |
