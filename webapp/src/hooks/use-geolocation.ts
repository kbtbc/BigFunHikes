import { useState, useEffect, useCallback } from "react";

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  timestamp: number | null;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoFetch?: boolean;
}

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000, // Cache for 1 minute
  autoFetch: true,
};

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const mergedOptions = { ...defaultOptions, ...options };

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: mergedOptions.autoFetch ?? true,
    error: null,
    timestamp: null,
  });

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Geolocation is not supported by your browser",
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let errorMessage: string;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location unavailable. Please try again.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
          default:
            errorMessage = "An unknown error occurred getting your location.";
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      },
      {
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge,
      }
    );
  }, [mergedOptions.enableHighAccuracy, mergedOptions.timeout, mergedOptions.maximumAge]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (mergedOptions.autoFetch) {
      fetchLocation();
    }
  }, []); // Only run once on mount

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearLocation = useCallback(() => {
    setState({
      latitude: null,
      longitude: null,
      accuracy: null,
      loading: false,
      error: null,
      timestamp: null,
    });
  }, []);

  return {
    ...state,
    fetchLocation,
    clearError,
    clearLocation,
    isSupported: typeof navigator !== "undefined" && "geolocation" in navigator,
  };
}

// Helper to format coordinates for display
export function formatCoordinates(lat: number | null, lon: number | null): string {
  if (lat === null || lon === null) return "Unknown location";
  
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  
  return `${Math.abs(lat).toFixed(5)}°${latDir}, ${Math.abs(lon).toFixed(5)}°${lonDir}`;
}

// Helper to format accuracy
export function formatAccuracy(accuracy: number | null): string {
  if (accuracy === null) return "";
  if (accuracy < 10) return "Very accurate (±" + Math.round(accuracy) + "m)";
  if (accuracy < 50) return "Accurate (±" + Math.round(accuracy) + "m)";
  if (accuracy < 100) return "Moderate (±" + Math.round(accuracy) + "m)";
  return "Low accuracy (±" + Math.round(accuracy) + "m)";
}
