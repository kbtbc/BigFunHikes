import { Timeline } from "@/components/Timeline";
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

  const entries = entriesData?.entries.map(transformApiEntryToComponent) || [];

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
            <Timeline entries={entries} />
          )}
        </div>
      </div>
    </div>
  );
}
