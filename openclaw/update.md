# Updating OcuClaw

**Guide version:** 2026-06-21

This is the **stable update** path — for any already-installed OcuClaw user. You
do **not** need to be a beta tester to be here. For the **beta channel** (newer
pre-release builds) or a **rollback** from beta back to stable — beta-Discord
testers only — load beta.md (https://ocuclaw.com/openclaw/beta.md) instead.

For a first-time install, this is the wrong file — load fresh-install.md
(https://ocuclaw.com/openclaw/fresh-install.md) instead.

Return to START_HERE.md (https://ocuclaw.com/openclaw/START_HERE.md) for the
guardrails and router.

The "quick Step 10 message test" referenced below is in fresh-install.md
(https://ocuclaw.com/openclaw/fresh-install.md); named failure cases (CASE-D,
HOST-OLD, ESCALATE) are in troubleshooting.md
(https://ocuclaw.com/openclaw/troubleshooting.md); the WRAP closing note is in
wrap-feedback.md (https://ocuclaw.com/openclaw/wrap-feedback.md).

## U1 — Update OcuClaw (already installed and healthy)

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

If installed == latest stable: tell them they're up to date. If they confirm they're a beta-Discord tester and want newer pre-release builds, load beta.md (https://ocuclaw.com/openclaw/beta.md); otherwise you're done.

**Pre-flight:** If the evenAiEnabled probe = 1 and the evenAiToken probe = 0 → run **CASE-D** before proceeding.

**DO:**

```
openclaw plugins update ocuclaw
```

Warn before restarting (~30 s quiet; resend this URL if I don't return), then:

```
openclaw gateway restart
```

**VERIFY:** `openclaw plugins inspect ocuclaw` shows the new `Version:` and `Status: loaded`. Run a quick Step 10 message test. On success → load wrap-feedback.md (https://ocuclaw.com/openclaw/wrap-feedback.md) and deliver the **WRAP** closing note.

**If failed:** CASE-D if validation rejected the update; HOST-OLD if OpenClaw is too old for the new version; otherwise ESCALATE.
