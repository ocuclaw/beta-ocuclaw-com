# OcuClaw beta channel & rollback

**Guide version:** 2026-06-21

**Beta-Discord testers only.** Beta builds are pre-release and can be unstable.
If the user is **not** a confirmed beta-testing Discord member, this is the wrong
file — load update.md (https://ocuclaw.com/openclaw/update.md) for the normal
stable update instead.

Return to START_HERE.md (https://ocuclaw.com/openclaw/START_HERE.md) for the
guardrails and router.

The "quick Step 10 message test" referenced below is in fresh-install.md
(https://ocuclaw.com/openclaw/fresh-install.md); named failure cases (CASE-D,
HOST-OLD, BETA-REPORT) are in troubleshooting.md
(https://ocuclaw.com/openclaw/troubleshooting.md); the WRAP closing note is in
wrap-feedback.md (https://ocuclaw.com/openclaw/wrap-feedback.md). To see what
beta builds exist, run the version-landscape checks in update.md
(https://ocuclaw.com/openclaw/update.md).

## B1 — Beta channel (beta-Discord testers only) — UPDATE / ROLLBACK ONLY

**Gate:** Beta builds are for members of the beta-testing Discord group and can be unstable. If the user is not a confirmed beta-Discord member, route them to the stable update — load update.md (https://ocuclaw.com/openclaw/update.md). Continue only once confirmed.

**B1 checklist — copy and tick:**
- [ ] Confirmed the user is a beta-Discord tester (gate)
- [ ] Pre-flight: evenAi consistent (else CASE-D first)
- [ ] Moved to target beta (update ocuclaw@beta) — or rolled back (install ocuclaw@latest --force) — + restarted
- [ ] Verified: expected Version + Status: loaded + quick message test

**Pre-flight:** If the evenAiEnabled probe = 1 and the evenAiToken probe = 0 → run **CASE-D** before proceeding. (Same pre-flight as the stable update in update.md.)

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

**VERIFY:** `openclaw plugins inspect ocuclaw` shows the expected `Version:` and `Status: loaded`. Run a quick Step 10 message test. On success → load wrap-feedback.md (https://ocuclaw.com/openclaw/wrap-feedback.md) and deliver the **WRAP** closing note.

**If failed:** HOST-OLD if a beta requires a newer OpenClaw; otherwise assemble the **BETA-REPORT** bundle (troubleshooting.md: https://ocuclaw.com/openclaw/troubleshooting.md) for the beta Discord.
