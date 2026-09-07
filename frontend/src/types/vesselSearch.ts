import type { VesselTrafficQuery, VesselTrafficVessel } from "./vesselTraffic";

export type VesselIdentitySummary = Pick<VesselTrafficVessel,
  "vesselId" | "name" | "mmsi" | "imo" | "callsign" | "flag" | "vesselType" | "gearType">;

export interface VesselAreaContext {
  query: VesselTrafficQuery;
  presenceHours: number;
  enteredAt: string | null;
  exitedAt: string | null;
}

export interface VesselSearchEvidence {
  source: string;
  reference: string;
  field: string;
  value: string;
  observedFrom: string | null;
  observedThrough: string | null;
  isLatestRecord: boolean | null;
}

export interface VesselSearchMatch {
  matchKey: string;
  vesselId: string | null;
  recordSource: string;
  name: string;
  mmsi: string;
  imo: string;
  callsign: string;
  flag: string;
  observedFrom: string | null;
  observedThrough: string | null;
  matchFields: string | null;
  matchingEvidence: VesselSearchEvidence[];
}

export interface VesselSearchResponse {
  query: string;
  matches: VesselSearchMatch[];
  nextCursor: string | null;
  dataset: string;
  dataProvider: string;
  attribution: string;
  caveats: string[];
}
