// These types mirror the stable vessel-details contract exposed by our ASP.NET Core API rather than Global Fishing Watch's upstream response shape.

export interface VesselShipTypeHistory {
  vesselType: string;
  years: number[];
}

export interface VesselIdentityRecord {
  vesselId: string;
  mmsi: string;
  name: string;
  flag: string;
  callsign: string;
  imo: string;
  gearType: string;
  vesselType: string;
  messagesCount: number;
  positionsCount: number;
  sourceCodes: string[];
  shipTypeHistory: VesselShipTypeHistory[];

  // These dates describe when GFW associated transmissions with an identity. They are not vessel positions.
  identityObservedFrom: string | null;
  identityObservedThrough: string | null;
}

export interface VesselRegistryRecord {
  recordId: string;
  sourceCodes: string[];
  mmsi: string;
  flag: string;
  name: string;
  callsign: string;
  imo: string;
  isLatestRecord: boolean;
  gearTypes: string[];
  lengthMeters: number | null;
  grossTonnage: number | null;
  builtYear: number | null;
  depthMeters: number | null;

  // Registry observation dates describe the record's effective period, not the vessel's location.
  recordObservedFrom: string | null;
  recordObservedThrough: string | null;
}

export interface VesselClassificationRecord {
  vesselId: string;
  name: string;
  source: string;
  yearFrom: number | null;
  yearTo: number | null;
}

export interface VesselDetailsResponse {
  vesselId: string;
  dataset: string;
  dataProvider: string;
  attribution: string;
  registryRecordCount: number;
  aisIdentities: VesselIdentityRecord[];
  registryRecords: VesselRegistryRecord[];
  combinedVesselTypes: VesselClassificationRecord[];
  combinedGearTypes: VesselClassificationRecord[];
  caveats: string[];
}
