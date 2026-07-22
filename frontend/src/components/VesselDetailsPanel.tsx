import type {
  VesselClassificationRecord,
  VesselDetailsResponse,
} from "../types/vesselDetails";
import type { VesselTrafficVessel } from "../types/vesselTraffic";

interface VesselDetailsPanelProps {
  summary: VesselTrafficVessel;
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

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function firstNonempty(...values: Array<string | null | undefined>): string {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

function formatPeriod(from: string | null, through: string | null): string {
  return `${formatDate(from)} to ${formatDate(through)}`;
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

export function VesselDetailsPanel({
  summary,
  details,
  isLoading,
  error,
  onRetry,
  onClose,
}: VesselDetailsPanelProps) {
  const primaryIdentity = details?.aisIdentities[0];
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
    <section className="vessel-details-panel" aria-labelledby="vessel-details-heading">
      <div className="vessel-details-panel__header">
        <div>
          <p className="vessel-details-panel__eyebrow">Vessel details</p>
          <h2 id="vessel-details-heading">{name || "Unnamed vessel"}</h2>
        </div>
        <button type="button" className="secondary-button" onClick={onClose}>
          Close
        </button>
      </div>

      <dl className="detail-grid detail-grid--summary">
        <DetailItem label="Vessel type" value={vesselType} />
        <DetailItem label="Gear type" value={gearType} />
        <DetailItem label="Flag" value={flag} />
        <DetailItem label="MMSI" value={mmsi} />
        <DetailItem label="IMO" value={imo} />
        <DetailItem label="Callsign" value={callsign} />
      </dl>

      <div className="presence-summary">
        <strong>{summary.presenceHours.toLocaleString()} observed hours</strong>
        <span>{formatPeriod(summary.enteredAt, summary.exitedAt)}</span>
        <small>Historical AIS presence in the searched area, not a live vessel position.</small>
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

      {details && (
        <div className="vessel-details-panel__content">
          <section aria-labelledby="identity-heading">
            <h3 id="identity-heading">AIS identities</h3>
            {details.aisIdentities.length === 0 ? (
              <p className="vessel-details-panel__empty">No AIS identity records were returned.</p>
            ) : (
              <div className="record-list">
                {details.aisIdentities.map((identity, index) => (
                  <article className="detail-record" key={`${identity.vesselId}-${identity.mmsi}-${identity.identityObservedThrough}-${index}`}>
                    <h4>{identity.name || "Unnamed identity"}</h4>
                    <dl className="detail-grid">
                      <DetailItem label="MMSI" value={identity.mmsi} />
                      <DetailItem label="IMO" value={identity.imo} />
                      <DetailItem label="Callsign" value={identity.callsign} />
                      <DetailItem label="Flag" value={identity.flag} />
                      <DetailItem label="Vessel type" value={identity.vesselType} />
                      <DetailItem label="Gear type" value={identity.gearType} />
                      <DetailItem label="AIS messages" value={identity.messagesCount.toLocaleString()} />
                      <DetailItem label="AIS positions" value={identity.positionsCount.toLocaleString()} />
                      <DetailItem label="Sources" value={identity.sourceCodes.join(", ")} />
                      <DetailItem label="Identity observed" value={formatPeriod(identity.identityObservedFrom, identity.identityObservedThrough)} />
                    </dl>
                    {identity.shipTypeHistory.length > 0 && (
                      <p className="detail-record__history">
                        Type history: {identity.shipTypeHistory.map((history) => `${history.vesselType || "Unknown"} (${history.years.join(", ") || "years unavailable"})`).join("; ")}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="registry-heading">
            <h3 id="registry-heading">
              Registry records ({details.registryRecordCount.toLocaleString()})
            </h3>
            {details.registryRecords.length === 0 ? (
              <p className="vessel-details-panel__empty">No registry records were returned.</p>
            ) : (
              <div className="record-list">
                {details.registryRecords.map((record, index) => (
                  <article className="detail-record" key={`${record.recordId}-${record.mmsi}-${record.recordObservedThrough}-${index}`}>
                    <h4>
                      {record.name || record.recordId || "Registry record"}
                      {record.isLatestRecord && <span className="record-badge">Latest</span>}
                    </h4>
                    <dl className="detail-grid">
                      <DetailItem label="Record ID" value={record.recordId} />
                      <DetailItem label="Sources" value={record.sourceCodes.join(", ")} />
                      <DetailItem label="MMSI" value={record.mmsi} />
                      <DetailItem label="IMO" value={record.imo} />
                      <DetailItem label="Callsign" value={record.callsign} />
                      <DetailItem label="Flag" value={record.flag} />
                      <DetailItem label="Gear types" value={record.gearTypes.join(", ")} />
                      <DetailItem label="Length" value={formatMeasurement(record.lengthMeters, "m")} />
                      <DetailItem label="Gross tonnage" value={record.grossTonnage?.toLocaleString()} />
                      <DetailItem label="Built year" value={record.builtYear} />
                      <DetailItem label="Depth" value={formatMeasurement(record.depthMeters, "m")} />
                      <DetailItem label="Record observed" value={formatPeriod(record.recordObservedFrom, record.recordObservedThrough)} />
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="classifications-heading">
            <h3 id="classifications-heading">Classifications</h3>
            <h4>Vessel types</h4>
            <ClassificationList records={details.combinedVesselTypes} emptyMessage="No combined vessel classifications were returned." />
            <h4>Gear types</h4>
            <ClassificationList records={details.combinedGearTypes} emptyMessage="No combined gear classifications were returned." />
          </section>

          <section className="data-notes" aria-labelledby="data-notes-heading">
            <h3 id="data-notes-heading">Source and caveats</h3>
            <p>{details.attribution}</p>
            <p>Provider: {details.dataProvider} | Dataset: {details.dataset}</p>
            <ul>
              {details.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </section>
  );
}
