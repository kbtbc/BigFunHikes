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
import { ArrowLeft, Loader2, Mountain, Image as ImageIcon, X, MapPin, Cloud, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation, formatCoordinates, formatAccuracy } from "@/hooks/use-geolocation";

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

  // GPS location
  const geo = useGeolocation({ autoFetch: true });
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

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

  // Fetch weather when we have GPS coordinates
  useEffect(() => {
    async function fetchWeather() {
      if (geo.latitude === null || geo.longitude === null) return;
      if (weatherData) return; // Already have weather

      setWeatherLoading(true);
      setWeatherError(null);

      try {
        // Use Open-Meteo API (free, no API key needed)
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph`
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
  }, [geo.latitude, geo.longitude, weatherData]);

  // Fetch the last entry to calculate running total and next day number
  const { data: lastEntryData } = useQuery({
    queryKey: ["entries", 1, 1],
    queryFn: () => entriesApi.list(1, 1),
  });

  // Set the next day number and calculate running total based on last entry
  useEffect(() => {
    if (lastEntryData?.entries[0]) {
      const lastEntry = lastEntryData.entries[0];
      setFormData((prev) => ({
        ...prev,
        dayNumber: lastEntry.dayNumber + 1,
      }));
    }
  }, [lastEntryData]);

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
    onSuccess: (newEntry) => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
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

  const handleSubmit = (e: React.FormEvent) => {
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
    const lastEntry = lastEntryData?.entries[0];
    const totalMilesCompleted = (lastEntry?.totalMilesCompleted || 0) + milesHiked;

    createMutation.mutate({
      date: dateString,
      dayNumber: formData.dayNumber,
      title: formData.title.trim(),
      content: formData.content.trim(),
      milesHiked,
      elevationGain: null,
      totalMilesCompleted,
      latitude: geo.latitude,
      longitude: geo.longitude,
      locationName: formData.locationName.trim() || null,
      weather: weatherData ? JSON.stringify(weatherData) : null,
      gpxData: null,
    });
  };

  const handleChange = (
    field: keyof typeof formData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isPending = createMutation.isPending || uploadingPhotos;

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
              <div className="p-2 rounded-lg bg-primary/10">
                <Mountain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl font-outfit">
                  New Journal Entry
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-base">
              Document your day on the trail
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
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
                      Day Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="dayNumber"
                      type="number"
                      min="1"
                      value={formData.dayNumber}
                      onChange={(e) =>
                        handleChange("dayNumber", parseInt(e.target.value) || 1)
                      }
                      required
                      className="h-10"
                    />
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
                  <Input
                    id="locationName"
                    type="text"
                    placeholder="e.g., Springer Mountain, GA"
                    value={formData.locationName}
                    onChange={(e) => handleChange("locationName", e.target.value)}
                    className="h-10"
                    maxLength={500}
                  />
                </div>
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
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={geo.fetchLocation}
                      disabled={geo.loading}
                      className="h-7 px-2"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${geo.loading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>

                  {geo.loading && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Getting your location...
                    </p>
                  )}

                  {geo.error && (
                    <p className="text-sm text-destructive">{geo.error}</p>
                  )}

                  {geo.latitude !== null && geo.longitude !== null && (
                    <div className="space-y-1">
                      <p className="text-sm font-mono text-foreground">
                        {formatCoordinates(geo.latitude, geo.longitude)}
                      </p>
                      {geo.accuracy && (
                        <p className="text-xs text-muted-foreground">
                          {formatAccuracy(geo.accuracy)}
                        </p>
                      )}
                    </div>
                  )}

                  {!geo.loading && !geo.error && geo.latitude === null && (
                    <p className="text-sm text-muted-foreground">
                      Location not available. Click Refresh to try again.
                    </p>
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

                  {!weatherLoading && !weatherError && !weatherData && geo.latitude === null && (
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
                <Button
                  type="submit"
                  size="lg"
                  disabled={isPending}
                  className="flex-1"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {uploadingPhotos ? "Uploading photos..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <Mountain className="h-4 w-4 mr-2" />
                      Save Entry
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
