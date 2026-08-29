# Ocean Intelligence project context

Last reviewed against the repository: 2026-08-29

## Product and current capabilities

Ocean Intelligence is a full-stack vessel research application. It searches
Global Fishing Watch for vessels historically observed within an area and date
range, then presents identity, registry, specification, classification, and
research context for a selected vessel. It does not provide live locations or
continuous tracks.

Implemented behavior includes:

- Geographic and date-based historical vessel-presence search.
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
cache, server-side result pagination, or public deployment is implemented.

## Stack and request flow

- Frontend: React 19, TypeScript 6, Vite 8, native `fetch`, and local state.
- Backend: .NET 10, ASP.NET Core controllers, `HttpClient`, `System.Text.Json`,
  `IMemoryCache`, built-in rate limiting, and xUnit tests.

```text
Browser
  -> GET /api/vessel-traffic or GET /api/vessels/{id}
  -> controller validation and public mapping
  -> data service protection and caching
  -> authenticated Global Fishing Watch client
  -> GFW v3
```

Area search uses the public global-presence report dataset. Vessel details use
the public vessel-identity dataset with registry information. Public response
models remain separate from raw provider payloads. Filtering, sorting, and
`Show 50 more` operate on the complete area report already in browser memory.

## Backend protection

- Successful area reports cache for 30 minutes; vessel details cache for
  24 hours.
- Area searches are limited to 6 requests per minute per client IP; vessel
  details to 60 per minute.
- One process-wide gate serializes area-report cache misses. Identical
  simultaneous detail requests share an in-flight operation; different vessel
  IDs remain independent.
- Failed or canceled upstream operations are not cached.
- Local rate-limit rejection is `429`; upstream rate limiting maps separately
  to a service-unavailable response.
- Protection is process-local. Initial production should use one API replica
  until cache, rate, and concurrency coordination are redesigned.

The GFW token is server-only. Local development uses
`GlobalFishingWatch:AccessToken` in .NET user secrets. Forwarded client headers
are not trusted until a hosting platform and proxy policy are selected.

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
- API pagination remains deferred until response size, browser memory, or
  documented upstream support demonstrates a need.

## Nearby-search boundary

`Use my location` calls browser geolocation only after a direct user action.
The pure bounding-box helper rejects pole and international-date-line crossings.
The result populates coordinate inputs but never starts a search. Coordinates,
permission state, and errors are not written to storage, cookies, or logs;
manual bounds remain available after denial or failure.

## Verification baseline

The full repository checks passed on 2026-08-11 after nearby search was merged:
frontend lint and build, 22 nearby-search tests, 32 backend tests, .NET format
verification, and `git diff --check`. Backend tests use in-memory HTTP handlers
and do not call GFW. This documentation cleanup inspected current source and Git
state but did not rerun application tests or browser review.

## Documentation roles

- `AGENTS.md`: operating, architecture, and security rules.
- `docs/PROJECT_CONTEXT.md`: durable current capabilities and constraints.
- `docs/ACTIVE_PLAN.md`: only approved work currently in progress.
- `README.md`: public setup, API use, and data caveats.
