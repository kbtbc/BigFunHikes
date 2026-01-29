import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { entriesApi, api, type CreateJournalEntryInput, type WeatherData } from "@/lib/api";
import { ArrowLeft, Loader2, Mountain, Image as ImageIcon, X, MapPin, Cloud, RefreshCw, Pencil, Check, Dumbbell, Info, WifiOff, Watch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation, formatCoordinates, formatAccuracy } from "@/hooks/use-geolocation";
import { ActivityDataUpload, type GpxUploadResult, type SuuntoUploadResult } from "@/components/ActivityDataUpload";
import { savePendingEntry } from "@/lib/offline-storage";
import { isOnline } from "@/lib/sync-service";
import { useOfflineStatus } from "@/hooks/use-offline";

// Photo state interface
interface PhotoUpload {
  id: string;
  caption: string;
  file: File;
  preview: string;
}

// Weather code to description mapping (WMO codes)
function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return descriptions[code] || "Unknown";
}

export default function NewEntryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Entry type state
  const [entryType, setEntryType] = useState<"trail" | "training">("trail");

  // GPS location
  const geo = useGeolocation({ autoFetch: true });
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [editingCoords, setEditingCoords] = useState(false);
  const [coordsInput, setCoordsInput] = useState("");
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Get effective coordinates (manual overrides auto)
  const effectiveLat = manualCoords?.lat ?? geo.latitude;
  const effectiveLng = manualCoords?.lng ?? geo.longitude;

  // Get today's date in local timezone
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];

  const [formData, setFormData] = useState({
    date: localDate,
    dayNumber: 1,
    title: "",
    content: "",
    milesHiked: "",
    locationName: "",
  });

  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // GPX data state
  const [gpxData, setGpxData] = useState<GpxUploadResult | null>(null);

  // Suunto data state
  const [suuntoData, setSuuntoData] = useState<SuuntoUploadResult | null>(null);

  // Handle GPX parsed callback
  const handleGpxParsed = (result: GpxUploadResult | null) => {
    setGpxData(result);
    if (result) {
      // Auto-populate miles hiked from GPX data (if no Suunto data already)
      if (!suuntoData) {
        setFormData((prev) => ({
          ...prev,
          milesHiked: result.distanceMiles.toString(),
        }));
      }
      // Set coordinates from GPX track start point
      setManualCoords({
        lat: result.startCoords[0],
        lng: result.startCoords[1],
      });
      // Clear weather so it refetches for the GPX location
      setWeatherData(null);
    }
  };

  // Handle Suunto parsed callback - auto-populate fields
  const handleSuuntoParsed = (result: SuuntoUploadResult | null) => {
    setSuuntoData(result);
    if (result) {
      // Auto-populate form fields from Suunto data
      const updates: Partial<typeof formData> = {
        milesHiked: result.distanceMiles.toFixed(1),
      };

      // Parse date from Suunto data if available
      if (result.dateTime) {
        try {
          const suuntoDate = new Date(result.dateTime);
          if (!isNaN(suuntoDate.getTime())) {
            const dateStr = suuntoDate.toISOString().split("T")[0];
            updates.date = dateStr;
          }
        } catch (e) {
          console.warn("Could not parse Suunto date:", e);
        }
      }

      setFormData((prev) => ({
        ...prev,
        ...updates,
      }));

      // Set coordinates from Suunto GPS track start point (if available and no GPX)
      if (result.startCoords && !gpxData) {
        setManualCoords({
          lat: result.startCoords[0],
          lng: result.startCoords[1],
        });
        // Clear weather so it refetches for the new location
        setWeatherData(null);
      }
    }
  };

  // Fetch weather when we have GPS coordinates
  useEffect(() => {
    async function fetchWeather() {
      if (effectiveLat === null || effectiveLng === null) return;
      if (weatherData) return; // Already have weather

      setWeatherLoading(true);
      setWeatherError(null);

      try {
        // Use Open-Meteo API (free, no API key needed)
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${effectiveLat}&longitude=${effectiveLng}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch weather");
        }

        const data = await response.json();
        const current = data.current_weather;

        const weather: WeatherData = {
          temperature: Math.round(current.temperature),
          temperatureUnit: "F",
          conditions: getWeatherDescription(current.weathercode),
          weatherCode: current.weathercode,
          windSpeed: Math.round(current.windspeed),
          windUnit: "mph",
          recordedAt: new Date().toISOString(),
        };

        setWeatherData(weather);
      } catch (error) {
        console.error("Weather fetch error:", error);
        setWeatherError("Could not fetch weather data");
      } finally {
        setWeatherLoading(false);
      }
    }

    fetchWeather();
  }, [effectiveLat, effectiveLng, weatherData]);

  // Reverse geocode to get location name when coordinates change
  useEffect(() => {
    async function reverseGeocode() {
      if (effectiveLat === null || effectiveLng === null) return;
      // Don't overwrite if user already entered a location name
      if (formData.locationName.trim()) return;

      setLocationLoading(true);

      try {
        // Use Nominatim (OpenStreetMap) for free reverse geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${effectiveLat}&lon=${effectiveLng}&zoom=14`,
          {
            headers: {
              "User-Agent": "TrailJournalApp/1.0",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch location name");
        }

        const data = await response.json();

        // Build a readable location name from the response
        const address = data.address || {};
        const parts: string[] = [];

        // Priority: natural feature > tourism > leisure > amenity > hamlet > village > town > city
        const placeName =
          address.natural ||
          address.tourism ||
          address.leisure ||
          address.amenity ||
          address.hamlet ||
          address.village ||
          address.town ||
          address.city ||
          address.municipality;

        if (placeName) {
          parts.push(placeName);
        }

        // Add county or region for context
        if (address.county && !parts.includes(address.county)) {
          parts.push(address.county);
        }

        // Add state abbreviation
        if (address.state) {
          // Common US state abbreviations
          const stateAbbreviations: Record<string, string> = {
            Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
            Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
            Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
            Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
            Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO",
            Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
            "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH",
            Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
            "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
            Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
          };
          const abbrev = stateAbbreviations[address.state] || address.state;
          parts.push(abbrev);
        }

        if (parts.length > 0) {
          setFormData((prev) => ({
            ...prev,
            locationName: parts.join(", "),
          }));
        }
      } catch (error) {
        console.error("Reverse geocoding error:", error);
        // Silently fail - location name is optional
      } finally {
        setLocationLoading(false);
      }
    }

    reverseGeocode();
  }, [effectiveLat, effectiveLng]); // Note: intentionally not including formData.locationName to avoid re-fetching

  // Fetch the last entry to calculate running total and next day number
  const { data: lastEntryData } = useQuery({
    queryKey: ["entries", 1, 1],
    queryFn: () => entriesApi.list(1, 1),
  });

  // Set the next day number and calculate running total based on last entry
  useEffect(() => {
    if (entryType === "training") {
      // Training entries default to day 0
      setFormData((prev) => ({
        ...prev,
        dayNumber: 0,
      }));
    } else if (lastEntryData?.entries[0]) {
      // Trail entries auto-increment from last entry
      const lastEntry = lastEntryData.entries[0];
      setFormData((prev) => ({
        ...prev,
        dayNumber: lastEntry.dayNumber + 1,
      }));
    }
  }, [lastEntryData, entryType]);

  // Handle photo upload
  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newPhoto: PhotoUpload = {
          id: Math.random().toString(36).substr(2, 9),
          caption: "",
          file: file,
          preview: e.target?.result as string,
        };
        setPhotos((prev) => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoRemove = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePhotoCaptionChange = (id: string, caption: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption } : p))
    );
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateJournalEntryInput) => {
      // First create the entry
      const newEntry = await entriesApi.create(data);

      // Then upload photos if any
      if (photos.length > 0) {
        setUploadingPhotos(true);

        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const formDataPhoto = new FormData();
          formDataPhoto.append("file", photo.file);
          formDataPhoto.append("caption", photo.caption);
          formDataPhoto.append("order", i.toString());

          try {
            // Use api.raw() to include auth token in headers
            const response = await api.raw(
              `/api/entries/${newEntry.id}/photos/upload`,
              {
                method: "POST",
                body: formDataPhoto,
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Failed to upload photo ${i + 1}:`, errorText);
            }
          } catch (error) {
            console.error(`Error uploading photo ${i + 1}:`, error);
          }
        }
        setUploadingPhotos(false);
      }

      return newEntry;
    },
    onSuccess: async (newEntry) => {
      // Wait for cache invalidation to complete before navigating
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["entries"] }),
        queryClient.invalidateQueries({ queryKey: ["entries", newEntry.id] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
      toast({
        title: "Entry created!",
        description: "Your journal entry has been saved successfully.",
      });
      navigate(`/entry/${newEntry.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to create entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { isOnline: online, refreshPendingCount } = useOfflineStatus();
  const [savingOffline, setSavingOffline] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in title and content.",
        variant: "destructive",
      });
      return;
    }

    // Convert date to ISO datetime string
    const dateString = `${formData.date}T12:00:00Z`;

    // Parse numeric fields
    const milesHiked = formData.milesHiked ? parseFloat(formData.milesHiked) : 0;

    // Calculate total miles completed
    // Training entries don't contribute to trail total
    let totalMilesCompleted = 0;
    if (entryType === "trail") {
      const lastEntry = lastEntryData?.entries[0];
      totalMilesCompleted = (lastEntry?.totalMilesCompleted || 0) + milesHiked;
    }

    // Determine elevation gain - prioritize Suunto, then GPX
    const elevationGain = suuntoData
      ? suuntoData.elevationGainFeet
      : gpxData
        ? gpxData.elevationGainFeet
        : null;

    const entryData: CreateJournalEntryInput = {
      date: dateString,
      dayNumber: formData.dayNumber,
      title: formData.title.trim(),
      content: formData.content.trim(),
      milesHiked,
      elevationGain,
      totalMilesCompleted,
      latitude: effectiveLat,
      longitude: effectiveLng,
      locationName: formData.locationName.trim() || null,
      weather: weatherData ? JSON.stringify(weatherData) : null,
      gpxData: gpxData ? gpxData.gpxData : null,
      suuntoData: suuntoData ? suuntoData.suuntoData : null,
      entryType,
    };

    // If offline, save locally
    if (!online) {
      setSavingOffline(true);
      try {
        await savePendingEntry(
          entryData,
          photos.map((p, i) => ({ file: p.file, caption: p.caption, order: i }))
        );
        await refreshPendingCount();
        toast({
          title: "Saved offline",
          description: "Your entry has been saved locally and will sync when you're back online.",
        });
        navigate("/timeline");
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save entry offline. Please try again.",
          variant: "destructive",
        });
      } finally {
        setSavingOffline(false);
      }
      return;
    }

    // Online - use normal mutation
    createMutation.mutate(entryData);
  };

  const handleChange = (
    field: keyof typeof formData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Parse and validate coordinate input
  const parseCoordinates = (input: string): { lat: number; lng: number } | null => {
    const cleaned = input.trim();
    const parts = cleaned.split(/[,\s]+/).filter(Boolean);
    if (parts.length !== 2) return null;

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90) return null;
    if (lng < -180 || lng > 180) return null;

    return { lat, lng };
  };

  const handleStartEditCoords = () => {
    const lat = effectiveLat ?? 0;
    const lng = effectiveLng ?? 0;
    setCoordsInput(`${lat}, ${lng}`);
    setCoordsError(null);
    setEditingCoords(true);
  };

  const handleSaveCoords = () => {
    const coords = parseCoordinates(coordsInput);
    if (!coords) {
      setCoordsError("Invalid format. Use: lat, lng (e.g., 34.6266, -84.1934)");
      return;
    }
    setManualCoords(coords);
    setEditingCoords(false);
    setCoordsError(null);
    // Clear weather so it refetches for new location
    setWeatherData(null);
  };

  const handleCancelEditCoords = () => {
    setEditingCoords(false);
    setCoordsError(null);
  };

  const handleCoordsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveCoords();
    } else if (e.key === "Escape") {
      handleCancelEditCoords();
    }
  };

  const isPending = createMutation.isPending || uploadingPhotos || savingOffline;

  return (
    <div className="min-h-screen bg-muted/30 py-8 md:py-12">
      <div className="container max-w-3xl mx-auto px-4">
        {/* Back button */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${entryType === "training" ? "bg-amber-500/10" : "bg-primary/10"}`}>
                {entryType === "training" ? (
                  <Dumbbell className="h-6 w-6 text-amber-600" />
                ) : (
                  <Mountain className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <CardTitle className="text-3xl font-outfit">
                  {entryType === "training" ? "New Training Entry" : "New Journal Entry"}
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-base">
              {entryType === "training"
                ? "Log your pre-hike training session"
                : "Document your day on the trail"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Entry Type Toggle */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Entry Type</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryType("trail")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      entryType === "trail"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Mountain className="h-5 w-5" />
                    <span className="font-medium">Trail Entry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType("training")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      entryType === "training"
                        ? "border-amber-500 bg-amber-500/5 text-amber-600"
                        : "border-border hover:border-amber-500/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Dumbbell className="h-5 w-5" />
                    <span className="font-medium">Training</span>
                  </button>
                </div>
                {entryType === "training" && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">
                      Training hikes are not counted in your trail statistics.
                    </p>
                  </div>
                )}
              </div>

              {/* Entry Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-medium">
                      Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleChange("date", e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dayNumber" className="text-sm font-medium">
                      {entryType === "training" ? "Training Day" : "Day Number"} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="dayNumber"
                      type="number"
                      min={entryType === "training" ? undefined : "1"}
                      value={formData.dayNumber}
                      onChange={(e) =>
                        handleChange("dayNumber", parseInt(e.target.value) || 0)
                      }
                      required
                      className="h-10"
                    />
                    {entryType === "training" && (
                      <p className="text-xs text-muted-foreground">
                        Use 0 or negative numbers for pre-trail training
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g., Springer Mountain to Hawk Mountain Shelter"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    required
                    className="h-10"
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content" className="text-sm font-medium">
                    Journal Entry <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="content"
                    placeholder="Write about your day on the trail..."
                    value={formData.content}
                    onChange={(e) => handleChange("content", e.target.value)}
                    rows={10}
                    required
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="milesHiked" className="text-sm font-medium">
                    Miles Hiked Today
                  </Label>
                  <Input
                    id="milesHiked"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={formData.milesHiked}
                    onChange={(e) => handleChange("milesHiked", e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Location Name */}
                <div className="space-y-2">
                  <Label htmlFor="locationName" className="text-sm font-medium">
                    Location Name (optional)
                  </Label>
                  <div className="relative">
                    <Input
                      id="locationName"
                      type="text"
                      placeholder={locationLoading ? "Looking up location..." : "e.g., Springer Mountain, GA"}
                      value={formData.locationName}
                      onChange={(e) => handleChange("locationName", e.target.value)}
                      className="h-10"
                      maxLength={500}
                    />
                    {locationLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto-filled from GPS coordinates. Feel free to edit.
                  </p>
                </div>
              </div>

              {/* Watch Data Import Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Watch className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold font-outfit">Import Watch Data</h3>
                </div>

                {/* Unified Activity Data Upload */}
                <ActivityDataUpload
                  onGpxParsed={handleGpxParsed}
                  onSuuntoParsed={handleSuuntoParsed}
                  disabled={isPending}
                />

                {/* Info message when data is imported */}
                {suuntoData && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-400">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">
                      Suunto data imported! Miles, elevation, date, and coordinates have been auto-filled.
                      Heart rate, pace, and lap data will be displayed on the entry.
                    </p>
                  </div>
                )}

                {gpxData && !suuntoData && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">
                      GPX track imported! Miles and coordinates have been auto-filled.
                      Your route will be displayed on the entry map.
                    </p>
                  </div>
                )}
              </div>

              {/* Location & Weather Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold font-outfit">Location & Weather</h3>
                </div>

                {/* GPS Status */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">GPS Coordinates</span>
                      {manualCoords && (
                        <span className="text-xs text-muted-foreground">(manual)</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setManualCoords(null);
                        setWeatherData(null);
                        geo.fetchLocation();
                      }}
                      disabled={geo.loading}
                      className="h-7 px-2"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${geo.loading ? "animate-spin" : ""}`} />
                      Auto
                    </Button>
                  </div>

                  {geo.loading && !manualCoords && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Getting your location...
                    </p>
                  )}

                  {geo.error && !manualCoords && (
                    <p className="text-sm text-destructive">{geo.error}</p>
                  )}

                  {editingCoords ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={coordsInput}
                          onChange={(e) => {
                            setCoordsInput(e.target.value);
                            setCoordsError(null);
                          }}
                          onKeyDown={handleCoordsKeyDown}
                          placeholder="lat, lng"
                          className="font-mono text-sm h-8 w-48"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={handleSaveCoords}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={handleCancelEditCoords}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      {coordsError && <p className="text-xs text-destructive">{coordsError}</p>}
                      <p className="text-xs text-muted-foreground">
                        Format: latitude, longitude (e.g., 34.6266, -84.1934)
                      </p>
                    </div>
                  ) : effectiveLat !== null && effectiveLng !== null ? (
                    <div className="space-y-1">
                      <div
                        className="group flex items-center gap-2 cursor-pointer"
                        onClick={handleStartEditCoords}
                        title="Click to edit coordinates"
                      >
                        <p className="text-sm font-mono text-foreground">
                          {formatCoordinates(effectiveLat, effectiveLng)}
                        </p>
                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {!manualCoords && geo.accuracy && (
                        <p className="text-xs text-muted-foreground">
                          {formatAccuracy(geo.accuracy)}
                        </p>
                      )}
                    </div>
                  ) : !geo.loading && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Location not available.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleStartEditCoords}
                        className="h-7"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Enter manually
                      </Button>
                    </div>
                  )}
                </div>

                {/* Weather Status */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Current Weather</span>
                  </div>

                  {weatherLoading && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Fetching weather...
                    </p>
                  )}

                  {weatherError && (
                    <p className="text-sm text-destructive">{weatherError}</p>
                  )}

                  {weatherData && (
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold">
                        {weatherData.temperature}°{weatherData.temperatureUnit}
                      </span>
                      <div className="text-sm">
                        <p className="font-medium">{weatherData.conditions}</p>
                        {weatherData.windSpeed !== undefined && (
                          <p className="text-muted-foreground">
                            Wind: {weatherData.windSpeed} {weatherData.windUnit}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {!weatherLoading && !weatherError && !weatherData && effectiveLat === null && (
                    <p className="text-sm text-muted-foreground">
                      Weather will be fetched once location is available.
                    </p>
                  )}
                </div>
              </div>

              {/* Photos Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-accent" />
                  <h3 className="text-lg font-semibold font-outfit">Photos</h3>
                </div>

                <div>
                  <Label htmlFor="photoUpload" className="text-sm font-medium block mb-2">
                    Upload Photos
                  </Label>
                  <Input
                    id="photoUpload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoAdd}
                    disabled={isPending}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Select one or more images to add to this entry
                  </p>
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group border border-border rounded-lg overflow-hidden bg-muted"
                      >
                        <img
                          src={photo.preview}
                          alt="Preview"
                          className="w-full h-32 object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handlePhotoRemove(photo.id)}
                          aria-label="Remove photo"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <div className="p-2">
                          <Input
                            placeholder="Add caption..."
                            value={photo.caption}
                            onChange={(e) =>
                              handlePhotoCaptionChange(photo.id, e.target.value)
                            }
                            className="h-7 text-xs"
                            disabled={isPending}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {createMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {createMutation.error instanceof Error
                      ? createMutation.error.message
                      : "Failed to create entry. Please try again."}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {/* Offline indicator */}
                {!online && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 mb-2 sm:mb-0 sm:hidden">
                    <WifiOff className="h-4 w-4 flex-shrink-0" />
                    <p className="text-sm">
                      You're offline. Entry will be saved locally.
                    </p>
                  </div>
                )}
                <Button
                  type="submit"
                  size="lg"
                  disabled={isPending}
                  className={`flex-1 ${entryType === "training" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {savingOffline ? "Saving offline..." : uploadingPhotos ? "Uploading photos..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      {!online ? (
                        <WifiOff className="h-4 w-4 mr-2" />
                      ) : entryType === "training" ? (
                        <Dumbbell className="h-4 w-4 mr-2" />
                      ) : (
                        <Mountain className="h-4 w-4 mr-2" />
                      )}
                      {!online ? "Save Offline" : `Save ${entryType === "training" ? "Training" : "Entry"}`}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => navigate(-1)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
