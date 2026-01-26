import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Timeline } from "@/components/Timeline";
import { PendingEntriesPanel } from "@/components/PendingEntriesPanel";
import { useEntries } from "@/hooks/use-entries";
import { useAuth } from "@/context/AuthContext";
import { transformApiEntryToComponent } from "@/lib/transformEntries";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export function TimelinePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: entriesData, isLoading: entriesLoading, error: entriesError } = useEntries(1, 50, {
    enabled: true, // Public access - no authentication required
  });
  const location = useLocation();

  const entries = entriesData?.entries.map(transformApiEntryToComponent) || [];

  // Sort entries: training entries first, then trail entries by day (descending)
  const sortedEntries = [...entries].sort((a, b) => {
    const aIsTraining = a.entryType === 'training';
    const bIsTraining = b.entryType === 'training';

    // Training entries come first
    if (aIsTraining && !bIsTraining) return -1;
    if (!aIsTraining && bIsTraining) return 1;

    // Within same type, sort by day (descending for trail, ascending for training)
    if (aIsTraining && bIsTraining) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return b.day - a.day;
  });

  // Scroll to entry if hash is present in URL
  useEffect(() => {
    if (location.hash && !entriesLoading && entries.length > 0) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const element = document.querySelector(location.hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location.hash, entriesLoading, entries.length]);

  return (
    <div className="min-h-screen py-12 md:py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Trail Journal
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Daily updates, stories, and reflections from the Appalachian Trail.
            Each entry captures the beauty, challenges, and magic of the journey.
          </p>
        </div>

        {/* Pending Offline Entries */}
        {isAuthenticated && (
          <div className="max-w-4xl mx-auto mb-8">
            <PendingEntriesPanel />
          </div>
        )}

        {/* Timeline */}
        <div className="max-w-4xl mx-auto">
          {authLoading || entriesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : entriesError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load entries. Please try again later.
              </AlertDescription>
            </Alert>
          ) : entries.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                No journal entries yet. Check back soon!
              </p>
            </div>
          ) : (
            <Timeline entries={sortedEntries} />
          )}
        </div>
      </div>
    </div>
  );
}
