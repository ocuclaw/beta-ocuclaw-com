# Brand font — Even Signature (notes)

Quick reference for the licensed display font. Mapped to the `--serif` token, used everywhere the old Pixelify Sans pixel font was.

## Rules (no-redistribution)
- Font is licensed (licensor: Dan Hu): usable on this site, **must not be given to competitors**.
- Master `EvenSignature.otf` lives at `~/Downloads/` — **never copied into the repo, never committed**.
- The font ships **only as inline base64 inside each page**, subset to that page's characters. The intermediate `.woff2` / `even.css` are **local-only and gitignored — never deployed**.
- `.gitignore` blocks `*.otf` / `*.ttf` and `assets/fonts/`; `git-sync.sh` also aborts if a raw font is staged.

## How it ships (inline-only, per-page minimal)
- Each font-using page carries its OWN inline `@font-face { src:url('data:font/woff2;base64,…') }`, subset to **only the characters visible on that page** — no shared union, no full-alphabet floor.
- The face's internal identity (CFF FontName/FullName) is **blanked to `BrandDisplay`** so an extracted copy can't self-identify; the copyright/license name records are **kept** as a licensed-provenance watermark.
- The CSS still calls it `'Even Signature'` — that alias is decoupled from the binary's internal name, so rendering is unaffected by the blanking.

## Files
- `tools/build-font.py` — rebuilds the per-page subsets from the master OTF and refreshes the inline base64 in each page. **Local-only (gitignored).**
- `assets/fonts/` — gitignored scratch; not part of the deploy.

## Workflow
- **Edit copy freely.** When you want the font to match new text:
  `python3 tools/build-font.py`
  (scans font-using pages → per-page subset → blanks identity → refreshes each page's inline base64).
- **Deploy:** run `git-sync.sh` — it runs `build-font.py` first, then commits + pushes. Vercel never runs the script (the OTF isn't there, by design); the inline base64 baked into each page is what deploys.

## New pages
- Include `'Even Signature'` in the page, set `--serif: 'Even Signature', 'Pixelify Sans', 'Times New Roman', serif;`, and paste an inline `@font-face` block with a placeholder `data:font/woff2;base64,` URI. `build-font.py` auto-detects the page and fills/refreshes the inline subset on the next run. (A page that references the font but has no inline slot is reported as skipped.)

## Fallback chain
`--serif: 'Even Signature', 'Pixelify Sans', 'Times New Roman', serif;`
- Browsers fall back **per glyph**: Even Signature renders what it has; any glyph it lacks (`$ ~ → & ?` …) renders in **Pixelify Sans** (free Google font, re-loaded via the page's font link); only glyphs Pixelify also lacks (e.g. `∞`) hit Times.
- Keeps missing symbols on-brand (pixel look) instead of generic Times.

## Gotchas
- Even Signature has no glyphs for `!  &  ;  ?  $  ~  →` etc. — they render in Pixelify Sans (see fallback chain), not Times.
- **No always-on floor:** each page's subset is exactly its current characters. Typing a character a page didn't previously contain falls back (per-glyph) until the next `build-font.py` run. `git-sync.sh` rebuilds before every push, so the **deployed** page is always correct; only local preview between an edit and a rebuild shows the fallback. Fails safe (legible, never tofu).
- Master OTF must stay at `~/Downloads/EvenSignature.otf`, or set `EVEN_OTF=/path` before running.
- Pixelify Sans must stay in each page's Google Fonts `<link>` for the fallback to work.
