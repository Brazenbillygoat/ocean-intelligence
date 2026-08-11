import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { VesselTrafficQuery } from "../types/vesselTraffic";
import {
  calculateBoundingBox,
  formatCoordinate,
  NEARBY_SEARCH_RADIUS_NAUTICAL_MILES,
  type BoundingBoxFailureReason,
} from "../utils/geographicBounds";

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

const DEFAULT_COORDINATES = {
  west: "-71.20",
  south: "42.20",
  east: "-70.70",
  north: "42.60",
};

type LocationState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

// The success message describes an approximate rectangular area. It must not
// claim to enforce a true circular radius or live location.
const LOCATION_SUCCESS_MESSAGE =
  "Location applied as an approximate 25 nautical mile rectangular search area. Review the bounds and dates, then search.";

// Map helper failure reasons to concise user-facing messages without exposing
// raw calculation details or browser error objects.
const BOUNDARY_FAILURE_MESSAGES: Record<BoundingBoxFailureReason, string> = {
  invalid_latitude:
    "The browser returned invalid coordinates. Manual bounds remain available.",
  invalid_longitude:
    "The browser returned invalid coordinates. Manual bounds remain available.",
  invalid_radius:
    "The browser returned invalid coordinates. Manual bounds remain available.",
  unsupported_boundary_pole:
    "Your location is too close to a pole for a bounding-box search. Manual bounds remain available.",
  unsupported_boundary_date_line:
    "Your location is too close to the date line for a bounding-box search. Manual bounds remain available.",
};

export function VesselTrafficSearchForm({
  isLoading,
  onSearch,
}: VesselTrafficSearchFormProps) {
  // A lazy initializer computes the dynamic window once when the form mounts.
  const [defaultDates] = useState(getDefaultDateRange);

  // Controlled coordinate strings allow geolocation to populate the fields
  // while users can still type partial numeric values naturally.
  const [coordinates, setCoordinates] = useState(DEFAULT_COORDINATES);
  const [locationState, setLocationState] = useState<LocationState>({
    status: "idle",
  });

  // Track whether the component is still mounted so a stale geolocation
  // callback does not update state after unmount.
  const isMountedRef = useRef(true);

  // Prevent repeated clicks from creating overlapping geolocation requests.
  // A ref is used because the locating state update is asynchronous and a
  // rapid second click could see the stale false value.
  const isLocatingRef = useRef(false);

  const geolocationAvailable =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => {
    // Restore the mounted flag in setup so React StrictMode's extra
    // cleanup/setup cycle does not leave the ref false while mounted.
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isLocating = locationState.status === "locating";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Coordinates are converted from strings to numbers only at submit time
    // so partial typing and geolocation-populated values flow through the
    // same controlled state. Date inputs remain uncontrolled native inputs.
    const formData = new FormData(event.currentTarget);

    const query: VesselTrafficQuery = {
      west: Number(coordinates.west),
      south: Number(coordinates.south),
      east: Number(coordinates.east),
      north: Number(coordinates.north),
      startDate: String(formData.get("startDate")),
      endDate: String(formData.get("endDate")),
    };

    onSearch(query);
  }

  function handleUseLocation() {
    if (!geolocationAvailable || isLocatingRef.current) return;

    isLocatingRef.current = true;
    setLocationState({ status: "locating" });

    // getCurrentPosition is called only from this explicit button handler.
    // It is never called on mount or after a search. The options prefer a
    // fast, cached, low-accuracy fix suitable for a 25 nautical mile box.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current) {
          isLocatingRef.current = false;
          return;
        }

        isLocatingRef.current = false;

        const { latitude, longitude } = position.coords;

        // Validate browser coordinates before calculation. The helper also
        // validates, but checking here gives a clearer user-facing message.
        if (
          !Number.isFinite(latitude) ||
          latitude < -90 ||
          latitude > 90 ||
          !Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180
        ) {
          setLocationState({
            status: "error",
            message:
              "The browser returned invalid coordinates. Manual bounds remain available.",
          });
          return;
        }

        const result = calculateBoundingBox(
          latitude,
          longitude,
          NEARBY_SEARCH_RADIUS_NAUTICAL_MILES,
        );

        if (!result.success) {
          setLocationState({
            status: "error",
            message: BOUNDARY_FAILURE_MESSAGES[result.reason],
          });
          return;
        }

        // Populate all four coordinate inputs to at most six decimal places.
        // Dates are not touched. No search or API call is triggered.
        setCoordinates({
          west: formatCoordinate(result.bounds.west),
          south: formatCoordinate(result.bounds.south),
          east: formatCoordinate(result.bounds.east),
          north: formatCoordinate(result.bounds.north),
        });
        setLocationState({
          status: "success",
          message: LOCATION_SUCCESS_MESSAGE,
        });
      },
      (error) => {
        if (!isMountedRef.current) {
          isLocatingRef.current = false;
          return;
        }

        isLocatingRef.current = false;

        // Map the browser error code to a concise message without exposing
        // the raw error object. Prior coordinate and date values are
        // preserved because this callback never touches them.
        let message: string;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              "Location access was denied. Manual bounds remain available.";
            break;
          case error.POSITION_UNAVAILABLE:
            message =
              "Location is unavailable right now. Manual bounds remain available.";
            break;
          case error.TIMEOUT:
            message =
              "The location request timed out. Manual bounds remain available.";
            break;
          default:
            message =
              "Location could not be determined. Manual bounds remain available.";
            break;
        }

        setLocationState({ status: "error", message });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="location-action">
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={isLoading || isLocating || !geolocationAvailable}
        >
          {isLocating ? "Locating..." : "Use my location"}
        </button>

        {!geolocationAvailable && (
          <p className="location-unavailable">
            Browser location is unavailable. Enter coordinates manually below.
          </p>
        )}

        {isLocating && (
          <p role="status" aria-live="polite" className="location-status">
            Getting your approximate location...
          </p>
        )}

        {locationState.status === "success" && (
          <p role="status" aria-live="polite" className="location-status">
            {locationState.message}
          </p>
        )}

        {locationState.status === "error" && (
          <p role="alert" className="location-error">
            {locationState.message}
          </p>
        )}
      </div>

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
            value={coordinates.west}
            onChange={(event) =>
              setCoordinates((prev) => ({ ...prev, west: event.target.value }))
            }
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
            value={coordinates.south}
            onChange={(event) =>
              setCoordinates((prev) => ({
                ...prev,
                south: event.target.value,
              }))
            }
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
            value={coordinates.east}
            onChange={(event) =>
              setCoordinates((prev) => ({ ...prev, east: event.target.value }))
            }
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
            value={coordinates.north}
            onChange={(event) =>
              setCoordinates((prev) => ({
                ...prev,
                north: event.target.value,
              }))
            }
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

      <button type="submit" disabled={isLoading || isLocating}>
        {isLoading ? "Searching..." : "Search vessels"}
      </button>
    </form>
  );
}
