import { useMemo, useState } from "react";
import type {
  VesselTrafficResponse,
  VesselTrafficVessel,
} from "../types/vesselTraffic";

type SortMode = "hours-desc" | "name-asc";

const DEFAULT_VISIBLE_COUNT = 50;
const VISIBLE_INCREMENT = 50;

interface VesselTrafficResultsProps {
  results: VesselTrafficResponse;
  selectedVesselId: string | null;
  onSelectVessel: (
    vessel: VesselTrafficVessel,
    button: HTMLButtonElement,
  ) => void;
  isUpdating: boolean;
}

interface FilterOptions {
  flags: string[];
  vesselTypes: string[];
}

// Derive flag and vessel-type options from the complete response. Values are
// trimmed, deduplicated, and alphabetized without mutating the response array.
// Empty upstream values stay visible on cards but get no dropdown option.
function getFilterOptions(vessels: VesselTrafficVessel[]): FilterOptions {
  const flags = new Set<string>();
  const vesselTypes = new Set<string>();

  for (const vessel of vessels) {
    const flag = vessel.flag.trim();

    if (flag) {
      flags.add(flag);
    }

    const vesselType = vessel.vesselType.trim();

    if (vesselType) {
      vesselTypes.add(vesselType);
    }
  }

  return {
    flags: [...flags].sort((a, b) => a.localeCompare(b)),
    vesselTypes: [...vesselTypes].sort((a, b) => a.localeCompare(b)),
  };
}

function getFilteredSortedVessels(
  vessels: VesselTrafficVessel[],
  searchText: string,
  flagFilter: string,
  vesselTypeFilter: string,
  sortMode: SortMode,
): VesselTrafficVessel[] {
  const text = searchText.trim().toLowerCase();

  const filtered = vessels.filter((vessel) => {
    if (flagFilter && vessel.flag.trim() !== flagFilter) {
      return false;
    }

    if (vesselTypeFilter && vessel.vesselType.trim() !== vesselTypeFilter) {
      return false;
    }

    if (text) {
      const haystack = [
        vessel.name,
        vessel.mmsi,
        vessel.imo,
        vessel.callsign,
      ].map((value) => value.toLowerCase());

      if (!haystack.some((value) => value.includes(text))) {
        return false;
      }
    }

    return true;
  });

  // Sort a copy so the response array is never mutated in place. The vessel ID
  // is the final tie-breaker so equal entries keep a deterministic order.
  return [...filtered].sort((a, b) => {
    if (sortMode === "name-asc") {
      const nameComparison = (a.name || "").localeCompare(b.name || "", undefined, {
        sensitivity: "base",
      });

      if (nameComparison !== 0) {
        return nameComparison;
      }

      return a.vesselId.localeCompare(b.vesselId);
    }

    if (b.presenceHours !== a.presenceHours) {
      return b.presenceHours - a.presenceHours;
    }

    return a.vesselId.localeCompare(b.vesselId);
  });
}

export function VesselTrafficResults({
  results,
  selectedVesselId,
  onSelectVessel,
  isUpdating,
}: VesselTrafficResultsProps) {
  const [searchText, setSearchText] = useState("");
  const [flagFilter, setFlagFilter] = useState("");
  const [vesselTypeFilter, setVesselTypeFilter] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("hours-desc");
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_COUNT);
  const [prevResults, setPrevResults] = useState(results);

  // Reset every control and the visible count when a new completed report
  // arrives. Adjusting state during render, guarded by the previous prop, is
  // the documented replacement for a reset effect and avoids cascading renders.
  if (results !== prevResults) {
    setPrevResults(results);
    setSearchText("");
    setFlagFilter("");
    setVesselTypeFilter("");
    setSortMode("hours-desc");
    setVisibleCount(DEFAULT_VISIBLE_COUNT);
  }

  const filterOptions = useMemo(
    () => getFilterOptions(results.vessels),
    [results],
  );

  const filteredSortedVessels = useMemo(
    () =>
      getFilteredSortedVessels(
        results.vessels,
        searchText,
        flagFilter,
        vesselTypeFilter,
        sortMode,
      ),
    [results, searchText, flagFilter, vesselTypeFilter, sortMode],
  );

  const visibleVessels = filteredSortedVessels.slice(0, visibleCount);
  const hasMore = filteredSortedVessels.length > visibleCount;

  function resetVisibleCount() {
    setVisibleCount(DEFAULT_VISIBLE_COUNT);
  }

  function handleShowMore() {
    setVisibleCount((current) =>
      Math.min(current + VISIBLE_INCREMENT, filteredSortedVessels.length),
    );
  }

  const total = results.count;

  return (
    <section
      aria-labelledby="results-heading"
      aria-busy={isUpdating}
      className="results-region"
    >
      <h2 id="results-heading">{total.toLocaleString()} vessels found</h2>

      {isUpdating && (
        <p className="results-update-status" role="status" aria-live="polite">
          Updating results... Previous results remain visible.
        </p>
      )}

      {total === 0 ? (
        <p>No AIS reporting vessels were found for this search.</p>
      ) : (
        <>
          <fieldset className="results-controls" disabled={isUpdating}>
            <legend>Filter and sort results</legend>

            <label className="results-controls__field">
              <span className="results-controls__label">
                Search by name, MMSI, IMO, or callsign
              </span>
              <input
                type="text"
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  resetVisibleCount();
                }}
                placeholder="Enter text to filter vessels"
              />
            </label>

            <label className="results-controls__field">
              <span className="results-controls__label">Flag</span>
              <select
                value={flagFilter}
                onChange={(event) => {
                  setFlagFilter(event.target.value);
                  resetVisibleCount();
                }}
              >
                <option value="">All flags</option>
                {filterOptions.flags.map((flag) => (
                  <option key={flag} value={flag}>{flag}</option>
                ))}
              </select>
            </label>

            <label className="results-controls__field">
              <span className="results-controls__label">Vessel type</span>
              <select
                value={vesselTypeFilter}
                onChange={(event) => {
                  setVesselTypeFilter(event.target.value);
                  resetVisibleCount();
                }}
              >
                <option value="">All vessel types</option>
                {filterOptions.vesselTypes.map((vesselType) => (
                  <option key={vesselType} value={vesselType}>{vesselType}</option>
                ))}
              </select>
            </label>

            <label className="results-controls__field">
              <span className="results-controls__label">Sort by</span>
              <select
                value={sortMode}
                onChange={(event) => {
                  setSortMode(event.target.value as SortMode);
                  resetVisibleCount();
                }}
              >
                <option value="hours-desc">Sampled AIS hours: high to low</option>
                <option value="name-asc">Vessel name: A to Z</option>
              </select>
            </label>
          </fieldset>

          {filteredSortedVessels.length === 0 ? (
            <p className="results-empty-filters">
              No vessels match the current filters.
            </p>
          ) : (
            <>
              <p className="results-count">
                Showing {visibleVessels.length.toLocaleString()} of{" "}
                {filteredSortedVessels.length.toLocaleString()} matching vessels,{" "}
                {total.toLocaleString()} total
              </p>

              <ul className="vessel-results-list">
                {visibleVessels.map((vessel) => {
                  const isSelected = selectedVesselId === vessel.vesselId;

                  return (
                    // The GFW vessel identity is more suitable as a React key than MMSI, which can be reused or reported incorrectly.
                    <li
                      className={isSelected ? "vessel-card vessel-card--selected" : "vessel-card"}
                      key={vessel.vesselId}
                    >
                      <button
                        type="button"
                        className="vessel-card__button"
                        aria-pressed={isSelected}
                        disabled={isUpdating}
                        onClick={(event) =>
                          onSelectVessel(vessel, event.currentTarget)
                        }
                      >
                        <span className="vessel-card__name">
                          {vessel.name || "Unnamed vessel"}
                        </span>
                        <span>
                          {vessel.vesselType || "Unknown vessel type"} |{" "}
                          {vessel.flag || "Unknown flag"}
                        </span>
                        <span>
                          MMSI: {vessel.mmsi || "Unavailable"} | Sampled AIS
                          presence:{" "}
                          {vessel.presenceHours.toLocaleString()} hours
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {hasMore && (
                <button
                  type="button"
                  className="secondary-button results-show-more"
                  disabled={isUpdating}
                  onClick={handleShowMore}
                >
                  Show 50 more
                </button>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
