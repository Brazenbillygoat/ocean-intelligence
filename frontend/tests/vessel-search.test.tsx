import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import type { VesselDetailsResponse } from "../src/types/vesselDetails";
import type { VesselSearchMatch, VesselSearchResponse } from "../src/types/vesselSearch";
import type { VesselTrafficResponse } from "../src/types/vesselTraffic";

interface Request {
  url: URL;
  signal: AbortSignal;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
}
let requests: Request[];
beforeEach(() => {
  requests = [];
  // Deliberately let canceled requests settle: state guards must work even if
  // a response arrives after abort, or a transport does not honor cancellation.
  vi.stubGlobal("fetch", vi.fn((input: string, options: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      requests.push({ url: new URL(input, "https://example.test"), signal: options.signal!, resolve, reject });
    })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function match(id: string | null, name = id ?? "Missing", key = id ?? "missing"): VesselSearchMatch {
  return {
    matchKey: key, vesselId: id, recordSource: "AIS identity", name,
    mmsi: "123456789", imo: "", callsign: "CALL", flag: "USA",
    observedFrom: "2020-01-01T00:00:00Z", observedThrough: null,
    matchFields: null, matchingEvidence: [],
  };
}
function page(query: string, matches = [match("alpha", "Alpha")], nextCursor: string | null = null): VesselSearchResponse {
  return {
    query, matches, nextCursor, dataProvider: "Global Fishing Watch",
    dataset: "public-global-vessel-identity:latest",
    attribution: "Vessel data provided by Global Fishing Watch.",
    caveats: ["Observation dates are not vessel positions."],
  };
}
function details(id: string): VesselDetailsResponse {
  return {
    vesselId: id, dataset: "identity:v4", dataProvider: "Global Fishing Watch",
    attribution: "Vessel data provided by Global Fishing Watch.", registryRecordCount: 0,
    aisIdentities: [], registryRecords: [], combinedVesselTypes: [], combinedGearTypes: [],
    caveats: ["Identity may be incorrect."],
  };
}
const area: VesselTrafficResponse = {
  query: { west: -71, south: 42, east: -70, north: 43, startDate: "2026-06-01", endDate: "2026-06-08" },
  count: 1,
  vessels: [{
    vesselId: "alpha", name: "Alpha", mmsi: "123456789", imo: "", callsign: "CALL",
    flag: "USA", vesselType: "Cargo", gearType: "", presenceHours: 12,
    enteredAt: "2026-06-01T12:00:00Z", exitedAt: "2026-06-02T12:00:00Z",
  }],
};
async function reply(index: number, body: unknown, status = 200) {
  await act(async () => {
    requests[index].resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  });
}
async function fail(index: number, error = new Error("Network unavailable")) {
  await act(async () => { requests[index].reject(error); });
}
function queryInput() { return screen.getByRole("textbox", { name: "Name, MMSI, IMO, or callsign" }); }
async function submit(user: ReturnType<typeof userEvent.setup>, query: string) {
  await user.clear(queryInput());
  await user.type(queryInput(), query);
  await user.click(screen.getByRole("button", { name: "Search" }));
}
async function lookupApp() {
  const user = userEvent.setup();
  render(<StrictMode><App /></StrictMode>);
  await user.click(screen.getByRole("button", { name: "Find a vessel" }));
  return user;
}
function panel() { return screen.getByRole("region", { name: "Alpha" }); }

describe("direct vessel lookup", () => {
  it("makes no automatic requests and validates trimmed length before encoding a valid query", async () => {
    const user = await lookupApp();
    expect(requests).toHaveLength(0);
    await submit(user, " ab ");
    expect(requests).toHaveLength(0);
    expect(screen.getByRole("alert").textContent).toContain("3-100");
    await submit(user, "a".repeat(101));
    expect(requests).toHaveLength(0);
    await submit(user, "  BOAT &?/#  ");
    expect(requests).toHaveLength(1);
    expect(requests[0].url.pathname).toBe("/api/vessels/search");
    expect(requests[0].url.searchParams.get("query")).toBe("BOAT &?/#");
    expect(requests[0].url.searchParams.has("cursor")).toBe(false);
    await reply(0, page("BOAT &?/#", []));
    expect(screen.getByRole("status").textContent).toContain("No matching identity");
  });

  it("requires selecting even one match, loads details by ID, and restores keyboard focus on Close", async () => {
    const user = await lookupApp();
    await submit(user, "Alpha");
    await reply(0, page("Alpha"));
    expect(requests).toHaveLength(1);
    const button = screen.getByRole("button", { name: "View details for Alpha" });
    button.focus();
    await user.keyboard("{Enter}");
    expect(requests[1].url.pathname).toBe("/api/vessels/alpha");
    expect(document.activeElement).toBe(within(panel()).getByRole("heading", { name: "Alpha" }));
    await reply(1, details("alpha"));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(document.activeElement).toBe(button);
    await user.click(button);
    expect(requests).toHaveLength(2);
  });

  it("retains previous results during a failed replacement and identifies the failed query", async () => {
    const user = await lookupApp();
    await submit(user, "Alpha");
    await reply(0, page("Alpha"));
    await submit(user, "Bravo");
    expect(screen.getByRole("heading", { name: 'Matches for "Alpha"' })).toBeDefined();
    expect((screen.getByRole("button", { name: "View details for Alpha" }) as HTMLButtonElement).disabled).toBe(true);
    await reply(1, { detail: "Provider unavailable" }, 503);
    expect(screen.getByRole("alert").textContent).toContain('Search for "Bravo" failed');
    expect(screen.getByRole("alert").textContent).toContain('Previous results for "Alpha"');
    await user.click(screen.getByRole("button", { name: "Search" }));
    await reply(2, page("Bravo", [match("bravo", "Bravo")]));
    expect(screen.queryByRole("heading", { name: 'Matches for "Alpha"' })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each(["success", "failure"])("ignores a stale replacement %s", async (outcome) => {
    const user = await lookupApp();
    await submit(user, "Older");
    await submit(user, "Newer");
    expect(requests[0].signal.aborted).toBe(true);
    await reply(1, page("Newer", [match("newer", "Newer")]));
    if (outcome === "success") await reply(0, page("Older"));
    else await fail(0);
    expect(screen.getByRole("heading", { name: 'Matches for "Newer"' })).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("cancels on mode change and ignores late responses without fetching on return", async () => {
    const user = await lookupApp();
    await submit(user, "Alpha");
    await user.click(screen.getByRole("button", { name: "Search an area" }));
    expect(requests[0].signal.aborted).toBe(true);
    await reply(0, page("Alpha"));
    await user.click(screen.getByRole("button", { name: "Find a vessel" }));
    expect(requests).toHaveLength(1);
    expect((queryInput() as HTMLInputElement).value).toBe("Alpha");
    expect(screen.queryByRole("heading", { name: 'Matches for "Alpha"' })).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("paginates only on Load more, retains order, and deduplicates identity keys without merging shared MMSIs", async () => {
    const user = await lookupApp();
    await submit(user, "Alpha");
    await reply(0, page("Alpha", [match("a", "First"), match("b", "Second")], "opaque+/="));
    expect(requests).toHaveLength(1);
    await user.clear(queryInput());
    await user.type(queryInput(), "Unsubmitted");
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(requests[1].url.searchParams.get("query")).toBe("Alpha");
    expect(requests[1].url.searchParams.get("cursor")).toBe("opaque+/=");
    await reply(1, page("Alpha", [match("b", "Second"), match("c", "Third")]));
    expect(screen.getAllByRole("button", { name: /View details for/ }).map(button => button.textContent))
      .toEqual(["View details for First", "View details for Second", "View details for Third"]);
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("keeps loaded matches and the same continuation after pagination failure", async () => {
    const user = await lookupApp();
    await submit(user, "Alpha");
    await reply(0, page("Alpha", [match("alpha", "Alpha")], "page2"));
    await user.click(screen.getByRole("button", { name: "Load more" }));
    await fail(1);
    expect(screen.getByRole("alert").textContent).toContain('Could not load more matches for "Alpha"');
    expect(screen.getByRole("button", { name: "View details for Alpha" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(requests[2].url.searchParams.get("cursor")).toBe("page2");
    await reply(2, page("Alpha", [match("alpha", "Alpha")], "page3"));
    expect(screen.getAllByRole("button", { name: /View details for/ })).toHaveLength(1);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Load more" })).toBeDefined();
  });

  it("ignores an old pagination response after a new search succeeds", async () => {
    const user = await lookupApp();
    await submit(user, "Alpha");
    await reply(0, page("Alpha", [match("alpha", "Alpha")], "page2"));
    await user.click(screen.getByRole("button", { name: "Load more" }));
    await submit(user, "Bravo");
    expect(requests[1].signal.aborted).toBe(true);
    await reply(2, page("Bravo", [match("bravo", "Bravo")]));
    await reply(1, page("Alpha", [match("old", "Old")]));
    expect(screen.getAllByRole("button", { name: /View details for/ }).map(button => button.textContent))
      .toEqual(["View details for Bravo"]);
  });

  it("shows missing detail IDs as unavailable and retains explicit group matching evidence", async () => {
    const user = await lookupApp();
    const missing = match(null);
    missing.matchingEvidence = [{
      source: "registryInfo", reference: "registry-reference", field: "registryInfo.imo",
      value: "9876543", observedFrom: null, observedThrough: null, isLatestRecord: false,
    }];
    await submit(user, "Missing");
    await reply(0, page("Missing", [missing]));
    const button = screen.getByRole("button", { name: "Details unavailable" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await user.click(button);
    expect(requests).toHaveLength(1);
    expect(screen.getByText(/registryInfo.imo: 9876543/)).toBeDefined();
    expect(screen.getByText(/record: registry-reference/)).toBeDefined();
  });

  it("retries detail failures, ignores old detail responses, and closes the panel when modes change", async () => {
    const user = await lookupApp();
    await submit(user, "Alpha");
    await reply(0, page("Alpha", [match("alpha", "Alpha"), match("bravo", "Bravo")]));
    await user.click(screen.getByRole("button", { name: "View details for Alpha" }));
    await fail(1);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await user.click(screen.getByRole("button", { name: "View details for Bravo" }));
    expect(requests[2].signal.aborted).toBe(true);
    await fail(2);
    await reply(3, details("bravo"));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("region", { name: "Bravo" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Search an area" }));
    await user.click(screen.getByRole("button", { name: "Find a vessel" }));
    expect(screen.queryByRole("region", { name: "Bravo" })).toBeNull();
    expect(requests).toHaveLength(4);
  });
});

describe("area and dossier integration", () => {
  it("retains both modes' inputs, area filters, and completed results and shares the detail cache", async () => {
    const user = userEvent.setup();
    render(<App />);
    fireEvent.change(screen.getByLabelText("West longitude"), { target: { value: "-72" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-06-01" } });
    await user.click(screen.getByRole("button", { name: "Search vessels" }));
    await reply(0, area);
    await user.type(screen.getByRole("textbox", { name: "Search by name, MMSI, IMO, or callsign" }), "Alpha");
    await user.click(screen.getByRole("button", { name: /Alpha.*123456789/ }));
    await reply(1, details("alpha"));
    expect(panel().textContent).toContain("12 sampled AIS hours");
    expect(panel().textContent).toContain("First observed in searched area");
    await user.click(screen.getByRole("button", { name: "Find a vessel" }));
    await submit(user, "Alpha");
    await reply(2, page("Alpha"));
    await user.click(screen.getByRole("button", { name: "View details for Alpha" }));
    expect(requests).toHaveLength(3);
    expect(panel().textContent).toContain("no area report is attached");
    expect(panel().textContent).not.toContain("sampled AIS hours");
    expect(panel().textContent).not.toContain("First observed in searched area");
    expect(panel().textContent).not.toContain("Completed search context");
    expect(panel().textContent).toContain("Identity History");
    expect(panel().textContent).toContain("Registry Records");
    expect(panel().textContent).toContain("Sources and Caveats");
    await user.click(screen.getByRole("button", { name: "Show local time" }));
    expect(screen.getByRole("button", { name: "Show UTC" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Search an area" }));
    expect((screen.getByLabelText("West longitude") as HTMLInputElement).value).toBe("-72");
    expect((screen.getByLabelText("Start date") as HTMLInputElement).value).toBe("2026-06-01");
    expect((screen.getByRole("textbox", { name: "Search by name, MMSI, IMO, or callsign" }) as HTMLInputElement).value).toBe("Alpha");
    expect(screen.getByRole("button", { name: /Alpha.*123456789/ })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Find a vessel" }));
    expect((queryInput() as HTMLInputElement).value).toBe("Alpha");
    expect(screen.getByRole("heading", { name: 'Matches for "Alpha"' })).toBeDefined();
    expect(requests).toHaveLength(3);
  });

  it("cancels area requests on mode switching and leaves the retained report unchanged", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Search vessels" }));
    await reply(0, area);
    await user.click(screen.getByRole("button", { name: "Search vessels" }));
    await user.click(screen.getByRole("button", { name: "Find a vessel" }));
    expect(requests[1].signal.aborted).toBe(true);
    await reply(1, { ...area, count: 0, vessels: [] });
    await user.click(screen.getByRole("button", { name: "Search an area" }));
    expect(screen.getByRole("button", { name: /Alpha.*123456789/ })).toBeDefined();
    expect((screen.getByRole("button", { name: "Search vessels" }) as HTMLButtonElement).disabled).toBe(false);
    expect(requests).toHaveLength(2);
  });

  it("retains area results after a failed replacement", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Search vessels" }));
    await reply(0, area);
    await user.click(screen.getByRole("button", { name: "Search vessels" }));
    await fail(1);
    expect(screen.getByRole("alert").textContent).toContain("Previous results from 2026-06-01 to 2026-06-08 remain visible");
    expect(screen.getByRole("button", { name: /Alpha.*123456789/ })).toBeDefined();
  });

  it("uses the selected identity's detail values instead of another record in the group", async () => {
    const user = await lookupApp();
    await submit(user, "Alpha");
    await reply(0, page("Alpha", [{ ...match("alpha", "Alpha"), flag: "" }]));
    await user.click(screen.getByRole("button", { name: "View details for Alpha" }));
    const identity = {
      vesselId: "alpha", name: "Alpha", mmsi: "123456789", imo: "", callsign: "", flag: "USA",
      vesselType: "Cargo", gearType: "", messagesCount: 0, positionsCount: 0,
      sourceCodes: [], shipTypeHistory: [], identityObservedFrom: null, identityObservedThrough: null,
    };
    await reply(1, { ...details("alpha"), aisIdentities: [
      { ...identity, vesselId: "other", flag: "CAN" }, identity,
    ] });
    const overview = panel().querySelector(".detail-grid--summary")!;
    expect(overview.textContent).toContain("USA");
    expect(overview.textContent).not.toContain("CAN");
  });
});
