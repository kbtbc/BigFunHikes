import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { JournalEntry } from "@/components/JournalEntry";
import { EntryMap } from "@/components/EntryMap";
import { EditableCoordinates } from "@/components/EditableCoordinates";
import { SuuntoStatsDisplay } from "@/components/SuuntoStatsDisplay";
import { ActivityPlayer } from "@/components/ActivityPlayer";
import { useEntry, useDeleteEntry, useEntries, useUpdateEntry } from "@/hooks/use-entries";
import { useAuth } from "@/context/AuthContext";
import { transformApiEntryToComponent } from "@/lib/transformEntries";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, ArrowLeft, Edit, Trash2, Loader2, MapPin, Cloud, ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Reusable Entry Navigation Component
function EntryNavigation({
  prevEntry,
  nextEntry,
}: {
  prevEntry: { id: string; dayNumber: number; title: string } | null;
  nextEntry: { id: string; dayNumber: number; title: string } | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      {prevEntry ? (
        <Link to={`/entry/${prevEntry.id}`} className="flex-1">
          <Button variant="ghost" size="sm" className="w-full justify-start group">
            <ChevronLeft className="mr-1 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <div className="text-left">
              <span className="text-muted-foreground">Day {prevEntry.dayNumber}</span>
              <span className="hidden sm:inline text-muted-foreground ml-1">· {prevEntry.title.length > 30 ? prevEntry.title.slice(0, 30) + '...' : prevEntry.title}</span>
            </div>
          </Button>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      <Link to="/timeline">
        <Button variant="ghost" size="sm">
          Timeline
        </Button>
      </Link>

      {nextEntry ? (
        <Link to={`/entry/${nextEntry.id}`} className="flex-1">
          <Button variant="ghost" size="sm" className="w-full justify-end group">
            <div className="text-right">
              <span className="hidden sm:inline text-muted-foreground mr-1">{nextEntry.title.length > 30 ? nextEntry.title.slice(0, 30) + '...' : nextEntry.title} ·</span>
              <span className="text-muted-foreground">Day {nextEntry.dayNumber}</span>
            </div>
            <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}

export function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: apiEntry, isLoading: entryLoading, error: entryError } = useEntry(id || "", {
    enabled: !!id,
  });

  // Fetch all entries to determine prev/next
  const { data: allEntriesData } = useEntries(1, 1000, { enabled: true });

  const deleteMutation = useDeleteEntry();
  const updateMutation = useUpdateEntry();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const entry = apiEntry ? transformApiEntryToComponent(apiEntry) : null;

  // Find previous and next entries based on day number
  let prevEntry: { id: string; dayNumber: number; title: string; latitude?: number | null; longitude?: number | null } | null = null;
  let nextEntry: { id: string; dayNumber: number; title: string } | null = null;

  if (apiEntry && allEntriesData?.entries) {
    const allEntries = allEntriesData.entries;

    // Sort by day number
    const sortedEntries = [...allEntries].sort((a, b) => a.dayNumber - b.dayNumber);

    const currentIndex = sortedEntries.findIndex(e => e.id === id);

    if (currentIndex > 0) {
      const prev = sortedEntries[currentIndex - 1];
      prevEntry = {
        id: prev.id,
        dayNumber: prev.dayNumber,
        title: prev.title,
        latitude: prev.latitude,
        longitude: prev.longitude,
      };
    }

    if (currentIndex >= 0 && currentIndex < sortedEntries.length - 1) {
      const next = sortedEntries[currentIndex + 1];
      nextEntry = { id: next.id, dayNumber: next.dayNumber, title: next.title };
    }
  }

  // Scroll to top when entry loads (after create/edit navigation)
  useEffect(() => {
    if (entry) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [id, entry]);

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: "Entry deleted",
        description: "The journal entry has been deleted successfully.",
      });
      navigate("/timeline");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete entry.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  // Handle loading state
  if (authLoading || entryLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (entryError) {
    return (
      <div className="min-h-screen bg-muted/30 py-20">
        <div className="container mx-auto px-4 text-center">
          <Alert variant="destructive" className="max-w-md mx-auto mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {entryError?.message || "Failed to load entry. Please try again later."}
            </AlertDescription>
          </Alert>
          <Link to="/timeline">
            <Button size="lg">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Timeline
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Handle not found state
  if (!entry) {
    return (
      <div className="min-h-screen bg-muted/30 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold font-outfit mb-4">Entry Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The journal entry you're looking for doesn't exist.
          </p>
          <Link to="/timeline">
            <Button size="lg">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Timeline
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto py-3">
            <EntryNavigation prevEntry={prevEntry} nextEntry={nextEntry} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="max-w-4xl mx-auto">
          {/* Admin Actions - Floating */}
          {isAuthenticated && (
            <div className="flex gap-2 justify-end mb-4">
              <Link to={`/entry/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          )}

          {/* Training Entry Badge */}
          {entry.entryType === "training" && (
            <div className="mb-4 flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-amber-500 text-white hover:bg-amber-600 px-4 py-1.5 text-sm font-medium"
              >
                <Dumbbell className="h-4 w-4 mr-2" />
                Training Hike
              </Badge>
              <span className="text-sm text-muted-foreground">
                Not counted in trail statistics
              </span>
            </div>
          )}

          {/* Main Journal Entry Card */}
          <JournalEntry entry={entry} showFullContent={true} />

          {/* Location & Weather Section */}
          {(entry.locationName || entry.weather || (entry.coordinates.start[0] !== 34.6266)) && (
            <div className="mt-8 p-6 bg-background rounded-lg border-2 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold font-outfit">Location & Weather</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Location Info */}
                <div className="space-y-3">
                  {entry.locationName && (
                    <div>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Location</span>
                      <p className="font-medium">{entry.locationName}</p>
                    </div>
                  )}
                  {(entry.coordinates.start[0] !== 34.6266 || isAuthenticated) && (
                    <div>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">GPS Coordinates</span>
                      <EditableCoordinates
                        latitude={entry.coordinates.start[0]}
                        longitude={entry.coordinates.start[1]}
                        isAdmin={isAuthenticated}
                        onSave={async (lat, lng) => {
                          await updateMutation.mutateAsync({
                            id: id!,
                            data: { latitude: lat, longitude: lng },
                          });
                          toast({
                            title: "Coordinates updated",
                            description: `Location set to ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                          });
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Weather Info */}
                {entry.weather && (
                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Weather</span>
                    <div className="flex items-center gap-3">
                      <Cloud className="h-6 w-6 text-primary" />
                      <div>
                        <span className="text-2xl font-bold">
                          {entry.weather.temperature}°{entry.weather.temperatureUnit}
                        </span>
                        <p className="text-sm text-muted-foreground">{entry.weather.conditions}</p>
                        {entry.weather.windSpeed !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            Wind: {entry.weather.windSpeed} {entry.weather.windUnit}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suunto Fitness Watch Data */}
          {entry.suuntoData && (
            <div className="mt-8 p-6 bg-background rounded-lg border-2 shadow-md">
              <SuuntoStatsDisplay suuntoData={entry.suuntoData} />
            </div>
          )}

          {/* Activity Player - Relive style playback */}
          <div className="mt-8">
            <ActivityPlayer
              suuntoData={apiEntry?.suuntoData}
              gpxData={apiEntry?.gpxData}
              photos={apiEntry?.photos?.map(p => ({
                id: p.id,
                url: p.url,
                caption: p.caption,
                latitude: p.latitude,
                longitude: p.longitude,
                timestamp: p.takenAt,
              }))}
              entryDate={entry.date}
            />
          </div>

          {/* Map Section */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold font-outfit">
                {entry.entryType === "training" ? "Training Location" : "Today's Route"}
              </h3>
            </div>
            <EntryMap
              dayNumber={entry.day}
              title={entry.title}
              latitude={entry.coordinates.start[0]}
              longitude={entry.coordinates.start[1]}
              prevLatitude={prevEntry?.latitude}
              prevLongitude={prevEntry?.longitude}
              startLocation={entry.location.start}
              endLocation={entry.location.end}
              milesHiked={entry.miles}
              height="350px"
              entryType={entry.entryType}
              gpxTrack={entry.gpxTrack}
            />
          </div>

          {/* Bottom Navigation */}
          <div className="mt-12 pt-8 border-t">
            <EntryNavigation prevEntry={prevEntry} nextEntry={nextEntry} />
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Journal Entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "<span className="font-medium">{entry?.title}</span>" and all associated photos. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Entry"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
