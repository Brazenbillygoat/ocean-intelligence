import { useState } from "react";
import { getVesselTraffic } from "./api/vesselTrafficApi";
import { VesselTrafficResults } from "./components/VesselTrafficResults";
import { VesselTrafficSearchForm } from "./components/VesselTrafficSearchForm";
import type {
  VesselTrafficQuery,
  VesselTrafficResponse,
} from "./types/vesselTraffic";
import "./App.css";

function App() {
  const [results, setResults] = useState<VesselTrafficResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSearch(query: VesselTrafficQuery) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getVesselTraffic(query);
      setResults(response);
    } catch (requestError) {
      // JavaScript allows any value to be thrown, so we check for Error before reading its message.
      const message =
        requestError instanceof Error
          ? requestError.message
          : "An unexpected error occurred.";

      setError(message);
      setResults(null);
    } finally {
      // finally runs after either success or failure, ensuring the form never remains permanently disabled.
      setIsLoading(false);
    }
  }

  return (
    <main>
      <header>
        <h1>Ocean Intelligence</h1>
        <p>
          Search for AIS reporting vessels observed within an area and date
          range.
        </p>
      </header>

      <section aria-labelledby="search-heading">
        <h2 id="search-heading">Vessel traffic search</h2>

        <VesselTrafficSearchForm
          isLoading={isLoading}
          onSearch={handleSearch}
        />
      </section>

      {error && <p role="alert">{error}</p>}

      {results && <VesselTrafficResults results={results} />}
    </main>
  );
}

export default App;