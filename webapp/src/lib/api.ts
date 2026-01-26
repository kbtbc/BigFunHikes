// Determine API base URL based on DISABLE_VIBECODE setting
const isVibecodeModeDisabled = import.meta.env.VITE_DISABLE_VIBECODE === "true";

// Helper to get backend URL
// When Vite proxy is configured, use relative URLs so requests go through the proxy
// This makes everything same-origin so cookies work properly
function getBackendUrl(): string {
  // If Vibecode is disabled, use relative URLs (Vite proxy handles routing to backend)
  // This ensures same-origin requests so cookies work across ports
  if (isVibecodeModeDisabled) {
    return ""; // Empty string = relative URLs, uses current origin
  }
  
  // For Vibecode mode, use explicit backend URL
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
}

const API_BASE_URL = getBackendUrl();

class ApiError extends Error {
  constructor(message: string, public status: number, public data?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

// Response envelope type - all app routes return { data: T }
interface ApiResponse<T> {
  data: T;
}

// Helper to get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_auth_token");
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Include auth token in headers if available (for cross-origin HTTP)
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: "include",
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new ApiError(
      // Try app-route format first, fallback to generic message (Better Auth uses this)
      json?.error?.message || json?.message || `Request failed with status ${response.status}`,
      response.status,
      json?.error || json
    );
  }

  // 1. Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // 2. JSON responses: parse and unwrap { data }
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const json: ApiResponse<T> = await response.json();
    return json.data;
  }

  // 3. Non-JSON: return undefined (caller should use api.raw() for these)
  return undefined as T;
}

// Raw request for non-JSON endpoints (uploads, downloads, streams)
async function rawRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Include auth token in headers if available (for cross-origin HTTP)
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: "include",
  };
  return fetch(url, config);
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),

  // Escape hatch for non-JSON endpoints
  raw: rawRequest,
};

// Sample endpoint types (extend as needed)
export interface SampleResponse {
  message: string;
  timestamp: string;
}

// Sample API functions
export const sampleApi = {
  getSample: () => api.get<SampleResponse>("/api/sample"),
};

// ============================================================
// JOURNAL ENTRY TYPES
// ============================================================

export interface Photo {
  id: string;
  journalEntryId: string;
  url: string;
  caption: string | null;
  order: number;
  createdAt: string;
}

export interface WeatherData {
  temperature: number;
  temperatureUnit: "F" | "C";
  conditions: string;
  weatherCode?: number;
  humidity?: number;
  windSpeed?: number;
  windUnit?: string;
  recordedAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  date: string;
  dayNumber: number;
  title: string;
  content: string;
  milesHiked: number;
  elevationGain: number | null;
  totalMilesCompleted: number;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  weather: string | null; // JSON string of WeatherData
  gpxData: string | null;
  suuntoData: string | null; // JSON string of SuuntoParseResult
  entryType: "trail" | "training";
  createdAt: string;
  updatedAt: string;
  photos?: Photo[];
}

export interface CreateJournalEntryInput {
  date: string;
  dayNumber: number;
  title: string;
  content: string;
  milesHiked: number;
  elevationGain?: number | null;
  totalMilesCompleted: number;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  weather?: string | null;
  gpxData?: string | null;
  entryType?: "trail" | "training";
}

export interface UpdateJournalEntryInput {
  date?: string;
  dayNumber?: number;
  title?: string;
  content?: string;
  milesHiked?: number;
  elevationGain?: number | null;
  totalMilesCompleted?: number;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  weather?: string | null;
  gpxData?: string | null;
  entryType?: "trail" | "training";
}

export interface JournalEntriesList {
  entries: JournalEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface Stats {
  // Basic stats
  totalMiles: number;
  totalDays: number;
  totalElevationGain: number;
  averageMilesPerDay: number;
  lastEntryDate: string | null;
  // Enhanced stats
  longestDay: {
    miles: number;
    date: string;
    title: string;
  } | null;
  biggestClimb: {
    elevation: number;
    date: string;
    title: string;
  } | null;
  currentStreak: number;
  percentComplete: number;
  projectedCompletionDate: string | null;
  daysRemaining: number | null;
  recentPace: number;
  elevationProfile: Array<{
    date: string;
    dayNumber: number;
    elevation: number;
    miles: number;
  }>;
}

// ============================================================
// API FUNCTIONS
// ============================================================

export const entriesApi = {
  list: (page = 1, pageSize = 10) =>
    api.get<JournalEntriesList>(`/api/entries?page=${page}&pageSize=${pageSize}`),

  get: (id: string) => api.get<JournalEntry>(`/api/entries/${id}`),

  create: (data: CreateJournalEntryInput) =>
    api.post<JournalEntry>("/api/entries", data),

  update: (id: string, data: UpdateJournalEntryInput) =>
    api.put<JournalEntry>(`/api/entries/${id}`, data),

  delete: (id: string) => api.delete<void>(`/api/entries/${id}`),
};

export const statsApi = {
  get: () => api.get<Stats>("/api/stats"),
};

export const photosApi = {
  add: (entryId: string, data: { url: string; caption?: string; order: number }) =>
    api.post<Photo>(`/api/entries/${entryId}/photos`, data),

  update: (entryId: string, photoId: string, data: { caption?: string | null }) =>
    api.patch<Photo>(`/api/entries/${entryId}/photos/${photoId}`, data),

  delete: (entryId: string, photoId: string) =>
    api.delete<void>(`/api/entries/${entryId}/photos/${photoId}`),
};

export { ApiError };
