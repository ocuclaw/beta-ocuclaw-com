# Timeline-driven agent + neural panels

This site's agent-panel and neural-panel can be driven from a sidecar
`timeline.json` that ships next to each `.webm` recording. When a sidecar
is present, the panels flip CSS classes (`is-state-listening`,
`is-state-thinking`, `is-state-responding`, plus tool overlays) in lockstep
with `video.currentTime`. When no sidecar is present, the panels fall back
to their existing always-on animation — so the upgrade is **strictly
additive** and safe to apply to any newer hero-video page.

This document is the contract for upgrading newer versions of the page
(e.g. `OcuClaw O5 v23 - …html`) to support the same behaviour.

## What you need to add

1. A small CSS block (timeline-driven mode rules) inside the existing
   `<style>` block.
2. One inline `<script>` block right before `</body>`.
3. (Optional but recommended) Change the video container's `background`
   from `#000` to `transparent` so VP9-with-alpha recordings show the
   page through their transparent regions.

That's it. No external scripts, no build step, no library load.

## Artifacts in `uploads/`

For each looping hero recording, two files coexist with the same
basename:

```
uploads/<basename>.webm           # the looping video
uploads/<basename>.timeline.json  # the public-safe sidecar
```

**Hard rule:** `uploads/` MUST NEVER contain a `<basename>.events.jsonl`
file. That file is the recorder's private firehose — it carries
transcripts, session keys, and internal IDs. Only `.webm` and
`.timeline.json` are public artefacts. The recorder pipeline upstream
already enforces this at multiple layers; the website must not
reintroduce a leak.

The `.webm` is what the existing `<video>` element plays. The script
derives the sidecar URL from the video's `currentSrc`/`src` by replacing
the `.webm` suffix with `.timeline.json`. If the video element points at
something other than a `.webm`, the script silently no-ops.

## `timeline.json` shape (v1)

```jsonc
{
  "version": 1,
  "duration": 25.334,        // seconds; from ffprobe of the .webm
  "ranges": [
    { "tStart": 0.0,    "tEnd": 6.78,  "state": "idle" },
    { "tStart": 6.78,   "tEnd": 8.62,  "state": "thinking" },
    { "tStart": 8.62,   "tEnd": 9.04,  "state": "responding",
      "text": "Echo: Hey Matty. I'm here — what's up?" },
    { "tStart": 9.04,   "tEnd": 13.99, "state": "idle" },
    { "tStart": 13.99,  "tEnd": 24.59, "state": "thinking" },
    { "tStart": 17.48,  "tEnd": 23.79, "state": "tool", "overlay": true,
      "id": "<tool-call-id>", "tool": "web.search" },
    { "tStart": 24.59,  "tEnd": 28.40, "state": "responding",
      "text": "Echo: …" }
  ]
}
```

Field semantics:

- `version`: always `1` for now. The script bails out if not 1.
- `duration`: total seconds; equals the webm duration. Used only as a
  bound when reasoning about the loop end.
- `ranges`: array of half-open intervals `[tStart, tEnd)`. Two kinds:
  - **Primary** ranges (no `overlay` field, or `overlay: false`) carry
    one of four mutually-exclusive states: `idle`, `listening`,
    `thinking`, `responding`. The reducer guarantees these never
    overlap each other.
  - **Overlay** ranges (`overlay: true`) carry `state: "tool"` plus
    `id` and `tool`. Tool overlays are non-exclusive — they coexist
    with whatever primary range is active at the same time. There
    can be multiple overlapping tool overlays.
- Optional payload fields per range:
  - `transcript` (on listening): final committed transcript.
  - `summary` (on thinking): the agent's status-line text during the
    thinking phase (e.g., a short label or detail string). Reliably
    populated for recordings produced 2026-05-07 or later; older
    recordings may have the field absent on every thinking range.
    A given thinking range may also have the field absent if the
    activity stream that produced it carried no label/detail text.
  - `text` (on responding): the agent's response text. Capped at 500
    chars by the reducer; if capped, `truncated: true` is set.
  - `truncated` (boolean): set on any text-bearing range whose payload
    was capped at 500 chars.

The sidecar is **public-safe**: an allowlist on the writer side strips
internal IDs (`recordingId`, `parentId`, `clientId`, etc). Only the
fields above ever appear.

## DOM contract the script expects

The script queries these selectors at module load and bails silently if
any is missing:

| Selector | Required? | Used for |
|---|---|---|
| `.hud--video video` | yes | the looping recording |
| `.agent-panel` | yes | left/companion panel that flips state classes |
| `.neural-panel` | yes | right/companion panel that flips state classes |
| `.agent-panel__status` | optional | status text inside the agent panel; if present, its `textContent` is updated to a label like `Listening`, `Thinking`, `Echo: …` |

The script adds the class `is-timeline-driven` to both panels once it
successfully fetches and parses the sidecar. Without that class, the
existing always-on CSS animation continues unmodified.

While timeline-driven, the script per frame applies one of these state
classes to each panel: `is-state-idle`, `is-state-listening`,
`is-state-thinking`, `is-state-responding`. It also sets
`data-overlay="<id>"` (empty string when no tool is active) and
`data-overlay-count="<n>"`. These attributes are the hooks for any
overlay-specific styling the page wants to add.

## CSS to add

Insert this block inside the existing `<style>` block, anywhere
after the existing `.agent-panel` / `.neural-panel` rules:

```css
/* Timeline-driven mode: panels are CSS-flipped between states. */
.agent-panel.is-timeline-driven .wave i { animation-play-state: paused; }
.agent-panel.is-timeline-driven.is-state-listening .wave i { animation-play-state: running; }
.agent-panel.is-timeline-driven.is-state-thinking .wave i {
  animation-play-state: running;
  animation-duration: 2.4s;
  opacity: 0.55;
}
.agent-panel.is-timeline-driven.is-state-responding .wave i { /* gentle, biased forward */ }

.neural-panel.is-timeline-driven { opacity: 0.35; }
.neural-panel.is-timeline-driven.is-state-thinking,
.neural-panel.is-timeline-driven.is-state-responding,
.neural-panel.is-timeline-driven[data-overlay]:not([data-overlay=""]) { opacity: 1; }
```

These rules only take effect once the script attaches the
`is-timeline-driven` class. Pages without the script (or pages whose
sidecar fetch fails) render unchanged.

If you want the alpha channel of the recorded webm to actually show
through the page (instead of being composited against a black backdrop),
also change the video container's background:

```css
/* before: background:#000 */
.hud--video .hud__video { background: transparent; /* …rest unchanged… */ }
```

This works for both alpha and non-alpha recordings. Non-alpha videos
already use `mix-blend-mode: screen` on the `<video>` element, which
screens against whatever's behind — `background:transparent` is
strictly better than `#000` for both modes.

## Script to add

Insert this block immediately before the closing `</body>` tag. It is
self-contained, dependency-free, and gracefully exits on any precondition
failure.

```html
<script>
  (function() {
    var video = document.querySelector('.hud--video video');
    if (!video) return;
    var agentPanel = document.querySelector('.agent-panel');
    var neuralPanel = document.querySelector('.neural-panel');
    if (!agentPanel || !neuralPanel) return;

    var src = video.currentSrc || video.src;
    var u;
    try { u = new URL(src, location.href); } catch (e) { return; }
    var replaced = u.pathname.replace(/\.webm$/i, '.timeline.json');
    if (replaced === u.pathname) return; // not a .webm — no sidecar
    u.pathname = replaced;

    var timeline = null;
    fetch(u.toString())
      .then(function(r) { return r.ok ? r.json() : null; })
      .catch(function() { return null; })
      .then(function(t) {
        if (!t || t.version !== 1 || !Array.isArray(t.ranges)) {
          if (!t) console.warn('agent-panel: no timeline sidecar, falling back to always-on');
          return;
        }
        timeline = t;
        agentPanel.classList.add('is-timeline-driven');
        neuralPanel.classList.add('is-timeline-driven');
        startTick();
      });

    function lookupState(t) {
      var primary = { state: 'idle' };
      var overlays = [];
      for (var i = 0; i < timeline.ranges.length; i++) {
        var r = timeline.ranges[i];
        if (t < r.tStart || t >= r.tEnd) continue;
        if (r.overlay) overlays.push(r);
        else primary = r;
      }
      overlays.sort(function(a, b) { return a.tStart - b.tStart; });
      var overlay = overlays.length ? overlays[overlays.length - 1] : null;
      return { primary: primary, overlays: overlays, overlay: overlay };
    }

    function setStateClass(el, state) {
      var prefix = 'is-state-';
      var keep = [];
      for (var i = 0; i < el.classList.length; i++) {
        var c = el.classList[i];
        if (c.indexOf(prefix) !== 0) keep.push(c);
      }
      el.className = keep.join(' ') + ' ' + prefix + state;
    }

    function applyState(primary, overlay, overlays) {
      setStateClass(agentPanel, primary.state);
      setStateClass(neuralPanel, primary.state);
      var overlayId = overlay ? overlay.id : '';
      agentPanel.setAttribute('data-overlay', overlayId);
      neuralPanel.setAttribute('data-overlay', overlayId);
      agentPanel.setAttribute('data-overlay-count', String(overlays.length));
      neuralPanel.setAttribute('data-overlay-count', String(overlays.length));

      var statusEl = agentPanel.querySelector('.agent-panel__status');
      if (statusEl) {
        var label = 'Idle';
        if (overlay) {
          label = 'Running ' + (overlay.tool || 'tool');
          if (overlays.length > 1) label += ' (+' + (overlays.length - 1) + ')';
        } else if (primary.state === 'listening') label = 'Listening';
        else if (primary.state === 'thinking') label = primary.summary || 'Thinking';
        else if (primary.state === 'responding') label = (primary.text || 'Responding').slice(0, 80);
        statusEl.textContent = label;
      }
    }

    var lastKey = '';
    function tick() {
      if (!timeline) return;
      var t = video.currentTime; // already wraps via the video's loop attribute
      var s = lookupState(t);
      var overlayKey = s.overlays.map(function(o) { return o.id; }).join(',');
      var key = s.primary.state + '|' + overlayKey;
      if (key !== lastKey) { applyState(s.primary, s.overlay, s.overlays); lastKey = key; }
      requestAnimationFrame(tick);
    }
    function startTick() { requestAnimationFrame(tick); }
  })();
</script>
```

Notes for a future upgrade:

- The script reads `video.currentTime` directly each frame, so it
  wraps naturally with the `<video loop>` attribute. No manual
  rewind logic needed.
- It only re-applies state classes when the `(primary.state, overlays)`
  key actually changes, so style thrash is bounded.
- The `agent-panel__status` write replaces the inner DOM (including any
  blinking-caret child element). If newer page versions have a richer
  status structure, replace the `.textContent =` line with a
  page-appropriate update — but keep the label-derivation logic.

## Side-effects on the existing always-on animation

None when no sidecar is present. The script's state-class additions are
gated on `is-timeline-driven`, which is only added after a successful
fetch. A page served without `uploads/<basename>.timeline.json` will
behave identically to before this upgrade.

## Validating the upgrade

1. Make sure the page is served over HTTP (not `file://`) so `fetch`
   can read sibling files. A quick `python3 -m http.server 8080` from
   the website folder is enough for local testing.
2. Open DevTools → Network. With a `.timeline.json` next to the
   `.webm`, you should see a 200 fetch on page load. Without one, the
   console logs `agent-panel: no timeline sidecar, falling back to
   always-on` and the page still works.
3. With the sidecar loaded, both panels gain `is-timeline-driven` and
   one of the `is-state-*` classes flips as the video plays. You can
   verify in the Elements panel.
4. The agent-panel status text should update through the cycle:
   `Idle` → `Thinking` → `Echo: <response>` → `Idle` → … and the tool
   overlay should momentarily show `Running <tool>` during the tool
   range.

## How recordings are produced (upstream context)

The sidecars are produced by the recorder pipeline in the
`evenclaw-debug` repo (Linux dev box):

- `tools/recorder/panel.js` runs locally on `127.0.0.1:4180`. The
  operator clicks **Start Recording**, drives a flow in the simulator,
  clicks **Stop Recording**.
- The panel emits two artefacts per take into `docs/recordings/`:
  `<basename>.webm` and `<basename>.timeline.json`. (A third file,
  `<basename>.events.jsonl`, is the private firehose — never copy it
  into `uploads/`.)
- The operator copies `webm` + `timeline.json` into `uploads/`,
  optionally renaming to a stable filename like
  `menu-driven-new-session.webm` so the page's `<video>` element
  doesn't have to change between takes.
- For pre-publication review of the sidecar's transcripts, summaries,
  and tool names, the recorder repo also ships
  `tools/recorder/review-timeline.js` — pipe the
  `<basename>.timeline.json` through it before copying into `uploads/`.
- The recorder panel UI (`http://127.0.0.1:4180/`) also has a built-in
  playback indicator under each gallery video: pills, a click-to-seek
  timeline strip, and the current state's text payload. Useful for
  spot-checking what the page will display BEFORE copying a take into
  `uploads/`.

## When something doesn't work

- **`Access to fetch … has been blocked by CORS policy`** — the page is
  being opened via `file://`. Serve over HTTP instead.
- **Panels never gain `is-timeline-driven`** — open DevTools, watch the
  Network tab for the `timeline.json` fetch. 404 means the sidecar isn't
  in `uploads/` next to the webm. The console will log the fallback
  message.
- **Panels stuck on `idle`** — confirm the `<video>` element is actually
  playing (`currentTime > 0`). The script reads `video.currentTime`; if
  it stays at 0, no state transitions fire.
- **Black backdrop where alpha was expected** — the video container
  still has `background:#000`. Change to `background:transparent`
  (see CSS section above).
- **Status label stops updating but classes still flip** — the page may
  have changed `.agent-panel__status` to a richer DOM structure that
  doesn't tolerate `textContent =` replacing children. Adjust the
  status-write block in the script accordingly.

## Versioning

The sidecar declares `version: 1`. Future shape changes should bump
this and the script should fail-safe if it encounters an unknown
version (the current script already does — it returns from the
`.then()` if `version !== 1`).
