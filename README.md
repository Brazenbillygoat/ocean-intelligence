# Ocean Intelligence

Ocean Intelligence is an ASP.NET Core API for querying vessel presence data from Global Fishing Watch. The current endpoint accepts a geographic bounding box and date range, requests AIS vessel-presence data, and returns a simplified response owned by this application.

The repository currently contains the backend API and its automated tests. A frontend and database have not been added yet.

## Current stack

- .NET 10
- ASP.NET Core controller-based Web API
- xUnit
- Global Fishing Watch API v3

## Repository structure

```text
ocean-intelligence/
├── backend/
│   └── OceanIntelligence.Api/
│       ├── Controllers/                 HTTP endpoints
│       ├── ErrorHandling/               Centralized external-service errors
│       ├── Models/                      Public request and response models
│       └── Services/GlobalFishingWatch/ GFW client and upstream models
├── tests/
│   └── OceanIntelligence.Api.Tests/     Controller, mapping, and error tests
└── OceanIntelligence.slnx
```

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- A [Global Fishing Watch](https://globalfishingwatch.org/our-apis/documentation) account and API access token
- Git

Verify the SDK:

```powershell
dotnet --version
```

## Local setup

Clone the repository and enter it:

```powershell
git clone https://github.com/Brazenbillygoat/ocean-intelligence.git
cd ocean-intelligence
```

Restore dependencies:

```powershell
dotnet restore OceanIntelligence.slnx
```

Initialize user secrets for the API project if needed:

```powershell
dotnet user-secrets init --project backend/OceanIntelligence.Api
```

Copy a valid GFW token, then store it without placing it in source control:

```powershell
$gfwToken = (Get-Clipboard).Trim()
dotnet user-secrets set "GlobalFishingWatch:AccessToken" $gfwToken --project backend/OceanIntelligence.Api
Remove-Variable gfwToken
```

The non-sensitive GFW base URL is configured in `backend/OceanIntelligence.Api/appsettings.json`.

## Build and run

Build the full solution:

```powershell
dotnet build OceanIntelligence.slnx
```

Run the API with its HTTP development profile:

```powershell
dotnet run --project backend/OceanIntelligence.Api --launch-profile http
```

The API listens at `http://localhost:5131` by default. The launch profile does not open a browser.

## Vessel traffic endpoint

```http
GET /api/vessel-traffic
```

Query parameters:

| Parameter | Meaning |
| --- | --- |
| `west` | Western longitude from -180 to 180 |
| `south` | Southern latitude from -90 to 90 |
| `east` | Eastern longitude from -180 to 180 |
| `north` | Northern latitude from -90 to 90 |
| `startDate` | Start of the search in `YYYY-MM-DD` format |
| `endDate` | End of the search in `YYYY-MM-DD` format |

The bounding box must have west less than east and south less than north. GFW limits a report to 366 days.

Example request from PowerShell:

```powershell
$uri = "http://localhost:5131/api/vessel-traffic?west=-71.20&south=42.20&east=-70.70&north=42.60&startDate=2026-06-01&endDate=2026-06-08"
$vesselTraffic = Invoke-RestMethod -Uri $uri
```

Inspect the result:

```powershell
$vesselTraffic.count
$vesselTraffic.query
$vesselTraffic.vessels | Select-Object -First 10
```

The response contains:

- The original query
- The number of matching vessels
- A vessel list with identity, classification, entry and exit observations, and AIS presence hours

AIS data has coverage and reporting limitations. Entry and exit values are based on sampled AIS observations, not exact border-crossing times.

## Error responses

Known GFW failures are translated into consistent API responses:

| Condition | API status |
| --- | --- |
| GFW rate limit | `503 Service Unavailable` |
| GFW timeout | `504 Gateway Timeout` |
| Other GFW failure | `502 Bad Gateway` |

Errors use the standard ASP.NET Core `ProblemDetails` JSON shape.

## Tests

Run all tests:

```powershell
dotnet test OceanIntelligence.slnx
```

The current suite covers:

- Coordinate and date validation
- GFW JSON deserialization
- Translation from GFW models into public API models
- Response-envelope construction
- External-service error mapping

Tests use an in-memory HTTP handler and do not call the live GFW API.

## Data source and attribution

Vessel data is provided by [Global Fishing Watch](https://globalfishingwatch.org/). API use is subject to the [Global Fishing Watch API terms](https://globalfishingwatch.org/our-apis/documentation#terms-of-use), licensing requirements, rate limits, and data caveats.
