import type { FormEvent } from "react";
import type { VesselTrafficQuery } from "../types/vesselTraffic";

interface VesselTrafficSearchFormProps {
  isLoading: boolean;
  onSearch: (query: VesselTrafficQuery) => void;
}

export function VesselTrafficSearchForm({
  isLoading,
  onSearch,
}: VesselTrafficSearchFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // FormData reads values by input name. Number inputs still produce strings, so coordinates require explicit conversion.
    const formData = new FormData(event.currentTarget);

    const query: VesselTrafficQuery = {
      west: Number(formData.get("west")),
      south: Number(formData.get("south")),
      east: Number(formData.get("east")),
      north: Number(formData.get("north")),
      startDate: String(formData.get("startDate")),
      endDate: String(formData.get("endDate")),
    };

    onSearch(query);
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset disabled={isLoading}>
        <legend>Geographic bounds</legend>

        <label>
          West longitude
          <input
            name="west"
            type="number"
            min="-180"
            max="180"
            step="any"
            defaultValue="-71.20"
            required
          />
        </label>

        <label>
          South latitude
          <input
            name="south"
            type="number"
            min="-90"
            max="90"
            step="any"
            defaultValue="42.20"
            required
          />
        </label>

        <label>
          East longitude
          <input
            name="east"
            type="number"
            min="-180"
            max="180"
            step="any"
            defaultValue="-70.70"
            required
          />
        </label>

        <label>
          North latitude
          <input
            name="north"
            type="number"
            min="-90"
            max="90"
            step="any"
            defaultValue="42.60"
            required
          />
        </label>
      </fieldset>

      <fieldset disabled={isLoading}>
        <legend>Date range</legend>

        <label>
          Start date
          <input
            name="startDate"
            type="date"
            defaultValue="2026-06-01"
            required
          />
        </label>

        <label>
          End date
          <input
            name="endDate"
            type="date"
            defaultValue="2026-06-08"
            required
          />
        </label>
      </fieldset>

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Searching..." : "Search vessels"}
      </button>
    </form>
  );
}