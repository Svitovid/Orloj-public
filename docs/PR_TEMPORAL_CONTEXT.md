# Orloj × Purple Rain — Temporal Context Bridge v0

Date: 2026-10-08
Owner: Pansophia Institute / Orloj
Consumer: Purple Rain (PR)
Status: isolated implementation candidate; NOT deployed to public main

## Architectural rule

Orloj is Intelligence of Time. Purple Rain is Intelligence of Value.
They remain distinct products. Orloj provides time and provenance; Purple Rain owns investment analysis, treasury state, event verification, scenarios and decisions.

Data direction:

    OrlojDay + Astronomy Engine
        -> pr-temporal-context.js
        -> JSON temporal context
        -> PR Work integration (Opportunity Board, Treasury context, Machine Economy Timeline)

PR events are added by the PR consumer before rendering; Orloj never fetches, invents or validates live asset prices. The bridge does not read wallet information, portfolio balances, API keys, localStorage or cookies.

## What is implemented in v0

- Isolated UMD module with no new runtime dependencies; consumable in browser and Node.
- Civil date, ISO week and ordinal day from the existing OrlojDay module.
- Optional astronomical snapshot (lunar phase, illumination proxy, Moon/Sun ecliptic longitude and tropical zodiac) computed by existing OrlojDay + Astronomy Engine.
- Optional PR-supplied events and seven-local-day window, each with source and maturity metadata.
- Symbolic weekday ruler / universal day only with explicit opt-in, tagged non-empirical.
- Explicit financialSignals: null and marketPrediction: none.
- Existing public UI and offline assets stay untouched.

Not implemented: financial backtests, macro calendar feeds, planetary price forecasting, automatic market-regime classification, portfolio ingestion, live external event verification, PR-side UI.

## Contract

Module: pr-temporal-context.js
Schema: orloj.temporal-context/1.0.0
API: OrlojPRTemporal.createContext(input)

Input:

    {
      at: "2026-10-08T21:00:00Z",
      timeZone: "Europe/Prague",
      dayEngine: OrlojDay,
      astronomy: Astronomy,
      includeSymbolic: false,
      events: [
        {
          id: "pr-event-001",
          title: "Illustrative scheduled event — DEMO ONLY",
          startsAt: "2026-10-09T10:00:00+02:00",
          endsAt: null,
          category: "macro",
          maturity: "unknown",
          sourceUrl: null,
          sourcePublishedAt: null,
          description: "No verified external source; do not treat as a real event."
        }
      ]
    }

Important: at and event timestamps must be absolute ISO 8601 instants with timezone offset or JavaScript Dates, not ambiguous local strings. The timeZone is an IANA zone.

Event category values: macro, policy, network, treasury, machine-economy, other.
Event maturity values: production, pilot, memorandum, marketing, announcement, unknown.
Unknown values are normalized to safe defaults. Missing/non-HTTPS sources set sourceState = review_required.
Maturity comes from the PR input and is NOT verified automatically: even a supplied production designation requires independent confirmation.

Output shape:

    {
      schema: "orloj.temporal-context/1.0.0",
      generatedAt: "... UTC ISO ...",
      timeZone: "Europe/Prague",
      dateKey: "2026-10-08",
      calendar: { dayOfYear: 281, isoWeek: 41 },
      astronomy: { available: true, provenance: "...", lunar: {}, solar: {}, note: "..." },
      events: { all: [], nextSevenCalendarDays: [] },
      symbolic: null,
      financialSignals: null,
      boundaries: { decisionOwner: "Purple Rain", temporalOwner: "Orloj", marketPrediction: "none" }
    }

The illustrative values above are documentation examples, not market observations.

### Integration snippet (browser)

    <script src="./astronomy-engine.min.js"></script>
    <script src="./day-profile.js"></script>
    <script src="./pr-temporal-context.js"></script>
    <script>
      const snapshot = OrlojPRTemporal.createContext({
        at: new Date(),
        timeZone: "Europe/Prague",
        dayEngine: OrlojDay,
        astronomy: Astronomy,
        events: [], // Inject from a separate PR event service only after verification.
        includeSymbolic: false
      });
      // Send snapshot to the PR rendering layer. Do not conflate temporal data with trading signals.
    </script>

For Node test use require("./pr-temporal-context.js") with require("./day-profile.js") and require("./astronomy-engine.min.js").

## Intended Purple Rain surfaces

1. **Opportunity Board — Today and Next 7 Days.** Compact time strip: local date, astronomical context, verified event markers with sources, last refresh. Price, liquidity and treasury values must come from PR's independent empirical feeds.
2. **Machine Economy Timeline.** Overlay sourced technological/regulatory events and lifecycle stages; preserve differentiation between production, pilot, memorandum and marketing. Geopolitics is contextual, not causally inferred from astronomy.
3. **Cycles research.** Provide a timeline canvas for evaluating time-series hypotheses. Historical seasonality and cyclical narratives need preregistered windows, honest null results, controls and out-of-sample tests. Do not treat numerology or astrology as evidence of expected financial returns.
4. **Treasury context.** Read-only links to PR's XRP, FLR, FXRP and vault event views. Never show secret recovery phrases or automatically connect wallet state through Orloj.

## UX

- PR interface should feel like a deliberate observatory plate or timeline, not another dashboard full of charts.
- Keep empirical events and symbolic overlays visually distinct; show sources and "Why am I seeing this?".
- Symbolic layers are collapsed and OFF by default in financial work.
- Never badge a speculative correlation as "high confidence"; use "hypothesis" until evidence exists.
- Empty external event feeds must render "Not connected" rather than fabricated example events.
- Reader and Research share computational provenance; no independent calculation forks.

## Acceptance criteria for PR Work

- Consume the versioned context payload without copying ephemeris/calendar formulas.
- Test Europe/Prague DST and near-midnight UTC transitions.
- Audit event freshness, maturity and URLs; null or unavailable metrics render explicitly.
- Preserve source links and timestamp; do not infer trading actions from temporal features.
- No wallet access, seed phrases, signatures or portfolio balances cross into the Orloj adapter.
- Performance impact on public Orloj is zero until explicit integration approval.
- Review tests by running: node --test tests/pr-temporal-context.test.js
- Complete UI review before merging/deploying; no auto-merge to main.

## Ownership and follow-up

Orloj Architecture: contract, temporal engine and knowledge graph.
PR Architecture: consumers, separation of methodology and decision policy.
PR Work: build Opportunity Board / Timeline integration.
PR Board: review scenarios and decision-usefulness; only empirical inputs inform portfolio actions.
PR Agents: feed sourced event changes; avoid duplicate monitoring jobs.

No PR GitHub repository was visible to this connector on 2026-10-08, so the v0 bridge lives on an isolated Orloj-public feature branch pending PR Work integration.
