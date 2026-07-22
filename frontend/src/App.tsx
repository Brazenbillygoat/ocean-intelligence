import { useEffect, useRef, useState } from "react";
import { getVesselDetails } from "./api/vesselDetailsApi";
import { getVesselTraffic } from "./api/vesselTrafficApi";
import { VesselDetailsPanel } from "./components/VesselDetailsPanel";
import { VesselTrafficResults } from "./components/VesselTrafficResults";
import { VesselTrafficSearchForm } from "./components/VesselTrafficSearchForm";
import type { VesselDetailsResponse } from "./types/vesselDetails";
import type {
  VesselTrafficQuery,
  VesselTrafficResponse,
  VesselTrafficVessel,
} from "./types/vesselTraffic";
import "./App.css";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function App() {
  const [results, setResults] = useState<VesselTrafficResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVessel, setSelectedVessel] =
    useState<VesselTrafficVessel | null>(null);
  const [detailsByVesselId, setDetailsByVesselId] = useState<
    Record<string, VesselDetailsResponse>
  >({});
  const [detailsLoadingVesselId, setDetailsLoadingVesselId] = useState<
    string | null
  >(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const detailsAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => detailsAbortController.current?.abort();
  }, []);

  async function handleSearch(query: VesselTrafficQuery) {
    detailsAbortController.current?.abort();
    detailsAbortController.current = null;
    setSelectedVessel(null);
    setDetailsLoadingVesselId(null);
    setDetailsError(null);
    setIsLoading(true);
    setError(null);

    try {
      const response = await getVesselTraffic(query);
      setResults(response);
    } catch (requestError) {
      // JavaScript allows any value to be thrown, so we check for Error before reading its message.
      const message =
        requestError instanceof Error
          ? requestError.message
          : "An unexpected error occurred.";

      setError(message);
      setResults(null);
    } finally {
      // finally runs after either success or failure, ensuring the form never remains permanently disabled.
      setIsLoading(false);
    }
  }

  async function handleVesselSelect(vessel: VesselTrafficVessel) {
    detailsAbortController.current?.abort();
    detailsAbortController.current = null;
    setSelectedVessel(vessel);
    setDetailsError(null);

    // The cache is keyed by GFW vessel ID so reopening a vessel does not repeat the identity request during this browser session.
    if (detailsByVesselId[vessel.vesselId]) {
      setDetailsLoadingVesselId(null);
      return;
    }

    const controller = new AbortController();
    detailsAbortController.current = controller;
    setDetailsLoadingVesselId(vessel.vesselId);

    try {
      const details = await getVesselDetails(vessel.vesselId, controller.signal);
      setDetailsByVesselId((current) => ({
        ...current,
        [vessel.vesselId]: details,
      }));
    } catch (requestError) {
      if (
        !isAbortError(requestError) &&
        detailsAbortController.current === controller
      ) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "An unexpected error occurred while loading vessel details.";

        setDetailsError(message);
      }
    } finally {
      // Only the active request may clear loading state because a user can select another vessel before an earlier request settles.
      if (detailsAbortController.current === controller) {
        detailsAbortController.current = null;
        setDetailsLoadingVesselId(null);
      }
    }
  }

  function handleCloseDetails() {
    detailsAbortController.current?.abort();
    detailsAbortController.current = null;
    setSelectedVessel(null);
    setDetailsLoadingVesselId(null);
    setDetailsError(null);
  }

  const selectedDetails = selectedVessel
    ? (detailsByVesselId[selectedVessel.vesselId] ?? null)
    : null;

  return (
    <main>
      <header>
        <h1>Ocean Intelligence</h1>
        <p>
          Search for AIS reporting vessels observed within an area and date
          range.
        </p>
      </header>

      <section aria-labelledby="search-heading">
        <h2 id="search-heading">Vessel traffic search</h2>

        <VesselTrafficSearchForm
          isLoading={isLoading}
          onSearch={handleSearch}
        />
      </section>

      {error && <p role="alert">{error}</p>}

      {results && (
        <div
          className={
            selectedVessel
              ? "results-layout results-layout--with-details"
              : "results-layout"
          }
        >
          <VesselTrafficResults
            results={results}
            selectedVesselId={selectedVessel?.vesselId ?? null}
            onSelectVessel={handleVesselSelect}
          />

          {selectedVessel && (
            <VesselDetailsPanel
              summary={selectedVessel}
              details={selectedDetails}
              isLoading={
                detailsLoadingVesselId === selectedVessel.vesselId
              }
              error={detailsError}
              onRetry={() => void handleVesselSelect(selectedVessel)}
              onClose={handleCloseDetails}
            />
          )}
        </div>
      )}
    </main>
  );
}

export default App;
