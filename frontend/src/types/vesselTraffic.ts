// These types describe the JSON contract exposed by our ASP.NET Core API. Keeping them separate from React components prevents API details from leaking throughout the UI and gives TypeScript one authoritative response shape.

export interface VesselTrafficQuery {
  west: number;
  south: number;
  east: number;
  north: number;

  // ASP.NET serializes DateOnly values as ISO calendar dates such as 2026-06-01. They remain strings in the browser because JavaScript Date can introduce unwanted time-zone conversion for values that represent dates without times.
  startDate: string;
  endDate: string;
}

export interface VesselTrafficVessel {
  // This is Global Fishing Watch's vessel identity. MMSI can be reused or transmitted incorrectly, so it should not be treated as our permanent key.
  vesselId: string;
  name: string;
  mmsi: string;

  // IMO numbers are generally more stable identifiers, but many smaller vessels do not have one. Empty strings are therefore valid API values.
  imo: string;
  callsign: string;
  flag: string;
  vesselType: string;
  gearType: string;

  // These values may be null when the upstream report cannot establish a boundary time. They are ISO date-time strings when present.
  enteredAt: string | null;
  exitedAt: string | null;

  // This comes from sampled AIS activity. It indicates observed presence rather than proving that the vessel transmitted continuously for the entire period.
  presenceHours: number;
}

export interface VesselTrafficResponse {
  // The API echoes the accepted query so results remain tied to their geographic bounds and date window.
  query: VesselTrafficQuery;

  // The backend supplies count directly so clients do not have to infer it from the array or assume every future response contains the complete result set.
  count: number;
  vessels: VesselTrafficVessel[];
}
