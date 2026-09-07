import { useEffect, useRef, useState } from "react";
import type {
  VesselClassificationRecord,
  VesselDetailsResponse,
} from "../types/vesselDetails";
import type { VesselAreaContext, VesselIdentitySummary } from "../types/vesselSearch";
import { DossierSection } from "./vessel-details/DossierSection";
import { VesselResearchDossier } from "./vessel-details/VesselResearchDossier";

interface VesselDetailsPanelProps {
  summary: VesselIdentitySummary;
  areaContext: VesselAreaContext | null;
  details: VesselDetailsResponse | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

interface DetailItemProps {
  label: string;
  value: string | number | null | undefined;
}

type TimeMode = "utc" | "local";

const localTimeZoneName =
  Intl.DateTimeFormat().resolvedOptions().timeZone ?? "local time";

// Explicit date and time fields keep presence, identity, and registry
// timestamps consistent. timeZoneName surfaces a short zone label so a value
// is never shown without time-zone context. toISOString slicing is avoided so
// local calendar values do not shift the date near midnight.
const utcTimestampFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

const localTimestampFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

function firstNonempty(...values: Array<string | null | undefined>): string {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

function formatTimestamp(value: string | null, mode: TimeMode): string {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  // Preserve the upstream value verbatim when it cannot be parsed so a
  // misleading UTC or local label is never attached to an unknown timestamp.
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const formatter =
    mode === "utc" ? utcTimestampFormatter : localTimestampFormatter;

  return formatter.format(date);
}

// Both endpoints must parse before a range can be called reversed. A missing
// or unparseable value is not treated as an ordering problem.
function isReversedRange(
  first: string | null,
  last: string | null,
): boolean {
  if (!first || !last) {
    return false;
  }

  const startDate = new Date(first);
  const endDate = new Date(last);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return false;
  }

  return startDate.getTime() > endDate.getTime();
}

function formatMeasurement(value: number | null, unit: string): string | null {
  return value === null ? null : `${value.toLocaleString()} ${unit}`;
}

function formatClassificationPeriod(
  classification: VesselClassificationRecord,
): string {
  if (classification.yearFrom === null && classification.yearTo === null) {
    return "Years unavailable";
  }

  if (classification.yearFrom === classification.yearTo) {
    return classification.yearFrom?.toString() ?? "Years unavailable";
  }

  return `${classification.yearFrom ?? "Unknown"} to ${classification.yearTo ?? "present"}`;
}

function DetailItem({ label, value }: DetailItemProps) {
  const displayValue = value === null || value === undefined || value === ""
    ? "Unavailable"
    : value;

  return (
    <div>
      <dt>{label}</dt>
      <dd>{displayValue}</dd>
    </div>
  );
}

function ClassificationList({
  records,
  emptyMessage,
}: {
  records: VesselClassificationRecord[];
  emptyMessage: string;
}) {
  if (records.length === 0) {
    return <p className="vessel-details-panel__empty">{emptyMessage}</p>;
  }

  return (
    <ul className="classification-list">
      {records.map((record, index) => (
        <li key={`${record.vesselId}-${record.name}-${record.source}-${record.yearFrom}-${record.yearTo}-${index}`}>
          <strong>{record.name || "Unclassified"}</strong>
          <span>{formatClassificationPeriod(record)}</span>
          <span>Source: {record.source || "Unavailable"}</span>
        </li>
      ))}
    </ul>
  );
}

function DetailSectionStatus({
  isLoading,
  hasError,
  loadingMessage,
}: {
  isLoading: boolean;
  hasError: boolean;
  loadingMessage: string;
}) {
  const message = isLoading
    ? loadingMessage
    : hasError
      ? "GFW vessel details are unavailable. Use Retry above to try again."
      : "Awaiting GFW vessel details.";

  return <p className="vessel-details-panel__empty">{message}</p>;
}

function SourceDataWarning() {
  return (
    <p className="source-data-warning">
      Source data lists the first observation later than the last.
    </p>
  );
}

export function VesselDetailsPanel({
  summary,
  areaContext,
  details,
  isLoading,
  error,
  onRetry,
  onClose,
}: VesselDetailsPanelProps) {
  // Time mode is panel-local: the panel stays mounted while the user switches
  // vessels, so the chosen mode persists for the session, and unmounting on
  // Close or a new area search resets it to UTC.
  const [timeMode, setTimeMode] = useState<TimeMode>("utc");

  const toggleTimeMode = () =>
    setTimeMode((current) => (current === "utc" ? "local" : "utc"));

  // Move focus to the panel heading when a vessel is selected or switched so
  // keyboard and narrow-screen users arrive at the new content. tabIndex={-1}
  // keeps the heading programmatically focusable without joining tab order.
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [summary.vesselId]);

  const primaryIdentity = details?.aisIdentities.find((identity) => identity.vesselId === summary.vesselId)
    ?? details?.aisIdentities[0];
  const primaryRegistry =
    details?.registryRecords.find((record) => record.isLatestRecord) ??
    details?.registryRecords[0];

  // Area-search values remain authoritative when present because an empty detail field must not erase useful context already shown to the user.
  const name = firstNonempty(
    summary.name,
    primaryIdentity?.name,
    primaryRegistry?.name,
  );
  const vesselType = firstNonempty(
    summary.vesselType,
    primaryIdentity?.vesselType,
    details?.combinedVesselTypes[0]?.name,
  );
  const gearType = firstNonempty(
    summary.gearType,
    primaryIdentity?.gearType,
    details?.combinedGearTypes[0]?.name,
  );
  const mmsi = firstNonempty(
    summary.mmsi,
    primaryIdentity?.mmsi,
    primaryRegistry?.mmsi,
  );
  const imo = firstNonempty(
    summary.imo,
    primaryIdentity?.imo,
    primaryRegistry?.imo,
  );
  const callsign = firstNonempty(
    summary.callsign,
    primaryIdentity?.callsign,
    primaryRegistry?.callsign,
  );
  const flag = firstNonempty(
    summary.flag,
    primaryIdentity?.flag,
    primaryRegistry?.flag,
  );

  return (
    <section className="vessel-details-panel details-region" aria-labelledby="vessel-details-heading">
      <div className="vessel-details-panel__header">
        <div>
          <p className="vessel-details-panel__eyebrow">Vessel details</p>
          <h2 id="vessel-details-heading" ref={headingRef} tabIndex={-1}>
            {name || "Unnamed vessel"}
          </h2>
        </div>
        <div className="vessel-details-panel__header-actions">
          <span className="vessel-details-panel__time-mode">
            {timeMode === "utc"
              ? "Times shown in UTC"
              : `Times shown in ${localTimeZoneName}`}
          </span>
          <button
            type="button"
            className="secondary-button"
            onClick={toggleTimeMode}
          >
            {timeMode === "utc" ? "Show local time" : "Show UTC"}
          </button>
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {isLoading && (
        <p className="vessel-details-panel__status" role="status" aria-live="polite">
          Loading vessel details...
        </p>
      )}

      {error && (
        <div className="vessel-details-panel__error" role="alert">
          <p>{error}</p>
          <button type="button" className="secondary-button" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      <div className="vessel-details-panel__content">
        <DossierSection id="overview" title="Overview" label="GFW vessel data" initialOpen>
          <dl className="detail-grid detail-grid--summary">
            <DetailItem label="Vessel type" value={vesselType} />
            <DetailItem label="Gear type" value={gearType} />
            <DetailItem label="Flag" value={flag} />
            <DetailItem label="MMSI" value={mmsi} />
            <DetailItem label="IMO" value={imo} />
            <DetailItem label="Callsign" value={callsign} />
          </dl>

          {areaContext ? <div className="presence-summary">
            <strong>{areaContext.presenceHours.toLocaleString()} sampled AIS hours</strong>
            <dl className="detail-grid">
              <DetailItem
                label="First observed in searched area"
                value={formatTimestamp(areaContext.enteredAt, timeMode)}
              />
              <DetailItem
                label="Last observed in searched area"
                value={formatTimestamp(areaContext.exitedAt, timeMode)}
              />
            </dl>
            {isReversedRange(areaContext.enteredAt, areaContext.exitedAt) && (
              <SourceDataWarning />
            )}
            <small>Historical AIS presence in the searched area, not a live vessel position.</small>
          </div> : <p className="presence-summary">
            Direct vessel lookup: no area report is attached. Area-presence hours
            and entry/exit observations are unavailable. This is not a current vessel location.
          </p>}
        </DossierSection>

        <DossierSection
          id="identity"
          title="Identity History"
          label="GFW vessel data"
          count={details?.aisIdentities.length}
        >
          {!details ? (
            <DetailSectionStatus
              isLoading={isLoading}
              hasError={error !== null}
              loadingMessage="Loading GFW identity history..."
            />
          ) : details.aisIdentities.length === 0 ? (
            <p className="vessel-details-panel__empty">
              No AIS identity records were returned.
            </p>
          ) : (
            <div className="record-list">
              {details.aisIdentities.map((identity, index) => (
                <article
                  className="detail-record"
                  key={`${identity.vesselId}-${identity.mmsi}-${identity.identityObservedThrough}-${index}`}
                >
                  <h4>{identity.name || "Unnamed identity"}</h4>
                  <dl className="detail-grid">
                    <DetailItem label="MMSI" value={identity.mmsi} />
                    <DetailItem label="IMO" value={identity.imo} />
                    <DetailItem label="Callsign" value={identity.callsign} />
                    <DetailItem label="Flag" value={identity.flag} />
                    <DetailItem
                      label="Vessel type"
                      value={identity.vesselType}
                    />
                    <DetailItem label="Gear type" value={identity.gearType} />
                    <DetailItem
                      label="AIS messages"
                      value={identity.messagesCount.toLocaleString()}
                    />
                    <DetailItem
                      label="AIS positions"
                      value={identity.positionsCount.toLocaleString()}
                    />
                    <DetailItem
                      label="Sources"
                      value={identity.sourceCodes.join(", ")}
                    />
                    <DetailItem
                      label="First identity observation"
                      value={formatTimestamp(
                        identity.identityObservedFrom,
                        timeMode,
                      )}
                    />
                    <DetailItem
                      label="Last identity observation"
                      value={formatTimestamp(
                        identity.identityObservedThrough,
                        timeMode,
                      )}
                    />
                  </dl>
                  {isReversedRange(
                    identity.identityObservedFrom,
                    identity.identityObservedThrough,
                  ) && <SourceDataWarning />}
                  {identity.shipTypeHistory.length > 0 && (
                    <p className="detail-record__history">
                      Type history:{" "}
                      {identity.shipTypeHistory
                        .map(
                          (history) =>
                            `${history.vesselType || "Unknown"} (${history.years.join(", ") || "years unavailable"})`,
                        )
                        .join("; ")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </DossierSection>

        <DossierSection
          id="registry"
          title="Registry Records"
          label="GFW vessel data"
          count={details?.registryRecordCount}
        >
          {!details ? (
            <DetailSectionStatus
              isLoading={isLoading}
              hasError={error !== null}
              loadingMessage="Loading GFW registry records..."
            />
          ) : details.registryRecords.length === 0 ? (
            <p className="vessel-details-panel__empty">
              No registry records were returned.
            </p>
          ) : (
            <div className="record-list">
              {details.registryRecords.map((record, index) => (
                <article
                  className="detail-record"
                  key={`${record.recordId}-${record.mmsi}-${record.recordObservedThrough}-${index}`}
                >
                  <h4>
                    <span className="detail-record__title">
                      {record.name || record.recordId || "Registry record"}
                    </span>
                    {record.isLatestRecord && (
                      <span className="record-badge">Latest</span>
                    )}
                  </h4>
                  <dl className="detail-grid">
                    <DetailItem label="Record ID" value={record.recordId} />
                    <DetailItem
                      label="Sources"
                      value={record.sourceCodes.join(", ")}
                    />
                    <DetailItem label="MMSI" value={record.mmsi} />
                    <DetailItem label="IMO" value={record.imo} />
                    <DetailItem label="Callsign" value={record.callsign} />
                    <DetailItem label="Flag" value={record.flag} />
                    <DetailItem
                      label="Gear types"
                      value={record.gearTypes.join(", ")}
                    />
                    <DetailItem
                      label="Length"
                      value={formatMeasurement(record.lengthMeters, "m")}
                    />
                    <DetailItem
                      label="Gross tonnage"
                      value={record.grossTonnage?.toLocaleString()}
                    />
                    <DetailItem label="Built year" value={record.builtYear} />
                    <DetailItem
                      label="Depth"
                      value={formatMeasurement(record.depthMeters, "m")}
                    />
                    <DetailItem
                      label="First record observation"
                      value={formatTimestamp(
                        record.recordObservedFrom,
                        timeMode,
                      )}
                    />
                    <DetailItem
                      label="Last record observation"
                      value={formatTimestamp(
                        record.recordObservedThrough,
                        timeMode,
                      )}
                    />
                  </dl>
                  {isReversedRange(
                    record.recordObservedFrom,
                    record.recordObservedThrough,
                  ) && <SourceDataWarning />}
                </article>
              ))}
            </div>
          )}
        </DossierSection>

        <DossierSection
          id="classifications"
          title="Classifications"
          label="GFW vessel data"
        >
          {!details ? (
            <DetailSectionStatus
              isLoading={isLoading}
              hasError={error !== null}
              loadingMessage="Loading GFW classifications..."
            />
          ) : (
            <>
              <h4>Vessel types</h4>
              <ClassificationList
                records={details.combinedVesselTypes}
                emptyMessage="No combined vessel classifications were returned."
              />
              <h4>Gear types</h4>
              <ClassificationList
                records={details.combinedGearTypes}
                emptyMessage="No combined gear classifications were returned."
              />
            </>
          )}
        </DossierSection>

        <VesselResearchDossier query={areaContext?.query ?? null} />

        <DossierSection
          id="sources-caveats"
          title="Sources and Caveats"
          label={details ? "GFW vessel data" : "Awaiting GFW data"}
        >
          <div className="data-notes">
            {details ? (
              <>
                <p>{details.attribution}</p>
                <p>Provider: {details.dataProvider} | Dataset: {details.dataset}</p>
                <ul>
                  {details.caveats.map((caveat) => (
                    <li key={caveat}>{caveat}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>GFW attribution and vessel-detail caveats will appear when the detail request succeeds.</p>
            )}
            <div className="future-sources">
              <strong>Future reviewed research sources</strong>
              <span>Source pending</span>
            </div>
          </div>
        </DossierSection>
      </div>
    </section>
  );
}
