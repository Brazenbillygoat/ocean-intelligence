import type {
  VesselTrafficResponse,
  VesselTrafficVessel,
} from "../types/vesselTraffic";

interface VesselTrafficResultsProps {
  results: VesselTrafficResponse;
  selectedVesselId: string | null;
  onSelectVessel: (vessel: VesselTrafficVessel) => void;
}

export function VesselTrafficResults({
  results,
  selectedVesselId,
  onSelectVessel,
}: VesselTrafficResultsProps) {
  return (
    <section aria-labelledby="results-heading">
      <h2 id="results-heading">
        {results.count.toLocaleString()} vessels found
      </h2>

      {results.vessels.length === 0 ? (
        <p>No AIS reporting vessels were found for this search.</p>
      ) : (
        <ul className="vessel-results-list">
          {results.vessels.map((vessel) => {
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
                  onClick={() => onSelectVessel(vessel)}
                >
                  <span className="vessel-card__name">
                    {vessel.name || "Unnamed vessel"}
                  </span>
                  <span>
                    {vessel.vesselType || "Unknown vessel type"} |{" "}
                    {vessel.flag || "Unknown flag"}
                  </span>
                  <span>
                    MMSI: {vessel.mmsi || "Unavailable"} | Presence:{" "}
                    {vessel.presenceHours.toLocaleString()} hours
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
