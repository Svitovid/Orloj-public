# Orloj Desktop — Visual / Reader Vision

Working branch: `desktop-visual-v0`

## Goal

Build two coordinated faces of the same Orloj:

1. **Orloj Public / Research** — the existing GitHub version remains the precise, information-dense research instrument. It keeps technical depth, transparent calculations, diagnostics, and fast access to layers.
2. **Orloj Desktop / Reader** — a new visually rendered, calm, everyday edition designed for a large desktop display. It should feel like a rare illuminated book, observatory and living calendar rather than a dashboard.

The two versions must share the same conceptual data model and calculations where practical. Presentation is separate from truth/data.

## Design thesis

The new Reader version should feel timeless rather than fashionable.

Reference atmosphere:
- Library of Alexandria / a durable repository of knowledge
- Renaissance Tuscany: light, stone, ultramarine, ochre, terracotta, verdigris, gold
- Japanese fine paper: subtle tactile surface, quiet materiality, not faux-vintage clutter
- Frutiger Aero: clear sky, water, luminous atmosphere, optimistic depth
- Apple-like liquid glass: restrained translucency, optical layering, soft refraction
- Kodak-quality photographic character: warm highlights, natural skin/stone/green rendering, fine grain, modest halation rather than aggressive filters
- The three recent Pansophia symbolic images: classical architecture, water, sky, cosmological symbols, vivid but balanced full-spectrum color

The interface should be **color-rich, not dark-mode-only**. Pure white is an intentional high-contrast material and should appear as light, paper, margin and luminous accent.

## Display target

Primary target:
- 24–32 inch desktop monitor
- 4K resolution
- IPS / wide viewing angle
- high-quality 24-bit color as baseline
- wide-gamut / HDR-capable displays should benefit where the browser and asset format allow it

Do not make the visual identity depend on HDR being present. Use graceful sRGB fallbacks. Prefer wide-gamut color through CSS `color(display-p3 ...)` where appropriate, with standard CSS fallbacks first.

## Core principle: one engine, two surfaces

Do not fork astronomical/calendar truth into two independent implementations.

Conceptual structure:

`shared data / calculations`
→ `Research UI`
→ `Reader UI`

The Research UI can remain denser and technical.
The Reader UI should selectively reveal depth: overview first, detail on demand.

## Reader interaction model

The main screen is not a dashboard of cards. It is a **page / plate / scene**.

A user should be able to understand the day in seconds:
- date
- day of year / week context
- ruling planet
- lunar phase, sign and degree
- sun / season / daylight rhythm
- one or two dominant celestial motifs

Deeper layers open deliberately rather than competing for attention.

### Navigation

Persistent, minimal controls:
- previous day
- date / calendar picker
- next day
- Today
- open depth / layers

Avoid explanatory labels where the visual object already communicates the meaning.

## Visual system

### 1. Light

The UI should behave as if illuminated by real light.
- white margins as paper/light
- translucent glass only where layering has meaning
- moon panels subtly respond to illumination fraction
- sunrise / sunset / seasonal light can influence atmosphere without recoloring text illegibly

### 2. Color

Use the full palette intentionally.

Anchor families:
- ultramarine / lapis
- sky cyan
- water blue-green
- verdigris / botanical green
- Tuscan ochre
- terracotta / cinnabar
- warm gold
- deep wine / plum for rare emphasis
- true neutral white
- graphite/ink for text

Avoid neon-dashboard color coding.

### 3. Material

Three materials only:
- **paper** — quiet matte content surface
- **glass** — controls, overlays, floating navigation
- **image/light** — full-bleed visual atmosphere

A fine Japanese-paper texture may be used at extremely low opacity. It should disappear before it reads as a pattern.

### 4. Photography / rendered art

Use high-resolution art and photography as meaningful content, not wallpaper.

Desired image treatment:
- deep dynamic range
- fine grain
- natural highlights
- restrained cinematic warmth
- no cheap vignette
- no washed-out pseudo-film preset

### 5. Typography

Reader version should combine:
- a highly readable contemporary text face for UI/data
- an elegant humanist / Renaissance-inspired display serif for major titles and quotations

Do not imitate manuscript lettering for body text.

### 6. Ornament

Ornament is allowed but must behave like bookmaking / architecture:
- rules
- corner marks
- astronomical glyphs
- engraved separators
- small illuminated initials

Never use decorative symbolism just to fill empty space.

## First Reader screen: Day Profile

The first prototype should be a desktop Day Profile.

### Composition

**Top / margin**
- minimal Orloj mark
- date navigation

**Hero field**
- large date
- weekday
- day number / week number
- ruling planet as a quiet emblem
- season / solar rhythm

**Lunar object**
- image/rendered moon
- phase name
- zodiac sign + exact degree
- panel luminosity tied to real illumination fraction

**Celestial field**
- visually rendered sky/cosmic context
- only the most meaningful active relationships visible by default

**Lower folio**
- timeline / day rhythm
- optional deeper plates: planets, transits, calendars, numerology, symbolic layer

The page should breathe on a 4K monitor. Do not simply stretch the current mobile/card UI.

## Research version update

The GitHub Public/Research version should continue separately and receive pragmatic improvements:
- preserve precision and existing features
- improve desktop information hierarchy
- remove redundant labels
- keep date navigation coherent
- make technical layers easier to scan
- do not force the Reader visual language onto research screens

The Research version is a laboratory and instrument.
The Reader version is the finished book / observatory experience.

## Accessibility and legibility

Beauty must not reduce usability.
- body text contrast remains WCAG-conscious
- motion respects `prefers-reduced-motion`
- translucent panels must have a solid fallback
- key information may not rely on color alone
- typography remains readable at 100% scaling on a 4K display

## Performance

Target a rich visual result without turning the page into a GPU demo.
- high-resolution responsive images (`srcset`)
- modern image formats where safe
- lazy-load secondary art
- use CSS effects sparingly
- avoid constant full-screen blur/animation
- animate only meaningful state changes

## Product character

The desired emotional response is not "cool astrology app".

It is:

> I opened a living, beautifully printed book of time — except the page knows what the sky is doing now.

The product should be calm enough for daily use and rich enough to reward years of return.

## Working names

Research surface: **Orloj Public / Research**
Reader surface: **Orloj Desktop / Reader** (working title)

Possible later names:
- Orloj Illuminated
- Orloj Folio
- Orloj Living Book
- Orloj Aurea

Do not rename publicly until the visual prototype earns the name.

## Implementation sequence

### Phase 0 — Audit
- inventory current v11.13.1 screens and data dependencies
- identify calculations/data that can be shared cleanly
- document desktop pain points

### Phase 1 — Reader shell
- new desktop layout
- design tokens (color, type, paper, glass, spacing)
- date navigation
- responsive 4K-first grid with fallback to laptop widths

### Phase 2 — Day Profile prototype
- hero date / solar rhythm
- lunar object and true illumination
- ruling planet / day-week-year context
- rendered atmosphere

### Phase 3 — Depth
- expandable astronomy
- personal transit layer
- calendars
- symbolic interpretations

### Phase 4 — Sites edition
- publish only after explicit approval
- Reader version can live independently from the GitHub Research URL while sharing a release/data strategy

## Release rule

Do not deploy or merge this visual branch to the public main branch without explicit approval after desktop review.
