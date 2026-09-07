import type { VesselSearchMatch, VesselSearchResponse } from "../types/vesselSearch";

interface Props {
  results: VesselSearchResponse;
  selectedVesselId: string | null;
  isLoading: boolean;
  isReplacing: boolean;
  onLoadMore: () => void;
  onSelect: (match: VesselSearchMatch, button: HTMLButtonElement) => void;
}

function observation(value: string | null) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

export function VesselSearchResults({
  results, selectedVesselId, isLoading, isReplacing, onLoadMore, onSelect,
}: Props) {
  return (
    <section className="results-region" aria-labelledby="vessel-matches-heading">
      <h2 id="vessel-matches-heading">Matches for "{results.query}"</h2>
      <p role="status">{results.matches.length === 0
        ? "No matching identity records were returned."
        : `${results.matches.length} identity records loaded. These are not a verified count of physical vessels.`}</p>
      <ul className="vessel-results-list vessel-search-results">
        {results.matches.map((match) => (
          <li key={match.matchKey} className="vessel-search-card">
            <h3>{match.name || "Unnamed vessel"}</h3>
            <p>{match.recordSource}</p>
            <dl className="detail-grid">
              <div><dt>MMSI</dt><dd>{match.mmsi || "Unavailable"}</dd></div>
              <div><dt>IMO</dt><dd>{match.imo || "Unavailable"}</dd></div>
              <div><dt>Callsign</dt><dd>{match.callsign || "Unavailable"}</dd></div>
              <div><dt>Flag</dt><dd>{match.flag || "Unavailable"}</dd></div>
              <div><dt>First record observation</dt><dd>{observation(match.observedFrom)}</dd></div>
              <div><dt>Last record observation</dt><dd>{observation(match.observedThrough)}</dd></div>
              <div><dt>GFW identity</dt><dd>{match.vesselId || "Unavailable"}</dd></div>
            </dl>
            <details className="vessel-search-evidence">
              <summary>Matching evidence in this result group</summary>
              {match.matchFields && <p>Provider match classification: {match.matchFields}</p>}
              {match.matchingEvidence.length === 0 ? <p>No field-level matching evidence was returned.</p> : (
                <ul>{match.matchingEvidence.map((evidence, index) => (
                  <li key={index}>
                    <strong>{evidence.field || "Unspecified field"}: {evidence.value || "Unavailable"}</strong>
                    <p>Source: {evidence.source || "Unavailable"}; record: {evidence.reference || "Unavailable"}</p>
                    <p>{observation(evidence.observedFrom)} to {observation(evidence.observedThrough)}</p>
                    {evidence.isLatestRecord !== null && <p>{evidence.isLatestRecord ? "Latest source record" : "Historical source record"}</p>}
                  </li>
                ))}</ul>
              )}
              <p>Evidence may refer to another identity or registry record in this group. Shared identifiers do not verify identity.</p>
            </details>
            <button type="button" className="secondary-button"
              disabled={!match.vesselId || isReplacing}
              aria-pressed={match.vesselId !== null && selectedVesselId === match.vesselId}
              onClick={(event) => onSelect(match, event.currentTarget)}>
              {match.vesselId ? `View details for ${match.name || "unnamed vessel"}` : "Details unavailable"}
            </button>
            {!match.vesselId && <p>No usable GFW detail identity was returned for this record.</p>}
          </li>
        ))}
      </ul>
      {results.nextCursor !== null && (
        <button type="button" className="secondary-button load-more"
          disabled={isLoading} onClick={onLoadMore}>Load more</button>
      )}
      <div className="data-notes">
        <p>{results.attribution}</p>
        <p>Provider: {results.dataProvider} | Dataset: {results.dataset}</p>
        <ul>{results.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}</ul>
      </div>
    </section>
  );
}
