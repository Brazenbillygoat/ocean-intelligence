import { useEffect, useRef, useState } from "react";
import { searchVessels } from "../api/vesselSearchApi";
import type { VesselSearchMatch, VesselSearchResponse } from "../types/vesselSearch";

function mergeMatches(previous: VesselSearchMatch[], incoming: VesselSearchMatch[]) {
  const seen = new Set(previous.map((match) => match.matchKey));
  return [...previous, ...incoming.filter((match) => {
    if (seen.has(match.matchKey)) return false;
    seen.add(match.matchKey);
    return true;
  })];
}

export function useVesselSearch() {
  const [results, setResults] = useState<VesselSearchResponse | null>(null);
  const [pending, setPending] = useState<{ query: string; append: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => {
    request.current?.abort();
    request.current = null;
  }, []);

  function cancel() {
    request.current?.abort();
    request.current = null;
    setPending(null);
  }

  async function search(query: string, append = false) {
    const accepted = query.trim();
    if (accepted.length < 3 || accepted.length > 100) {
      setError("Enter a name, MMSI, IMO, or callsign of 3-100 characters.");
      return;
    }
    const prior = results;
    if (append && (request.current || !prior?.nextCursor)) return;
    cancel();
    const controller = new AbortController();
    request.current = controller;
    setPending({ query: accepted, append });
    setError(null);
    try {
      // Pagination always uses the completed query, even if the input has been edited.
      const page = await searchVessels(
        append ? prior!.query : accepted,
        append ? prior!.nextCursor : null,
        controller.signal,
      );
      if (request.current !== controller) return;
      setResults({
        ...page,
        matches: mergeMatches(append ? prior!.matches : [], page.matches),
      });
    } catch (failure) {
      if (request.current !== controller || controller.signal.aborted) return;
      const message = failure instanceof Error ? failure.message : "An unexpected error occurred.";
      setError(append
        ? `Could not load more matches for "${prior!.query}". ${message} Loaded matches remain available; use Load more to retry.`
        : `Search for "${accepted}" failed. ${message}${prior ? ` Previous results for "${prior.query}" remain visible.` : ""}`);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setPending(null);
      }
    }
  }

  return { results, pending, error, search, cancel };
}
