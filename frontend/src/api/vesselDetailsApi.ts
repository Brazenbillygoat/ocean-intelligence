import type { VesselDetailsResponse } from "../types/vesselDetails";
import { readErrorMessage } from "./apiError";

export async function getVesselDetails(
  vesselId: string,
  signal?: AbortSignal,
): Promise<VesselDetailsResponse> {
  // The vessel ID is upstream-controlled data, so it must be encoded before it becomes part of the request path.
  const response = await fetch(`/api/vessels/${encodeURIComponent(vesselId)}`, {
    signal,
  });

  // fetch resolves for HTTP failures, so status responses still require an explicit check.
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  // TypeScript types do not validate JSON at runtime. The frontend currently trusts its own backend contract, matching the area-search client.
  return (await response.json()) as VesselDetailsResponse;
}
