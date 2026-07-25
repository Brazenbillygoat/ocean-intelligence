# Ocean Intelligence project context

Last verified against the repository: 2026-07-25

This file is the durable engineering handoff for future development sessions.
Read it with `AGENTS.md` before proposing or implementing work. If
`docs/ACTIVE_PLAN.md` exists, read it next for active or retained implementation
planning. A plan does not describe verified current state. Current code and
tests take precedence if any document becomes stale.

## Product purpose

Ocean Intelligence is a full-stack vessel research application. It searches Global Fishing Watch data for vessels historically observed within a geographic area and date range, then provides a deeper identity and public-registry view for a selected vessel.

The application does not provide live vessel locations. Area-search results describe sampled historical AIS presence, not continuous tracking or proof that a vessel remained inside a region for an entire reported period.

The likely future primary action is "What's near me?" It would search for vessels observed near the user using a default radius and period. The existing geographic and date search should remain available as an advanced customizable search.

## Current status

Implemented:

- ASP.NET Core API integration with Global Fishing Watch v3.
- Geographic and date-based vessel-presence search.
- Vessel identity, registry, specification, and classification details.
- React search, loading, error, result, selection, retry, and responsive detail-panel interactions.
- An internal vessel research dossier with accessible collapsible sections, clearly separated GFW evidence, search context, and visibly unfinished research placeholders.
- Keyboard-accessible vessel result selection.
- Frontend session caching for fetched vessel details.
- Cancellation of stale frontend detail requests.
- Server-side `IMemoryCache` caching for area searches and vessel details.
- One-at-a-time 4Wings report coordination for the configured GFW token.
- Per-IP rate limiting with separate area-search and vessel-detail policies.
- Problem Details responses for known upstream failures.
- Tests for validation, mapping, client requests, caching, concurrency, rate limiting, error handling, and irregular registry JSON.
- Public README, strengthened dotenv ignore rules, and repository line-ending policy.

Not implemented:

- Authentication or per-user quotas.
- Public deployment configuration.
- Database or distributed cache.
- Live location, automatic tracks, maps, routing, or "What's near me?"
- Reviewed vessel imagery, external research enrichment, approved research notes, or sourced general-reference content.
- GitHub Actions.

## Repository and stack

Repository:

`https://github.com/Brazenbillygoat/ocean-intelligence`

Primary projects:

- Solution: `OceanIntelligence.slnx`
- API: `backend/OceanIntelligence.Api`
- Tests: `tests/OceanIntelligence.Api.Tests`
- Frontend: `frontend`

Current stack:

- .NET 10
- ASP.NET Core controller-based Web API
- `IHttpClientFactory`-managed `HttpClient`
- Options binding and startup validation
- ASP.NET Core exception handling and Problem Details
- ASP.NET Core in-memory caching and rate limiting
- xUnit
- React 19
- Vite 8
- TypeScript 6
- Native `fetch`
- Local React state

The frontend development server proxies `/api` to the local API at `http://localhost:5131`.

## Request flow

```text
Browser
  -> React frontend
  -> Ocean Intelligence ASP.NET Core API
  -> Global Fishing Watch API using the server-side token
```

The GFW token belongs only on the backend. A repository clone does not receive the developer's .NET user-secrets store. A hosted public application would use the host's token for visitor requests, so caching and abuse controls are required before public use.

## Public API contracts

### Area search

```http
GET /api/vessel-traffic
```

Query parameters:

- `west`
- `south`
- `east`
- `north`
- `startDate`
- `endDate`

Validation:

- Longitudes must be between -180 and 180.
- Latitudes must be between -90 and 90.
- All coordinates must be finite numbers.
- West must be less than east.
- South must be less than north.
- Start date must precede end date.
- A report cannot span more than 366 days.

Upstream strategy:

- One aggregated `POST /v3/4wings/report` request.
- Dataset: `public-global-presence:latest`.
- Temporal resolution: `ENTIRE`.
- Grouping: `VESSEL_ID`.
- The bounding box is sent as a GeoJSON polygon.

Public response:

- Echoed accepted query.
- Result count.
- Vessel identity summary.
- Classification summary.
- Entry and exit observation boundaries.
- Sampled AIS presence hours.

### Vessel details

```http
GET /api/vessels/{vesselId}
```

The controller accepts non-empty GFW identifiers up to 100 characters and deliberately does not require a UUID format.

Upstream strategy:

```http
GET /v3/vessels/{vesselId}?dataset=public-global-vessel-identity:latest&registries-info-data=ALL
```

Public response:

- `vesselId`
- `dataset`
- `dataProvider`
- `attribution`
- `registryRecordCount`
- `aisIdentities`
- `registryRecords`
- `combinedVesselTypes`
- `combinedGearTypes`
- `caveats`

Identity records are ordered newest first. Registry records preserve source, observation dates, and whether GFW marked a record as latest. Combined classifications retain their evidence source and effective years.

## API call policy

Maintain this request pattern:

1. Area search makes one aggregated 4Wings report call.
2. Selecting a vessel makes one lighter Vessel API identity lookup.
3. A future explicit "View activity" action may make a heavier spatial report call.
4. Repeated vessel details should be cached.
5. Never request detailed tracks for every vessel in a result set.

## Frontend behavior

`frontend/src/App.tsx` owns:

- Area-search results, loading, and errors.
- Selected vessel summary.
- Vessel-detail loading and errors.
- An `AbortController` for the active detail request.
- A vessel-ID-keyed in-memory details cache.

Selecting another vessel aborts the previous detail request. Reopening a cached vessel does not repeat the API call during that browser session. Starting a new area search closes the detail panel but retains the session cache.

`VesselDetailsPanel.tsx` merges the area-search summary with the detail response. Non-empty search values remain authoritative when a detailed record is empty. The panel presents historical presence context, identities, registry specifications, classifications, attribution, and caveats.

The panel is organized as a research dossier using native, initially open `details` sections. All ten sections remain visible while GFW details load or fail, with pending, failed, successfully empty, and populated states kept distinct. GFW vessel evidence, general-reference scaffolding, and pending vessel-specific research are visibly labeled. Frontend-only placeholder configuration is kept separate from the stable API types and contains no invented facts, URLs, or approved content. The regional section displays the completed search bounds and date range as historical report context, not a current vessel location.

There is no frontend route for vessel details yet. The responsive panel is intentional.

## Backend boundaries

- `Controllers/` validate public requests and map upstream models into stable application-owned response models.
- `Models/` contains public API contracts.
- `Services/GlobalFishingWatch/Models/` contains raw upstream JSON contracts.
- `GlobalFishingWatchClient` configures bearer authentication and performs upstream HTTP calls.
- `GlobalFishingWatchDataService` owns cache behavior and coordinates protected access to the raw client.
- `GlobalFishingWatchRequestCoordinator` owns the singleton report gate and vessel-detail single-flight work.
- `GlobalFishingWatchExceptionHandler` maps known GFW failures to safe Problem Details responses.

Current upstream error mapping:

- GFW `429` becomes API `503 Service Unavailable`.
- GFW request or gateway timeout becomes API `504 Gateway Timeout`.
- Other non-success GFW responses become API `502 Bad Gateway`.

Local rate-limit rejection is separate from upstream error handling. It returns API `429 Too Many Requests` with Problem Details and `Retry-After` when the fixed-window limiter supplies it.

Do not leak raw upstream response bodies or token information in public errors.

## Backend protection

`ApiProtection` settings are bound and validated during startup.

Current defaults:

- Area-search cache expiration: 30 minutes.
- Vessel-detail cache expiration: 24 hours.
- Area-search rate limit: 6 requests per minute per client IP.
- Vessel-detail rate limit: 60 requests per minute per client IP.
- Rate-limit queue length: zero.

Both caches use absolute expiration and store only successfully deserialized upstream responses. Area cache keys contain canonical invariant coordinates and ISO dates. Vessel-detail cache keys preserve the exact case-sensitive GFW identifier. Signed coordinate zero is canonicalized so equivalent accepted queries share an entry.

An area cache miss waits on one singleton `SemaphoreSlim` report gate. The cache is rechecked after entering the gate, and the upstream report uses the caller's cancellation token. The gate is released in `finally`.

Vessel-detail requests never acquire the report gate. Identical simultaneous detail requests share one in-flight operation, while different vessel IDs remain independent. Failed or canceled operations are removed and are not cached.

The cache, report gate, in-flight request tracking, and rate-limit counters are process-local. Production must initially run one API replica unless these protections are replaced with distributed coordination. Rate limits use the connection's remote IP and do not trust forwarded headers until a hosting platform and trusted-proxy configuration are selected.

## Important upstream compatibility behavior

Official GFW documentation describes `registryInfo.extraFields` as an object. Live responses may instead return an empty JSON array when no extra fields exist.

`GfwRegistryExtraFieldsJsonConverter` therefore:

- Deserializes the documented object.
- Treats an empty array as no extra fields.
- Rejects a populated array so a genuine schema change is not silently discarded.

Regression tests cover all three cases. Preserve this strict fallback behavior.

## Maritime data rules

- AIS identity values are self reported and may be incomplete, outdated, or incorrect.
- Identity and registry observation dates are not vessel positions.
- Multiple identities may describe the same physical vessel.
- Registry records may conflict or change.
- Presence hours are based on sampled AIS observations.
- Entry and exit values are observation boundaries, not exact border crossings.
- GFW vessel and gear classifications can change with source data and model revisions.
- GFW attribution and relevant caveats must remain visible in the detailed UI.

## Security and repository decisions

- Local GFW credentials use `.NET user-secrets`.
- `GlobalFishingWatch:AccessToken` must never enter source control, logs, frontend code, or API responses.
- `.env` and `.env.*` are ignored, while `.env.example` may be committed.
- Repository text uses LF; Windows batch scripts use CRLF.
- The source may be publicly viewable, but the user does not currently want to grant general reuse permission. No license should be added without an explicit decision change.
- The public README is for users and contributors. This file is the internal engineering handoff, but it is still committed publicly and must never contain secrets.

## Product and architecture guardrails

- Keep the advanced area/date search customizable.
- Prefer a detail panel or responsive widget over routing until navigation requirements justify routes.
- Continue using native `fetch` and local state while the application remains small.
- Do not add Redux, Axios, Next.js, authentication, a database, a component library, or a map library preemptively.
- Do not build machine learning or risk scoring before the product has validated data and user needs.
- Do not turn the project into a large platform architecture to solve hypothetical scale.

## Public-use readiness

The repository may be public, but the application should not be offered as an unrestricted public service yet. A hosted backend would use the owner's GFW token for every visitor.

The local protection foundation is implemented. Before public deployment:

1. Choose a hosting architecture and initially enforce one API replica.
2. Configure production CORS or serve the frontend and API from one origin.
3. Inject the GFW token through the hosting platform's secret configuration.
4. Configure trusted forwarded headers before relying on proxy-provided client IPs.
5. Add usage monitoring, memory monitoring, budget alerts, and conservative hosting limits.
6. Revisit bounded cache sizing using measured response and memory behavior.
7. Deploy privately or as a limited preview before unrestricted public access.

GFW currently documents only one concurrent 4Wings report per token. Reverify provider limits and non-commercial-use terms before deployment because external policies can change.

Initial hosting options discussed, but not selected:

- GitHub Pages for the static frontend plus Azure Container Apps for the API.
- GitHub Pages for the static frontend plus Render for a low-traffic demonstration.
- Railway for simpler paid full-stack hosting.

Use `IMemoryCache` for the first single-instance deployment. Redis is premature until multiple API instances need a shared cache, shared rate counters, or distributed coordination.

## Recommended next slice

The next product slice is the first "What's near me?" experience:

1. Request browser geolocation only after an explicit user action.
2. Choose a sensible default radius and historical date range.
3. Convert the location and radius into the existing area-search contract.
4. Keep the current geographic and date controls available as advanced search.
5. Preserve all historical-AIS caveats and avoid live-location claims.

Do not add a map or automatic vessel tracks as part of the first slice.

## Verification

Full repository verification:

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
cd ..
dotnet test OceanIntelligence.slnx
dotnet format OceanIntelligence.slnx --verify-no-changes --no-restore
git diff --check
```

The full verification set passed on 2026-07-25 after the dossier implementation and formatting remediation. The backend suite contains 32 passing tests.

Do not open the frontend or launch a browser during verification. The user performs visual inspection.

## Key files

- `backend/OceanIntelligence.Api/Program.cs`
- `backend/OceanIntelligence.Api/Controllers/VesselTrafficController.cs`
- `backend/OceanIntelligence.Api/Controllers/VesselsController.cs`
- `backend/OceanIntelligence.Api/Protection/ApiProtectionOptions.cs`
- `backend/OceanIntelligence.Api/Protection/RateLimitPolicyNames.cs`
- `backend/OceanIntelligence.Api/Services/GlobalFishingWatch/GlobalFishingWatchClient.cs`
- `backend/OceanIntelligence.Api/Services/GlobalFishingWatch/GlobalFishingWatchDataService.cs`
- `backend/OceanIntelligence.Api/Services/GlobalFishingWatch/GlobalFishingWatchRequestCoordinator.cs`
- `backend/OceanIntelligence.Api/ErrorHandling/GlobalFishingWatchExceptionHandler.cs`
- `backend/OceanIntelligence.Api/Models/VesselTrafficResponse.cs`
- `backend/OceanIntelligence.Api/Models/VesselDetailsResponse.cs`
- `backend/OceanIntelligence.Api/Services/GlobalFishingWatch/Models/GfwRegistryExtraFieldsJsonConverter.cs`
- `frontend/src/App.tsx`
- `frontend/src/components/VesselTrafficResults.tsx`
- `frontend/src/components/VesselDetailsPanel.tsx`
- `frontend/src/components/vessel-details/VesselResearchDossier.tsx`
- `frontend/src/data/vesselResearchPlaceholders.ts`
- `frontend/src/types/vesselResearch.ts`
- `frontend/src/api/vesselTrafficApi.ts`
- `frontend/src/api/vesselDetailsApi.ts`
- `tests/OceanIntelligence.Api.Tests`
