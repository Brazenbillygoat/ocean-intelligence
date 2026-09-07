import type { VesselSearchResponse } from "../types/vesselSearch";
import { readErrorMessage } from "./apiError";

export async function searchVessels(
  query: string,
  cursor: string | null,
  signal: AbortSignal,
): Promise<VesselSearchResponse> {
  const parameters = new URLSearchParams({ query });
  if (cursor !== null) parameters.set("cursor", cursor);
  const response = await fetch(`/api/vessels/search?${parameters}`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return (await response.json()) as VesselSearchResponse;
}
