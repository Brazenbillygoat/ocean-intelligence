// ASP.NET Core returns errors using the Problem Details format. We only model the fields needed to show a useful message to the user.
interface ProblemDetails {
  title?: string;
  detail?: string;
}

export async function readErrorMessage(response: Response): Promise<string> {
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
