import { useState } from "react";
import type { FormEvent } from "react";
import type { VesselTrafficQuery } from "../types/vesselTraffic";

interface VesselTrafficSearchFormProps {
  isLoading: boolean;
  onSearch: (query: VesselTrafficQuery) => void;
}

// Format a Date as a local YYYY-MM-DD value for native date inputs. Local
// calendar components are used directly so a date near midnight is not shifted
// by a UTC round trip.
function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Calculate the default historical window once on mount: the end date is five
// calendar days before the user's current local date, and the start date is
// seven days before that end date. The assumed provider lag is a default, not
// a restriction, so users can still select other valid dates.
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - 5);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  return {
    startDate: toLocalDateInputValue(startDate),
    endDate: toLocalDateInputValue(endDate),
  };
}

export function VesselTrafficSearchForm({
  isLoading,
  onSearch,
}: VesselTrafficSearchFormProps) {
  // A lazy initializer computes the dynamic window once when the form mounts.
  const [defaultDates] = useState(getDefaultDateRange);

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
            defaultValue={defaultDates.startDate}
            required
          />
        </label>

        <label>
          End date
          <input
            name="endDate"
            type="date"
            defaultValue={defaultDates.endDate}
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