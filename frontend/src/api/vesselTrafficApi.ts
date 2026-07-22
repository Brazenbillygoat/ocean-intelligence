import type {
  VesselTrafficQuery,
  VesselTrafficResponse,
} from "../types/vesselTraffic";

// ASP.NET Core returns errors using the Problem Details format. We only model the fields needed to show a useful message to the user.
interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const problem = (await response.json()) as ProblemDetails;

    // Detail is normally more specific, while title provides a useful fallback for Problem Details responses without additional context.
    return (
      problem.detail ??
      problem.title ??
      `The request failed with status ${response.status}.`
    );
  } catch {
    // Upstream infrastructure can sometimes return an empty body or non-JSON response, so error handling must not assume every failure is valid Problem Details JSON.
    return `The request failed with status ${response.status}.`;
  }
}

export async function getVesselTraffic(
  query: VesselTrafficQuery,
  signal?: AbortSignal,
): Promise<VesselTrafficResponse> {
  // URLSearchParams performs the required URL encoding and keeps query-string construction out of the React component.
  const parameters = new URLSearchParams({
    west: query.west.toString(),
    south: query.south.toString(),
    east: query.east.toString(),
    north: query.north.toString(),
    startDate: query.startDate,
    endDate: query.endDate,
  });

  // The relative /api URL is sent to Vite during development, where the proxy forwards it to ASP.NET Core. This avoids hard-coding a backend host into browser code.
  const response = await fetch(`/api/vessel-traffic?${parameters.toString()}`, {
    signal,
  });

  // fetch only rejects for network-level failures. HTTP responses such as 400, 502, or 503 must be checked explicitly.
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  // TypeScript types do not validate JSON at runtime. For now we trust our own backend contract and keep runtime schema validation out of this small vertical slice.
  return (await response.json()) as VesselTrafficResponse;
}