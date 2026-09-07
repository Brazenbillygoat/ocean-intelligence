import { useState } from "react";
import type { FormEvent } from "react";

export function VesselSearchForm({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(query);
  }
  return (
    <form onSubmit={submit} aria-label="Find a vessel" autoComplete="off">
      <label htmlFor="vessel-query">Name, MMSI, IMO, or callsign</label>
      <input id="vessel-query" name="query" value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-describedby="vessel-query-help" />
      <p id="vessel-query-help">Enter 3-100 characters. Review the matches before selecting a vessel.</p>
      <button type="submit">Search</button>
    </form>
  );
}
