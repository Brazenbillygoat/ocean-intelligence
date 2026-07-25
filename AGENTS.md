# Ocean Intelligence agent instructions

These instructions apply to the entire repository.

## Start every task

1. Read this file and `docs/PROJECT_CONTEXT.md` in full before proposing architecture or making changes.
2. If `docs/ACTIVE_PLAN.md` exists, read it in full after the permanent context files. It is temporary planning state and does not override current code or tests.
3. Run `git status --short --branch` before editing.
4. Inspect the actual current files involved in the task.
5. Treat the code and tests as the source of truth when older notes disagree.
6. Explain the intended approach before taking action.

## Working with the developer

- Treat the user as the developer and technical decision-maker.
- Keep responses concise and technically direct unless more explanation is requested.
- When the user wants to type or paste changes, provide exact paths, commands, and complete file contents or precisely bounded replacements.
- Do not give ambiguous replacement instructions.
- Explain unfamiliar C#, ASP.NET Core, React, and TypeScript concepts at a mid-level developer level.
- Do not reflexively agree. Briefly identify incorrect assumptions, uncertainty, risks, and tradeoffs.
- Discussion and brainstorming do not authorize file or system changes.
- Create or edit files only after the user explicitly asks to implement or make the change.
- Do not commit, push, open a pull request, change repository visibility, or alter external services unless explicitly asked.
- Hard-wrap prose inside copyable fenced blocks at about 80 characters. Do not hard-wrap real code when doing so would damage readability or behavior.
- Never use em dashes.

## Change safety

- Preserve all existing and unrelated work in a dirty tree.
- Edit only files required for the requested task.
- Never discard or overwrite user changes.
- Ask before destructive actions or commands requiring approval.
- Do not add GitHub Actions unless the user explicitly requests them.
- Do not add large frameworks, services, or abstractions before the current product needs them.
- Never launch, open, or create a browser preview of the local application.
- Never run the local application in a browser. The user performs browser inspection.
- Respect `.gitattributes`: repository text uses LF, while `.bat` and `.cmd` use CRLF.

## Code and architecture conventions

- Keep the public Ocean Intelligence API contract separate from raw Global Fishing Watch response models.
- Controllers own request validation and public response mapping.
- The GFW client owns authenticated upstream HTTP calls and upstream deserialization.
- Keep native `fetch` and local React state until a demonstrated need justifies another client or state library.
- Do not add Next.js, routing, Redux, Axios, authentication, a database, a component library, or a map library without a feature that requires it and explicit approval.
- Do not automatically request detailed tracks for every vessel returned by an area search.
- Preserve useful area-search values when detailed identity or registry fields are empty.
- Keep GFW attribution and relevant data caveats visible wherever detailed vessel data is presented.
- Do not build machine learning, risk scoring, or large platform architecture prematurely.

## Comments and formatting

- Add comments when they explain framework behavior, architecture, upstream contracts, non-obvious decisions, or maritime-data caveats.
- Do not comment obvious syntax.
- Keep each code comment on one physical line and let the editor wrap it.
- Avoid excessive hyphens in comment prose.
- In C#, keep a method return type and method name on the same physical line.
- Preserve normal human formatting instead of mechanically compressing code.

## Security and data integrity

- Never print, log, paste into tracked files, or commit the Global Fishing Watch access token.
- Local development uses .NET user secrets for `GlobalFishingWatch:AccessToken`.
- Hosted environments must inject the token as a server-side secret.
- Never expose the token to browser code or return it from an API response.
- Do not treat AIS observations as verified identity or live location.
- Identity and registry observation dates are not vessel positions.
- Multiple identities may refer to one physical vessel, and registry records may conflict.
- GFW classifications may change as source data and models change.
- Do not add a reuse license unless the user explicitly changes the current decision. The repository is intended to be publicly viewable without granting general reuse permission.

## Verification

Run checks proportional to the change. The full verification set is:

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
cd ..
dotnet test OceanIntelligence.slnx
dotnet format OceanIntelligence.slnx --verify-no-changes --no-restore
git diff --check
```

- Do not start the local application merely to verify a non-runtime change.
- If Windows reports that `OceanIntelligence.Api.exe` is locked, report it and ask before stopping a process.
- Do not claim browser or visual verification unless the user performed it or explicitly authorized a supported browser workflow.

## Maintaining project context

- Update `docs/PROJECT_CONTEXT.md` in the same change whenever a material feature changes architecture, current capabilities, constraints, decisions, or next work.
- Keep the context file factual and concise. It is a current-state handoff, not a chronological diary.
- Clearly label planned work as planned. Never describe a proposal as implemented.
- Update its verification date only after inspecting the current repository.
- Never store tokens, private credentials, sensitive personal information, or machine-specific secret paths in repository context.
- Keep public onboarding material in `README.md`; keep Codex operating guidance here and engineering handoff detail in `docs/PROJECT_CONTEXT.md`.
