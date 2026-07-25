import { vesselResearchPlaceholderSections } from "../../data/vesselResearchPlaceholders";
import type { VesselTrafficQuery } from "../../types/vesselTraffic";
import { DossierSection } from "./DossierSection";
import { ResearchPlaceholderCard } from "./ResearchPlaceholderCard";

interface VesselResearchDossierProps {
  query: VesselTrafficQuery;
}

function formatCoordinate(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function VesselResearchDossier({
  query,
}: VesselResearchDossierProps) {
  return (
    <>
      {vesselResearchPlaceholderSections.map((section) => (
        <DossierSection
          id={section.id}
          title={section.title}
          label="Research scaffolding"
          count={section.entries.length}
          key={section.id}
        >
          <p className="dossier-section__description">{section.description}</p>

          {section.id === "regional-context" && (
            <div className="search-context">
              <h4>Completed search context</h4>
              <dl className="detail-grid">
                <div>
                  <dt>Longitude</dt>
                  <dd>
                    {formatCoordinate(query.west)} to{" "}
                    {formatCoordinate(query.east)}
                  </dd>
                </div>
                <div>
                  <dt>Latitude</dt>
                  <dd>
                    {formatCoordinate(query.south)} to{" "}
                    {formatCoordinate(query.north)}
                  </dd>
                </div>
                <div>
                  <dt>Date range</dt>
                  <dd>
                    {query.startDate} to {query.endDate}
                  </dd>
                </div>
              </dl>
              <p>
                These values describe the searched area and historical report
                period. They are not a current vessel location.
              </p>
            </div>
          )}

          <div className="research-card-list">
            {section.entries.map((entry) => (
              <ResearchPlaceholderCard entry={entry} key={entry.id} />
            ))}
          </div>
        </DossierSection>
      ))}
    </>
  );
}
