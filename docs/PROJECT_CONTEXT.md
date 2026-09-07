# Ocean Intelligence project context

Last reviewed against the repository: 2026-09-07

## Product and current capabilities

Ocean Intelligence is a full-stack vessel research application. It searches
Global Fishing Watch by vessel name or identifier, or for vessels historically
observed within an area and date range. Both modes present identity, registry,
specification, classification, and research context for a selected vessel.
Area-presence evidence appears only when the selection comes from an area
report. The application does not provide live locations or continuous tracks.

Implemented behavior includes:

- Geographic and date-based historical vessel-presence search.
- Direct name/MMSI/IMO/callsign lookup with explicit submit, selectable identity
  matches, source-labeled matching evidence, and user-triggered pagination.
- Separate area/identity modes retain inputs, filters, and completed results in
  page memory. Switching cancels API requests and closes details; returning
  never automatically fetches.
- Optional user-triggered browser geolocation that fills an approximate
  25-nautical-mile rectangular search area without submitting it.
- Dynamic seven-day date defaults ending five local calendar days ago.
- Local text, flag, and vessel-type filtering; deterministic sorting; and
  progressive display in groups of 50 with no additional network requests.
- Previous-result retention during replacement searches and clear failure
  behavior.
- A responsive vessel dossier with accessible sections, detail-request
  cancellation, session caching, focus management, and useful area values
  preserved when detail fields are empty.
- UTC timestamps by default with a panel-wide local-time toggle, distinct first
  and last observations, and warnings for reversed parseable periods.
- GFW attribution, historical-AIS caveats, and visibly incomplete research
  placeholders.

No authentication, database, map, vessel tracks, client router, distributed
cache or public deployment is implemented. Only direct identity lookup uses
provider pagination; area reports remain complete responses.

## Stack and request flow

- Frontend: React 19, TypeScript 6, Vite 8, native `fetch`, and local state.
- Backend: .NET 10, ASP.NET Core controllers, `HttpClient`, `System.Text.Json`,
  `IMemoryCache`, built-in rate limiting, and xUnit tests.

```text
Browser
  -> GET /api/vessel-traffic, GET /api/vessels/search, or GET /api/vessels/{id}
  -> controller validation and public mapping
  -> data service protection and caching
  -> authenticated Global Fishing Watch client
  -> GFW v3
```

Area search uses the public global-presence report dataset. Vessel details use
the public vessel-identity dataset with registry information. Public response
models remain separate from raw provider payloads. Filtering, sorting, and
`Show 50 more` operate on the complete area report already in browser memory.

Direct lookup requests 30 provider entries with `MATCH_CRITERIA` from
`public-global-vessel-identity:latest`. Use vessel search's opaque `since`
token (exposed publicly as `nextCursor`), not the generic GFW offset contract.
The controller expands each group's AIS identities in provider order and
preserves their IDs; MMSI/name never deduplicate identities. Registry-only or
missing-ID records stay unavailable for detail selection. Group matching
evidence retains source and reference labels. Provider groups and loaded
identity records are not verified physical-vessel counts.

The dossier receives identity summary and nullable area context separately.
Direct selection never borrows a retained area report. Details cache by GFW ID
across both modes. Active request identity guards ignore late search, pagination,
area, and detail responses even after cancellation.

## Backend protection

- Successful area reports cache for 30 minutes; vessel details cache for
  24 hours.
- Successful lookup pages cache for 30 minutes using a tuple of query, identity
  dataset, and opaque cursor. Query case and cursor contents stay distinct.
- Area searches are limited to 6 requests per minute per client IP; vessel
  details and lookup share 60 per minute.
- One process-wide gate serializes area-report cache misses. Identical
  simultaneous detail requests share an in-flight operation; different vessel
  IDs remain independent.
- Failed or canceled upstream operations are not cached.
- Local rate-limit rejection is `429`; upstream rate limiting maps separately
  to a service-unavailable response.
- Lookup maps provider/network/malformed payload failures to `502`, upstream
  rate limits to `503`, and upstream timeouts to `504`. Caller cancellation
  propagates separately and never stores a successful cache page.
- Protection is process-local. Initial production should use one API replica
  until cache, rate, and concurrency coordination are redesigned.

The GFW token is server-only. Local development uses
`GlobalFishingWatch:AccessToken` in .NET user secrets. Forwarded client headers
are not trusted until a hosting platform and proxy policy are selected. Search
queries are not persisted in browser storage or application logs. Default
HttpClient URI logging is disabled; lookup responses prevent browser caching.

## Data and product constraints

- Sampled AIS presence is historical and incomplete. It must not be presented
  as continuous transmission, exact border crossing, verified identity, or
  current location.
- Identity and registry observations may conflict; preserve source distinctions
  and raw identifiers rather than silently correcting them.
- Do not request detailed tracks or details for every search result.
- GFW attribution and provider caveats remain visible.
- Public-use work still requires hosting, server-secret configuration, CORS and
  trusted-proxy decisions, provider-term review, production observability, and
  measured cache sizing.
- Area-report pagination remains deferred; direct identity pagination follows
  the documented search endpoint's continuation contract.

## Nearby-search boundary

`Use my location` calls browser geolocation only after a direct user action.
The pure bounding-box helper rejects pole and international-date-line crossings.
The result populates coordinate inputs but never starts a search. Coordinates,
permission state, and errors are not written to storage, cookies, or logs;
manual bounds remain available after denial or failure.

## Verification baseline

Run frontend lint/build, `test:nearby`, and `test:vessel-search`; root
`dotnet test OceanIntelligence.slnx`, .NET format verification, and
`git diff --check`. Lookup tests cover query/cursor validation, provider mapping,
ambiguity, cache separation/expiration policy, failures, cancellation, retained
mode state, pagination, stale responses, focus restoration, and absence of
fabricated area evidence. Backend tests and frontend interaction tests mock
provider responses. Exact candidate/check/review results live in the governed
task outcome. Hyrum owns startup, live-data checks, and browser/visual acceptance.

## Documentation roles

- `AGENTS.md`: operating, architecture, and security rules.
- `docs/PROJECT_CONTEXT.md`: durable current capabilities and constraints.
- `docs/ACTIVE_PLAN.md`: only approved work currently in progress.
- `README.md`: public setup, API use, and data caveats.
