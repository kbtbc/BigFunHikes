import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { entriesApi, photosApi, api, type UpdateJournalEntryInput, type Photo, type WeatherData } from "@/lib/api";
import { useEntry, useUpdateEntry } from "@/hooks/use-entries";
import { ArrowLeft, Loader2, Mountain, Image as ImageIcon, X, Trash2, MapPin, Cloud, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCoordinates } from "@/hooks/use-geolocation";
import { GpxFileUpload, type GpxUploadResult } from "@/components/GpxFileUpload";

// Photo state interface for new uploads
interface PhotoUpload {
  id: string;
  caption: string;
  file: File;
  preview: string;
}

export default function EditEntryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: entry, isLoading: entryLoading } = useEntry(id || "", {
    enabled: !!id,
  });

  const updateMutation = useUpdateEntry();
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [editingCaptionPhotoId, setEditingCaptionPhotoId] = useState<string | null>(null);
  const [editedCaptions, setEditedCaptions] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    date: "",
    dayNumber: 1,
    title: "",
    content: "",
    milesHiked: "",
    totalMilesCompleted: "",
    locationName: "",
  });

  const [newPhotos, setNewPhotos] = useState<PhotoUpload[]>([]);

  // GPX data state
  const [gpxData, setGpxData] = useState<GpxUploadResult | null>(null);
  const [gpxRemoved, setGpxRemoved] = useState(false);

  // Handle GPX parsed callback
  const handleGpxParsed = (result: GpxUploadResult | null) => {
    if (result) {
      setGpxData(result);
      setGpxRemoved(false);
      // Auto-populate miles hiked from GPX data
      setFormData((prev) => ({
        ...prev,
        milesHiked: result.distanceMiles.toString(),
      }));
    } else {
      setGpxData(null);
      setGpxRemoved(true);
    }
  };

  // Parse weather data if it exists
  const existingWeather: WeatherData | null = entry?.weather
    ? JSON.parse(entry.weather)
    : null;

  // Load entry data into form
  useEffect(() => {
    if (entry) {
      const entryDate = new Date(entry.date);
      const localDate = new Date(
        entryDate.getTime() - entryDate.getTimezoneOffset() * 60000
      )
        .toISOString()
        .split("T")[0];

      setFormData({
        date: localDate,
        dayNumber: entry.dayNumber,
        title: entry.title,
        content: entry.content,
        milesHiked: entry.milesHiked.toString(),
        totalMilesCompleted: entry.totalMilesCompleted.toString(),
        locationName: entry.locationName || "",
      });
    }
  }, [entry]);

  // Handle new photo upload
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
        setNewPhotos((prev) => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleNewPhotoRemove = (id: string) => {
    setNewPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleNewPhotoCaptionChange = (id: string, caption: string) => {
    setNewPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption } : p))
    );
  };

  // Delete existing photo
  const handleDeletePhoto = async (photoId: string) => {
    if (!id || !entry) return;

    setDeletingPhotoId(photoId);
    try {
      await photosApi.delete(id, photoId);
      queryClient.invalidateQueries({ queryKey: ["entries", id] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      toast({
        title: "Photo deleted",
        description: "The photo has been removed from this entry.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete photo.",
        variant: "destructive",
      });
    } finally {
      setDeletingPhotoId(null);
    }
  };

  // Update existing photo caption
  const handleUpdatePhotoCaption = async (photoId: string, caption: string) => {
    if (!id) return;

    try {
      await photosApi.update(id, photoId, { caption: caption || null });
      queryClient.invalidateQueries({ queryKey: ["entries", id] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      setEditingCaptionPhotoId(null);
      setEditedCaptions(prev => {
        const updated = { ...prev };
        delete updated[photoId];
        return updated;
      });
      toast({
        title: "Caption updated",
        description: "The photo caption has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update caption.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id || !entry) return;

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
    const totalMilesCompleted = formData.totalMilesCompleted
      ? parseFloat(formData.totalMilesCompleted)
      : entry.totalMilesCompleted;

    const updateData: UpdateJournalEntryInput = {
      date: dateString,
      dayNumber: formData.dayNumber,
      title: formData.title.trim(),
      content: formData.content.trim(),
      milesHiked,
      totalMilesCompleted,
      locationName: formData.locationName.trim() || null,
      // Include GPX data if new GPX was uploaded, or null if removed
      ...(gpxData && {
        gpxData: gpxData.gpxData,
        elevationGain: gpxData.elevationGainFeet,
        latitude: gpxData.startCoords[0],
        longitude: gpxData.startCoords[1],
      }),
      ...(gpxRemoved && !gpxData && { gpxData: null }),
    };

    try {
      // Update the entry
      await updateMutation.mutateAsync({ id, data: updateData });

      // Upload new photos if any
      if (newPhotos.length > 0) {
        setUploadingPhotos(true);

        // Get current max order
        const existingPhotos = entry.photos || [];
        const maxOrder = existingPhotos.length > 0
          ? Math.max(...existingPhotos.map((p) => p.order))
          : -1;

        for (let i = 0; i < newPhotos.length; i++) {
          const photo = newPhotos[i];
          const formDataPhoto = new FormData();
          formDataPhoto.append("file", photo.file);
          formDataPhoto.append("caption", photo.caption);
          formDataPhoto.append("order", (maxOrder + 1 + i).toString());

          try {
            // Use api.raw() to include auth token in headers
            const response = await api.raw(
              `/api/entries/${id}/photos/upload`,
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

      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({
        title: "Entry updated!",
        description: "Your journal entry has been saved successfully.",
      });
      navigate(`/entry/${id}`);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChange = (
    field: keyof typeof formData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (entryLoading) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 md:py-12">
        <div className="container max-w-3xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-32 bg-muted rounded" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 md:py-12">
        <div className="container max-w-3xl mx-auto px-4">
          <Alert variant="destructive">
            <AlertDescription>Entry not found.</AlertDescription>
          </Alert>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  const isPending = updateMutation.isPending || uploadingPhotos;
  const existingPhotos = entry.photos || [];

  return (
    <div className="min-h-screen bg-muted/30 py-8 md:py-12">
      <div className="container max-w-3xl mx-auto px-4">
        {/* Back button */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/entry/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Entry
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
                  Edit Journal Entry
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-base">
              Update your journal entry
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
                      min={entry?.entryType === "training" ? undefined : "1"}
                      value={formData.dayNumber}
                      onChange={(e) =>
                        handleChange("dayNumber", parseInt(e.target.value) || 0)
                      }
                      required
                      className="h-10"
                    />
                    {entry?.entryType === "training" && (
                      <p className="text-xs text-muted-foreground">
                        Training entries can use 0 or negative day numbers
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="space-y-2">
                    <Label htmlFor="totalMilesCompleted" className="text-sm font-medium">
                      Total Miles Completed
                    </Label>
                    <Input
                      id="totalMilesCompleted"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0.0"
                      value={formData.totalMilesCompleted}
                      onChange={(e) =>
                        handleChange("totalMilesCompleted", e.target.value)
                      }
                      className="h-10"
                    />
                  </div>
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

              {/* GPX Import Section */}
              <div className="space-y-4 pt-4 border-t">
                <GpxFileUpload
                  onGpxParsed={handleGpxParsed}
                  existingGpx={!gpxRemoved ? entry.gpxData : null}
                  disabled={isPending}
                />
                {gpxData && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">
                      New GPX track imported! Miles have been updated. Your route will be displayed on the entry map.
                    </p>
                  </div>
                )}
              </div>

              {/* Location & Weather Display (read-only from original entry) */}
              {(entry.latitude !== null || existingWeather) && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold font-outfit">Recorded Location & Weather</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* GPS Coordinates */}
                    {entry.latitude !== null && entry.longitude !== null && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">GPS Coordinates</span>
                        </div>
                        <p className="text-sm font-mono">
                          {formatCoordinates(entry.latitude, entry.longitude)}
                        </p>
                      </div>
                    )}

                    {/* Weather */}
                    {existingWeather && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Cloud className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Weather When Recorded</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-bold">
                            {existingWeather.temperature}°{existingWeather.temperatureUnit}
                          </span>
                          <span className="text-sm">{existingWeather.conditions}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Existing Photos Section */}
              {existingPhotos.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-accent" />
                    <h3 className="text-lg font-semibold font-outfit">
                      Existing Photos
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {existingPhotos.map((photo: Photo) => (
                      <div
                        key={photo.id}
                        className="relative group border border-border rounded-lg overflow-hidden bg-muted"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || "Photo"}
                          className="w-full h-48 object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeletePhoto(photo.id)}
                          disabled={deletingPhotoId === photo.id}
                        >
                          {deletingPhotoId === photo.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="p-3 bg-background">
                          {editingCaptionPhotoId === photo.id ? (
                            <div className="flex gap-2">
                              <Input
                                value={editedCaptions[photo.id] ?? photo.caption ?? ""}
                                onChange={(e) =>
                                  setEditedCaptions(prev => ({
                                    ...prev,
                                    [photo.id]: e.target.value
                                  }))
                                }
                                placeholder="Add a caption..."
                                className="h-8 text-sm"
                                maxLength={500}
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  handleUpdatePhotoCaption(
                                    photo.id,
                                    editedCaptions[photo.id] ?? photo.caption ?? ""
                                  )
                                }
                                className="h-8"
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingCaptionPhotoId(null);
                                  setEditedCaptions(prev => {
                                    const updated = { ...prev };
                                    delete updated[photo.id];
                                    return updated;
                                  });
                                }}
                                className="h-8"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <p
                              className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => {
                                setEditingCaptionPhotoId(photo.id);
                                setEditedCaptions(prev => ({
                                  ...prev,
                                  [photo.id]: photo.caption ?? ""
                                }));
                              }}
                            >
                              {photo.caption || "Click to add caption..."}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Photos Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-accent" />
                  <h3 className="text-lg font-semibold font-outfit">Add Photos</h3>
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

                {newPhotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {newPhotos.map((photo) => (
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
                          onClick={() => handleNewPhotoRemove(photo.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <div className="p-2">
                          <Input
                            placeholder="Add caption..."
                            value={photo.caption}
                            onChange={(e) =>
                              handleNewPhotoCaptionChange(photo.id, e.target.value)
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
              {updateMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {updateMutation.error instanceof Error
                      ? updateMutation.error.message
                      : "Failed to update entry. Please try again."}
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
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => navigate(`/entry/${id}`)}
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
