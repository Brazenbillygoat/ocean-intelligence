# Ocean Intelligence repository instructions

Read this file and `docs/PROJECT_CONTEXT.md` before proposing architecture or
making changes. Read `docs/ACTIVE_PLAN.md` only when its status is not
`NO ACTIVE PLAN`. Check the branch and working tree, inspect the relevant code
and tests, and treat current implementation as authoritative.

Explain the approach before acting. Do not edit, move, delete, install, stage,
commit, push, deploy, launch the application, open a browser preview, or change
external services without explicit permission. Preserve unrelated dirty work.

## Architecture

- Keep the public Ocean Intelligence API separate from raw Global Fishing Watch
  models. Controllers validate and map public responses; the GFW client owns
  authenticated upstream calls and deserialization.
- Preserve useful area-search values when detailed identity or registry fields
  are empty.
- Keep native `fetch`, local React state, and the current ASP.NET Core service
  boundaries until measured need justifies another library or service.
- Do not automatically fetch detailed tracks or details for every area result.
- Do not add Next.js, routing, Redux, Axios, authentication, a database, Redis,
  a component library, or a map library without an approved feature requiring
  it.

## Security and data integrity

- Never expose, log, paste, or commit the Global Fishing Watch access token.
  Local development uses .NET user secrets; hosted deployments inject a
  server-side secret.
- AIS observations are historical evidence, not verified identity, continuous
  tracking, or live location. Identity and registry observation dates are not
  vessel positions, and source records may conflict.
- Keep GFW attribution and relevant caveats visible with vessel data.
- Preserve cache, concurrency, rate-limit, validation, error-mapping, and
  cancellation behavior unless the approved task changes it.
- Do not add a reuse license unless the user explicitly changes the decision.

## Change quality

Use concise comments only for non-obvious framework behavior, upstream
contracts, architecture, or maritime caveats. Respect `.gitattributes`: normal
repository text is LF; `.bat` and `.cmd` are CRLF.

Do not launch the local application or browser for verification. Hyrum owns
browser and visual review. If `OceanIntelligence.Api.exe` locks build output,
report it and ask before stopping a process.

Run checks proportional to the change. The full set is:

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
npm.cmd run test:nearby
npm.cmd run test:vessel-search
cd ..
dotnet test OceanIntelligence.slnx
dotnet format OceanIntelligence.slnx --verify-no-changes --no-restore
git diff --check
```

Keep `docs/PROJECT_CONTEXT.md` as concise current engineering context. Keep
only approved work in progress in `docs/ACTIVE_PLAN.md`; completed plans do not
belong there. Public setup and API usage belong in `README.md`.
