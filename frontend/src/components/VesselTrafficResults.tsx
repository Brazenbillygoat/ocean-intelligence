import type { VesselTrafficResponse } from "../types/vesselTraffic";

interface VesselTrafficResultsProps {
  results: VesselTrafficResponse;
}

export function VesselTrafficResults({
  results,
}: VesselTrafficResultsProps) {
  return (
    <section aria-labelledby="results-heading">
      <h2 id="results-heading">
        {results.count.toLocaleString()} vessels found
      </h2>

      {results.vessels.length === 0 ? (
        <p>No AIS reporting vessels were found for this search.</p>
      ) : (
        <ul>
          {results.vessels.map((vessel) => (
            // The GFW vessel identity is more suitable as a React key than MMSI, which can be reused or reported incorrectly.
            <li key={vessel.vesselId}>
              <h3>{vessel.name || "Unnamed vessel"}</h3>
              <p>
                {vessel.vesselType || "Unknown vessel type"} ·{" "}
                {vessel.flag || "Unknown flag"}
              </p>
              <p>
                MMSI: {vessel.mmsi || "Unavailable"} | Presence:{" "}
                {vessel.presenceHours.toLocaleString()} hours
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}