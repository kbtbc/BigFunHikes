import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { JournalEntry } from "@/components/JournalEntry";
import { TrailMap } from "@/components/TrailMap";
import { useEntry, useDeleteEntry, useEntries } from "@/hooks/use-entries";
import { useAuth } from "@/context/AuthContext";
import { transformApiEntryToComponent } from "@/lib/transformEntries";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { AlertCircle, ArrowLeft, Edit, Trash2, Loader2, MapPin, Cloud, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCoordinates } from "@/hooks/use-geolocation";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const entry = apiEntry ? transformApiEntryToComponent(apiEntry) : null;

  // Find previous and next entries based on day number
  let prevEntry: { id: string; dayNumber: number; title: string } | null = null;
  let nextEntry: { id: string; dayNumber: number; title: string } | null = null;

  if (apiEntry && allEntriesData?.entries) {
    const currentDayNumber = apiEntry.dayNumber;
    const allEntries = allEntriesData.entries;

    // Sort by day number
    const sortedEntries = [...allEntries].sort((a, b) => a.dayNumber - b.dayNumber);

    const currentIndex = sortedEntries.findIndex(e => e.id === id);

    if (currentIndex > 0) {
      const prev = sortedEntries[currentIndex - 1];
      prevEntry = { id: prev.id, dayNumber: prev.dayNumber, title: prev.title };
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
      <div className="min-h-screen py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-12 w-32 mb-6" />
            <Skeleton className="h-64 w-full mb-6" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (entryError) {
    return (
      <div className="min-h-screen py-20">
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
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Entry Not Found</h1>
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

  // Format the creation timestamp with both date and time
  const formattedDateTime = entry?.createdAt
    ? format(new Date(entry.createdAt), "MMMM d, yyyy 'at' h:mm a")
    : entry
    ? format(new Date(entry.date), "MMMM d, yyyy")
    : "";

  return (
    <div className="min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Main content */}
        <div className="max-w-4xl mx-auto">
          {/* Date and time heading */}
          <div className="mb-6">
            <h2 className="text-sm italic text-muted-foreground">{formattedDateTime}</h2>
          </div>

          {/* Admin Actions */}
          {isAuthenticated && (
            <div className="mb-6 flex gap-2 justify-end">
              <Link to={`/entry/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Entry
                </Button>
              </Link>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Entry
              </Button>
            </div>
          )}

          <JournalEntry entry={entry} showFullContent={true} />

          {/* Location & Weather Section */}
          {(entry.locationName || entry.weather || (entry.coordinates.start[0] !== 34.6266)) && (
            <div className="mt-8 p-6 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold font-outfit">Location & Weather</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Location Info */}
                <div className="space-y-2">
                  {entry.locationName && (
                    <div>
                      <span className="text-sm text-muted-foreground">Location</span>
                      <p className="font-medium">{entry.locationName}</p>
                    </div>
                  )}
                  {entry.coordinates.start[0] !== 34.6266 && (
                    <div>
                      <span className="text-sm text-muted-foreground">GPS Coordinates</span>
                      <p className="font-mono text-sm">
                        {formatCoordinates(entry.coordinates.start[0], entry.coordinates.start[1])}
                      </p>
                    </div>
                  )}
                </div>

                {/* Weather Info */}
                {entry.weather && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Weather When Recorded</span>
                    <div className="flex items-center gap-3">
                      <Cloud className="h-5 w-5 text-muted-foreground" />
                      <span className="text-2xl font-bold">
                        {entry.weather.temperature}°{entry.weather.temperatureUnit}
                      </span>
                      <div className="text-sm">
                        <p className="font-medium">{entry.weather.conditions}</p>
                        {entry.weather.windSpeed !== undefined && (
                          <p className="text-muted-foreground">
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

          {/* Map section */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold mb-4">Today's Route</h3>
            <TrailMap entries={[entry]} selectedEntry={entry} height="400px" />
          </div>

          {/* Navigation */}
          <div className="mt-12 pt-8 border-t">
            <div className="flex justify-between items-center gap-4">
              <Link to="/timeline">
                <Button size="lg" variant="outline">
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back to Timeline
                </Button>
              </Link>

              <div className="flex gap-2">
                {prevEntry ? (
                  <Link to={`/entry/${prevEntry.id}`}>
                    <Button size="lg" variant="outline" className="group">
                      <ChevronLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                      <div className="text-left">
                        <div className="text-xs text-muted-foreground">Previous</div>
                        <div className="font-semibold">Day {prevEntry.dayNumber}</div>
                      </div>
                    </Button>
                  </Link>
                ) : (
                  <Button size="lg" variant="outline" disabled>
                    <ChevronLeft className="mr-2 h-5 w-5" />
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">Previous</div>
                      <div className="font-semibold">—</div>
                    </div>
                  </Button>
                )}

                {nextEntry ? (
                  <Link to={`/entry/${nextEntry.id}`}>
                    <Button size="lg" variant="outline" className="group">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Next</div>
                        <div className="font-semibold">Day {nextEntry.dayNumber}</div>
                      </div>
                      <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                ) : (
                  <Button size="lg" variant="outline" disabled>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Next</div>
                      <div className="font-semibold">—</div>
                    </div>
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the journal
                entry "{entry?.title}" and all associated photos.
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
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
