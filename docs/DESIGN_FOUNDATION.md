# Orloj — Design Foundation v1

Draft integration on Orloj-public main (base 87ed502). No framework, chat UI, new hosted Site, or changes to numerology / astronomy algorithms.

## Interactive review

Serve the checkout with a static HTTP server, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000/index.html?design-preview=1`.
This query assembles the real existing DOM, calculations and controls into a review route. `index.html` remains the complete application; `tarot.html#hermit-study` is the existing Reader image.

The preview's “Osobní čas” link maps to the existing Nyní instrument (there was no standalone page named Osobní čas). Calendar values remain those of the existing application, including its existing default-profile behavior. This change does not redefine any numerological output.

## Architecture

- `appearance.js`: visual preferences only, versioned schema, palette resolution, WCAG luminance checks, live native dialog, save/cancel/reset, import/export. Single storage key `orloj.appearance.v1`; no reading, copying or exporting the birth profile, location or journal.
- `design-foundation.css`: shared semantic tokens, legacy variable bridge, three integrated surfaces, typography and reduced-motion rules. System sans-serif default; optional book face for Reader; all fonts local. Calendar columns remain readable and scroll horizontally when necessary.
- `symbol-registry.js`: 10 bodies, 12 zodiac signs and 5 event categories, Czech/English names, glyphs and references to existing model keys. Body presentation metadata consumes this registry; the dialog exposes the whole registry. Zodiac SVG references point to existing ZODIAC_MARKS. Phase glyphs are labels, never substitutes for computed phase geometry.
- `sw.js`: new cache revision with all three new static assets. Both existing entry pages and the local Reader image are precached.

The selected surfaces use one text/surface palette. Legacy areas outside this first integration retain component styles; the shared aliases provide a bridge, but a full application-wide contrast audit is not claimed. Rendered historical artwork and its measured color swatches are data and retain their original colors.

## Preferences and contrast

Three presets (Observatoř / Pergamen / Lesní ticho), light/dark/system; four custom color controls, UI and Reader fonts, 100–150% text and atmosphere intensity. System follows `prefers-color-scheme` changes. Mode/preset changes reset custom palette overrides; font and scale settings stay intact.

Draft changes affect the open page immediately but persist only after Save. Cancel and Escape restore the saved appearance. Reset is a draft operation and can also be cancelled. Native dialog traps focus and restores it to the trigger. Storage failures are reported and do not pretend to persist.

Text/background, text/surface and text/accent pairs require 4.5:1 to save. The repair chooses automatic black/white foreground; if incompatible background and surface colors still fail, it aligns the surface with the background. Import is size limited to 16 KB and rejects extra keys, invalid values, future versions and prototype-related keys. Export uses an explicit visual allowlist only.

## Verification — 7 November 2026

- `node --test tests/*.test.js`: **107 / 107 pass** (99 existing + 8 new).
- Core tests cover all preset / system resolutions, exact contrast values, hostile input, round-trip export, privacy allowlist, corrupt/denied storage, registry references and actual service-worker fallback code with failed network fetches.
- Chromium UI: dark/light changes; dark persistence on reload; shared settings in Reader; 150% text; slider keyboard End/Home; Escape restores saved light mode; invalid manual foreground disables Save; repair enables Save; reset cancelled without changing saved theme.
- Screenshots: dialog in dark mode, personal-time instrument with large text, number calendar with large text, existing Reader in light mode.
- Reduced motion: shared CSS disables animation/transitions; programmatic smooth-scroll calls in the two integrated HTML entry points respect the media query. Browser OS preference emulation was unavailable, so an actual OS reduced-motion toggle is not claimed as tested.
- Offline: service-worker fetch fallback exercised in a Node VM with the actual worker and all local precache files. A browser network-off toggle was unavailable; manual offline browser smoke testing remains for merge review.
- No deployment or merge performed.

## Remaining review

Manual Safari/iPhone smoke test, real offline reload after initial cache installation, OS system theme/reduced-motion switching, and the remaining legacy surfaces before a wider theme migration. Contrast checks cover theme pairs, not every historical SVG color outside the integrated instrument.
