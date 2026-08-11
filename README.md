# Ocean Intelligence

Ocean Intelligence is a full-stack vessel research application built with ASP.NET Core, React, and TypeScript. It searches Global Fishing Watch data for vessels observed within a geographic area and date range, then provides a deeper identity and registry view for a selected vessel.

The application works with historical AIS observations. It does not provide live vessel positions, continuous tracking, or proof that a vessel remained inside an area for an entire reported period.

## Features

- Search a geographic bounding box and date range for observed vessel traffic.
- Search dates default to a dynamic seven-day historical window ending five days ago.
- Filter results by vessel name, MMSI, IMO, or callsign, plus flag and vessel type.
- Sort results by sampled AIS hours or vessel name, with a deterministic tie-breaker.
- Results reveal progressively: 50 matching vessels first, with a `Show 50 more` action.
- A replacement search keeps previous results visible until the new report succeeds.
- View vessel identity, classification, flag, and sampled AIS presence hours.
- Select a result to load additional AIS identity and public registry records.
- Switch the detail panel between UTC and local time for every timestamp.
- Review vessel and gear classifications with their source and effective years.
- Preserve useful area-search values when detailed records contain empty fields.
- Cache vessel details in browser state to avoid repeated requests during a session.
- Display Global Fishing Watch attribution and relevant maritime-data caveats.
- Optional `Use my location` button that populates an approximate 25 nautical mile rectangular search area from browser geolocation.
- Return consistent API errors using ASP.NET Core Problem Details.

## Current stack

- .NET 10 and ASP.NET Core controller-based Web API
- React 19, TypeScript, and Vite
- Native `fetch` and local React state
- xUnit
- Global Fishing Watch API v3

The project intentionally does not yet include authentication, a database, routing, Redux, Axios, a component library, or a map library.

## Repository structure

```text
ocean-intelligence/
|-- backend/
|   `-- OceanIntelligence.Api/
|       |-- Controllers/                 HTTP endpoints
|       |-- ErrorHandling/               External-service error mapping
|       |-- Models/                      Public API contracts
|       `-- Services/GlobalFishingWatch/ GFW client and upstream models
|-- frontend/
|   `-- src/
|       |-- api/                         Typed browser API clients
|       |-- components/                  Search, results, and detail UI
|       `-- types/                       Frontend API contracts
|-- tests/
|   `-- OceanIntelligence.Api.Tests/     Controller, client, mapping, and error tests
`-- OceanIntelligence.slnx
```

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- Node.js `20.19+` or `22.12+`
- npm
- A [Global Fishing Watch](https://globalfishingwatch.org/our-apis/documentation) account and API access token
- Git

Verify the required runtimes:

```powershell
dotnet --version
node --version
npm --version
```

## Local setup

Clone the repository:

```powershell
git clone https://github.com/Brazenbillygoat/ocean-intelligence.git
cd ocean-intelligence
```

Restore backend and frontend dependencies:

```powershell
dotnet restore OceanIntelligence.slnx
npm install --prefix frontend
```

Store the GFW access token with .NET user secrets. Do not place the token in `appsettings.json`, an environment file, source code, or a Git commit.

```powershell
$gfwToken = (Get-Clipboard).Trim()
dotnet user-secrets set "GlobalFishingWatch:AccessToken" $gfwToken --project backend/OceanIntelligence.Api
Remove-Variable gfwToken
```

The non-sensitive GFW base URL is configured in `backend/OceanIntelligence.Api/appsettings.json`.

## Run locally

Start the API from the repository root:

```powershell
dotnet run --project backend/OceanIntelligence.Api --launch-profile http
```

The API listens at `http://localhost:5131` by default. Its development launch profile does not open a browser.

In a second terminal, start the frontend:

```powershell
cd frontend
npm run dev
```

The Vite development server proxies relative `/api` requests to the local ASP.NET Core API.

## Nearby search

The search form includes an optional `Use my location` button. Activating it requests browser geolocation and populates the four coordinate fields with an approximate 25 nautical mile rectangular search area centered on the reported position.

The button does not submit the form or start a search. After location succeeds, review the populated bounds and date range, then use `Search vessels` as usual.

The populated region is an approximate rectangle, not a true circle. It uses a fixed 25 nautical mile radius and the existing bounding-box area-search API. The application does not provide live vessel location, and the populated coordinates describe a historical AIS search area, not a current position.

If browser location is unavailable, denied, times out, or returns coordinates too close to a pole or the international date line, the coordinate fields are left unchanged and manual bounds remain available. No location data is stored in browser storage, cookies, or logs.

## API endpoints

### Search vessel traffic

```http
GET /api/vessel-traffic
```

| Parameter | Meaning |
| --- | --- |
| `west` | Western longitude from -180 to 180 |
| `south` | Southern latitude from -90 to 90 |
| `east` | Eastern longitude from -180 to 180 |
| `north` | Northern latitude from -90 to 90 |
| `startDate` | Start date in `YYYY-MM-DD` format |
| `endDate` | End date in `YYYY-MM-DD` format |

The bounding box must have west less than east and south less than north. A report cannot span more than 366 days.

Example request from PowerShell:

```powershell
$uri = "http://localhost:5131/api/vessel-traffic?west=-71.20&south=42.20&east=-70.70&north=42.60&startDate=2026-06-01&endDate=2026-06-08"
$vesselTraffic = Invoke-RestMethod -Uri $uri
$vesselTraffic.vessels | Select-Object -First 10
```

The response contains the accepted query, result count, and vessels with identity, classification, observation boundaries, and sampled AIS presence hours.

The frontend fetches one complete report and then filters, sorts, and progressively reveals it locally. It shows 50 matching vessels first and adds 50 per `Show 50 more` action. No filtering, sorting, or `Show more` action makes an API request.

### Get vessel details

```http
GET /api/vessels/{vesselId}
```

This endpoint performs a lighter Global Fishing Watch identity lookup for one selected vessel. The response includes:

- AIS identity records and observation periods
- Public registry records and vessel specifications
- Combined vessel and gear classifications
- Dataset and provider information
- Attribution and data caveats

The detail panel shows timestamps in UTC by default, with a `Show local time` toggle that switches every presence, identity, and registry timestamp to the browser's local time zone.

The application deliberately does not request detailed tracks for every search result.

## Data limitations

Global Fishing Watch data and AIS transmissions require careful interpretation:

- Area-search results describe historical observed presence, not live location.
- Presence hours come from sampled AIS activity and do not prove continuous transmission.
- Entry and exit observations are not exact geographic border-crossing times.
- AIS identity values are self reported and may be incomplete, outdated, or incorrect.
- Multiple identities may describe the same physical vessel.
- Registry records can conflict or change over time.
- Identity and registry observation dates are not vessel positions.
- Vessel and gear classifications can change as source data and models are revised.

## Error responses

Known Global Fishing Watch failures are translated into consistent API responses:

| Condition | API status |
| --- | --- |
| GFW rate limit | `503 Service Unavailable` |
| GFW timeout | `504 Gateway Timeout` |
| Other GFW failure | `502 Bad Gateway` |

Errors use the standard ASP.NET Core `ProblemDetails` JSON shape.

## Verification

Run frontend checks:

```powershell
cd frontend
npm run test:nearby
npm run lint
npm run build
```

Run backend tests and formatting verification from the repository root:

```powershell
dotnet test OceanIntelligence.slnx
dotnet format OceanIntelligence.slnx --verify-no-changes --no-restore
```

Backend tests use in-memory HTTP handlers and do not call the live Global Fishing Watch API.

## Security

The Global Fishing Watch access token is required only by the backend and should be stored with .NET user secrets during local development. If a token is ever committed, revoke it immediately and remove it from Git history before publishing the repository.

## Data source and attribution

Vessel data is provided by [Global Fishing Watch](https://globalfishingwatch.org/). API use is subject to the [Global Fishing Watch API terms](https://globalfishingwatch.org/our-apis/documentation#terms-of-use), licensing requirements, rate limits, and data caveats.
