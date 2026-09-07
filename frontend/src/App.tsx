import { useEffect, useRef, useState } from "react";
import { getVesselDetails } from "./api/vesselDetailsApi";
import { getVesselTraffic } from "./api/vesselTrafficApi";
import { VesselDetailsPanel } from "./components/VesselDetailsPanel";
import { VesselTrafficResults } from "./components/VesselTrafficResults";
import { VesselTrafficSearchForm } from "./components/VesselTrafficSearchForm";
import { VesselSearchForm } from "./components/VesselSearchForm";
import { VesselSearchResults } from "./components/VesselSearchResults";
import { useVesselSearch } from "./hooks/useVesselSearch";
import type { VesselDetailsResponse } from "./types/vesselDetails";
import type { VesselAreaContext, VesselIdentitySummary, VesselSearchMatch } from "./types/vesselSearch";
import type { VesselTrafficQuery, VesselTrafficResponse, VesselTrafficVessel } from "./types/vesselTraffic";
import "./App.css";

type SearchMode = "area" | "vessel";
interface Selection {
  summary: VesselIdentitySummary;
  areaContext: VesselAreaContext | null;
}

function App() {
  const [mode, setMode] = useState<SearchMode>("area");
  const [results, setResults] = useState<VesselTrafficResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const areaRequest = useRef<AbortController | null>(null);
  const lookup = useVesselSearch();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [detailsByVesselId, setDetailsByVesselId] = useState(
    () => new Map<string, VesselDetailsResponse>(),
  );
  const [detailsLoadingVesselId, setDetailsLoadingVesselId] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const detailsRequest = useRef<AbortController | null>(null);
  const activatingVesselButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => () => {
    areaRequest.current?.abort();
    areaRequest.current = null;
    detailsRequest.current?.abort();
    detailsRequest.current = null;
  }, []);

  function clearDetails() {
    detailsRequest.current?.abort();
    detailsRequest.current = null;
    setSelection(null);
    setDetailsLoadingVesselId(null);
    setDetailsError(null);
    activatingVesselButtonRef.current = null;
  }

  function changeMode(next: SearchMode) {
    if (mode === next) return;
    areaRequest.current?.abort();
    areaRequest.current = null;
    setIsLoading(false);
    lookup.cancel();
    clearDetails();
    setMode(next);
  }

  async function handleSearch(query: VesselTrafficQuery) {
    const prior = results;
    areaRequest.current?.abort();
    const controller = new AbortController();
    areaRequest.current = controller;
    clearDetails();
    setIsLoading(true);
    setError(null);
    try {
      const response = await getVesselTraffic(query, controller.signal);
      if (areaRequest.current !== controller) return;
      setResults(response);
    } catch (failure) {
      if (areaRequest.current !== controller || controller.signal.aborted) return;
      const message = failure instanceof Error ? failure.message : "An unexpected error occurred.";
      setError(`Area search for ${query.startDate} to ${query.endDate} (${query.west}, ${query.south} to ${query.east}, ${query.north}) failed. ${message}${prior ? ` Previous results from ${prior.query.startDate} to ${prior.query.endDate} remain visible.` : ""}`);
    } finally {
      if (areaRequest.current === controller) {
        areaRequest.current = null;
        setIsLoading(false);
      }
    }
  }

  async function selectVessel(next: Selection, activatingButton?: HTMLButtonElement) {
    if (activatingButton) activatingVesselButtonRef.current = activatingButton;
    detailsRequest.current?.abort();
    detailsRequest.current = null;
    setSelection(next);
    setDetailsError(null);
    const vesselId = next.summary.vesselId;
    if (detailsByVesselId.has(vesselId)) {
      setDetailsLoadingVesselId(null);
      return;
    }
    const controller = new AbortController();
    detailsRequest.current = controller;
    setDetailsLoadingVesselId(vesselId);
    try {
      const details = await getVesselDetails(vesselId, controller.signal);
      if (detailsRequest.current !== controller) return;
      setDetailsByVesselId((current) => new Map(current).set(vesselId, details));
    } catch (failure) {
      if (detailsRequest.current !== controller || controller.signal.aborted) return;
      setDetailsError(failure instanceof Error ? failure.message : "An unexpected error occurred while loading vessel details.");
    } finally {
      if (detailsRequest.current === controller) {
        detailsRequest.current = null;
        setDetailsLoadingVesselId(null);
      }
    }
  }

  function selectAreaVessel(vessel: VesselTrafficVessel, button: HTMLButtonElement) {
    if (!results) return;
    void selectVessel({
      summary: vessel,
      areaContext: {
        query: results.query,
        presenceHours: vessel.presenceHours,
        enteredAt: vessel.enteredAt,
        exitedAt: vessel.exitedAt,
      },
    }, button);
  }

  function selectLookupMatch(match: VesselSearchMatch, button: HTMLButtonElement) {
    if (!match.vesselId) return;
    void selectVessel({
      summary: { ...match, vesselId: match.vesselId, vesselType: "", gearType: "" },
      areaContext: null,
    }, button);
  }

  function closeDetails() {
    const button = activatingVesselButtonRef.current;
    clearDetails();
    if (button && document.contains(button)) button.focus();
  }

  const panel = selection && (
    <VesselDetailsPanel
      summary={selection.summary}
      areaContext={selection.areaContext}
      details={detailsByVesselId.get(selection.summary.vesselId) ?? null}
      isLoading={detailsLoadingVesselId === selection.summary.vesselId}
      error={detailsError}
      onRetry={() => void selectVessel(selection)}
      onClose={closeDetails}
    />
  );
  const layout = selection ? "results-layout results-layout--with-details" : "results-layout";

  return (
    <main>
      <header>
        <h1>Ocean Intelligence</h1>
        <p>Research vessel identities or explore historical AIS presence within an area and date range.</p>
      </header>
      <div className="search-modes" role="group" aria-label="Search mode">
        <button type="button" className="secondary-button" aria-pressed={mode === "area"}
          onClick={() => changeMode("area")}>Search an area</button>
        <button type="button" className="secondary-button" aria-pressed={mode === "vessel"}
          onClick={() => changeMode("vessel")}>Find a vessel</button>
      </div>

      {/* Keep both mode trees mounted so native date inputs, filters and completed
          results survive switching. Hidden content cannot receive keyboard focus. */}
      <div className="search-mode" hidden={mode !== "area"}>
        <section aria-labelledby="search-heading">
          <h2 id="search-heading">Vessel traffic search</h2>
          <VesselTrafficSearchForm isLoading={isLoading} onSearch={handleSearch} />
        </section>
        {error && <p role="alert">{error}</p>}
        {isLoading && !results && <p className="search-status" role="status">Generating the area report. This may take a moment.</p>}
        {results && (
          <div className={layout}>
            <VesselTrafficResults results={results}
              selectedVesselId={selection?.summary.vesselId ?? null}
              onSelectVessel={selectAreaVessel} isUpdating={isLoading} />
            {mode === "area" && panel}
          </div>
        )}
      </div>

      <div className="search-mode" hidden={mode !== "vessel"}>
        <section aria-labelledby="lookup-heading">
          <h2 id="lookup-heading">Find a vessel</h2>
          <VesselSearchForm onSearch={(query) => {
            if (query.trim().length >= 3 && query.trim().length <= 100) clearDetails();
            void lookup.search(query);
          }} />
        </section>
        {lookup.error && <p role="alert">{lookup.error}</p>}
        {lookup.pending && <p className="search-status" role="status">
          {lookup.pending.append ? "Loading more matches" : "Searching"} for "{lookup.pending.query}".
          {lookup.results && !lookup.pending.append ? ` Previous results for "${lookup.results.query}" remain visible until success.` : ""}
        </p>}
        {lookup.results && (
          <div className={layout}>
            <VesselSearchResults results={lookup.results}
              selectedVesselId={selection?.summary.vesselId ?? null}
              isLoading={lookup.pending !== null}
              isReplacing={lookup.pending !== null && !lookup.pending.append}
              onLoadMore={() => void lookup.search(lookup.results!.query, true)}
              onSelect={selectLookupMatch} />
            {mode === "vessel" && panel}
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
